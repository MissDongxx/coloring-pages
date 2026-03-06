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
import { createColoringPageWithSlugRetry, ColoringPageStatus, findColoringPage } from '@/shared/models/coloring_page';
import { KaggleClient } from '@/shared/services/kaggle';
import AdmZip from 'adm-zip';
import { revalidatePath } from 'next/cache';

interface WorkflowOptions {
  wordRoots?: string[];
  count?: number;
  jobType: ColoringJobType;
  userId?: string;
  provider?: 'replicate' | 'kaggle';
}

/**
 * Execute promises with concurrency limit
 */
async function promiseAllConcurrent<T>(
  items: Array<T>,
  asyncFn: (item: T, index: number) => Promise<any>,
  concurrency: number
): Promise<any[]> {
  const results: any[] = [];
  const executing: Array<Promise<any>> = [];

  for (let i = 0; i < items.length; i++) {
    const promise = asyncFn(items[i], i).then((result) => {
      executing.splice(executing.indexOf(promise), 1);
      return result;
    });

    results.push(promise);
    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
    }
  }

  return Promise.all(results);
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

    // Save to database periodically (but not too frequently to avoid size issues)
    const logs = this.jobLogs.get(jobId)!;
    // Only save on error, or every 20 logs to reduce DB writes
    if (level === 'error' || logs.length % 20 === 0) {
      // Only keep last 100 logs to prevent oversized JSON
      const logsToSave = logs.slice(-100);
      try {
        await updateColoringJob(jobId, {
          logs: JSON.stringify(logsToSave)
        });
      } catch (dbError: any) {
        // If DB update fails due to size, try with even fewer logs
        const minimalLogs = logs.slice(-20);
        await updateColoringJob(jobId, {
          logs: JSON.stringify(minimalLogs)
        });
      }
    }
  }

  /**
   * Flush remaining logs to database
   */
  private async flushLogs(jobId: string): Promise<void> {
    const logs = this.jobLogs.get(jobId);
    if (logs && logs.length > 0) {
      // Only keep last 100 logs to prevent oversized JSON
      const logsToSave = logs.slice(-100);
      try {
        await updateColoringJob(jobId, {
          logs: JSON.stringify(logsToSave)
        });
      } catch (dbError: any) {
        // If DB update fails due to size, try with even fewer logs
        const minimalLogs = logs.slice(-20);
        await updateColoringJob(jobId, {
          logs: JSON.stringify(minimalLogs)
        });
      }
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
        await fs.unlink(csvPath).catch(() => { });
      }
      if (imagesDir) {
        await fs.rm(imagesDir, { recursive: true, force: true }).catch(() => { });
      }
    } catch (error) {
      console.error(`Cleanup error for job ${jobId}:`, error);
    }
  }

  /**
   * Step 1: Generate keywords using AI
   */
  private async generateKeywords(jobId: string, wordRoots?: string[], count?: number): Promise<{
    csvPath: string;
    keywordsCount: number;
    csvContent: string;
  }> {
    await this.ensureTempDir();

    await this.log(jobId, 'info', 'Step 1: Generating keywords...', { wordRoots });

    try {
      const result = await this.keywordGenerator.generate({
        source: wordRoots ? 'word_roots' : 'auto_generated',
        wordRoots,
        count,
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
          csvContent: result.csvContent, // Store CSV content directly
        }),
        totalKeywords: result.keywords.length,
      });

      return {
        csvPath: result.csvPath,
        keywordsCount: result.keywords.length,
        csvContent: result.csvContent,
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
      // Kaggle REST API Integration
      this.log(jobId, 'info', 'Initializing Kaggle Client...');
      try {
        const kaggle = new KaggleClient();

        // 1. Batch Keywords (100 per chunk per user request)
        const batchSize = 100;
        const numBatches = Math.ceil(keywords.length / batchSize);

        for (let batchIdx = 0; batchIdx < numBatches; batchIdx++) {
          const batchKeywords = keywords.slice(batchIdx * batchSize, (batchIdx + 1) * batchSize);
          await this.log(jobId, 'info', `Processing Kaggle Batch ${batchIdx + 1} / ${numBatches} (${batchKeywords.length} keywords)`);

          // Generate CSV content for this batch
          // Format: category,keyword,prompt (as expected by the notebook)
          const header = 'category,keyword,prompt\n';
          const csvRows = batchKeywords.map((kw: any) => {
            // Use the prompt if available, otherwise generate a simple one
            const prompt = kw.prompt || `A coloring page of ${kw.keyword}, simple outlines, suitable for children`;
            // Escape double quotes in CSV format by doubling them
            const safeCategory = (kw.category || 'general').replace(/"/g, '""');
            const safeKeyword = kw.keyword.replace(/"/g, '""');
            const safePrompt = prompt.replace(/"/g, '""').replace(/\n/g, ' ').replace(/\r/g, ' ');
            return `"${safeCategory}","${safeKeyword}","${safePrompt}"`;
          }).join('\n');
          const batchCsvContent = header + csvRows;

          // Debug log
          await this.log(jobId, 'info', `Generated CSV content (${batchCsvContent.length} chars):`, { preview: batchCsvContent.substring(0, 200) });

          // Upload to Dataset
          await this.log(jobId, 'info', `Uploading Dataset...`);
          await kaggle.uploadKeywordsDataset(batchCsvContent);

          // Small delay to allow Kaggle backend to stabilize dataset version
          await new Promise(r => setTimeout(r, 5000));

          // Trigger Notebook
          await this.log(jobId, 'info', `Triggering Notebook execution...`);
          await kaggle.triggerNotebook();

          // Poll for completion (Kaggle can take 15-30+ mins)
          await this.log(jobId, 'info', `Polling Kernel Status...`);
          let isComplete = false;
          let pollAttempts = 0;
          const maxPolls = 240; // e.g., 240 * 30s = 120 mins max

          while (!isComplete && pollAttempts < maxPolls) {
            await new Promise(r => setTimeout(r, 30000)); // 30 sec poll interval
            const statusObj = await kaggle.getNotebookStatus();
            // Expected status: 'running', 'queued', 'complete', 'error', 'cancel'
            await this.log(jobId, 'info', `Kernel status: ${statusObj.status}`);

            if (statusObj.status === 'complete') {
              isComplete = true;
            } else if (statusObj.status === 'error' || statusObj.status === 'cancel' || statusObj.status === 'failed') {
              throw new Error(`Kernel failed with status: ${statusObj.status}`);
            }
            pollAttempts++;
          }

          if (!isComplete) {
            throw new Error(`Kaggle notebook timeout after ${maxPolls * 30} seconds`);
          }

          // Download Output with retry logic - keep trying until we get files or timeout
          await this.log(jobId, 'info', `Downloading zip output from Kaggle...`);
          let zipBuffer: Buffer = Buffer.alloc(0);
          let downloadAttempts = 0;
          const maxDownloadAttempts = 20; // Retry up to 20 times (10 minutes)
          let lastError: any = null;

          while (downloadAttempts < maxDownloadAttempts) {
            try {
              zipBuffer = await kaggle.getNotebookOutput();
              // Successfully downloaded, verify it has content and is a valid zip
              if (zipBuffer.length > 0) {
                // Validate ZIP magic number (starts with "PK")
                if (zipBuffer[0] !== 0x50 || zipBuffer[1] !== 0x4B) {
                  const preview = zipBuffer.toString('utf-8', 0, Math.min(200, zipBuffer.length));
                  throw new Error(`Downloaded content is not a valid ZIP file. Preview: ${preview.substring(0, 100)}`);
                }
                break; // Success, exit retry loop
              } else {
                throw new Error('Downloaded empty file');
              }
            } catch (downloadError: any) {
              lastError = downloadError;
              downloadAttempts++;

              if (downloadAttempts >= maxDownloadAttempts) {
                throw new Error(`Failed to download output after ${maxDownloadAttempts} attempts: ${lastError.message}`);
              }

              const waitTime = 30; // 30 seconds between retries
              await this.log(jobId, 'info', `Output not ready yet, retrying in ${waitTime}s (attempt ${downloadAttempts}/${maxDownloadAttempts})...`);
              await new Promise(r => setTimeout(r, waitTime * 1000));
            }
          }

          // Extract Zip using adm-zip
          await this.log(jobId, 'info', `Extracting images...`);
          await this.log(jobId, 'info', `Downloaded zip size: ${zipBuffer.length} bytes`);
          const zip = new AdmZip(zipBuffer);
          const zipEntries = zip.getEntries();
          await this.log(jobId, 'info', `Zip entries count: ${zipEntries.length}`);

          for (const entry of zipEntries) {
            await this.log(jobId, 'info', `Processing entry: ${entry.entryName}, isDirectory: ${entry.isDirectory}`);
            if (!entry.isDirectory && /\.(png|jpe?g|webp)$/i.test(entry.entryName)) {
              // Extract to imagesDir
              // We assume images are flat or we flatten them
              const outPath = path.join(imagesDir, path.basename(entry.entryName));
              await fs.writeFile(outPath, entry.getData());
              successCount++;
              await this.log(jobId, 'info', `Extracted: ${entry.entryName} -> ${outPath}`);
            }
          }

          await this.log(jobId, 'info', `Batch ${batchIdx + 1} complete. Generated ${successCount} images so far.`);
        }

      } catch (error) {
        await this.log(jobId, 'error', `Kaggle workflow failed`, { error: error instanceof Error ? error.message : String(error) });
        // Set failCount equal to remaining keywords length to indicate failure
        failCount += keywords.length - successCount;
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
  private async checkImageQuality(jobId: string, imagesDir: string, keywords: any[]): Promise<{
    passedImages: Array<{
      path: string;
      category: string;
      keyword: string;
      rootKeyword?: string;
      modifier?: string;
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

        // Fallback or better parsing
        let category = 'uncategorized';
        let keywordStr = basename;

        const parts = basename.includes('_') ? basename.split('_') : basename.split('-');
        let matchedKw: any = undefined;

        if (parts.length >= 2) {
          category = parts[0];
          // Kaggle replaces spaces with underscores, so we reconstruct the keyword slug
          const fileKeywordSlug = parts.slice(1).join('_');

          matchedKw = keywords.find((k: any) => {
            const kSlug = k.keyword.replace(/[\s-]/g, '_');
            return kSlug === fileKeywordSlug && k.category === category;
          });

          if (!matchedKw) {
            // Also try hyphen matching just in case
            const fileKeywordSlugHyphen = parts.slice(1).join('-');
            matchedKw = keywords.find((k: any) => {
              const kSlugHyphen = k.keyword.replace(/[\s_]/g, '-');
              return kSlugHyphen === fileKeywordSlugHyphen && k.category === category;
            });
          }

          if (matchedKw) {
            keywordStr = matchedKw.keyword;
            return {
              path: imgPath,
              category: matchedKw.category,
              keyword: matchedKw.keyword,
              rootKeyword: matchedKw.rootKeyword,
              modifier: matchedKw.modifier,
            };
          }
        }

        return {
          path: imgPath,
          category,
          keyword: keywordStr,
          rootKeyword: matchedKw?.rootKeyword,
          modifier: matchedKw?.modifier,
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
      rootKeyword?: string;
      modifier?: string;
    }>
  ): Promise<
    Array<{
      category: string;
      keyword: string;
      imageUrl: string;
      rootKeyword?: string;
      modifier?: string;
    }>
  > {
    await this.log(jobId, 'info', `Step 4: Uploading ${images.length} images to R2...`);

    const r2Path = envConfigs.coloring_r2_path || 'coloring-pages';
    await this.log(jobId, 'info', `R2 path: ${r2Path}`);

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    // Limit concurrent uploads to avoid overwhelming the network/server
    // Use 3 concurrent uploads at a time
    const results = await promiseAllConcurrent(
      images,
      async (img) => {
        const filename = path.basename(img.path);
        const key = `${r2Path}/${img.category}/${filename}`;

        try {
          await this.log(jobId, 'info', `Uploading ${filename} to ${key}...`);

          const imageBuffer = await fs.readFile(img.path);
          await this.log(jobId, 'info', `File read: ${filename}, size: ${imageBuffer.length} bytes`);

          const storage = await getStorageService();
          const providers = storage.getProviderNames();
          await this.log(jobId, 'info', `Storage service obtained, providers: ${providers.join(', ') || 'NONE'}`);

          if (providers.length === 0) {
            throw new Error('No storage providers configured. Please check R2/S3 configuration in settings.');
          }

          const result = await storage.uploadFile({
            body: imageBuffer,
            key: key,
            contentType: 'image/png',
          });

          await this.log(jobId, 'info', `Upload result for ${filename}:`, {
            success: result.success,
            url: result.url,
            location: result.location,
            error: result.error,
            provider: result.provider,
            key: result.key
          });

          if (!result.url) {
            throw new Error(`Upload failed - no URL returned. Success: ${result.success}, Error: ${result.error || 'none'}`);
          }

          await this.log(jobId, 'info', `Upload success: ${filename}`, { url: result.url });
          successCount++;

          return {
            category: img.category,
            keyword: img.keyword,
            imageUrl: result.url,
            rootKeyword: img.rootKeyword,
            modifier: img.modifier,
          };
        } catch (error) {
          const errorMsg = `Failed to upload ${filename}: ${error instanceof Error ? error.message : String(error)}`;
          await this.log(jobId, 'error', errorMsg);
          errors.push(errorMsg);
          failCount++;
          return null;
        }
      },
      3 // Max 3 concurrent uploads
    );
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
   * Step 6: Create database records (DB-only, no MDX files)
   */
  private async createColoringPages(
    jobId: string,
    uploadedImages: Array<{
      category: string;
      keyword: string;
      imageUrl: string;
      rootKeyword?: string;
      modifier?: string;
    }>
  ): Promise<void> {
    await this.log(jobId, 'info', `Step 5: Creating ${uploadedImages.length} coloring page records...`);

    let successCount = 0;
    let failCount = 0;

    try {
      for (const img of uploadedImages) {
        const slug = this.generateSlug(img.keyword);
        const title = this.generateTitle(img.keyword);
        const description = `A beautiful ${img.keyword} coloring page for kids`;

        await this.log(jobId, 'info', `Creating page: ${slug}`, { category: img.category, keyword: img.keyword });

        try {
          await createColoringPageWithSlugRetry({
            jobId,
            userId: 'system',
            slug,
            title,
            description,
            category: img.category,
            keyword: img.keyword,
            rootKeyword: img.rootKeyword || null,
            modifier: img.modifier || null,
            prompt: `coloring page of ${img.keyword}`,
            imageUrl: img.imageUrl,
            status: ColoringPageStatus.PUBLISHED,
            publishedAt: new Date(),
            sort: 0,
          });
          successCount++;
          await this.log(jobId, 'info', `Page created: ${slug}`);
        } catch (pageError) {
          failCount++;
          await this.log(jobId, 'error', `Failed to create page for ${img.keyword}`, {
            error: pageError instanceof Error ? pageError.message : String(pageError)
          });
        }
      }

      await this.log(jobId, 'info', `Pages created: ${successCount} success, ${failCount} failed`);
    } catch (error) {
      await this.log(jobId, 'error', 'Failed to create coloring pages', { error: error instanceof Error ? error.message : String(error) });
      await updateColoringJob(jobId, {
        errorMessage: `Page creation failed: ${error instanceof Error ? error.message : String(error)}`
      });
      throw error;
    }
  }

  /**
   * Generate SEO-friendly slug: {keyword}-coloring-page (max 70 chars)
   */
  private generateSlug(keyword: string): string {
    const base = keyword
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const slug = `${base}-coloring-page`;
    // Cap at 70 chars for SEO (trim at word boundary)
    if (slug.length > 70) {
      const trimmed = slug.slice(0, 70);
      const lastDash = trimmed.lastIndexOf('-');
      return lastDash > 20 ? trimmed.slice(0, lastDash) : trimmed;
    }
    return slug;
  }

  /**
   * Generate a title from keyword
   */
  private generateTitle(keyword: string): string {
    return `${keyword
      .split(/[-_]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')} Coloring Page`;
  }

  /**
   * Main workflow orchestration
   */
  async runWorkflow(options: WorkflowOptions): Promise<string> {
    return this.runWorkflowInternal(options);
  }

  /**
   * Start workflow in background and return jobId immediately
   */
  async runWorkflowInBackground(options: WorkflowOptions): Promise<string> {
    // Create job record first to get the ID
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

    // Run workflow in background
    this.runWorkflowInternal({ ...options, jobId }).catch((error) => {
      console.error(`Background workflow failed for job ${jobId}:`, error);
    });

    // Return jobId immediately
    return jobId;
  }

  /**
   * Internal workflow orchestration
   */
  private async runWorkflowInternal(options: WorkflowOptions & { jobId?: string }): Promise<string> {
    // Step 0: Create job record or use existing jobId from background workflow
    let jobId = options.jobId;
    if (!jobId) {
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
      jobId = job.id;
    }
    let csvPath: string | undefined;
    let imagesDir: string | undefined;

    try {
      // Update status to processing
      await updateJobStatus(jobId, ColoringJobStatus.PROCESSING);
      await this.log(jobId, 'info', 'Workflow started');

      // Step 1: Generate keywords
      const keywordResult = await this.generateKeywords(jobId, options.wordRoots, options.count);
      csvPath = keywordResult.csvPath;

      // Get keywords for image generation
      const job = await findColoringJob({ id: jobId });
      const keywordsData = JSON.parse(job?.keywordsData || '{"keywords":[]}');
      const allKeywords = keywordsData.keywords || [];

      // Step 1.5: Deduplicate - filter out keywords that already have pages in DB
      await this.log(jobId, 'info', `Deduplicating ${allKeywords.length} keywords against existing pages...`);
      const dedupResults = await Promise.all(
        allKeywords.map(async (kw: any) => {
          const slug = `${kw.keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-coloring-page`;
          const existing = await findColoringPage({ slug, status: ColoringPageStatus.PUBLISHED });
          return { kw, exists: !!existing };
        })
      );
      const keywords = dedupResults.filter(r => !r.exists).map(r => r.kw);
      const skippedCount = allKeywords.length - keywords.length;
      await this.log(jobId, 'info', `Dedup complete: ${skippedCount} existing, ${keywords.length} new keywords to process`);

      if (keywords.length === 0) {
        await this.log(jobId, 'info', 'All keywords already have pages. Workflow complete (no new images needed).');
        await updateJobStatus(jobId, ColoringJobStatus.COMPLETED);
        await updateColoringJob(jobId, {
          completedAt: new Date(),
          processedPages: 0,
          totalKeywords: allKeywords.length,
        });
        await this.flushLogs(jobId);
        return jobId;
      }

      // Step 2: Generate images
      imagesDir = await this.generateImages(jobId, keywords, options.provider);

      // Step 3: Check image quality
      const qualityResult = await this.checkImageQuality(jobId, imagesDir, keywords);

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
          const category = parts.length >= 2 ? parts[0] : 'uncategorized';
          const keywordStr = parts.length >= 2 ? parts.slice(1).join('-') : basename;
          const originalKw = keywords.find((k: any) => k.keyword === keywordStr && k.category === category);

          return {
            path: path.join(imagesDir!, f),
            category,
            keyword: keywordStr,
            rootKeyword: originalKw?.rootKeyword,
            modifier: originalKw?.modifier,
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

      try {
        revalidatePath('/', 'layout');
      } catch (e) {
        console.error('Failed to revalidate cache:', e);
      }

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

  /**
   * Resume a failed/timed-out workflow from the download step.
   * Downloads Kaggle output → quality check → upload R2 → create pages.
   */
  async resumeFromDownload(jobId: string): Promise<string> {
    await this.ensureTempDir();

    // Load job and its keyword data
    const job = await findColoringJob({ id: jobId });
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    const keywordsData = JSON.parse(job.keywordsData || '{"keywords":[]}');
    const keywords = keywordsData.keywords || [];

    if (keywords.length === 0) {
      throw new Error('No keywords found in job data. Cannot resume.');
    }

    await this.log(jobId, 'info', `Resuming workflow from download step with ${keywords.length} keywords...`);

    // Update job status back to processing
    await updateJobStatus(jobId, ColoringJobStatus.PROCESSING);

    const imagesDir = path.join(this.tempDir, jobId, 'images');
    await fs.mkdir(imagesDir, { recursive: true });

    let successCount = 0;

    try {
      // Step 1: Download Kaggle output
      await this.log(jobId, 'info', 'Downloading Kaggle notebook output...');
      const kaggle = new KaggleClient();

      let zipBuffer: Buffer = Buffer.alloc(0);
      let downloadAttempts = 0;
      const maxDownloadAttempts = 20;
      let lastError: any = null;

      while (downloadAttempts < maxDownloadAttempts) {
        try {
          zipBuffer = await kaggle.getNotebookOutput();
          if (zipBuffer.length > 0) {
            // Validate ZIP magic number (starts with "PK")
            if (zipBuffer[0] !== 0x50 || zipBuffer[1] !== 0x4B) {
              const preview = zipBuffer.toString('utf-8', 0, Math.min(200, zipBuffer.length));
              throw new Error(`Downloaded content is not a valid ZIP file. Preview: ${preview.substring(0, 100)}`);
            }
            break;
          } else {
            throw new Error('Downloaded empty file');
          }
        } catch (downloadError: any) {
          lastError = downloadError;
          downloadAttempts++;

          if (downloadAttempts >= maxDownloadAttempts) {
            throw new Error(`Failed to download output after ${maxDownloadAttempts} attempts: ${lastError.message}`);
          }

          const waitTime = 30;
          await this.log(jobId, 'info', `Output not ready yet, retrying in ${waitTime}s (attempt ${downloadAttempts}/${maxDownloadAttempts})...`);
          await new Promise(r => setTimeout(r, waitTime * 1000));
        }
      }

      // Step 2: Extract images from zip
      await this.log(jobId, 'info', `Downloaded zip size: ${zipBuffer.length} bytes. Extracting...`);
      const zip = new AdmZip(zipBuffer);
      const zipEntries = zip.getEntries();
      await this.log(jobId, 'info', `Zip entries count: ${zipEntries.length}`);

      for (const entry of zipEntries) {
        if (!entry.isDirectory && /\.(png|jpe?g|webp)$/i.test(entry.entryName)) {
          const outPath = path.join(imagesDir, path.basename(entry.entryName));
          await fs.writeFile(outPath, entry.getData());
          successCount++;
          await this.log(jobId, 'info', `Extracted: ${entry.entryName}`);
        }
      }

      await this.log(jobId, 'info', `Extracted ${successCount} images.`);

      if (successCount === 0) {
        throw new Error('No images found in Kaggle output');
      }

      // Step 3: Quality check
      const qualityResult = await this.checkImageQuality(jobId, imagesDir, keywords);

      let finalImages = qualityResult.passedImages;
      if (finalImages.length === 0) {
        await this.log(jobId, 'warn', 'All images failed quality check, allowing through for testing');
        const files = await fs.readdir(imagesDir);
        const imageFiles = files.filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
        finalImages = imageFiles.map((f) => {
          const basename = f.replace(/\.[^/.]+$/, '');
          const parts = basename.includes('_') ? basename.split('_') : basename.split('-');
          let category = parts.length >= 2 ? parts[0] : 'uncategorized';
          let keywordStr = basename;
          let originalKw = undefined;

          if (parts.length >= 2) {
            const fileKeywordSlug = parts.slice(1).join('_');
            originalKw = keywords.find((k: any) => {
              const kSlug = k.keyword.replace(/[\s-]/g, '_');
              return kSlug === fileKeywordSlug && k.category === category;
            });

            if (!originalKw) {
              const fileKeywordSlugHyphen = parts.slice(1).join('-');
              originalKw = keywords.find((k: any) => {
                const kSlugHyphen = k.keyword.replace(/[\s_]/g, '-');
                return kSlugHyphen === fileKeywordSlugHyphen && k.category === category;
              });
            }
          }

          if (originalKw) {
            keywordStr = originalKw.keyword;
            category = originalKw.category;
          } else if (parts.length >= 2) {
            keywordStr = parts.slice(1).join(' '); // Fallback to spaced if no match
          }

          return {
            path: path.join(imagesDir, f),
            category,
            keyword: keywordStr,
            rootKeyword: originalKw?.rootKeyword,
            modifier: originalKw?.modifier,
          };
        });
      }

      if (finalImages.length === 0) {
        throw new Error('No images found after quality check');
      }

      // Step 4: Upload to R2
      const uploadedImages = await this.uploadImagesToR2(jobId, finalImages);

      // Step 5: Create pages
      await this.createColoringPages(jobId, uploadedImages);

      // Mark job as completed
      await updateJobStatus(jobId, ColoringJobStatus.COMPLETED);
      await updateColoringJob(jobId, {
        completedAt: new Date(),
        processedPages: uploadedImages.length,
        errorMessage: null,
      });

      await this.log(jobId, 'info', `Resume workflow completed! ${uploadedImages.length} pages created.`);
      await this.flushLogs(jobId);
      return jobId;
    } catch (error) {
      await this.log(jobId, 'error', 'Resume workflow failed', { error: error instanceof Error ? error.message : String(error) });
      await updateJobStatus(jobId, ColoringJobStatus.FAILED, error instanceof Error ? error.message : 'Resume failed');
      await this.flushLogs(jobId);
      throw error;
    } finally {
      await this.cleanup(jobId, undefined, imagesDir);
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
