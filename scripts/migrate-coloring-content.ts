/**
 * 涂色内容迁移脚本
 * 将 coloring-pages 项目中的 MDX 内容文件迁移到模板项目
 */

import fs from 'fs';
import path from 'path';

// 源目录和目标目录
const SOURCE_DIR = path.resolve(__dirname, '../../coloring-pages/content');
const TARGET_DIR = path.resolve(__dirname, '../content/coloring');

/**
 * 递归复制目录
 */
function copyDirectory(src: string, dest: string) {
  // 创建目标目录
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  // 读取源目录
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      // 递归复制子目录
      copyDirectory(srcPath, destPath);
    } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.mdx'))) {
      // 只复制 MD 和 MDX 文件
      console.log(`Copying: ${entry.name}`);
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * 主函数
 */
function main() {
  console.log('开始迁移涂色内容文件...\n');

  // 检查源目录是否存在
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`源目录不存在: ${SOURCE_DIR}`);
    console.error('请确保 coloring-pages 项目在正确的位置');
    process.exit(1);
  }

  // 清理并创建目标目录
  if (fs.existsSync(TARGET_DIR)) {
    console.log(`清理目标目录: ${TARGET_DIR}`);
    fs.rmSync(TARGET_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TARGET_DIR, { recursive: true });

  // 统计信息
  let totalFiles = 0;
  let totalCategories = 0;

  // 读取所有分类目录
  const categories = fs.readdirSync(SOURCE_DIR, { withFileTypes: true });

  for (const category of categories) {
    if (category.isDirectory()) {
      const srcCategoryPath = path.join(SOURCE_DIR, category.name);
      const destCategoryPath = path.join(TARGET_DIR, category.name);

      // 复制分类目录
      copyDirectory(srcCategoryPath, destCategoryPath);

      // 统计文件数量
      const countFiles = (dir: string): number => {
        let count = 0;
        const files = fs.readdirSync(dir, { withFileTypes: true });
        for (const file of files) {
          if (file.isDirectory()) {
            count += countFiles(path.join(dir, file.name));
          } else if (file.isFile() && (file.name.endsWith('.md') || file.name.endsWith('.mdx'))) {
            count++;
          }
        }
        return count;
      };

      const fileCount = countFiles(destCategoryPath);
      console.log(`✓ ${category.name}: ${fileCount} 个文件`);
      totalCategories++;
      totalFiles += fileCount;
    }
  }

  console.log(`\n迁移完成！`);
  console.log(`- 总计 ${totalCategories} 个分类`);
  console.log(`- 总计 ${totalFiles} 个 MDX/MD 文件`);
  console.log(`\n目标目录: ${TARGET_DIR}`);
}

// 运行迁移
main();
