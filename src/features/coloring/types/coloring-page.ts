/**
 * 涂色页数据结构定义
 * 基于 PRD 和 design.md 中的规范
 */

// 单个涂色页的完整数据结构
export interface ColoringPage {
  /** URL slug，例如 "bunny" 会生成 /bunny-coloring-page/ */
  slug: string;

  /** 页面标题，例如 "Bunny" */
  title: string;

  /** 一级分类，例如 "animals" */
  category: string;

  /** 二级分类/主题，例如 "bunny" */
  subCategory: string;

  /** 图片资源 */
  image: {
    /** PNG 图片路径，用于网页展示 */
    png: string;
    /** PDF 文件路径，用于打印下载 */
    pdf: string;
  };

  /** SEO 关键词列表 */
  keywords: string[];

  /** 相关涂色页的 slug 列表（6-12 个） */
  related: string[];

  /** 简短描述（2-3 行，≤150 字） */
  description: string;

  /** HTML/Markdown 格式的富文本内容 */
  content?: string;

  /** 作者名称 */
  author?: string;

  /** 发布日期 (ISO string) */
  publishDate?: string;
}

// 分类数据结构
export interface Category {
  /** 分类 slug，例如 "animals" */
  slug: string;

  /** 分类显示名称，例如 "Animals" */
  name: string;

  /** 分类图标 (emoji) */
  icon?: string;

  /** 分类封面图 */
  imageSrc?: string;

  /** 预览关键词，例如 "Bunny, Cat, Dog & More" */
  preview?: string;

  /** 分类描述 */
  description: string;

  /** 该分类下的涂色页数量 */
  count: number;

  /** 子分类列表 */
  subCategories?: SubCategory[];
}

// 子分类（二级分类）数据结构
export interface SubCategory {
  /** 子分类 slug，例如 "bunny" */
  slug: string;

  /** 子分类显示名称，例如 "Bunny" */
  name: string;

  /** 子分类描述 */
  description: string;

  /** 该子分类下的涂色页数量 */
  count: number;
}

// 用于卡片展示的简化涂色页数据
export interface ColoringCardData {
  title: string;
  slug: string;
  imageSrc: string;
}

// 相关涂色页数据
export interface RelatedItem {
  title: string;
  slug: string;
  imageSrc: string;
}
