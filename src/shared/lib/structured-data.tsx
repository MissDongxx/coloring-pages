import { envConfigs } from '@/config';
import { joinUrl } from './utils';

interface WebSiteSchema {
  name: string;
  url: string;
  description: string;
}

interface CollectionPageSchema {
  name: string;
  description: string;
  url: string;
  numberOfItems: number;
}

interface BreadcrumbItem {
  name: string;
  item: string;
}

interface FAQItem {
  question: string;
  answer: string;
}

interface ItemListItem {
  name: string;
  url: string;
  image?: string;
  description?: string;
}

interface ImageObjectSchema {
  name: string;
  description: string;
  url: string;
  thumbnailUrl: string;
  uploadDate?: string;
  author?: string;
  keywords?: string[];
  category?: string;
}

interface CategoryPageSchema extends CollectionPageSchema {
  categoryName: string;
  items: ItemListItem[];
}

/**
 * Generate WebSite Schema for search engines
 * Helps with site search box in search results
 */
export function generateWebSiteSchema({ name, url, description }: WebSiteSchema) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: name,
    url: url,
    description: description,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: joinUrl(url, 'themes?q={search_term_string}')
      },
      'query-input': 'required name=search_term_string'
    }
  };
}

/**
 * Generate CollectionPage Schema for the homepage
 * Describes the coloring pages collection
 */
export function generateCollectionPageSchema({
  name,
  description,
  url,
  numberOfItems
}: CollectionPageSchema) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: name,
    description: description,
    url: url,
    about: {
      '@type': 'Thing',
      name: 'Coloring Pages'
    },
    audience: [
      { '@type': 'PeopleAudience', name: 'Children' },
      { '@type': 'PeopleAudience', name: 'Adults' },
      { '@type': 'PeopleAudience', name: 'Teachers' },
      { '@type': 'PeopleAudience', name: 'Parents' }
    ],
    numberOfItems: numberOfItems,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: numberOfItems,
      itemListElement: []
    }
  };
}

/**
 * Generate BreadcrumbList Schema
 * Helps display breadcrumb navigation in search results
 */
export function generateBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.item
    }))
  };
}

/**
 * Generate FAQPage Schema
 * Helps display FAQ in search results
 */
export function generateFAQSchema(faqs: FAQItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  };
}

/**
 * JSON-LD Script component for React
 * Injects structured data into the page head
 */
export function JSONLDScript({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data)
      }}
    />
  );
}

/**
 * Generate ItemList Schema for category/theme pages
 * Lists items with their URLs and optional images
 */
export function generateItemListSchema({
  name,
  description,
  url,
  items
}: {
  name: string;
  description: string;
  url: string;
  items: ItemListItem[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: name,
    description: description,
    url: url,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: item.url.startsWith('http') ? item.url : joinUrl(url, item.url),
      ...(item.image && { image: item.image }),
      ...(item.description && { description: item.description })
    }))
  };
}

/**
 * Generate ImageObject Schema for individual coloring pages
 * Describes the image content, keywords, and category
 */
export function generateImageObjectSchema({
  name,
  description,
  url,
  thumbnailUrl,
  author,
  keywords,
  category
}: ImageObjectSchema) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    name: name,
    description: description,
    contentUrl: url,
    thumbnailUrl: thumbnailUrl,
    ...(author && { author: { '@type': 'Person', name: author } }),
    ...(keywords && { keywords: keywords.join(', ') }),
    ...(category && {
      about: {
        '@type': 'Thing',
        name: category
      }
    }),
    audience: [
      { '@type': 'PeopleAudience', name: 'Children' },
      { '@type': 'PeopleAudience', name: 'Adults' },
      { '@type': 'PeopleAudience', name: 'Teachers' },
      { '@type': 'PeopleAudience', name: 'Parents' }
    ],
    educationalLevel: 'Beginner',
    learningResourceType: 'Coloring Page'
  };
}

/**
 * Generate CategoryPage Schema with items
 * Combines CollectionPage with ItemList for category pages
 */
export function generateCategoryPageSchema({
  name,
  description,
  url,
  numberOfItems,
  categoryName,
  items
}: CategoryPageSchema) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: name,
    description: description,
    url: url,
    about: {
      '@type': 'Thing',
      name: categoryName
    },
    audience: [
      { '@type': 'PeopleAudience', name: 'Children' },
      { '@type': 'PeopleAudience', name: 'Adults' },
      { '@type': 'PeopleAudience', name: 'Teachers' },
      { '@type': 'PeopleAudience', name: 'Parents' }
    ],
    numberOfItems: numberOfItems,
    mainEntity: {
      '@type': 'ItemList',
      name: `${categoryName} Coloring Pages`,
      numberOfItems: items.length,
      itemListElement: items.slice(0, 20).map((item, index) => ({ // Limit to 20 for schema
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        url: item.url.startsWith('http') ? item.url : joinUrl(url, item.url),
        ...(item.image && { image: item.image })
      }))
    }
  };
}
