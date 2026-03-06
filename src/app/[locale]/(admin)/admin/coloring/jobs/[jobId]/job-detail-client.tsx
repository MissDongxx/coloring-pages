'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, CheckCircle, XCircle, ListTodo } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'error' | 'warn';
  message: string;
  data?: any;
}

interface JobData {
  id: string;
  status: string;
  jobType: string;
  startedAt: string | null;
  completedAt: string | null;
  totalKeywords: number;
  processedPages: number | null;
  failedPages: number | null;
  errorMessage: string | null;
  keywordsData: string;
  logs: string;
}

interface JobDetailClientProps {
  initialJob: JobData;
  locale: string;
  jobId: string;
  translations: {
    detail: { title: string; steps: string; keywords: string };
    status: { [key: string]: string };
    type: { [key: string]: string };
    fields: { status: string; jobType: string; duration: string };
    actions: { viewPages: string; retry: string };
  };
}

export function JobDetailClient({ initialJob, locale, jobId, translations }: JobDetailClientProps) {
  const router = useRouter();
  const [job, setJob] = useState<JobData>(initialJob);
  const [isLoading, setIsLoading] = useState(false);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  // Determine if job is still running
  const isRunning = job.status === 'processing' || job.status === 'pending';

  // Parse logs
  const logs: LogEntry[] = (() => {
    try {
      return JSON.parse(job.logs || '[]');
    } catch {
      return [];
    }
  })();

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logsContainerRef.current && isRunning) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [job.logs, isRunning]);

  // Auto-refresh for running jobs
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(async () => {
      if (isLoading) return;
      setIsLoading(true);
      try {
        const response = await fetch(`/api/coloring/jobs/${jobId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.code === 0 && data.data) {
            setJob(data.data);
            // If job completed, refresh the page to get all data
            if (data.data.status !== 'processing' && data.data.status !== 'pending') {
              setTimeout(() => {
                router.refresh();
              }, 1000);
            }
          }
        }
      } catch (error) {
        console.error('Failed to refresh job data:', error);
      } finally {
        setIsLoading(false);
      }
    }, 3000); // Refresh every 3 seconds

    return () => clearInterval(interval);
  }, [isRunning, jobId, isLoading, router]);

  // Status helpers
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

  function getStatusIcon(status: string) {
    switch (status) {
      case 'processing':
        return <Clock className="h-5 w-5" />;
      case 'completed':
        return <CheckCircle className="h-5 w-4" />;
      case 'failed':
        return <XCircle className="h-5 w-5" />;
      default:
        return <ListTodo className="h-5 w-5" />;
    }
  }

  function formatDuration(): string {
    if (!job.completedAt || !job.startedAt) return '-';
    const start = new Date(job.startedAt).getTime();
    const end = new Date(job.completedAt).getTime();
    const diff = (end - start) / 1000;
    if (diff < 60) return `${Math.round(diff)}s`;
    return `${Math.round(diff / 60)}m`;
  }

  // Log level colors
  const levelColors = {
    info: 'text-foreground',
    error: 'text-destructive',
    warn: 'text-yellow-600 dark:text-yellow-400',
  };
  const levelBgColors = {
    info: 'bg-muted/30',
    error: 'bg-destructive/10',
    warn: 'bg-yellow-500/10',
  };

  return (
    <>
      {/* Job Status Card with Live Indicator */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              {translations.fields.status}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {getStatusIcon(job.status)}
              <Badge variant={getStatusVariant(job.status)}>
                {translations.status[job.status] || job.status}
              </Badge>
              {isRunning && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              {translations.fields.jobType}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">{translations.type[job.jobType] || job.jobType}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              {translations.fields.duration}
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
              <span>{job.processedPages ?? 0}</span>
            </div>
            {(job.failedPages ?? 0) > 0 && (
              <div className="flex justify-between text-sm text-destructive">
                <span>Failed:</span>
                <span>{job.failedPages}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Live Execution Logs */}
      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListTodo className="h-5 w-5" />
              Execution Logs
              <Badge variant="outline">{logs.length}</Badge>
              {isRunning && (
                <span className="text-xs text-muted-foreground ml-2">
                  (Auto-refreshing...)
                </span>
              )}
            </CardTitle>
            <CardDescription>
              {isRunning ? 'Live logs - updating every 3 seconds' : 'Detailed step-by-step execution logs'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 font-mono text-xs max-h-[600px] overflow-y-auto" ref={logsContainerRef}>
              {logs.map((log, index) => (
                <div
                  key={index}
                  className={`flex gap-2 p-2 rounded ${levelBgColors[log.level] || levelBgColors.info}`}
                >
                  <span className="text-muted-foreground shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className={`font-semibold shrink-0 uppercase ${levelColors[log.level] || levelColors.info}`}>
                    [{log.level}]
                  </span>
                  <span className={levelColors[log.level] || levelColors.info}>
                    {log.message}
                  </span>
                  {log.data && (
                    <span className="text-muted-foreground ml-auto">
                      {JSON.stringify(log.data)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
