/**
 * Coloring pages management page
 * View and manage generated coloring pages
 */

import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { getTranslations } from 'next-intl/server';
import { getColoringPages, getColoringPagesCount, ColoringPageStatus } from '@/shared/models/coloring_page';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { FileImage, ExternalLink, Eye } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import Image from 'next/image';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    page?: string;
    status?: string;
    tab?: string;
    category?: string;
    jobId?: string;
  }>;
}

// Server action to update page status
async function updatePageStatus(pageId: string, status: string) {
  'use server';
  const { requirePermission } = await import('@/core/rbac');
  const { updateColoringPage } = await import('@/shared/models/coloring_page');

  await requirePermission({
    code: PERMISSIONS.COLORING_PAGES_WRITE,
  });

  await updateColoringPage(pageId, { status: status as any });
  revalidatePath('/admin/coloring/pages');
}

// Server action to delete page
async function deletePage(pageId: string) {
  'use server';
  const { requirePermission } = await import('@/core/rbac');
  const { deleteColoringPage } = await import('@/shared/models/coloring_page');

  await requirePermission({
    code: PERMISSIONS.COLORING_PAGES_DELETE,
  });

  await deleteColoringPage(pageId);
  revalidatePath('/admin/coloring/pages');
}

export default async function AdminColoringPagesPage({
  params,
  searchParams,
}: PageProps) {
  const { locale } = await params;
  const { page: searchPage, status: searchStatus, tab: searchTab, category: searchCategory, jobId: searchJobId } = await searchParams;

  await requirePermission({
    code: PERMISSIONS.COLORING_PAGES_READ,
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const t = await getTranslations('admin.coloring.pages');
  const tCommon = await getTranslations('admin.coloring.common');

  const page = parseInt(searchPage || '1');
  const limit = 20;
  const status = searchStatus;
  const tab = searchTab || 'all';
  const category = searchCategory;
  const jobId = searchJobId;

  // Determine status filter based on tab
  const statusFilter =
    tab === 'all' ? undefined : (tab === 'archived' ? ColoringPageStatus.ARCHIVED : (tab as ColoringPageStatus));

  // Fetch pages
  const pages = await getColoringPages({
    page,
    limit,
    status: statusFilter as any,
    category,
    jobId,
  });

  const totalCount = await getColoringPagesCount({
    status: statusFilter as any,
    category,
    jobId,
  });

  // Get all counts for tabs
  const [allCount, publishedCount, draftCount, archivedCount] =
    await Promise.all([
      getColoringPagesCount(),
      getColoringPagesCount({ status: ColoringPageStatus.PUBLISHED }),
      getColoringPagesCount({ status: ColoringPageStatus.DRAFT }),
      getColoringPagesCount({ status: ColoringPageStatus.ARCHIVED }),
    ]);

  const crumbs = [
    { title: t('list.crumbs.title'), href: '/admin' },
    { title: t('list.crumb.title'), href: '/admin/coloring' },
    { title: t('list.title'), href: '/admin/coloring/pages' },
  ];

  // Status badge variant
  function getStatusVariant(status: string): 'default' | 'secondary' | 'outline' {
    switch (status) {
      case ColoringPageStatus.PUBLISHED:
        return 'default';
      case ColoringPageStatus.DRAFT:
        return 'secondary';
      case ColoringPageStatus.ARCHIVED:
        return 'outline';
      default:
        return 'outline';
    }
  }

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t('list.title')} />

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{allCount}</div>
              <div className="text-xs text-muted-foreground">{t('stats.total')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{publishedCount}</div>
              <div className="text-xs text-muted-foreground">{t('stats.published')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-600">{draftCount}</div>
              <div className="text-xs text-muted-foreground">{t('stats.draft')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{archivedCount}</div>
              <div className="text-xs text-muted-foreground">{t('stats.archived')}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs and Filters */}
        <Tabs defaultValue={tab} className="mb-6">
          <TabsList>
            <TabsTrigger value="all" asChild>
              <Link href="/admin/coloring/pages?tab=all">
                All ({allCount})
              </Link>
            </TabsTrigger>
            <TabsTrigger value="published" asChild>
              <Link href="/admin/coloring/pages?tab=published">
                Published ({publishedCount})
              </Link>
            </TabsTrigger>
            <TabsTrigger value="draft" asChild>
              <Link href="/admin/coloring/pages?tab=draft">
                Draft ({draftCount})
              </Link>
            </TabsTrigger>
            <TabsTrigger value="archived" asChild>
              <Link href="/admin/coloring/pages?tab=archived">
                Archived ({archivedCount})
              </Link>
            </TabsTrigger>
          </TabsList>
          <TabsContent value={tab}>
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-4">
                  <Input
                    placeholder={t('filters.search')}
                    className="w-[250px]"
                  />
                  <Select>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder={t('filters.category')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="animals">Animals</SelectItem>
                      <SelectItem value="nature">Nature</SelectItem>
                      <SelectItem value="vehicles">Vehicles</SelectItem>
                      <SelectItem value="food">Food</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder={t('filters.locale')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locales</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="zh">中文</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Pages Grid */}
            <Card>
              <CardContent className="p-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {pages.map((page) => (
                    <div
                      key={page.id}
                      className="group relative overflow-hidden rounded-lg border bg-card"
                    >
                      {/* Image Preview */}
                      <div className="relative aspect-square bg-muted">
                        {page.imageUrl ? (
                          <Image
                            src={page.imageUrl}
                            alt={page.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <FileImage className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                        {/* Status Badge */}
                        <div className="absolute top-2 right-2">
                          <Badge variant={getStatusVariant(page.status)}>
                            {t(`status.${page.status}`)}
                          </Badge>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4 space-y-2">
                        <div>
                          <div className="font-medium truncate">{page.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {page.slug}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline">{page.category}</Badge>
                        </div>

                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1" asChild>
                            <Link href={`/coloring-pages/${page.slug}`}>
                              <Eye className="mr-1 h-3 w-3" />
                              {t('actions.view')}
                            </Link>
                          </Button>
                          {page.status === 'draft' && (
                            <form action={async () => {
                              'use server';
                              await updatePageStatus(page.id, ColoringPageStatus.PUBLISHED);
                            }}>
                              <button
                                type="submit"
                                className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground hover:bg-primary/90"
                              >
                                {t('actions.publish')}
                              </button>
                            </form>
                          )}
                          {page.status === 'published' && (
                            <form action={async () => {
                              'use server';
                              await updatePageStatus(page.id, ColoringPageStatus.DRAFT);
                            }}>
                              <button
                                type="submit"
                                className="rounded-md border px-3 py-1 text-sm hover:bg-accent"
                              >
                                {t('actions.unpublish')}
                              </button>
                            </form>
                          )}
                          <form action={async () => {
                            'use server';
                            await deletePage(page.id);
                          }}>
                            <button
                              type="submit"
                              className="rounded-md border border-destructive px-3 py-1 text-sm text-destructive hover:bg-destructive/10"
                            >
                              {t('actions.delete')}
                            </button>
                          </form>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {pages.length === 0 && (
                  <div className="py-12 text-center text-muted-foreground">
                    {tCommon('noData')}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                {page > 1 && (
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={`/admin/coloring/pages?tab=${tab}&page=${page - 1}`}
                    >
                      Previous
                    </Link>
                  </Button>
                )}
                <div className="flex items-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <Button
                      key={pageNum}
                      variant={pageNum === page ? 'default' : 'outline'}
                      size="sm"
                      asChild
                    >
                      <Link
                        href={`/admin/coloring/pages?tab=${tab}&page=${pageNum}`}
                      >
                        {pageNum}
                      </Link>
                    </Button>
                  ))}
                </div>
                {page < totalPages && (
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={`/admin/coloring/pages?tab=${tab}&page=${page + 1}`}
                    >
                      Next
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Main>
    </>
  );
}
