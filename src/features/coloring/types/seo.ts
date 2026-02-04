/**
 * SEO 相关类型定义
 * 基于 page-plan.md 规范
 */

/**
 * 图片元数据类型
 */
export interface ImageMeta {
  /** 图片路径 */
  src: string;

  /** Alt 文本（50-100 字符，SEO 优化） */
  alt: string;

  /** 图片宽度 */
  width: number;

  /** 图片高度 */
  height: number;
}

/**
 * SEO 数据类型
 */
export interface SEOData {
  /** 页面标题 */
  title: string;

  /** SEO 描述（150-160 字） */
  description: string;

  /** 规范 URL */
  canonical: string;

  /** Open Graph 图片 */
  openGraph?: {
    url: string;
    width: number;
    height: number;
    alt: string;
  };
}
