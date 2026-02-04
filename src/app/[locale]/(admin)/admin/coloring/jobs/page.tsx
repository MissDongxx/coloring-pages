/**
 * Coloring jobs list page
 * Lists all workflow jobs with filtering
 */

import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { getTranslations } from 'next-intl/server';
import {
  getColoringJobs,
  getColoringJobsCount,
} from '@/shared/models/coloring_job';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { ListTodo, Clock, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: { locale: string };
  searchParams: {
    page?: string;
    status?: string;
    tab?: string;
  };
}

export default async AdminColoringJobsPage({
  params,
  searchParams,
}: PageProps) {
  await requirePermission({
    code: PERMISSIONS.COLORING_JOBS_READ,
    redirectUrl: '/admin/no-permission',
    locale: params.locale,
  });

  const t = await getTranslations('admin.coloring.jobs');
  const tCommon = await getTranslations('admin.coloring.common');

  const page = parseInt(searchParams.page || '1');
  const limit = 20;
  const status = searchParams.status;
  const tab = searchParams.tab || 'all';

  // Determine status filter based on tab
  const statusFilter =
    tab === 'all' ? undefined : (tab === 'failed' ? 'failed' : tab);

  // Fetch jobs
  const jobs = await getColoringJobs({
    page,
    limit,
    status: statusFilter as any,
  });

  const totalCount = await getColoringJobsCount({
    status: statusFilter as any,
  });

  // Get all counts for tabs
  const [allCount, processingCount, completedCount, failedCount] =
    await Promise.all([
      getColoringJobsCount(),
      getColoringJobsCount({ status: 'processing' }),
      getColoringJobsCount({ status: 'completed' }),
      getColoringJobsCount({ status: 'failed' }),
    ]);

  const crumbs = [
    { title: t('list.crumbs.title'), href: '/admin' },
    { title: t('list.crumbs.crumb.title'), href: '/admin/coloring' },
    { title: t('list.title'), href: '/admin/coloring/jobs' },
  ];

  // Status badge variant
  function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
    switch (status) {
      case 'completed':
        return 'default';
      case 'processing':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  }

  // Status icon
  function getStatusIcon(status: string) {
    switch (status) {
      case 'processing':
        return <Clock className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'failed':
        return <XCircle className="h-4 w-4" />;
      default:
        return <ListTodo className="h-4 w-4" />;
    }
  }

  // Format duration
  function formatDuration(job: any): string {
    if (!job.completedAt || !job.startedAt) return '-';
    const start = new Date(job.startedAt).getTime();
    const end = new Date(job.completedAt).getTime();
    const diff = (end - start) / 1000;
    if (diff < 60) return `${Math.round(diff)}s`;
    return `${Math.round(diff / 60)}m`;
  }

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t('list.title')} />

        {/* Tabs */}
        <Tabs defaultValue={tab} className="mb-6">
          <TabsList>
            <TabsTrigger value="all" asChild>
              <Link href="/admin/coloring/jobs?tab=all">
                All ({allCount})
              </Link>
            </TabsTrigger>
            <TabsTrigger value="processing" asChild>
              <Link href="/admin/coloring/jobs?tab=processing">
                Processing ({processingCount})
              </Link>
            </TabsTrigger>
            <TabsTrigger value="completed" asChild>
              <Link href="/admin/coloring/jobs?tab=completed">
                Completed ({completedCount})
              </Link>
            </TabsTrigger>
            <TabsTrigger value="failed" asChild>
              <Link href="/admin/coloring/jobs?tab=failed">
                Failed ({failedCount})
              </Link>
            </TabsTrigger>
          </TabsList>
          <TabsContent value={tab} className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <Select>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder={t('filters.status')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder={t('filters.jobType')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Types</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Jobs List */}
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between p-4 hover:bg-muted/50"
                    >
                      <div className="flex items-start gap-4">
                        <div className="mt-1 text-muted-foreground">
                          {getStatusIcon(job.status)}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <code className="text-sm">{job.id}</code>
                            <Badge variant={getStatusVariant(job.status)}>
                              {t(`status.${job.status}`)}
                            </Badge>
                            <Badge variant="outline">{t(`type.${job.jobType}`)}</Badge>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">{job.totalKeywords} keywords</span>
                            <span className="mx-2">·</span>
                            <span className="text-muted-foreground">{job.processedPages} pages</span>
                            {job.failedPages > 0 && (
                              <>
                                <span className="mx-2">·</span>
                                <span className="text-destructive">{job.failedPages} failed</span>
                              </>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Started: {new Date(job.startedAt || '').toLocaleString()}
                            <span className="mx-2">·</span>
                            Duration: {formatDuration(job)}
                          </div>
                          {job.errorMessage && (
                            <div className="text-xs text-destructive">
                              {job.errorMessage}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/admin/coloring/jobs/${job.id}`}>
                            {t('actions.view')}
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                  {jobs.length === 0 && (
                    <div className="py-12 text-center text-muted-foreground">
                      {tCommon('noData')}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2">
                {page > 1 && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/coloring/jobs?tab=${tab}&page=${page - 1}`}>
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
                      <Link href={`/admin/coloring/jobs?tab=${tab}&page=${pageNum}`}>
                        {pageNum}
                      </Link>
                    </Button>
                  ))}
                </div>
                {page < totalPages && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/coloring/jobs?tab=${tab}&page=${page + 1}`}>
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
