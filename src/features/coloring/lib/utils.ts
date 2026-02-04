import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * 合并 Tailwind CSS 类名的工具函数
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 获取图片代理 URL（用于处理 CORS 问题）
 */
export function getProxyUrl(url: string): string {
  // 如果是本地路径，直接返回
  if (url.startsWith("/") && !url.startsWith("//")) {
    return url;
  }
  // 否则通过 API 代理
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}

/**
 * 生成存储键（用于 localStorage）
 */
export function getStorageKey(imageSrc: string): string {
  return `coloring-canvas-${imageSrc.split("/").pop()}`;
}

/**
 * HEX 转 RGB
 */
export function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}
