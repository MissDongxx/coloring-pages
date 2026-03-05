import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export interface MdxPage {
  title: string;
  description: string;
  content: string;
  created_at?: string;
}

/**
 * Read MDX file from content/pages directory
 * @param slug - The slug of the page (e.g., 'privacy-policy')
 * @param locale - The locale (e.g., 'en', 'zh')
 * @returns The parsed MDX page data or null if not found
 */
export async function getMdxPage({
  slug,
  locale,
}: {
  slug: string;
  locale: string;
}): Promise<MdxPage | null> {
  try {
    // Try locale-specific file first (e.g., privacy-policy.zh.mdx)
    const localeFilePath = path.join(
      process.cwd(),
      'content',
      'pages',
      `${slug}.${locale}.mdx`
    );

    // Then try default file (e.g., privacy-policy.mdx)
    const defaultFilePath = path.join(
      process.cwd(),
      'content',
      'pages',
      `${slug}.mdx`
    );

    let filePath = localeFilePath;
    if (!fs.existsSync(filePath)) {
      filePath = defaultFilePath;
    }

    if (!fs.existsSync(filePath)) {
      return null;
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(fileContent);

    return {
      title: data.title || slug,
      description: data.description || '',
      content,
      created_at: data.created_at || data.date || undefined,
    };
  } catch (error) {
    console.error(`Error reading MDX file for ${slug}:`, error);
    return null;
  }
}
