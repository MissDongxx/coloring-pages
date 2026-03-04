import { R2Provider, S3Provider, StorageManager } from '@/extensions/storage';
import { Configs, getAllConfigs } from '@/shared/models/config';

/**
 * get storage service with configs
 */
export function getStorageServiceWithConfigs(configs: Configs) {
  const storageManager = new StorageManager();

  console.log('[Storage] Initializing with configs:', {
    hasR2AccessKey: !!configs.r2_access_key,
    hasR2SecretKey: !!configs.r2_secret_key,
    hasR2Bucket: !!configs.r2_bucket_name,
    hasR2AccountId: !!configs.r2_account_id,
    r2Bucket: configs.r2_bucket_name,
    r2Domain: configs.r2_domain,
    r2UploadPath: configs.r2_upload_path,
    r2Endpoint: configs.r2_endpoint,
  });

  // Add R2 provider if configured
  if (
    configs.r2_access_key &&
    configs.r2_secret_key &&
    configs.r2_bucket_name
  ) {
    // r2_account_id stores the Cloudflare Account ID
    // Also try r2_endpoint as fallback for custom endpoint configuration
    const accountId = configs.r2_account_id || configs.r2_accountId || '';

    if (!accountId) {
      console.error('[Storage] R2 Account ID is missing! Please set CF_R2_ACCOUNT_ID environment variable or configure r2_account_id in settings.');
    }

    // If r2_endpoint is set but doesn't start with https://, add it
    let r2Endpoint = configs.r2_endpoint;
    if (r2Endpoint && !r2Endpoint.startsWith('http://') && !r2Endpoint.startsWith('https://')) {
      r2Endpoint = `https://${r2Endpoint}`;
    }

    storageManager.addProvider(
      new R2Provider({
        accountId: accountId,
        accessKeyId: configs.r2_access_key,
        secretAccessKey: configs.r2_secret_key,
        bucket: configs.r2_bucket_name,
        uploadPath: configs.r2_upload_path,
        region: 'auto', // R2 uses "auto" as region
        endpoint: r2Endpoint, // Optional custom endpoint
        publicDomain: configs.r2_domain,
      }),
      true // Set R2 as default
    );
  } else {
    console.error('[Storage] R2 provider NOT initialized - missing required configs:', {
      hasAccessKey: !!configs.r2_access_key,
      hasSecretKey: !!configs.r2_secret_key,
      hasBucket: !!configs.r2_bucket_name,
    });
  }

  // Add S3 provider if configured (future support)
  if (configs.s3_access_key && configs.s3_secret_key && configs.s3_bucket) {
    storageManager.addProvider(
      new S3Provider({
        endpoint: configs.s3_endpoint,
        region: configs.s3_region,
        accessKeyId: configs.s3_access_key,
        secretAccessKey: configs.s3_secret_key,
        bucket: configs.s3_bucket,
        publicDomain: configs.s3_domain,
      })
    );
  }

  return storageManager;
}

/**
 * global storage service
 */
let storageService: StorageManager | null = null;

/**
 * get storage service instance
 */
export async function getStorageService(
  configs?: Configs
): Promise<StorageManager> {
  if (!configs) {
    configs = await getAllConfigs();
  }
  storageService = getStorageServiceWithConfigs(configs);

  return storageService;
}
