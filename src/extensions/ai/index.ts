import { AIFile, AIMediaType, AIProvider } from './types';

export * from './types';

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
 * AI Manager to manage all AI providers
 */
export class AIManager {
  // ai providers
  private providers: AIProvider[] = [];
  // default ai provider
  private defaultProvider?: AIProvider;

  // add ai provider
  addProvider(provider: AIProvider, isDefault = false) {
    this.providers.push(provider);
    if (isDefault) {
      this.defaultProvider = provider;
    }
  }

  // get provider by name
  getProvider(name: string): AIProvider | undefined {
    return this.providers.find((p) => p.name === name);
  }

  // get all provider names
  getProviderNames(): string[] {
    return this.providers.map((p) => p.name);
  }

  // get all media types
  getMediaTypes(): string[] {
    return Object.values(AIMediaType);
  }

  getDefaultProvider(): AIProvider | undefined {
    // set default provider if not set
    if (!this.defaultProvider && this.providers.length > 0) {
      this.defaultProvider = this.providers[0];
    }

    return this.defaultProvider;
  }
}

// save files to custom storage
export async function saveFiles(files: AIFile[]) {
  try {
    const { getStorageService } = await import('@/shared/services/storage');
    const storageService = await getStorageService();

    const uploadedFiles = await promiseAllConcurrent(
      files,
      async (file) => {
        const result = await storageService.downloadAndUpload({
          url: file.url,
          contentType: file.contentType,
          key: file.key,
        });
        return {
          ...file,
          url: result.url,
        } as AIFile;
      },
      3 // Max 3 concurrent uploads
    );

    return uploadedFiles;
  } catch (error) {
    console.error('save files failed:', error);
    return undefined;
  }
}

// ai manager
export const aiManager = new AIManager();

export * from './kie';
export * from './replicate';
export * from './gemini';
export * from './fal';
export * from './siliconflow';
export * from './runware';
