import { envConfigs } from '@/config';

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
        urlTemplate: `${url}/themes?q={search_term_string}`
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
