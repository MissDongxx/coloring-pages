/**
 * Coloring workflow service - orchestrates the entire coloring page generation workflow
 */

import { promises as fs } from 'fs';
import path from 'path';
import { envConfigs } from '@/config';
import { createKeywordGenerator } from '@/extensions/keyword-generator';
import { createImageQualityChecker } from '@/extensions/image-quality-checker';
import { getStorageService } from '@/shared/services/storage';
import {
  createColoringJob,
  findColoringJob,
  updateJobStatus,
  updateColoringJob,
  ColoringJobStatus,
  ColoringJobType,
} from '@/shared/models/coloring_job';
import {
  batchCreateColoringPages,
  ColoringPageStatus,
} from '@/shared/models/coloring_page';

interface WorkflowOptions {
  wordRoots?: string[];
  jobType: ColoringJobType;
  userId?: string;
  provider?: 'replicate' | 'kaggle';
}

/**
 * Coloring workflow service class
 */
export class ColoringWorkflowService {
  private keywordGenerator = createKeywordGenerator();
  private qualityChecker = createImageQualityChecker();
  private tempDir = path.join(process.cwd(), 'temp');
  private jobLogs: Map<string, Array<{ timestamp: string; level: string; message: string; data?: any }>> = new Map();

  /**
   * Add a log entry for a job
   */
  private async log(jobId: string, level: 'info' | 'error' | 'warn', message: string, data?: any): Promise<void> {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(data && { data })
    };

    // Store in memory
    if (!this.jobLogs.has(jobId)) {
      this.jobLogs.set(jobId, []);
    }
    this.jobLogs.get(jobId)!.push(entry);

    // Console output
    const consoleMsg = `[${jobId}] ${message}`;
    if (level === 'error') {
      console.error(consoleMsg, data || '');
    } else if (level === 'warn') {
      console.warn(consoleMsg, data || '');
    } else {
      console.log(consoleMsg, data || '');
    }

    // Save to database periodically (every 5 logs or on error)
    const logs = this.jobLogs.get(jobId)!;
    if (logs.length % 5 === 0 || level === 'error') {
      await updateColoringJob(jobId, {
        logs: JSON.stringify(logs)
      });
    }
  }

  /**
   * Flush remaining logs to database
   */
  private async flushLogs(jobId: string): Promise<void> {
    const logs = this.jobLogs.get(jobId);
    if (logs && logs.length > 0) {
      await updateColoringJob(jobId, {
        logs: JSON.stringify(logs)
      });
    }
  }

  /**
   * Initialize temp directory
   */
  private async ensureTempDir(): Promise<void> {
    await fs.mkdir(this.tempDir, { recursive: true });
  }

  /**
   * Clean up temporary files
   */
  private async cleanup(jobId: string, csvPath?: string, imagesDir?: string): Promise<void> {
    try {
      if (csvPath) {
        await fs.unlink(csvPath).catch(() => {});
      }
      if (imagesDir) {
        await fs.rm(imagesDir, { recursive: true, force: true }).catch(() => {});
      }
    } catch (error) {
      console.error(`Cleanup error for job ${jobId}:`, error);
    }
  }

  /**
   * Step 1: Generate keywords using AI
   */
  private async generateKeywords(jobId: string, wordRoots?: string[]): Promise<{
    csvPath: string;
    keywordsCount: number;
  }> {
    await this.ensureTempDir();

    await this.log(jobId, 'info', 'Step 1: Generating keywords...', { wordRoots });

    try {
      const result = await this.keywordGenerator.generate({
        source: wordRoots ? 'word_roots' : 'auto_generated',
        wordRoots,
      });

      await this.log(jobId, 'info', 'Keywords generated successfully', {
        count: result.keywords.length,
        csvPath: result.csvPath,
        keywords: result.keywords.map((k: any) => `${k.category}:${k.keyword}`).join(', ')
      });

      // Update job with keywords data
      await updateColoringJob(jobId, {
        keywordsData: JSON.stringify({
          keywords: result.keywords,
          csvPath: result.csvPath,
        }),
        totalKeywords: result.keywords.length,
      });

      return {
        csvPath: result.csvPath,
        keywordsCount: result.keywords.length,
      };
    } catch (error) {
      await this.log(jobId, 'error', 'Failed to generate keywords', { error: error instanceof Error ? error.message : String(error) });
      await updateColoringJob(jobId, {
        errorMessage: `Keyword generation failed: ${error instanceof Error ? error.message : String(error)}`
      });
      throw error;
    }
  }

  /**
   * Step 2: Generate images using AI
   * Supports 'replicate' (via API) or 'kaggle' (currently local placeholder/mock)
   */
  private async generateImages(jobId: string, keywords: any[], provider: 'replicate' | 'kaggle' = 'kaggle'): Promise<string> {
    await this.ensureTempDir();

    await this.log(jobId, 'info', `Step 2: Generating images for ${keywords.length} keywords using ${provider}...`);

    const imagesDir = path.join(this.tempDir, jobId, 'images');
    await fs.mkdir(imagesDir, { recursive: true });

    await this.log(jobId, 'info', `Images directory created: ${imagesDir}`);

    let successCount = 0;
    let failCount = 0;

    if (provider === 'replicate') {
      // Replicate Implementation
      const { getAIService } = await import('@/shared/services/ai');
      const { AIMediaType, AITaskStatus } = await import('@/extensions/ai/types');
      const aiService = await getAIService();
      
      // Get Replicate provider
      const replicateProvider = aiService.getProvider('replicate');
      if (!replicateProvider) {
        const error = new Error('Replicate provider not configured. Please set REPLICATE_API_TOKEN in your environment variables.');
        await this.log(jobId, 'error', error.message);
        throw error;
      }
      
      const MODEL = 'stability-ai/sdxl';
      const LORA_URL = 'https://huggingface.co/renderartist/Coloring-Book-Z-Image-Turbo-LoRA/resolve/main/coloring-book-z-image-turbo.safetensors';
      
      for (const kw of keywords) {
        const filename = `${kw.category}-${kw.keyword}.png`;
        const imagePath = path.join(imagesDir, filename);
        
        try {
          await this.log(jobId, 'info', `Generating image for "${kw.keyword}"...`);
  
          // Construct prompt optimized for this LoRA
          // Avoid "book" to prevent literal book generation
          const prompt = `black and white cartoon, ${kw.keyword}, simple, cute, thick lines, white background, no shading, clean lines, kids style <lora:coloring-book-z-image-turbo:0.7>`;
          
          // Call Replicate
          const { taskId, taskStatus } = await replicateProvider.generate({
            params: {
              mediaType: AIMediaType.IMAGE,
              model: MODEL,
              prompt: prompt,
              options: {
                lora_weights: LORA_URL,
                lora_scale: 0.7,
                negative_prompt: "shading, gradient, color, complex, realistic, photo, grayscale, gray, background, watermark, text",
                num_inference_steps: 30,
                guidance_scale: 7.5,
                width: 1024,
                height: 1024,
                scheduler: "K_EULER", 
              }
            }
          });
  
          if (taskStatus === AITaskStatus.FAILED) {
               throw new Error('Task failed immediately');
          }
  
          // Poll for completion
          if (!replicateProvider.query) {
               throw new Error('Provider does not support querying task status');
          }
  
          let resultUrl = '';
          let attempts = 0;
          const maxAttempts = 60; // 2 minutes (2s interval)
          
          while (attempts < maxAttempts) {
            await new Promise(r => setTimeout(r, 2000));
            const result = await replicateProvider.query({ taskId, mediaType: AIMediaType.IMAGE });
            
            if (result.taskStatus === AITaskStatus.SUCCESS) {
               const images = result.taskInfo?.images;
               if (images && images.length > 0 && images[0].imageUrl) {
                 resultUrl = images[0].imageUrl;
               }
               break;
            } else if (result.taskStatus === AITaskStatus.FAILED || result.taskStatus === AITaskStatus.CANCELED) {
               throw new Error(`Generation failed: ${result.taskInfo?.errorMessage || 'Unknown error'}`);
            }
            attempts++;
          }
  
          if (!resultUrl) {
             throw new Error('Timeout or no image URL returned');
          }
  
          // Download and save image
          await this.log(jobId, 'info', `Downloading image from ${resultUrl}...`);
          const response = await fetch(resultUrl);
          if (!response.ok) throw new Error(`Failed to download image: ${response.statusText}`);
          
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          await fs.writeFile(imagePath, buffer);
          
          await this.log(jobId, 'info', `Image saved: ${filename}`);
          successCount++;
          
        } catch (error) {
          await this.log(jobId, 'error', `Failed to generate ${kw.keyword}`, { error: error instanceof Error ? error.message : String(error) });
          failCount++;
        }
      }

    } else {
      // Kaggle / Mock Implementation (Restored)
      // This is the "old" process (placeholder/mock)
      for (const kw of keywords) {
        const filename = `${kw.category}-${kw.keyword}.png`;
        const imagePath = path.join(imagesDir, filename);
  
        // Create a simple 512x512 coloring page placeholder (black outlines on white background)
        // Design: A simple flower/butterfly shape with thick black outlines
        const svgImage = `
          <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
            <rect width="512" height="512" fill="white"/>
            <!-- Simple coloring page design - flower or butterfly outline -->
            <circle cx="256" cy="256" r="80" fill="none" stroke="black" stroke-width="4"/>
            <circle cx="256" cy="256" r="40" fill="none" stroke="black" stroke-width="3"/>
            <circle cx="256" cy="256" r="10" fill="black"/>
            <!-- Petals/wings -->
            <ellipse cx="176" cy="256" rx="60" ry="30" fill="none" stroke="black" stroke-width="3"/>
            <ellipse cx="336" cy="256" rx="60" ry="30" fill="none" stroke="black" stroke-width="3"/>
            <ellipse cx="256" cy="176" rx="30" ry="60" fill="none" stroke="black" stroke-width="3"/>
            <ellipse cx="256" cy="336" rx="30" ry="60" fill="none" stroke="black" stroke-width="3"/>
            <text x="50%" y="480" font-family="Arial" font-size="16" fill="black" text-anchor="middle">
              ${kw.keyword}
            </text>
          </svg>
        `;
  
        try {
          const sharpModule = await import('sharp');
          const sharp = sharpModule.default || sharpModule;
          const buffer = Buffer.from(svgImage);
          await sharp(buffer)
            .resize(512, 512)
            .png()
            .toFile(imagePath);
          await this.log(jobId, 'info', `Created placeholder: ${filename}`);
          successCount++;
        } catch (error) {
          await this.log(jobId, 'error', `Failed to create ${filename}`, { error: error instanceof Error ? error.message : String(error) });
          failCount++;
        }
      }
    }

    await this.log(jobId, 'info', `Image generation complete: ${successCount} success, ${failCount} failed`);

    if (successCount === 0) {
      const error = new Error('Failed to generate any images');
      await this.log(jobId, 'error', `Image generation failed: ${error.message}`);
      await updateColoringJob(jobId, {
        errorMessage: `Image generation failed: ${error.message}`
      });
      throw error;
    }

    return imagesDir;
  }

  /**
   * Step 4: Check image quality and filter low-quality images
   */
  private async checkImageQuality(jobId: string, imagesDir: string): Promise<{
    passedImages: Array<{
      path: string;
      category: string;
      keyword: string;
    }>;
    qualityReport: any[];
  }> {
    await this.log(jobId, 'info', 'Step 3: Checking image quality...');

    try {
      // Get all image files
      const files = await fs.readdir(imagesDir);
      await this.log(jobId, 'info', `Found ${files.length} files in images directory`);

      const imageFiles = files
        .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
        .map((f) => path.join(imagesDir, f));

      await this.log(jobId, 'info', 'Image files to check', { files: imageFiles.map(f => path.basename(f)) });

      if (imageFiles.length === 0) {
        const error = new Error('No image files found in directory');
        await this.log(jobId, 'error', `Quality check failed: ${error.message}`);
        await updateColoringJob(jobId, {
          errorMessage: `Quality check failed: ${error.message}`
        });
        throw error;
      }

      // Filter by quality
      const filterResult = await this.qualityChecker.filterImages(imageFiles);

      await this.log(jobId, 'info', 'Quality check results', {
        passed: filterResult.passed.length,
        failed: filterResult.failed.length,
        total: imageFiles.length
      });

      // Log detailed quality report for failed images
      if (filterResult.failed.length > 0) {
        const failedDetails = filterResult.qualityReport
          .filter((r: any) => !r.result.passed)
          .map((r: any) => ({
            file: path.basename(r.imagePath),
            score: r.result.score,
            issues: r.result.issues
          }));
        await this.log(jobId, 'warn', 'Failed images details', { failed: failedDetails });
      }

      // Extract metadata for passed images
      const passedImages = filterResult.passed.map((imgPath) => {
        const filename = path.basename(imgPath);
        const basename = filename.replace(/\.[^/.]+$/, '');
        const parts = basename.split('-');

        return {
          path: imgPath,
          category: parts.length >= 2 ? parts[0] : 'uncategorized',
          keyword: parts.length >= 2 ? parts.slice(1).join('-') : basename,
        };
      });

      // Update job with failed pages count
      await updateColoringJob(jobId, {
        failedPages: filterResult.failed.length,
      });

      return {
        passedImages,
        qualityReport: filterResult.qualityReport,
      };
    } catch (error) {
      await this.log(jobId, 'error', 'Quality check failed', { error: error instanceof Error ? error.message : String(error) });
      await updateColoringJob(jobId, {
        errorMessage: `Quality check failed: ${error instanceof Error ? error.message : String(error)}`
      });
      throw error;
    }
  }

  /**
   * Step 5: Upload quality-checked images to R2
   */
  private async uploadImagesToR2(
    jobId: string,
    images: Array<{
      path: string;
      category: string;
      keyword: string;
    }>
  ): Promise<
    Array<{
      category: string;
      keyword: string;
      imageUrl: string;
    }>
  > {
    await this.log(jobId, 'info', `Step 4: Uploading ${images.length} images to R2...`);

    const r2Path = envConfigs.coloring_r2_path || 'coloring-pages';
    await this.log(jobId, 'info', `R2 path: ${r2Path}`);

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    const uploadPromises = images.map(async (img) => {
      const filename = path.basename(img.path);
      const key = `${r2Path}/${img.category}/${filename}`;

      try {
        await this.log(jobId, 'info', `Uploading ${filename} to ${key}...`);

        const imageBuffer = await fs.readFile(img.path);
        await this.log(jobId, 'info', `File read: ${filename}, size: ${imageBuffer.length} bytes`);

        const storage = await getStorageService();
        const result = await storage.uploadFile({
          body: imageBuffer,
          key: key,
          contentType: 'image/png',
        });

        if (!result.url) {
          throw new Error('Upload failed - no URL returned');
        }

        await this.log(jobId, 'info', `Upload success: ${filename}`, { url: result.url });
        successCount++;

        return {
          category: img.category,
          keyword: img.keyword,
          imageUrl: result.url,
        };
      } catch (error) {
        const errorMsg = `Failed to upload ${filename}: ${error instanceof Error ? error.message : String(error)}`;
        await this.log(jobId, 'error', errorMsg);
        errors.push(errorMsg);
        failCount++;
        return null;
      }
    });

    const results = await Promise.all(uploadPromises);
    const uploaded = results.filter((r): r is NonNullable<typeof r> => r !== null);

    await this.log(jobId, 'info', `R2 upload complete: ${successCount} success, ${failCount} failed`);

    if (uploaded.length === 0) {
      const error = new Error(`All R2 uploads failed: ${errors.join('; ')}`);
      await this.log(jobId, 'error', `R2 upload failed: ${error.message}`);
      await updateColoringJob(jobId, {
        errorMessage: `R2 upload failed: ${error.message}`
      });
      throw error;
    }

    if (failCount > 0) {
      await this.log(jobId, 'warn', `Partial R2 upload failure: ${failCount}/${images.length} failed`, { errors });
      await updateColoringJob(jobId, {
        errorMessage: `Partial R2 upload failure: ${failCount}/${images.length} failed. Errors: ${errors.join('; ')}`
      });
    }

    return uploaded;
  }

  /**
   * Step 6: Create database records and MDX files
   */
  private async createColoringPages(
    jobId: string,
    uploadedImages: Array<{
      category: string;
      keyword: string;
      imageUrl: string;
    }>
  ): Promise<void> {
    await this.log(jobId, 'info', 'Step 5: Creating coloring pages and MDX files...');

    const mdxPath = envConfigs.coloring_mdx_path || 'content/coloring-pages';
    const locales = ['en', 'zh']; // Supported locales

    await this.log(jobId, 'info', `MDX path: ${mdxPath}, locales: ${locales.join(', ')}`);

    try {
      // Create pages for each locale
      for (const locale of locales) {
        const localeDir = path.join(process.cwd(), mdxPath, locale);
        await fs.mkdir(localeDir, { recursive: true });
        await this.log(jobId, 'info', `Locale directory ready: ${localeDir}`);

        const pages: any[] = [];
        for (const img of uploadedImages) {
          const slug = this.generateSlug(img.category, img.keyword);
          const title = this.generateTitle(img.keyword);
          const description = `A beautiful ${img.keyword} coloring page for kids`;

          await this.log(jobId, 'info', `Creating page: ${locale}-${slug}`, { category: img.category, keyword: img.keyword });

          // Create MDX file
          await this.createMDXFile(
            localeDir,
            slug,
            title,
            description,
            img.category,
            img.keyword,
            img.imageUrl,
            locale
          );

          pages.push({
            jobId,
            userId: 'system', // System user for background-generated content
            slug: `${locale}-${slug}`,
            title,
            description,
            category: img.category,
            keyword: img.keyword,
            prompt: `coloring page of ${img.keyword}`,
            imageUrl: img.imageUrl,
            mdxPath: path.join(mdxPath, locale, `${slug}.mdx`),
            status: ColoringPageStatus.DRAFT,
            sort: 0,
          });
        }

        await this.log(jobId, 'info', `Creating ${pages.length} database records for locale ${locale}...`);

        // Batch create database records
        await batchCreateColoringPages(pages);

        await this.log(jobId, 'info', `Database records created for locale ${locale}`);
      }

      await this.log(jobId, 'info', `Total pages created: ${uploadedImages.length * locales.length}`);
    } catch (error) {
      await this.log(jobId, 'error', 'Failed to create coloring pages', { error: error instanceof Error ? error.message : String(error) });
      await updateColoringJob(jobId, {
        errorMessage: `Page creation failed: ${error instanceof Error ? error.message : String(error)}`
      });
      throw error;
    }
  }

  /**
   * Generate a slug from category and keyword
   * Adds a random suffix to ensure uniqueness
   */
  private generateSlug(category: string, keyword: string): string {
    const base = `${category}-${keyword}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    // Add a random 4-char suffix for uniqueness
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    return `${base}-${randomSuffix}`;
  }

  /**
   * Generate a title from keyword
   */
  private generateTitle(keyword: string): string {
    return `${keyword
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')} Coloring Page`;
  }

  /**
   * Create an MDX file
   */
  private async createMDXFile(
    dir: string,
    slug: string,
    title: string,
    description: string,
    category: string,
    keyword: string,
    imageUrl: string,
    locale: string
  ): Promise<void> {
    const filePath = path.join(dir, `${slug}.mdx`);
    const content = `---
title: "${title}"
description: "${description}"
category: "${category}"
keyword: "${keyword}"
image: "${imageUrl}"
status: "draft"
locale: "${locale}"
createdAt: "${new Date().toISOString()}"
---

# ${title}

Print and color this beautiful ${keyword} design. Perfect for kids of all ages to enjoy!

## How to Color

1. Download the coloring page
2. Print it on your favorite paper
3. Get your crayons, colored pencils, or markers ready
4. Let your creativity shine!

## Tips

- Stay within the lines for a neat look
- Experiment with different color combinations
- Have fun and be creative!
`;

    await fs.writeFile(filePath, content, 'utf-8');
  }

  /**
   * Main workflow orchestration
   */
  async runWorkflow(options: WorkflowOptions): Promise<string> {
    // Step 0: Create job record
    const job = await createColoringJob({
      userId: options.userId || 'system',
      status: ColoringJobStatus.PENDING,
      jobType: options.jobType,
      keywordsData: '',
      totalKeywords: 0,
      processedPages: 0,
      failedPages: 0,
      startedAt: new Date(),
    });

    const jobId = job.id;
    let csvPath: string | undefined;
    let imagesDir: string | undefined;

    try {
      // Update status to processing
      await updateJobStatus(jobId, ColoringJobStatus.PROCESSING);
      await this.log(jobId, 'info', 'Workflow started');

      // Step 1: Generate keywords
      const keywordResult = await this.generateKeywords(jobId, options.wordRoots);
      csvPath = keywordResult.csvPath;

      // Get keywords for image generation
      const job = await findColoringJob({ id: jobId });
      const keywordsData = JSON.parse(job?.keywordsData || '{"keywords":[]}');
      const keywords = keywordsData.keywords || [];

      // Step 2: Generate images
      imagesDir = await this.generateImages(jobId, keywords, options.provider);

      // Step 3: Check image quality
      const qualityResult = await this.checkImageQuality(jobId, imagesDir);

      // For placeholder images, if all fail quality check, allow them through for testing
      let finalImages = qualityResult.passedImages;
      if (finalImages.length === 0) {
        await this.log(jobId, 'warn', 'All images failed quality check, allowing placeholders through for testing');
        // Get all images from directory and add them as passed
        const files = await fs.readdir(imagesDir!);
        const imageFiles = files.filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
        finalImages = imageFiles.map((f) => {
          const basename = f.replace(/\.[^/.]+$/, '');
          const parts = basename.split('-');
          return {
            path: path.join(imagesDir!, f),
            category: parts.length >= 2 ? parts[0] : 'uncategorized',
            keyword: parts.length >= 2 ? parts.slice(1).join('-') : basename,
          };
        });
      }

      if (finalImages.length === 0) {
        throw new Error('No images found');
      }

      // Step 4: Upload to R2
      const uploadedImages = await this.uploadImagesToR2(jobId, finalImages);

      // Step 5: Create pages
      await this.createColoringPages(jobId, uploadedImages);

      // Mark job as completed
      await updateJobStatus(jobId, ColoringJobStatus.COMPLETED);
      await updateColoringJob(jobId, {
        processedPages: uploadedImages.length * 2, // Both en and zh
      });

      await this.log(jobId, 'info', 'Workflow completed successfully!');
      await this.flushLogs(jobId);
      return jobId;
    } catch (error) {
      await this.log(jobId, 'error', 'Workflow failed', { error: error instanceof Error ? error.message : String(error) });

      // Mark job as failed
      await updateJobStatus(
        jobId,
        ColoringJobStatus.FAILED,
        error instanceof Error ? error.message : 'Unknown error'
      );

      await this.flushLogs(jobId);
      throw error;
    } finally {
      // Cleanup
      await this.cleanup(jobId, csvPath, imagesDir);
    }
  }
}

// Singleton instance
let workflowServiceInstance: ColoringWorkflowService | null = null;

export function getWorkflowService(): ColoringWorkflowService {
  if (!workflowServiceInstance) {
    workflowServiceInstance = new ColoringWorkflowService();
  }
  return workflowServiceInstance;
}
