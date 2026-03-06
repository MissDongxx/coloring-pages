/**
 * Coloring job detail page
 * View details of a specific workflow job
 */

import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { getTranslations } from 'next-intl/server';
import { findColoringJob } from '@/shared/models/coloring_job';
import { redirect } from 'next/navigation';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { CheckCircle, XCircle, FileImage, Workflow } from 'lucide-react';
import Link from 'next/link';
import { JobDetailClient } from './job-detail-client';

interface PageProps {
  params: Promise<{ locale: string; jobId: string }>;
}

export default async function AdminColoringJobDetailPage({
  params,
}: PageProps) {
  const { locale, jobId } = await params;

  await requirePermission({
    code: PERMISSIONS.COLORING_JOBS_READ,
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const t = await getTranslations('admin.coloring.jobs');
  const tCommon = await getTranslations('admin.coloring.common');

  const job = await findColoringJob({ id: jobId });

  if (!job) {
    redirect(`/${locale}/admin/coloring/jobs`);
  }

  const crumbs = [
    { title: t('list.crumbs.title'), href: '/admin' },
    { title: t('list.crumb.title'), href: '/admin/coloring' },
    { title: t('list.title'), href: '/admin/coloring/jobs' },
    { title: `Job ${jobId.slice(0, 8)}` },
  ];

  // Parse keywords data
  let keywords: any[] = [];
  let csvContent = '';
  try {
    const keywordsData = JSON.parse(job.keywordsData || '{}');
    keywords = keywordsData.keywords || [];
    csvContent = keywordsData.csvContent || '';
  } catch (e) {
    // Invalid JSON
  }

  // Prepare translations for client component
  const translations = {
    detail: {
      title: t('detail.title'),
      steps: t('detail.steps'),
      keywords: t('detail.keywords'),
    },
    status: {
      pending: t('status.pending'),
      processing: t('status.processing'),
      completed: t('status.completed'),
      failed: t('status.failed'),
    },
    type: {
      manual: t('type.manual'),
      scheduled: t('type.scheduled'),
    },
    fields: {
      status: t('fields.status'),
      jobType: t('fields.jobType'),
      duration: t('fields.duration'),
    },
    actions: {
      viewPages: t('actions.viewPages'),
      retry: t('actions.retry'),
    },
  };

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader
          title={`${t('detail.title')} - ${jobId.slice(0, 8)}`}
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

        {/* Client Component with Live Updates */}
        <JobDetailClient
          initialJob={job}
          locale={locale}
          jobId={jobId}
          translations={translations}
        />

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
                    {job.totalKeywords} images created
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
                    Database records created
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Keywords Generated */}
        {keywords.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between pr-6">
              <div>
                <CardTitle>{t('detail.keywords')}</CardTitle>
                <CardDescription>
                  AI-generated keywords from word roots
                </CardDescription>
              </div>
              {csvContent && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`} download={`keywords-${jobId}.csv`}>
                    Download CSV
                  </a>
                </Button>
              )}
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
              <CardTitle className="text-destructive flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                Error Details
              </CardTitle>
              <CardDescription>
                This job failed during processing. See details below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">Error Message</div>
                <pre className="text-sm text-destructive whitespace-pre-wrap bg-destructive/10 p-3 rounded-lg">
                  {job.errorMessage}
                </pre>
              </div>

              {/* Troubleshooting Tips */}
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">Common Causes</div>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>R2 storage configuration missing or incorrect</li>
                  <li>Image quality check too strict for placeholder images</li>
                  <li>Sharp module not installed for image processing</li>
                  <li>Database connection or schema issues</li>
                  <li>File system permissions for temp/content directories</li>
                </ul>
              </div>

              {/* Debug Info */}
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">Debug Information</div>
                <div className="text-sm space-y-1 bg-muted/50 p-3 rounded-lg">
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-muted-foreground">Keywords:</span>
                    <span>{job.totalKeywords}</span>
                    <span className="text-muted-foreground">Pages:</span>
                    <span>{job.processedPages ?? 0}</span>
                    <span className="text-muted-foreground">Failed:</span>
                    <span className="text-destructive">{job.failedPages ?? 0}</span>
                  </div>
                </div>
              </div>
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
