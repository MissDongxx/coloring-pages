#!/usr/bin/env python3
"""
关键词挖掘系统 - 增强版
支持定时执行、更好的错误处理和日志记录
"""

import os
import csv
import random
import time
import re
import json
from datetime import datetime
from pytrends.request import TrendReq

# ==================== 配置 ====================
KEYWORDS_FILE = 'keywords.csv'  # 本地关键词文件
KEYWORD_PREFIXES = [
    'coloring sheets',
    'coloring pages',
    'coloring books',
    'coloring sheet',
    'coloring page',
    'coloring book'
]

# 去除词
REMOVE_WORDS = [
    'free', 'printable', 'kids', 'for kids', 'cute',
    'for', 'for adults', 'adults'
]

# 停用词（用于清理提取的关键词）
STOP_WORDS = [
    'for', 'and', 'the', 'with', 'a', 'an',
    'in', 'on', 'at', 'to', 'of', 'by'
]

# 查询配置
GEO = 'US'  # 地区：美国
TIMEFRAME = 'today 1-m'  # 时间范围：过去一个月

# 重试配置（设置为0表示不重试）
MAX_RETRIES = 0

# ==================== 日志 ====================
def log(message):
    """输出日志"""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f"[{timestamp}] {message}")


def save_log_to_file(log_data, filename='keyword_miner_log.json'):
    """保存日志到文件"""
    try:
        if os.path.exists(filename):
            with open(filename, 'r', encoding='utf-8') as f:
                logs = json.load(f)
        else:
            logs = []

        logs.append(log_data)

        # 只保留最近100条日志
        logs = logs[-100:]

        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(logs, f, ensure_ascii=False, indent=2)
    except Exception as e:
        log(f"保存日志失败: {e}")


# ==================== 本地文件操作 ====================
def load_keywords_from_file(filename=KEYWORDS_FILE):
    """从本地CSV文件加载关键词"""
    if not os.path.exists(filename):
        return []

    keywords = []
    with open(filename, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            keywords.append({
                'root_keyword': row.get('root-keyword', ''),
                'root_num': int(row.get('root-num', 0)),
                'keyword_raw': row.get('keyword-raw', ''),
                'keyword': row.get('keyword', ''),
                'index': int(row.get('index', 0)),
                'created': int(row.get('created', 0))
            })
    return keywords


def save_keywords_to_file(keywords, filename=KEYWORDS_FILE):
    """保存关键词到本地CSV文件"""
    with open(filename, 'w', encoding='utf-8', newline='') as f:
        fieldnames = ['root-keyword', 'root-num', 'keyword-raw', 'keyword', 'index', 'created']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()

        for kw in keywords:
            writer.writerow({
                'root-keyword': kw.get('root_keyword', ''),
                'root-num': kw.get('root_num', 0),
                'keyword-raw': kw.get('keyword_raw', ''),
                'keyword': kw.get('keyword', ''),
                'index': kw.get('index', 0),
                'created': kw.get('created', 0)
            })


# ==================== 关键词处理 ====================
def find_min_root_num_keywords(keywords):
    """找到root-num最小的关键词行（可能有多行）"""
    if not keywords:
        return []

    min_num = min(kw['root_num'] for kw in keywords)
    min_keywords = [kw for kw in keywords if kw['root_num'] == min_num]

    return min_keywords


def extract_core_keyword(keyword_raw, prefix):
    """从原始关键词中提取核心关键词"""
    # 去除前缀
    core = keyword_raw[len(prefix):].strip()

    # 去除指定的词
    for word in REMOVE_WORDS:
        pattern = r'\b' + re.escape(word) + r'\b'
        core = re.sub(pattern, '', core, flags=re.IGNORECASE)

    # 清理多余的空格和标点
    core = re.sub(r'\s+', ' ', core).strip()

    # 去除停用词
    words = core.split()
    filtered_words = [w for w in words if w.lower() not in STOP_WORDS]
    core = ' '.join(filtered_words).strip()

    return core


def matches_prefix(keyword_raw):
    """检查关键词是否匹配指定的前缀"""
    keyword_lower = keyword_raw.lower().strip()

    for prefix in KEYWORD_PREFIXES:
        if keyword_lower.startswith(prefix.lower()):
            return prefix
    return None


def filter_and_extract_queries(queries):
    """筛选并提取相关查询"""
    extracted = []

    for query_item in queries:
        query = query_item.get('query', '').strip()
        value = query_item.get('value', 0)

        if not query:
            continue

        # 检查是否匹配前缀
        prefix = matches_prefix(query)
        if not prefix:
            continue

        # 提取核心关键词
        core_keyword = extract_core_keyword(query, prefix)

        # 检查提取的关键词是否有效
        if not core_keyword or len(core_keyword) < 2:
            continue

        extracted.append({
            'keyword_raw': query,
            'keyword': core_keyword,
            'index': value,
            'root_keyword': query
        })

    return extracted


def deduplicate_keywords(new_keywords, existing_keywords):
    """基于keyword去重，保留index最大的记录"""
    keyword_map = {}

    # 先添加已有关键词
    for kw in existing_keywords:
        keyword = kw.get('keyword', '')
        if keyword:
            if keyword not in keyword_map or kw.get('index', 0) > keyword_map[keyword].get('index', 0):
                keyword_map[keyword] = kw

    # 添加新关键词（保留index最大的）
    for kw in new_keywords:
        keyword = kw.get('keyword', '')
        if keyword:
            if keyword not in keyword_map or kw.get('index', 0) > keyword_map[keyword].get('index', 0):
                kw['created'] = int(time.time())
                keyword_map[keyword] = kw

    return list(keyword_map.values())


# ==================== PyTrends查询 ====================
def fetch_related_queries_with_retry(keyword, geo='US', timeframe='today 1-m'):
    """使用pytrends获取相关查询"""
    user_agents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ]

    try:
        headers = {'User-Agent': random.choice(user_agents)}
        time.sleep(random.uniform(3, 6))

        pytrends = TrendReq(
            hl='en-US',
            tz=360,
            timeout=(15, 30),
            retries=1,
            backoff_factor=0.5,
            requests_args={'headers': headers}
        )

        pytrends.build_payload([keyword], timeframe=timeframe, geo=geo)
        related_queries = pytrends.related_queries()

        if keyword in related_queries:
            all_queries = []

            top = related_queries[keyword].get('top')
            if top is not None and not top.empty:
                all_queries.extend(top.to_dict('records'))

            rising = related_queries[keyword].get('rising')
            if rising is not None and not rising.empty:
                all_queries.extend(rising.to_dict('records'))

            return all_queries

    except Exception as e:
        pass  # 静默失败，返回空列表

    return []


# ==================== 主流程 ====================
def main():
    """主执行流程"""
    log("=" * 80)
    log("关键词挖掘系统启动")
    log("=" * 80)

    # 初始化日志数据
    log_data = {
        'timestamp': datetime.now().isoformat(),
        'success': False,
        'query_keyword': '',
        'related_queries_count': 0,
        'extracted_count': 0,
        'new_records': 0,
        'total_records': 0,
        'error': None
    }

    log(f"📁 关键词文件: {KEYWORDS_FILE}")
    log("")

    try:
        # ==================== 步骤1: 从本地文件加载关键词 ====================
        log("📥 步骤1: 从本地文件加载keywords...")
        keywords = load_keywords_from_file()

        root_num_distribution = {}
        for kw in keywords:
            num = kw['root_num']
            root_num_distribution[num] = root_num_distribution.get(num, 0) + 1

        log(f"  ✅ 成功获取 {len(keywords)} 条关键词记录")
        log(f"  📊 root-num分布: {root_num_distribution}")
        log("")

        # ==================== 步骤2: 找到root-num最小的行 ====================
        log("🔍 步骤2: 查找root-num最小的关键词...")
        min_keywords = find_min_root_num_keywords(keywords)
        if not min_keywords:
            log("  ❌ 没有找到关键词")
            return

        min_num = min_keywords[0]['root_num']
        log(f"  ✅ 找到 {len(min_keywords)} 条root-num={min_num} 的记录")

        selected_keyword = random.choice(min_keywords)
        log(f"  🎲 随机选中: {selected_keyword['keyword_raw']}")
        log(f"     当前root-num: {selected_keyword['root_num']}")
        log("")

        # 保存查询关键词到日志
        log_data['query_keyword'] = selected_keyword['keyword_raw']

        # ==================== 步骤3: 使用pytrends查询 ====================
        log("🔎 步骤3: 使用pytrends查询相关查询...")
        query_keyword = selected_keyword['keyword_raw']
        log(f"  🔍 查询关键词: {query_keyword}")
        log(f"  🌍 地区: {GEO}")
        log(f"  📅 时间范围: {TIMEFRAME}")

        related_queries = fetch_related_queries_with_retry(query_keyword, GEO, TIMEFRAME)

        if not related_queries:
            # Google查询失败，记录日志并退出
            log("  ❌ 未获取到相关查询")
            log(f"  📊 关键词: {query_keyword}")
            log(f"  🌍 地区: {GEO}")
            log(f"  📅 时间范围: {TIMEFRAME}")

            log_data['error'] = 'Google Trends query failed'
            log_data['success'] = False
            save_log_to_file(log_data)

            log("")
            log("=" * 80)
            log("⚠️  Google查询失败，已终止执行（未更新root-num）")
            log("=" * 80)
            return
        else:
            log(f"  ✅ 获取到 {len(related_queries)} 条相关查询")
            log_data['related_queries_count'] = len(related_queries)

            # 显示部分查询结果
            log("  📋 相关查询示例 (前5条):")
            for i, q in enumerate(related_queries[:5], 1):
                log(f"    {i}. {q.get('query', 'N/A')} (value: {q.get('value', 0)})")
            log("")

            # ==================== 步骤4: 筛选和提取 ====================
            log("🎯 步骤4: 筛选和提取新关键词...")
            log(f"  匹配前缀: {', '.join(KEYWORD_PREFIXES)}")
            log(f"  去除词: {', '.join(REMOVE_WORDS)}")

            extracted = filter_and_extract_queries(related_queries)
            log_data['extracted_count'] = len(extracted)

            if not extracted:
                log("  ⚠️  没有符合条件的关键词")
            else:
                log(f"  ✅ 提取到 {len(extracted)} 条新关键词")

                # 显示提取结果
                log("  📋 提取示例 (前5条):")
                for i, kw in enumerate(extracted[:5], 1):
                    log(f"    {i}. {kw['keyword_raw']}")
                    log(f"       → {kw['keyword']} (index: {kw['index']})")
                log("")

                # ==================== 步骤5: 去重 ====================
                log("🔄 步骤5: 去重并合并...")
                for kw in extracted:
                    kw['root_keyword'] = query_keyword
                    kw['root_num'] = 0

                merged_keywords = deduplicate_keywords(extracted, keywords)
                new_count = len(merged_keywords) - len(keywords)
                log_data['new_records'] = new_count
                log(f"  ✅ 去重后总记录数: {len(merged_keywords)}")
                log(f"  ➕ 新增记录: {new_count} 条")
                log("")

                keywords = merged_keywords

        # ==================== 步骤6: 更新被查询行的root-num ====================
        log("📝 步骤6: 更新被查询关键词的root-num...")
        for i, kw in enumerate(keywords):
            if (kw['root_keyword'] == selected_keyword['root_keyword'] and
                kw['keyword_raw'] == selected_keyword['keyword_raw']):
                old_num = keywords[i]['root_num']
                keywords[i]['root_num'] = old_num + 1
                log(f"  ✅ 更新: {kw['keyword_raw']}")
                log(f"     root-num: {old_num} → {old_num + 1}")
                break
        log("")

        # ==================== 步骤7: 保存到本地文件 ====================
        log("💾 步骤7: 保存关键词到本地文件...")
        try:
            save_keywords_to_file(keywords)
            log(f"  ✅ 成功保存到 {KEYWORDS_FILE}")
        except Exception as e:
            log(f"  ⚠️  保存失败: {e}")
        log("")

        log_data['total_records'] = len(keywords)
        log_data['success'] = True

        log("=" * 80)
        log("✅ 关键词挖掘完成!")
        log("=" * 80)
        log(f"📊 本次执行统计:")
        log(f"  - 查询关键词: {query_keyword}")
        if related_queries:
            log(f"  - 获取相关查询: {len(related_queries)} 条")
            log(f"  - 提取新关键词: {log_data['extracted_count']} 条")
            log(f"  - 新增记录: {log_data['new_records']} 条")
        log(f"  - 总记录数: {len(keywords)} 条")
        log("")

    except Exception as e:
        log(f"❌ 错误: {e}")
        log_data['error'] = str(e)
        import traceback
        traceback.print_exc()

    # 保存日志
    save_log_to_file(log_data)

    return log_data


# ==================== 定时执行模式 ====================
def run_scheduled(interval_minutes=60, max_iterations=-1):
    """
    定时执行模式

    Args:
        interval_minutes: 执行间隔（分钟）
        max_iterations: 最大执行次数，-1表示无限循环
    """
    log("=" * 80)
    log(f"定时执行模式启动")
    log(f"执行间隔: {interval_minutes} 分钟")
    log(f"最大执行次数: {'无限' if max_iterations == -1 else max_iterations}")
    log("=" * 80)
    log("")

    iteration = 0
    while max_iterations == -1 or iteration < max_iterations:
        iteration += 1
        log(f"🔄 开始第 {iteration} 次执行...")

        try:
            result = main()
        except Exception as e:
            log(f"❌ 执行出错: {e}")

        # 计算下次执行时间
        if max_iterations == -1 or iteration < max_iterations:
            next_run = datetime.now()
            next_run_time = next_run.strftime('%Y-%m-%d %H:%M:%S')
            log(f"⏰ 下次执行时间: {next_run_time}")
            log(f"⏳ 等待 {interval_minutes} 分钟...")
            log("")
            time.sleep(interval_minutes * 60)


if __name__ == '__main__':
    import sys

    # 检查命令行参数
    if len(sys.argv) > 1 and sys.argv[1] == '--schedule':
        # 定时执行模式
        interval = int(sys.argv[2]) if len(sys.argv) > 2 else 60
        max_iter = int(sys.argv[3]) if len(sys.argv) > 3 else -1
        run_scheduled(interval, max_iter)
    else:
        # 单次执行模式
        main()
