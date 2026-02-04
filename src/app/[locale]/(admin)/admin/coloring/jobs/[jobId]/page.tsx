/**
 * Coloring job detail page
 * View details of a specific workflow job
 */

import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { getTranslations } from 'next-intl/server';
import { findColoringJob } from '@/shared/models/coloring_job';
import { redirect } from '@/core/i18n/navigation';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Separator } from '@/shared/components/ui/separator';
import { Clock, CheckCircle, XCircle, FileImage, ListTodo, Workflow } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: { locale: string; jobId: string };
}

export default async AdminColoringJobDetailPage({
  params,
}: PageProps) {
  await requirePermission({
    code: PERMISSIONS.COLORING_JOBS_READ,
    redirectUrl: '/admin/no-permission',
    locale: params.locale,
  });

  const t = await getTranslations('admin.coloring.jobs');
  const tCommon = await getTranslations('admin.coloring.common');

  const job = await findColoringJob({ id: params.jobId });

  if (!job) {
    redirect({ href: '/admin/coloring/jobs' });
  }

  const crumbs = [
    { title: t('list.crumbs.title'), href: '/admin' },
    { title: t('list.crumbs.crumb.title'), href: '/admin/coloring' },
    { title: t('list.title'), href: '/admin/coloring/jobs' },
    { title: `Job ${params.jobId.slice(0, 8)}` },
  ];

  // Parse keywords data
  let keywords: any[] = [];
  try {
    const keywordsData = JSON.parse(job.keywordsData || '{}');
    keywords = keywordsData.keywords || [];
  } catch (e) {
    // Invalid JSON
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

  // Status icon
  function getStatusIcon(status: string) {
    switch (status) {
      case 'processing':
        return <Clock className="h-5 w-5" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5" />;
      case 'failed':
        return <XCircle className="h-5 w-5" />;
      default:
        return <ListTodo className="h-5 w-5" />;
    }
  }

  // Format duration
  function formatDuration(): string {
    if (!job.completedAt || !job.startedAt) return '-';
    const start = new Date(job.startedAt).getTime();
    const end = new Date(job.completedAt).getTime();
    const diff = (end - start) / 1000;
    if (diff < 60) return `${Math.round(diff)}s`;
    return `${Math.round(diff / 60)}m`;
  }

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader
          title={`${t('detail.title')} - ${params.jobId.slice(0, 8)}`}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href={`/admin/coloring/pages?jobId=${job.id}`}>
                  <FileImage className="mr-2 h-4 w-4" />
                  {t('actions.viewPages')}
                </Link>
              </Button>
              {job.status === 'failed' && (
                <Button asChild>
                  <Link
                    href={`/api/coloring/workflow/start?wordRoots=test&retry=${job.id}`}
                  >
                    <Workflow className="mr-2 h-4 w-4" />
                    {t('actions.retry')}
                  </Link>
                </Button>
              )}
            </div>
          }
        />

        {/* Job Overview */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-normal text-muted-foreground">
                {t('fields.status')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {getStatusIcon(job.status)}
                <Badge variant={getStatusVariant(job.status)}>
                  {t(`status.${job.status}`)}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-normal text-muted-foreground">
                {t('fields.jobType')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="outline">{t(`type.${job.jobType}`)}</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-normal text-muted-foreground">
                {t('fields.duration')}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {formatDuration()}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-normal text-muted-foreground">
                Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Keywords:</span>
                <span>{job.totalKeywords}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pages:</span>
                <span>{job.processedPages}</span>
              </div>
              {job.failedPages > 0 && (
                <div className="flex justify-between text-sm text-destructive">
                  <span>Failed:</span>
                  <span>{job.failedPages}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Timeline */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('detail.steps')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-semibold">1</span>
                  </div>
                  <div className="w-px h-12 bg-border" />
                </div>
                <div className="pb-8">
                  <div className="font-medium">Generate Keywords</div>
                  <div className="text-sm text-muted-foreground">
                    {job.totalKeywords} keywords generated
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-semibold">2</span>
                  </div>
                  <div className="w-px h-12 bg-border" />
                </div>
                <div className="pb-8">
                  <div className="font-medium">Generate Images</div>
                  <div className="text-sm text-muted-foreground">
                    {job.totalKeywords} placeholder images created
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-semibold">3</span>
                  </div>
                  <div className="w-px h-12 bg-border" />
                </div>
                <div className="pb-8">
                  <div className="font-medium">Quality Check</div>
                  <div className="text-sm text-muted-foreground">
                    Images validated against quality standards
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-semibold">4</span>
                  </div>
                  <div className="w-px h-12 bg-border" />
                </div>
                <div className="pb-8">
                  <div className="font-medium">Upload to R2</div>
                  <div className="text-sm text-muted-foreground">
                    Images uploaded to Cloudflare R2 storage
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-primary-foreground" />
                  </div>
                </div>
                <div>
                  <div className="font-medium">Create Pages</div>
                  <div className="text-sm text-muted-foreground">
                    Database records and MDX files created
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Keywords Generated */}
        {keywords.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{t('detail.keywords')}</CardTitle>
              <CardDescription>
                AI-generated keywords from word roots
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {keywords.map((kw, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <div className="font-medium">{kw.keyword}</div>
                      <div className="text-xs text-muted-foreground">
                        {kw.category}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {index + 1}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Message */}
        {job.errorMessage && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm text-destructive whitespace-pre-wrap">
                {job.errorMessage}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Technical Details */}
        <Card>
          <CardHeader>
            <CardTitle>Technical Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-3 gap-4">
                <span className="text-muted-foreground">Job ID:</span>
                <code className="col-span-2">{job.id}</code>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <span className="text-muted-foreground">User ID:</span>
                <code className="col-span-2">{job.userId}</code>
              </div>
              {job.kaggleRunId && (
                <div className="grid grid-cols-3 gap-4">
                  <span className="text-muted-foreground">Kaggle Run ID:</span>
                  <code className="col-span-2">{job.kaggleRunId}</code>
                </div>
              )}
              <div className="grid grid-cols-3 gap-4">
                <span className="text-muted-foreground">Started At:</span>
                <span className="col-span-2">
                  {job.startedAt
                    ? new Date(job.startedAt).toLocaleString()
                    : '-'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <span className="text-muted-foreground">Completed At:</span>
                <span className="col-span-2">
                  {job.completedAt
                    ? new Date(job.completedAt).toLocaleString()
                    : '-'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <span className="text-muted-foreground">Created At:</span>
                <span className="col-span-2">
                  {new Date(job.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <span className="text-muted-foreground">Updated At:</span>
                <span className="col-span-2">
                  {new Date(job.updatedAt).toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </Main>
    </>
  );
}
