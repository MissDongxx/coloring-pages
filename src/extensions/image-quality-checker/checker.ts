/**
 * Image quality checker for coloring pages
 * Uses sharp for image analysis
 */

import type sharp from 'sharp';
import { promises as fs } from 'fs';
import { envConfigs } from '@/config';
import type {
  ImageMetadata,
  QualityCheckOptions,
  QualityCheckResult,
  QualityFilterResult,
  QualityReport,
} from './types';

/**
 * Image quality checker class
 */
export class ImageQualityChecker {
  private readonly minWidth: number;
  private readonly maxWidth: number;
  private readonly minSize: number;
  private readonly maxSize: number;
  private readonly minScore: number;
  private readonly checkLineArt: boolean;
  private readonly checkNoise: boolean;

  constructor(options?: QualityCheckOptions) {
    this.minWidth =
      options?.minWidth ||
      parseInt(envConfigs.coloring_min_image_width || '512', 10);
    this.maxWidth =
      options?.maxWidth ||
      parseInt(envConfigs.coloring_max_image_width || '4096', 10);
    this.minSize =
      options?.minSize ||
      parseInt(envConfigs.coloring_min_image_size || '10240', 10);
    this.maxSize =
      options?.maxSize ||
      parseInt(envConfigs.coloring_max_image_size || '5242880', 10);
    this.minScore =
      options?.minScore ||
      parseInt(envConfigs.coloring_min_quality_score || '70', 10);
    this.checkLineArt = options?.checkLineArt !== false;
    this.checkNoise = options?.checkNoise !== false;
  }

  /**
   * Check if an image meets quality standards
   */
  async checkQuality(imagePath: string): Promise<QualityCheckResult> {
    const issues: string[] = [];
    let score = 100;

    try {
      // Check if file exists
      const stats = await fs.stat(imagePath);
      const fileSize = stats.size;

      // Check file size
      if (fileSize < this.minSize) {
        issues.push(`File size too small: ${fileSize} bytes (min: ${this.minSize})`);
        score -= 20;
      }
      if (fileSize > this.maxSize) {
        issues.push(`File size too large: ${fileSize} bytes (max: ${this.maxSize})`);
        score -= 20;
      }

      // Get image metadata
      const sharpModule = await import('sharp');
      const sharp = sharpModule.default || sharpModule;
      const metadata = await sharp(imagePath).metadata();
      const width = metadata.width || 0;
      const height = metadata.height || 0;
      const format = metadata.format || 'unknown';

      // Check dimensions
      if (width < this.minWidth || height < this.minWidth) {
        issues.push(
          `Dimensions too small: ${width}x${height} (min: ${this.minWidth}x${this.minWidth})`
        );
        score -= 30;
      }
      if (width > this.maxWidth || height > this.maxWidth) {
        issues.push(
          `Dimensions too large: ${width}x${height} (max: ${this.maxWidth}x${this.maxWidth})`
        );
        score -= 20;
      }

      // Check format
      if (!['png', 'jpeg', 'jpg', 'webp'].includes(format || '')) {
        issues.push(`Unsupported format: ${format}`);
        score -= 20;
      }

      // Get image statistics for quality analysis
      const imageStats = await sharp(imagePath).stats();
      const { brightness, contrast } = this.calculateBrightnessAndContrast(imageStats);

      // Check if it's a line art (black and white)
      const isLineArt = this.checkLineArt
        ? await this.isLineArtImage(imagePath, imageStats)
        : true;

      if (!isLineArt) {
        issues.push('Image does not appear to be a coloring page (not line art)');
        score -= 30;
      }

      // Check for noise
      const hasNoise = this.checkNoise
        ? await this.detectNoise(imagePath)
        : false;

      if (hasNoise) {
        issues.push('Image appears to have excessive noise');
        score -= 20;
      }

      // Ensure score is not negative
      score = Math.max(0, score);

      return {
        passed: score >= this.minScore,
        score,
        issues,
        metadata: {
          width,
          height,
          format: format || 'unknown',
          size: fileSize,
          isLineArt,
          hasNoise,
          brightness,
          contrast,
        },
      };
    } catch (error) {
      return {
        passed: false,
        score: 0,
        issues: [
          `Failed to analyze image: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
        metadata: {
          width: 0,
          height: 0,
          format: 'unknown',
          size: 0,
          isLineArt: false,
          hasNoise: false,
          brightness: 0,
          contrast: 0,
        },
      };
    }
  }

  /**
   * Check if image is a proper coloring page (line art, black & white)
   */
  async isColoringPage(imagePath: string): Promise<boolean> {
    const result = await this.checkQuality(imagePath);
    return result.passed && result.metadata.isLineArt;
  }

  /**
   * Calculate quality score from metadata
   */
  calculateScore(metadata: ImageMetadata): number {
    let score = 100;

    // Dimension score
    if (metadata.width < this.minWidth || metadata.height < this.minWidth) {
      score -= 30;
    }
    if (metadata.width > this.maxWidth || metadata.height > this.maxWidth) {
      score -= 20;
    }

    // Size score
    if (metadata.size < this.minSize) {
      score -= 20;
    }
    if (metadata.size > this.maxSize) {
      score -= 20;
    }

    // Line art score
    if (!metadata.isLineArt) {
      score -= 30;
    }

    // Noise score
    if (metadata.hasNoise) {
      score -= 20;
    }

    return Math.max(0, score);
  }

  /**
   * Filter images by quality threshold
   */
  async filterImages(
    images: string[],
    minScore?: number
  ): Promise<QualityFilterResult> {
    const threshold = minScore || this.minScore;
    const passed: string[] = [];
    const failed: string[] = [];
    const qualityReport: QualityReport[] = [];

    for (const imagePath of images) {
      const result = await this.checkQuality(imagePath);

      // Extract category and keyword from path
      const pathParts = imagePath.split('/');
      const filename = pathParts[pathParts.length - 1];
      const basename = filename.replace(/\.[^/.]+$/, '');

      let category: string | undefined;
      let keyword: string | undefined;

      const parts = basename.split('-');
      if (parts.length >= 2) {
        category = parts[0];
        keyword = parts.slice(1).join('-');
      }

      const report: QualityReport = {
        imagePath,
        result,
        category,
        keyword,
      };

      qualityReport.push(report);

      if (result.score >= threshold) {
        passed.push(imagePath);
      } else {
        failed.push(imagePath);
      }
    }

    return { passed, failed, qualityReport };
  }

  /**
   * Check if image is line art (black and white with simple outlines)
   */
  private async isLineArtImage(
    imagePath: string,
    stats: sharp.Stats
  ): Promise<boolean> {
    // For a coloring page, we expect:
    // 1. Low saturation (mostly black and white)
    // 2. High contrast
    // 3. Limited color palette

    const { channels } = stats;

    // Check if RGB channels are similar (indicating grayscale/line art)
    if (channels && channels.length >= 3) {
      const r = channels[0];
      const g = channels[1];
      const b = channels[2];

      // Standard deviation of means should be low for grayscale images
      const means = [r.mean, g.mean, b.mean];
      const avgMean = means.reduce((a, b) => a + b, 0) / means.length;
      const variance =
        means.reduce((sum, mean) => sum + Math.pow(mean - avgMean, 2), 0) /
        means.length;
      const stdDev = Math.sqrt(variance);

      // Low standard deviation means similar RGB values (grayscale)
      const isGrayscale = stdDev < 20;

      // Check contrast - coloring pages should have good contrast
      const rStdDev = r.stdev;
      const hasGoodContrast = rStdDev > 40;

      return isGrayscale && hasGoodContrast;
    }

    return false;
  }

  /**
   * Detect noise in image
   */
  private async detectNoise(imagePath: string): Promise<boolean> {
    try {
      // Use edge detection to find noise
      const sharpModule = await import('sharp');
      const sharp = sharpModule.default || sharpModule;
      const edges = await sharp(imagePath)
        .clone()
        .resize(256, 256, { fit: 'inside' })
        .greyscale()
        .normalize()
        .sharpen()
        .raw()
        .toBuffer();

      // Calculate variance in edge regions
      let sum = 0;
      for (let i = 0; i < edges.length; i++) {
        sum += edges[i];
      }
      const mean = sum / edges.length;

      let variance = 0;
      for (let i = 0; i < edges.length; i++) {
        variance += Math.pow(edges[i] - mean, 2);
      }
      variance /= edges.length;

      // High variance in normalized image may indicate noise
      return variance > 1000;
    } catch {
      return false;
    }
  }

  /**
   * Calculate brightness and contrast from image statistics
   */
  private calculateBrightnessAndContrast(stats: sharp.Stats): {
    brightness: number;
    contrast: number;
  } {
    if (stats.channels && stats.channels.length > 0) {
      const channel = stats.channels[0];
      return {
        brightness: Math.round(channel.mean),
        contrast: Math.round(channel.stdev),
      };
    }
    return { brightness: 128, contrast: 64 };
  }
}

/**
 * Create image quality checker instance
 */
export function createImageQualityChecker(
  options?: QualityCheckOptions
): ImageQualityChecker {
  return new ImageQualityChecker(options);
}
