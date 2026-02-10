import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { envConfigs } from '@/config';
import { isCloudflareWorker } from '@/shared/lib/env';

// Global database connection instance (singleton pattern)
let dbInstance: ReturnType<typeof drizzle> | null = null;
let client: ReturnType<typeof postgres> | null = null;

/**
 * Get Cloudflare Workers env from the global context
 * This must be called within a request handler to have access to the env
 */
function getCloudflareEnv(): any {
  if (!isCloudflareWorker) {
    return {};
  }
  const cloudflareSymbol = Symbol.for('__cloudflare-context__');
  const cloudflareContext = (globalThis as any)[cloudflareSymbol] as { env?: any } | undefined;
  const env = cloudflareContext?.env || {};
  console.log('[DB] Cloudflare env keys:', Object.keys(env));
  console.log('[DB] Has HYPERDRIVE:', 'HYPERDRIVE' in env);
  return env;
}

export function getPostgresDb() {
  let databaseUrl = envConfigs.database_url;

  let isHyperdrive = false;
  const schemaName = (envConfigs.db_schema || 'public').trim();
  const connectionSchemaOptions =
    schemaName && schemaName !== 'public'
      ? { connection: { options: `-c search_path=${schemaName}` } }
      : {};

  if (isCloudflareWorker) {
    console.log('[DB] Running in Cloudflare Workers environment');
    const env = getCloudflareEnv();

    // Detect if set Hyperdrive
    isHyperdrive = 'HYPERDRIVE' in env;

    if (isHyperdrive) {
      const hyperdrive = env.HYPERDRIVE;
      databaseUrl = hyperdrive.connectionString;
      console.log('[DB] Using Hyperdrive connection:', databaseUrl ? 'OK' : 'MISSING');
    } else {
      console.error('[DB] HYPERDRIVE binding not found. Available keys:', Object.keys(env));
      throw new Error(
        'Cloudflare Workers requires Hyperdrive to connect to PostgreSQL. ' +
        'Please configure Hyperdrive in your Cloudflare dashboard and add it to wrangler.toml. ' +
        'See: https://developers.cloudflare.com/hyperdrive/'
      );
    }
  }

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set');
  }

  // In Cloudflare Workers, create new connection each time
  if (isCloudflareWorker) {
    console.log('in Cloudflare Workers environment');
    // Workers environment uses minimal configuration
    const client = postgres(databaseUrl, {
      prepare: false,
      max: 1, // Limit to 1 connection in Workers
      idle_timeout: 10, // Shorter timeout for Workers
      connect_timeout: 5,
      ...connectionSchemaOptions,
    });

    return drizzle(client);
  }

  // Singleton mode: reuse existing connection (good for traditional servers and serverless warm starts)
  if (envConfigs.db_singleton_enabled === 'true') {
    // Return existing instance if already initialized
    if (dbInstance) {
      return dbInstance;
    }

    // Create connection pool only once
    client = postgres(databaseUrl, {
      prepare: false,
      max: Number(envConfigs.db_max_connections) || 1, // Maximum connections in pool (default 1)
      idle_timeout: 30, // Idle connection timeout (seconds)
      connect_timeout: 10, // Connection timeout (seconds)
      ...connectionSchemaOptions,
    });

    dbInstance = drizzle(client);
    return dbInstance;
  }

  // Non-singleton mode: create new connection each time (good for serverless)
  // In serverless, the connection will be cleaned up when the function instance is destroyed
  const serverlessClient = postgres(databaseUrl, {
    prepare: false,
    max: 1, // Use single connection in serverless
    idle_timeout: 20,
    connect_timeout: 10,
    ...connectionSchemaOptions,
  });

  return drizzle(serverlessClient);
}

// Optional: Function to close database connection (useful for testing or graceful shutdown)
// Note: Only works in singleton mode
export async function closePostgresDb() {
  if (envConfigs.db_singleton_enabled && client) {
    await client.end();
    client = null;
    dbInstance = null;
  }
}
