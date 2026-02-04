import packageJson from '../../package.json';

// Load .env files for scripts (tsx/ts-node) - but NOT in Edge Runtime or browser
// This ensures scripts can read DATABASE_URL and other env vars
// Check for real Node.js environment by looking at global 'process' properties
if (
  typeof process !== 'undefined' &&
  typeof process.cwd === 'function' &&
  !process.env.NEXT_RUNTIME // Skip if in Next.js runtime (already loaded)
) {
  try {
    const dotenv = require('dotenv');
    dotenv.config({ path: '.env.development' });
    dotenv.config({ path: '.env', override: false });
  } catch (e) {
    // Silently fail - dotenv might not be available in some environments
  }
}

export type ConfigMap = Record<string, string>;

export const envConfigs: ConfigMap = {
  app_url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  app_name: process.env.NEXT_PUBLIC_APP_NAME ?? 'ColoringPages',
  app_description: process.env.NEXT_PUBLIC_APP_DESCRIPTION ?? '',
  app_logo: process.env.NEXT_PUBLIC_APP_LOGO ?? '/logo.png',
  app_favicon: process.env.NEXT_PUBLIC_APP_FAVICON ?? '/favicon.ico',
  app_preview_image:
    process.env.NEXT_PUBLIC_APP_PREVIEW_IMAGE ?? '/preview.png',
  theme: process.env.NEXT_PUBLIC_THEME ?? 'default',
  appearance: process.env.NEXT_PUBLIC_APPEARANCE ?? 'system',
  locale: process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? 'en',
  database_url: process.env.DATABASE_URL ?? '',
  database_auth_token: process.env.DATABASE_AUTH_TOKEN ?? '',
  database_provider: process.env.DATABASE_PROVIDER ?? 'postgresql',
  db_schema_file: process.env.DB_SCHEMA_FILE ?? './src/config/db/schema.ts',
  // PostgreSQL schema name (e.g. 'web'). Default: 'public'
  db_schema: process.env.DB_SCHEMA ?? 'public',
  // Drizzle migrations journal table name (avoid conflicts across projects)
  db_migrations_table:
    process.env.DB_MIGRATIONS_TABLE ?? '__drizzle_migrations',
  // Drizzle migrations journal schema (default in drizzle-kit is 'drizzle')
  // We keep 'public' as template default for stability on fresh Supabase DBs.
  db_migrations_schema: process.env.DB_MIGRATIONS_SCHEMA ?? 'drizzle',
  // Output folder for drizzle-kit generated migrations
  db_migrations_out:
    process.env.DB_MIGRATIONS_OUT ?? './src/config/db/migrations',
  db_singleton_enabled: process.env.DB_SINGLETON_ENABLED || 'false',
  db_max_connections: process.env.DB_MAX_CONNECTIONS || '1',
  auth_url: process.env.AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || '',
  auth_secret: process.env.AUTH_SECRET ?? '', // openssl rand -base64 32
  version: packageJson.version,
  locale_detect_enabled:
    process.env.NEXT_PUBLIC_LOCALE_DETECT_ENABLED ?? 'false',
  // Kaggle Configuration
  kaggle_username: process.env.KAGGLE_USERNAME ?? '',
  kaggle_key: process.env.KAGGLE_KEY ?? '',
  kaggle_notebook_slug: process.env.KAGGLE_NOTEBOOK_SLUG ?? '',
  kaggle_notebook_version: process.env.KAGGLE_NOTEBOOK_VERSION ?? '',
  // Coloring Workflow Configuration
  coloring_workflow_enabled: process.env.COLORING_WORKFLOW_ENABLED ?? 'false',
  coloring_workflow_schedule_time: process.env.COLORING_WORKFLOW_SCHEDULE_TIME ?? '02:00',
  coloring_workflow_max_daily: process.env.COLORING_WORKFLOW_MAX_DAILY ?? '100',
  coloring_mdx_path: process.env.COLORING_MDX_PATH ?? 'content/coloring-pages',
  coloring_r2_path: process.env.COLORING_R2_PATH ?? 'coloring-pages',
  // Image Quality Settings
  coloring_min_image_width: process.env.COLORING_MIN_IMAGE_WIDTH ?? '512',
  coloring_max_image_width: process.env.COLORING_MAX_IMAGE_WIDTH ?? '4096',
  coloring_min_image_size: process.env.COLORING_MIN_IMAGE_SIZE ?? '10240',
  coloring_max_image_size: process.env.COLORING_MAX_IMAGE_SIZE ?? '5242880',
  coloring_min_quality_score: process.env.COLORING_MIN_QUALITY_SCORE ?? '70',
  coloring_use_ai_validation: process.env.COLORING_USE_AI_VALIDATION ?? 'true',
  coloring_ai_validation_model: process.env.COLORING_AI_VALIDATION_MODEL ?? 'openai',
  // R2 Storage Configuration
  r2_account_id: process.env.CF_R2_ACCOUNT_ID ?? '',
  r2_access_key: process.env.R2_ACCESS_KEY_ID ?? '',
  r2_secret_key: process.env.R2_SECRET_ACCESS_KEY ?? '',
  r2_bucket_name: process.env.R2_BUCKET_NAME ?? '',
  r2_domain: process.env.R2_DOMAIN ?? '',
};
