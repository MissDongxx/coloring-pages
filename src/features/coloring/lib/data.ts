import type { ColoringPage, Category, ColoringCardData } from "@/features/coloring/types/coloring-page";
import pagesData from "@/data/coloring/pages/all-pages.json";

// 类型断言 - 确保数据正确导入
const allPages: ColoringPage[] = Array.isArray(pagesData) ? pagesData as ColoringPage[] : [];

/**
 * 获取所有涂色页数据
 */
export function getAllPages(): ColoringPage[] {
  return allPages;
}

/**
 * 根据 slug 获取单个涂色页
 */
export function getPageBySlug(slug: string): ColoringPage | undefined {
  return allPages.find((page) => page.slug === slug);
}

/**
 * 动态生成分类数据 - 根据涂色页自动生成
 * 规则：
 * 1. 从涂色页的 category 字段提取所有主分类
 * 2. 从涂色页的 subCategory 字段提取所有子分类
 * 3. 自动计算每个分类下的涂色页数量
 */
export function getAllCategories(): Category[] {
  // 按主分类分组涂色页
  const categoryMap = new Map<string, ColoringPage[]>();
  const subCategoryMap = new Map<string, { category: string; pages: ColoringPage[] }>();

  for (const page of allPages) {
    // 按主分类分组
    if (!categoryMap.has(page.category)) {
      categoryMap.set(page.category, []);
    }
    categoryMap.get(page.category)!.push(page);

    // 按子分类分组
    const subKey = `${page.category}:${page.subCategory}`;
    if (!subCategoryMap.has(subKey)) {
      subCategoryMap.set(subKey, { category: page.category, pages: [] });
    }
    subCategoryMap.get(subKey)!.pages.push(page);
  }

  // 获取默认图标和描述
  const defaultIcons: Record<string, string> = {
    animals: "🐾",
    nature: "🌸",
    vehicles: "🚗",
    fantasy: "🦄",
    holidays: "🎄",
    food: "🍎",
    sports: "⚽",
    characters: "👧",
    objects: "📦",
    buildings: "🏠",
    zodiac: "♈",
    mythical: "🐉",
    advanced: "🎨",
    complexity: "🔷",
    ip: "©",
    architecture: "🏛️",
    biomechanical: "🤖",
    micro: "🔬",
    cyberpunk: "🌆",
    music: "🎵",
    mandala: "☸️",
    items: "🎁",
    space: "🚀",
    fruits: "🍇",
    surrealism: "🌀",
    extreme: "💀",
    textile: "🧵",
    mythology: "🏺",
    profession: "👨‍⚕️",
    seasons: "🍂",
    steampunk: "⚙️",
    pattern: "🔲",
  };

  // 生成分类数据
  const categories: Category[] = [];
  for (const [slug, pages] of categoryMap) {
    // 获取该分类下的所有子分类
    const subCategories = [...subCategoryMap.entries()]
      .filter(([_, data]) => data.category === slug)
      .map(([subKey, data]) => {
        const subSlug = subKey.split(":")[1];
        return {
          slug: subSlug,
          name: formatName(subSlug),
          description: `${formatName(subSlug)} coloring pages.`,
          count: data.pages.length,
        };
      })
      .sort((a, b) => b.count - a.count);

    // 获取该分类的第一个涂色页作为封面图
    const firstPage = pages[0];

    categories.push({
      slug,
      name: formatName(slug),
      icon: defaultIcons[slug.toLowerCase()] || "📄",
      imageSrc: firstPage?.image.png || "",
      preview: subCategories.slice(0, 3).map(s => s.name).join(", ") + (subCategories.length > 3 ? " & More" : ""),
      description: `Explore our collection of ${formatName(slug).toLowerCase()} coloring pages.`,
      count: pages.length,
      subCategories,
    });
  }

  // 按涂色页数量降序排序
  return categories.sort((a, b) => b.count - a.count);
}

/**
 * 格式化名称：将 slug 转换为显示名称
 */
function formatName(slug: string): string {
  return slug
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * 根据 slug 获取单个分类
 */
export function getCategoryBySlug(slug: string): Category | undefined {
  const categories = getAllCategories();
  return categories.find((cat) => cat.slug === slug);
}

/**
 * 获取分类下的所有涂色页
 */
export function getPagesByCategory(category: string): ColoringPage[] {
  return allPages.filter((page) => page.category === category);
}

/**
 * 获取子分类下的所有涂色页
 */
export function getPagesBySubCategory(category: string, subCategory: string): ColoringPage[] {
  return allPages.filter(
    (page) => page.category === category && page.subCategory === subCategory
  );
}

/**
 * 获取相关涂色页数据
 */
export function getRelatedPages(slugs: string[]): ColoringCardData[] {
  return slugs
    .map((slug) => {
      const page = getPageBySlug(slug);
      if (!page) {
        // 返回占位数据
        return {
          title: slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
          slug,
          imageSrc: "/images/coloring/placeholder.png",
        };
      }
      return {
        title: page.title,
        slug: page.slug,
        imageSrc: page.image.png,
      };
    })
    .slice(0, 8);
}

/**
 * 获取所有涂色页的 slug 列表（用于 generateStaticParams）
 */
export function getAllPageSlugs(): string[] {
  return allPages.map((page) => page.slug);
}

/**
 * 获取热门涂色页（用于首页展示）
 * 返回有实际内容的页面作为热门页面
 */
export function getPopularPages(limit: number = 8): ColoringCardData[] {
  return allPages.slice(0, limit).map((page) => ({
    title: page.title,
    slug: page.slug,
    imageSrc: page.image.png,
  }));
}

/**
 * 根据当前页面获取相关推荐页面
 * 优先推荐同分类、同子分类的页面
 */
export function getRecommendedPages(currentSlug: string, category: string, subCategory?: string, limit: number = 6): ColoringCardData[] {
  // 排除当前页面
  const otherPages = allPages.filter((page) => page.slug !== currentSlug);

  // 1. 优先推荐同子分类的页面
  let recommended = otherPages.filter((page) =>
    page.category === category && (subCategory ? page.subCategory === subCategory : true)
  );

  // 2. 如果同子分类的页面不够，补充同分类的其他页面
  if (recommended.length < limit) {
    const sameCategoryPages = otherPages.filter((page) => page.category === category);
    for (const page of sameCategoryPages) {
      if (!recommended.find((r) => r.slug === page.slug)) {
        recommended.push(page);
      }
    }
  }

  // 3. 如果还不够，从热门页面中补充
  if (recommended.length < limit) {
    const popularPages = getPopularPages(limit * 2);
    for (const page of allPages) {
      if (recommended.length >= limit) break;
      if (!recommended.find((r) => r.slug === page.slug)) {
        recommended.push(page);
      }
    }
  }

  return recommended.slice(0, limit).map((page) => ({
    title: page.title,
    slug: page.slug,
    imageSrc: page.image.png,
  }));
}
