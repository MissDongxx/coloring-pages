/**
 * Image quality checker types
 */

export interface QualityCheckResult {
  passed: boolean;
  score: number; // 0-100
  issues: string[];
  metadata: ImageMetadata;
}

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  isLineArt: boolean; // Black and white line art detection
  hasNoise: boolean;
  brightness: number;
  contrast: number;
}

export interface QualityCheckOptions {
  minWidth?: number;
  maxWidth?: number;
  minSize?: number;
  maxSize?: number;
  minScore?: number;
  checkLineArt?: boolean;
  checkNoise?: boolean;
}

export interface QualityReport {
  imagePath: string;
  result: QualityCheckResult;
  category?: string;
  keyword?: string;
}

export interface QualityFilterResult {
  passed: string[];
  failed: string[];
  qualityReport: QualityReport[];
}
