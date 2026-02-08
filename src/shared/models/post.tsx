import { and, count, desc, eq, like } from 'drizzle-orm';

import { getPostDate } from '@/shared/lib/dayjs';

import { db } from '@/core/db';
import { post } from '@/config/db/schema';
import { MarkdownContent } from '@/shared/blocks/common/markdown-content';
import {
  Category as BlogCategoryType,
  Post as BlogPostType,
} from '@/shared/types/blocks/blog';

import { getTaxonomies, TaxonomyStatus, TaxonomyType } from './taxonomy';

export type Post = typeof post.$inferSelect;
export type NewPost = typeof post.$inferInsert;
export type UpdatePost = Partial<Omit<NewPost, 'id' | 'createdAt'>>;

export enum PostType {
  ARTICLE = 'article',
  PAGE = 'page',
  LOG = 'log',
}

export enum PostStatus {
  PUBLISHED = 'published', // published and visible to the public
  PENDING = 'pending', // pending review by admin
  DRAFT = 'draft', // draft and not visible to the public
  ARCHIVED = 'archived', // archived means deleted
}

export async function addPost(data: NewPost) {
  const [result] = await db().insert(post).values(data).returning();

  return result;
}

export async function updatePost(id: string, data: UpdatePost) {
  const [result] = await db()
    .update(post)
    .set(data)
    .where(eq(post.id, id))
    .returning();

  return result;
}

export async function deletePost(id: string) {
  const result = await updatePost(id, {
    status: PostStatus.ARCHIVED,
  });

  return result;
}

export async function findPost({
  id,
  slug,
  status,
}: {
  id?: string;
  slug?: string;
  status?: PostStatus;
}) {
  const [result] = await db()
    .select()
    .from(post)
    .where(
      and(
        id ? eq(post.id, id) : undefined,
        slug ? eq(post.slug, slug) : undefined,
        status ? eq(post.status, status) : undefined
      )
    )
    .limit(1);

  return result;
}

export async function getPosts({
  type,
  status,
  category,
  tag,
  page = 1,
  limit = 30,
}: {
  type?: PostType;
  status?: PostStatus;
  category?: string;
  tag?: string[];
  page?: number;
  limit?: number;
} = {}): Promise<Post[]> {
  const result = await db()
    .select()
    .from(post)
    .where(
      and(
        type ? eq(post.type, type) : undefined,
        status ? eq(post.status, status) : undefined,
        category ? like(post.categories, `%${category}%`) : undefined,
        tag ? like(post.tags, `%${tag}%`) : undefined
      )
    )
    .orderBy(desc(post.updatedAt), desc(post.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  return result;
}

export async function getPostsCount({
  type,
  status,
  category,
  tag,
}: {
  type?: PostType;
  status?: PostStatus;
  category?: string;
  tag?: string;
} = {}): Promise<number> {
  const [result] = await db()
    .select({ count: count() })
    .from(post)
    .where(
      and(
        type ? eq(post.type, type) : undefined,
        status ? eq(post.status, status) : undefined,
        category ? like(post.categories, `%${category}%`) : undefined,
        tag ? like(post.tags, `%${tag}%`) : undefined
      )
    )
    .limit(1);

  return result?.count || 0;
}

// get single post from database
export async function getPost({
  slug,
  locale,
  postPrefix = '/blog/',
}: {
  slug: string;
  locale: string;
  postPrefix?: string;
}): Promise<BlogPostType | null> {
  let post: BlogPostType | null = null;

  try {
    // get post from database
    const postData = await findPost({ slug, status: PostStatus.PUBLISHED });
    if (postData) {
      // post exist in database
      const content = postData.content || '';

      // Convert markdown content to MarkdownContent component
      const body = content ? <MarkdownContent content={content} /> : undefined;

      // Generate TOC from content - Disabled/Removed
      const toc: any[] = []; 

      post = {
        id: postData.id,
        slug: postData.slug,
        title: postData.title || '',
        description: postData.description || '',
        content: '',
        body: body,
        toc: toc,
        created_at:
          getPostDate({
            created_at: postData.createdAt.toISOString(),
            locale,
          }) || '',
        author_name: postData.authorName || '',
        author_image: postData.authorImage || '',
        author_role: '',
        url: `${postPrefix}${postData.slug}`,
      };

      return post;
    }
  } catch (e) {
    console.log('get post from database failed:', e);
  }

  return null;
}

// Placeholder: getLocalPost now returns null
export async function getLocalPost({
  slug,
  locale,
  postPrefix = '/blog/',
}: {
  slug: string;
  locale: string;
  postPrefix?: string;
}): Promise<BlogPostType | null> {
  return null;
}

// Placeholder: getLocalPage now returns null
export async function getLocalPage({
  slug,
  locale,
}: {
  slug: string;
  locale: string;
}): Promise<BlogPostType | null> {
  return null;
}

// get posts and categories, only from database
export async function getPostsAndCategories({
  page = 1,
  limit = 30,
  locale,
  postPrefix = '/blog/',
  categoryPrefix = '/blog/category/',
}: {
  page?: number;
  limit?: number;
  locale: string;
  postPrefix?: string;
  categoryPrefix?: string;
}) {
  // get remote posts only
  const {
    posts: remotePosts,
    postsCount: remotePostsCount,
    categories: remoteCategories,
    categoriesCount: remoteCategoriesCount,
  } = await getRemotePostsAndCategories({
    page,
    limit,
    locale,
    postPrefix,
    categoryPrefix,
  });

  return {
    posts: remotePosts,
    postsCount: remotePostsCount,
    categories: remoteCategories,
    categoriesCount: remoteCategoriesCount,
  };
}

// get remote posts and categories
export async function getRemotePostsAndCategories({
  page = 1,
  limit = 30,
  locale,
  postPrefix = '/blog/',
  categoryPrefix = '/blog/category/',
}: {
  page?: number;
  limit?: number;
  locale: string;
  postPrefix?: string;
  categoryPrefix?: string;
}) {
  const dbPostsList: BlogPostType[] = [];
  const dbCategoriesList: BlogCategoryType[] = [];

  try {
    // get posts from database
    const dbPosts = await getPosts({
      type: PostType.ARTICLE,
      status: PostStatus.PUBLISHED,
      page,
      limit,
    });

    if (!dbPosts || dbPosts.length === 0) {
      return {
        posts: [],
        postsCount: 0,
        categories: [],
        categoriesCount: 0,
      };
    }

    dbPostsList.push(
      ...dbPosts.map((post) => ({
        id: post.id,
        slug: post.slug,
        title: post.title || '',
        description: post.description || '',
        author_name: post.authorName || '',
        author_image: post.authorImage || '',
        created_at:
          getPostDate({
            created_at: post.createdAt.toISOString(),
            locale,
          }) || '',
        image: post.image || '',
        url: `${postPrefix}${post.slug}`,
      }))
    );

    // get categories from database
    const dbCategories = await getTaxonomies({
      type: TaxonomyType.CATEGORY,
      status: TaxonomyStatus.PUBLISHED,
    });

    dbCategoriesList.push(
      ...(dbCategories || []).map((category) => ({
        id: category.id,
        slug: category.slug,
        title: category.title,
        url: `${categoryPrefix}${category.slug}`,
      }))
    );
  } catch (e) {
    console.log('get remote posts and categories failed:', e);
  }

  return {
    posts: dbPostsList,
    postsCount: dbPostsList.length,
    categories: dbCategoriesList,
    categoriesCount: dbCategoriesList.length,
  };
}

// Placeholder for getLocalPostsAndCategories
export async function getLocalPostsAndCategories({
  locale,
  postPrefix = '/blog/',
  categoryPrefix = '/blog/category/',
  type = PostType.ARTICLE,
}: {
  locale: string;
  postPrefix?: string;
  categoryPrefix?: string;
  type?: PostType;
}): Promise<{
  posts: BlogPostType[];
  postsCount: number;
  categories: BlogCategoryType[];
  categoriesCount: number;
}> {
  return {
    posts: [],
    postsCount: 0,
    categories: [],
    categoriesCount: 0,
  };
}

export function getPostSlug({
  url,
  locale,
  prefix = '/blog/',
}: {
  url: string; 
  locale: string; 
  prefix?: string; 
}): string {
  if (url.startsWith(prefix)) {
    return url.replace(prefix, '');
  } else if (url.startsWith(`/${locale}${prefix}`)) {
    return url.replace(`/${locale}${prefix}`, '');
  }

  return url;
}

export { getPostDate } from '@/shared/lib/dayjs';

export function removePostFrontmatter(content: string): string {
  const frontmatterRegex = /^---\r?\n[\s\S]*?\r?\n---\r?\n/;
  return content.replace(frontmatterRegex, '').trim();
}
