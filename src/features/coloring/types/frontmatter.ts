/**
 * Frontmatter 类型定义
 * 用于 Markdown/MDX 文件的 frontmatter 数据结构
 * 基于 page-plan.md 规范
 */

import type { ImageMeta } from "./seo";

/**
 * 难度级别枚举
 */
export type DifficultyLevel = "easy" | "medium" | "hard" | "advanced";

/**
 * 年龄分组枚举
 */
export type AgeGroup = "toddlers" | "preschool" | "kids" | "adults";

/**
 * MDX Frontmatter 类型
 * 对应 content 目录下的 .md 文件的 frontmatter
 */
export interface Frontmatter {
  /** 页面标题，以 "Free Printable..." 开头 */
  title: string;

  /** URL slug，全小写，以 -coloring-pages 结尾 */
  slug: string;

  /** SEO 描述，150-160 字 */
  description: string;

  /** 主分类数组，如 ["animals", "nature"] */
  categories: string[];

  /** 标签数组，用于虚拟分类 */
  tags: string[];

  /** 难度级别 */
  difficulty: DifficultyLevel;

  /** 年龄分组 */
  ageGroup: AgeGroup;

  /** 图片对象（含 src/alt/width/height） */
  image: ImageMeta;

  /** 是否为高危 IP（true 则自动 noindex） */
  is_high_risk?: boolean;

  /** 规范 URL */
  canonical?: string;

  /** 原 IP 名称（仅用于内部管理，IP 类内容） */
  original_ip?: string;

  /** 发布日期 (ISO string) */
  publishDate?: string;

  /** 作者名称 */
  author?: string;
}
