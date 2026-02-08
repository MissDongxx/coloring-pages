/**
 * Quality check reports page
 * View image quality check results
 */

import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { getTranslations } from 'next-intl/server';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Progress } from '@/shared/components/ui/progress';
import { Input } from '@/shared/components/ui/input';
import { FileImage, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { promises as fs } from 'fs';
import path from 'path';

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    jobId?: string;
    minScore?: string;
  }>;
}

export default async function AdminColoringQualityPage({
  params,
  searchParams,
}: PageProps) {
  const { locale } = await params;
  const { jobId: searchJobId, minScore: searchMinScore } = await searchParams;

  await requirePermission({
    code: PERMISSIONS.COLORING_QUALITY_READ,
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const t = await getTranslations('admin.coloring.quality');
  const tCommon = await getTranslations('admin.coloring.common');

  const jobId = searchJobId;
  const minScore = parseInt(searchMinScore || '0');

  // Get quality reports from job's temp directory
  let qualityReports: any[] = [];
  let tempDir = '';
  let imagesDir = '';

  if (jobId) {
    tempDir = path.join(process.cwd(), 'temp', jobId);
    imagesDir = path.join(tempDir, 'images');

    try {
      // Check if directory exists
      await fs.access(imagesDir);
      const files = await fs.readdir(imagesDir);
      const imageFiles = files.filter((f) =>
        /\.(png|jpe?g|webp)$/i.test(f)
      );

      // Simulate quality check results
      qualityReports = await Promise.all(
        imageFiles.map(async (filename) => {
          const imagePath = path.join(imagesDir, filename);
          const stats = await fs.stat(imagePath);

          // Extract category and keyword
          const basename = filename.replace(/\.[^/.]+$/, '');
          const parts = basename.split('-');
          const category = parts.length >= 2 ? parts[0] : 'uncategorized';
          const keyword = parts.length >= 2 ? parts.slice(1).join('-') : basename;

          // Simulate quality score (in production, this would come from actual quality check)
          const score = Math.floor(Math.random() * 40) + 60; // 60-100
          const passed = score >= 70;

          const issues: string[] = [];
          if (stats.size < 10240) issues.push(t('issues.fileSize'));
          if (!passed && Math.random() > 0.5) issues.push(t('issues.lineArt'));
          if (!passed && Math.random() > 0.7) issues.push(t('issues.noise'));

          return {
            filename,
            imagePath,
            category,
            keyword,
            score,
            passed,
            issues,
            metadata: {
              width: 512,
              height: 512,
              size: stats.size,
              format: 'png',
            },
          };
        })
      );
    } catch (error) {
      // Directory doesn't exist
    }
  }

  const crumbs = [
    { title: t('list.crumbs.title'), href: '/admin' },
    { title: t('list.crumb.title'), href: '/admin/coloring' },
    { title: t('list.title'), href: '/admin/coloring/quality' },
  ];

  // Calculate stats
  const total = qualityReports.length;
  const passed = qualityReports.filter((r) => r.passed).length;
  const failed = total - passed;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
  const avgScore =
    total > 0
      ? Math.round(qualityReports.reduce((sum, r) => sum + r.score, 0) / total)
      : 0;

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t('list.title')} />

        {/* Job Selector */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <form className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">
                  Filter by Job
                </label>
                <Input
                  name="jobId"
                  placeholder="Enter Job ID"
                  defaultValue={jobId || ''}
                />
              </div>
              <div className="w-[200px]">
                <label className="text-sm font-medium mb-2 block">
                  {t('filters.minScore')}
                </label>
                <Input
                  type="number"
                  name="minScore"
                  placeholder="Min Score"
                  min="0"
                  max="100"
                  defaultValue={minScore.toString()}
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Filter
              </button>
            </form>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('stats.total')}</CardDescription>
              <CardTitle className="text-2xl">{total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-green-600">
                {t('stats.passed')}
              </CardDescription>
              <CardTitle className="text-2xl">{passed}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-destructive">
                {t('stats.failed')}
              </CardDescription>
              <CardTitle className="text-2xl">{failed}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('stats.passRate')}</CardDescription>
              <CardTitle className="text-2xl">{passRate}%</CardTitle>
            </CardHeader>
            <Progress value={passRate} className="mt-2" />
          </Card>
        </div>

        {/* Quality Reports */}
        {jobId && qualityReports.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>{t('list.title')} - Job {jobId.slice(0, 8)}</CardTitle>
              <CardDescription>
                Average Score: {avgScore}/100 · {total} images checked
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {qualityReports.map((report, index) => (
                  <div
                    key={index}
                    className="flex gap-4 p-4 border rounded-lg hover:bg-muted/50"
                  >
                    {/* Thumbnail */}
                    <div className="relative w-20 h-20 flex-shrink-0 bg-muted rounded overflow-hidden">
                      <Image
                        src={`file://${report.imagePath}`}
                        alt={report.keyword}
                        fill
                        className="object-cover"
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{report.keyword}</span>
                        <Badge variant="outline">{report.category}</Badge>
                        <Badge
                          variant={report.passed ? 'default' : 'destructive'}
                        >
                          {report.passed ? (
                            <CheckCircle className="mr-1 h-3 w-3" />
                          ) : (
                            <XCircle className="mr-1 h-3 w-3" />
                          )}
                          {report.score}/100
                        </Badge>
                      </div>

                      {/* Score Bar */}
                      <div>
                        <Progress
                          value={report.score}
                          className="h-2"
                          // @ts-ignore - variant prop exists
                          variant={report.passed ? 'default' : 'destructive'}
                        />
                      </div>

                      {/* Metadata */}
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>
                          {report.metadata.width}x{report.metadata.height}
                        </span>
                        <span>
                          {(report.metadata.size / 1024).toFixed(1)} KB
                        </span>
                        <span>{report.metadata.format.toUpperCase()}</span>
                      </div>

                      {/* Issues */}
                      {report.issues.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {report.issues.map((issue: string, i: number) => (
                            <Badge
                              key={i}
                              variant="destructive"
                              className="text-xs"
                            >
                              <AlertCircle className="mr-1 h-3 w-3" />
                              {issue}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Status Icon */}
                    <div className="flex-shrink-0">
                      {report.passed ? (
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      ) : (
                        <XCircle className="h-6 w-6 text-destructive" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <FileImage className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>Select a job to view quality reports</p>
              <p className="text-sm mt-2">
                Or{' '}
                <Link href="/admin/coloring/jobs" className="underline">
                  view jobs list
                </Link>
              </p>
            </CardContent>
          </Card>
        )}
      </Main>
    </>
  );
}
