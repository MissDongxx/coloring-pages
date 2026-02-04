/**
 * Kaggle API extension types
 */

export interface KaggleConfigs {
  username: string;
  apiKey: string;
  notebookSlug: string;
  notebookVersion?: string;
  organization?: string;
}

export type KaggleRunStatus = 'running' | 'completed' | 'failed' | 'pending';

export interface KaggleUploadResult {
  success: boolean;
  datasetSlug?: string;
  datasetUrl?: string;
  error?: string;
}

export interface KaggleRunResult {
  success: boolean;
  runId?: string;
  runUrl?: string;
  error?: string;
}

export interface KaggleStatusResult {
  status: KaggleRunStatus;
  outputUrl?: string;
  error?: string;
  progress?: number;
}

export interface KaggleDownloadResult {
  success: boolean;
  images?: Array<{
    filename: string;
    localPath: string;
    category: string;
    keyword: string;
  }>;
  error?: string;
}

export interface KaggleKeywordData {
  category: string;
  keyword: string;
  prompt: string;
}

export interface KaggleCSVData {
  keywords: KaggleKeywordData[];
  csvPath: string;
}
