import type {
  StorageConfigs,
  StorageDownloadUploadOptions,
  StorageProvider,
  StorageUploadOptions,
  StorageUploadResult,
} from '.';

/**
 * R2 storage provider configs
 * @docs https://developers.cloudflare.com/r2/
 */
export interface R2Configs extends StorageConfigs {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  uploadPath?: string;
  region?: string;
  endpoint?: string;
  publicDomain?: string;
}

/**
 * R2 storage provider implementation
 * @website https://www.cloudflare.com/products/r2/
 */
export class R2Provider implements StorageProvider {
  readonly name = 'r2';
  configs: R2Configs;

  constructor(configs: R2Configs) {
    this.configs = configs;
    // Validate required configs
    if (!configs.accountId) {
      throw new Error('R2 accountId is required. Please set CF_R2_ACCOUNT_ID environment variable.');
    }
    if (!configs.accessKeyId) {
      throw new Error('R2 accessKeyId is required. Please set R2_ACCESS_KEY_ID environment variable.');
    }
    if (!configs.secretAccessKey) {
      throw new Error('R2 secretAccessKey is required. Please set R2_SECRET_ACCESS_KEY environment variable.');
    }
    if (!configs.bucket) {
      throw new Error('R2 bucket is required. Please set R2_BUCKET_NAME environment variable.');
    }
  }

  private getUploadPath() {
    let uploadPath = this.configs.uploadPath || 'uploads';
    if (uploadPath.startsWith('/')) {
      uploadPath = uploadPath.slice(1);
    }
    if (uploadPath.endsWith('/')) {
      uploadPath = uploadPath.slice(0, -1);
    }
    return uploadPath;
  }

  private getEndpoint() {
    if (this.configs.endpoint) {
      return this.configs.endpoint;
    }
    if (!this.configs.accountId) {
      console.error('[R2] accountId is missing, cannot construct default endpoint');
      return '';
    }
    return `https://${this.configs.accountId}.r2.cloudflarestorage.com`;
  }

  getPublicUrl = (options: { key: string; bucket?: string }) => {
    const uploadBucket = options.bucket || this.configs.bucket;
    const uploadPath = this.getUploadPath();
    // Support absolute keys (starting with /) - don't add uploadPath
    const isAbsoluteKey = options.key.startsWith('/');
    const normalizedKey = isAbsoluteKey ? options.key.slice(1) : options.key;
    const keyPath = isAbsoluteKey ? normalizedKey : `${uploadPath}/${options.key}`;
    const url = `${this.getEndpoint()}/${uploadBucket}/${keyPath}`;
    const resultUrl = this.configs.publicDomain
      ? `${this.configs.publicDomain}/${keyPath}`
      : url;

    console.log('[R2 getPublicUrl]', {
      inputKey: options.key,
      inputBucket: options.bucket,
      uploadBucket,
      uploadPath,
      isAbsoluteKey,
      normalizedKey,
      keyPath,
      publicDomain: this.configs.publicDomain,
      endpoint: this.getEndpoint(),
      resultUrl
    });

    return resultUrl;
  };

  exists = async (options: { key: string; bucket?: string }) => {
    try {
      const uploadBucket = options.bucket || this.configs.bucket;
      if (!uploadBucket) return false;
      const uploadPath = this.getUploadPath();
      // Support absolute keys (starting with /) - don't add uploadPath
      const isAbsoluteKey = options.key.startsWith('/');
      const normalizedKey = isAbsoluteKey ? options.key.slice(1) : options.key;
      const keyPath = isAbsoluteKey ? normalizedKey : `${uploadPath}/${options.key}`;
      const url = `${this.getEndpoint()}/${uploadBucket}/${keyPath}`;

      const { AwsClient } = await import('aws4fetch');
      const client = new AwsClient({
        accessKeyId: this.configs.accessKeyId,
        secretAccessKey: this.configs.secretAccessKey,
        region: this.configs.region || 'auto',
      });

      const response = await client.fetch(
        new Request(url, {
          method: 'HEAD',
        })
      );

      return response.ok;
    } catch {
      return false;
    }
  };

  async uploadFile(
    options: StorageUploadOptions
  ): Promise<StorageUploadResult> {
    try {
      const uploadBucket = options.bucket || this.configs.bucket;
      if (!uploadBucket) {
        return {
          success: false,
          error: 'Bucket is required',
          provider: this.name,
        };
      }

      const bodyArray =
        options.body instanceof Buffer
          ? new Uint8Array(options.body)
          : options.body;

      const uploadPath = this.getUploadPath();
      const endpoint = this.getEndpoint();

      // Validate endpoint before attempting upload
      if (!endpoint) {
        return {
          success: false,
          error: 'R2 endpoint is not configured. Please set CF_R2_ACCOUNT_ID environment variable.',
          provider: this.name,
        };
      }

      // Support absolute keys (starting with /) - don't add uploadPath
      const isAbsoluteKey = options.key.startsWith('/');
      const normalizedKey = isAbsoluteKey ? options.key.slice(1) : options.key;
      const keyPath = isAbsoluteKey ? normalizedKey : `${uploadPath}/${options.key}`;

      // R2 endpoint format: https://<accountId>.r2.cloudflarestorage.com
      // Use custom endpoint if provided, otherwise use default
      const url = `${endpoint}/${uploadBucket}/${keyPath}`;

      const { AwsClient } = await import('aws4fetch');

      // R2 uses "auto" as region for S3 API compatibility
      const client = new AwsClient({
        accessKeyId: this.configs.accessKeyId,
        secretAccessKey: this.configs.secretAccessKey,
        region: this.configs.region || 'auto',
      });

      const headers: Record<string, string> = {
        'Content-Type': options.contentType || 'application/octet-stream',
        'Content-Disposition': options.disposition || 'inline',
        'Content-Length': bodyArray.length.toString(),
      };

      const request = new Request(url, {
        method: 'PUT',
        headers,
        body: bodyArray as any,
      });

      const response = await client.fetch(request);

      console.log('[R2 Upload] Response status:', response.status, response.statusText);

      if (!response.ok) {
        const responseText = await response.text();
        console.error('[R2 Upload] Upload failed, response:', responseText);
        return {
          success: false,
          error: `Upload failed: ${response.statusText}`,
          provider: this.name,
        };
      }

      console.log('[R2 Upload] Upload OK, computing public URL...');
      console.log('[R2 Upload] Input:', {
        key: options.key,
        bucket: uploadBucket,
        uploadPath,
        publicDomain: this.configs.publicDomain,
        endpoint
      });

      const publicUrl =
        this.getPublicUrl({ key: options.key, bucket: uploadBucket }) || url;

      console.log('[R2 Upload] Computed publicUrl:', publicUrl);
      console.log('[R2 Upload] Fallback URL:', url);

      return {
        success: true,
        location: url,
        bucket: uploadBucket,
        uploadPath: uploadPath,
        key: options.key,
        filename: options.key.split('/').pop(),
        url: publicUrl,
        provider: this.name,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.name,
      };
    }
  }

  async downloadAndUpload(
    options: StorageDownloadUploadOptions
  ): Promise<StorageUploadResult> {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[R2 downloadAndUpload] Attempt ${attempt}/${maxRetries} for URL: ${options.url}`);

        // Add timeout to fetch request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        const response = await fetch(options.url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const error = `HTTP error! status: ${response.status} ${response.statusText}`;
          console.error(`[R2 downloadAndUpload] ${error}`);

          if (attempt === maxRetries) {
            return {
              success: false,
              error,
              provider: this.name,
            };
          }
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempt - 1)));
          continue;
        }

        if (!response.body) {
          return {
            success: false,
            error: 'No body in response',
            provider: this.name,
          };
        }

        const arrayBuffer = await response.arrayBuffer();
        const body = new Uint8Array(arrayBuffer);

        console.log(`[R2 downloadAndUpload] Download successful (${body.length} bytes), uploading...`);

        const uploadResult = await this.uploadFile({
          body,
          key: options.key,
          bucket: options.bucket,
          contentType: options.contentType,
          disposition: options.disposition,
        });

        if (uploadResult.success) {
          console.log(`[R2 downloadAndUpload] Upload successful: ${uploadResult.url}`);
        }

        return uploadResult;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[R2 downloadAndUpload] Attempt ${attempt}/${maxRetries} failed:`, errorMessage);

        // Check if error is due to abort (timeout)
        if (error instanceof Error && error.name === 'AbortError') {
          console.error('[R2 downloadAndUpload] Request timed out');
        }

        if (attempt === maxRetries) {
          return {
            success: false,
            error: `Failed after ${maxRetries} attempts: ${errorMessage}`,
            provider: this.name,
          };
        }

        // Wait before retry with exponential backoff
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`[R2 downloadAndUpload] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return {
      success: false,
      error: 'Max retries exceeded',
      provider: this.name,
    };
  }
}

/**
 * Create R2 provider with configs
 */
export function createR2Provider(configs: R2Configs): R2Provider {
  return new R2Provider(configs);
}
