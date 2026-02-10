/**
 * Coloring workflow management page
 * POST /admin/coloring/workflow
 */

import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { getTranslations } from 'next-intl/server';
import {
  getColoringJobs,
  getColoringJobsCount,
  ColoringJobStatus,
} from '@/shared/models/coloring_job';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Workflow } from 'lucide-react';
import { revalidatePath } from 'next/cache';

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; status?: string }>;
}

export default async function AdminColoringWorkflowPage({
  params,
  searchParams,
}: PageProps) {
  const { locale } = await params;
  const { page: searchPage, status: searchStatus } = await searchParams;

  await requirePermission({
    code: PERMISSIONS.COLORING_WORKFLOW_READ,
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const t = await getTranslations('admin.coloring.workflow');
  const tCommon = await getTranslations('admin.coloring.common');

  const pageNum = parseInt(searchPage || '1');
  const limit = 10;

  // Fetch jobs
  const jobs = await getColoringJobs({
    page: pageNum,
    limit,
    status: searchStatus as any,
  });

  const totalCount = await getColoringJobsCount({
    status: searchStatus as any,
  });

  // Calculate stats
  const [completedCount, failedCount, processingCount] = await Promise.all([
    getColoringJobsCount({ status: ColoringJobStatus.COMPLETED }),
    getColoringJobsCount({ status: ColoringJobStatus.FAILED }),
    getColoringJobsCount({ status: ColoringJobStatus.PROCESSING }),
  ]);

  const total = await getColoringJobsCount();

  const crumbs = [
    { title: t('list.crumbs.title'), href: '/admin' },
    { title: t('list.crumb.title'), href: '/admin/coloring' },
    { title: t('list.title'), href: '/admin/coloring/workflow' },
  ];

  // Server action to start workflow
  async function startWorkflow(formData: FormData) {
    'use server';
    const { requirePermission } = await import('@/core/rbac');
    const { getTranslations } = await import('next-intl/server');
    const { getWorkflowService } = await import('@/shared/services/coloring-workflow');
    const { redirect } = await import('@/core/i18n/navigation');

    await requirePermission({
      code: PERMISSIONS.COLORING_WORKFLOW_WRITE,
      redirectUrl: '/admin/no-permission',
    });

    const wordRoots = formData.get('wordRoots');
    const jobType = formData.get('jobType') || 'manual';
    const provider = formData.get('provider') || 'kaggle';

    const workflowService = getWorkflowService();
    const jobId = await workflowService.runWorkflow({
      wordRoots: wordRoots ? (wordRoots as string).split(',').map((s) => s.trim()) : undefined,
      jobType: jobType as any,
      provider: provider as any,
    });

    revalidatePath('/admin/coloring');
    redirect({ href: `/admin/coloring/jobs/${jobId}`, locale });
  }

  // Format duration
  function formatDuration(started: string | Date | null, completed: string | Date | null): string {
    if (!completed || !started) return '-';
    const start = new Date(started).getTime();
    const end = new Date(completed).getTime();
    const diff = (end - start) / 1000;
    if (diff < 60) return `${Math.round(diff)}s`;
    return `${Math.round(diff / 60)}m`;
  }

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

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader
          title={t('list.title')}
          actions={
            <Button asChild>
              <a href="#start-workflow">
                <Workflow className="mr-2 h-4 w-4" />
                {t('actions.start')}
              </a>
            </Button>
          }
        />

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('stats.totalJobs')}</CardDescription>
              <CardTitle className="text-2xl">{total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('stats.completed')}</CardDescription>
              <CardTitle className="text-2xl">{completedCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('stats.processing')}</CardDescription>
              <CardTitle className="text-2xl">{processingCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('stats.failed')}</CardDescription>
              <CardTitle className="text-2xl text-destructive">
                {failedCount}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('stats.totalPages')}</CardDescription>
              <CardTitle className="text-2xl">
                {jobs.reduce((sum, job) => sum + (job.processedPages || 0), 0)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Start Workflow Form */}
        <Card id="start-workflow" className="mb-6">
          <CardHeader>
            <CardTitle>{t('form.title')}</CardTitle>
            <CardDescription>
              Start a new coloring page generation workflow
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={startWorkflow} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="wordRoots">{t('form.wordRoots')}</Label>
                  <Input
                    id="wordRoots"
                    name="wordRoots"
                    placeholder={t('form.wordRootsPlaceholder')}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jobType">{t('form.jobType')}</Label>
                  <Select name="jobType" defaultValue="manual">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">{t('type.manual')}</SelectItem>
                      <SelectItem value="scheduled">{t('type.scheduled')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="provider">Provider</Label>
                  <Select name="provider" defaultValue="kaggle">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kaggle">Kaggle (Mock/Local)</SelectItem>
                      <SelectItem value="replicate">Replicate (AI)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full">
                <Workflow className="mr-2 h-4 w-4" />
                {t('form.submit')}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Recent Jobs */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Jobs</CardTitle>
            <CardDescription>Latest workflow executions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <code className="text-sm">{job.id.slice(0, 8)}...</code>
                      <Badge variant={getStatusVariant(job.status)}>
                        {t(`status.${job.status}`)}
                      </Badge>
                      <Badge variant="outline">{t(`type.${job.jobType}`)}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {job.totalKeywords} keywords · {job.processedPages ?? 0} pages
                      {(job.failedPages ?? 0) > 0 && ` · ${job.failedPages} failed`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Started: {new Date(job.startedAt || '').toLocaleString()}
                      {job.completedAt && ` · ${formatDuration(job.startedAt, job.completedAt)}`}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/admin/coloring/jobs/${job.id}`}>
                        {t('actions.view')}
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
              {jobs.length === 0 && (
                <div className="py-8 text-center text-muted-foreground">
                  {tCommon('noData')}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </Main>
    </>
  );
}
