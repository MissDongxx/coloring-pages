/**
 * Data Migration Script
 *
 * This script migrates data from an old database (e.g., Neon) to a new database (e.g., Supabase)
 * with custom schema support for multi-project isolation.
 *
 * Usage:
 * 1. Configure OLD_DB_URL and NEW_DB_URL in your .env file
 * 2. Run: pnpm tsx scripts/migrate-data.ts
 *
 * Migration Order:
 * The tables are defined in dependency order (parent tables before child tables)
 * to avoid foreign key constraint violations.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/config/db/schema';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

// Database connection URLs
const { DATABASE_URL } = process.env;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined in .env file');
}

// Type assertion: we've verified DATABASE_URL is defined above
const dbUrl = DATABASE_URL as string;

// Migration configuration
const BATCH_SIZE = 100; // Number of records to insert per batch

// Define migration order (tables with foreign keys should come after their dependencies)
const MIGRATION_TABLES = [
  // Auth tables
  { name: 'user', table: schema.user },
  { name: 'session', table: schema.session },
  { name: 'account', table: schema.account },
  { name: 'verification', table: schema.verification },

  // Content tables
  { name: 'config', table: schema.config },
  { name: 'taxonomy', table: schema.taxonomy },
  { name: 'post', table: schema.post },

  // Payment & subscription tables
  { name: 'order', table: schema.order },
  { name: 'subscription', table: schema.subscription },
  { name: 'credit', table: schema.credit },

  // RBAC tables
  { name: 'role', table: schema.role },
  { name: 'permission', table: schema.permission },
  { name: 'role_permission', table: schema.rolePermission },
  { name: 'user_role', table: schema.userRole },

  // API & feature tables
  { name: 'apikey', table: schema.apikey },
  { name: 'ai_task', table: schema.aiTask },
  { name: 'chat', table: schema.chat },
  { name: 'chat_message', table: schema.chatMessage },

  // Coloring workflow tables
  { name: 'coloring_job', table: schema.coloringJob },
  { name: 'coloring_page', table: schema.coloringPage },

  // Rate limiting table
  { name: 'rate_limits', table: schema.rateLimit },
];

/**
 * Builds a column mapping from database column names to Schema property names
 * Handles snake_case (database) to camelCase (Schema) conversion
 */
function buildColumnMapping(table: any): Record<string, string> {
  const columnMapping: Record<string, string> = {};

  for (const key in table) {
    // @ts-ignore - Access internal column definition
    const col = table[key];
    // col.name is the database column name (snake_case)
    // key is the Schema property name (camelCase)
    if (col && typeof col === 'object' && 'name' in col) {
      columnMapping[col.name] = key;
    }
  }

  return columnMapping;
}

/**
 * Transforms a database row to match Schema property names
 */
function transformRow(row: any, columnMapping: Record<string, string>): any {
  const transformed: any = {};
  for (const dbColName in row) {
    const schemaKey = columnMapping[dbColName];
    // Use Schema key if mapping exists, otherwise keep original column name
    transformed[schemaKey || dbColName] = row[dbColName];
  }
  return transformed;
}

/**
 * Main migration function
 */
async function main() {
  console.log('Starting data migration...\n');

  // Create database connections
  const destClient = postgres(dbUrl, { max: 1 });
  const destDb = drizzle(destClient, { schema });

  const startTime = Date.now();
  let totalRecords = 0;

  try {
    for (const tableConfig of MIGRATION_TABLES) {
      const { name, table } = tableConfig;
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Migrating table: ${name}`);

      // Build column mapping for this table
      const columnMapping = buildColumnMapping(table);
      console.log(`Column mapping: ${Object.keys(columnMapping).length} columns`);

      // Fetch data from old database (assuming old DB uses public schema)
      // For tables with underscores like 'chat_message', we need to handle them properly
      console.log(`Fetching data from source...`);
      const rows = await destClient.unsafe(
        `SELECT * FROM public.${name.replace(/"/g, '')}`
      );

      if (rows.length === 0) {
        console.log(`  No data found, skipping.`);
        continue;
      }

      console.log(`  Found ${rows.length} records`);

      // Transform and insert data in batches
      let migratedCount = 0;
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const transformedBatch = batch.map((row) =>
          transformRow(row, columnMapping)
        );

        try {
          await destDb.insert(table).values(transformedBatch).onConflictDoNothing();
          migratedCount += transformedBatch.length;
          console.log(
            `  Progress: ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length} records`
          );
        } catch (error) {
          console.error(`  Batch ${i / BATCH_SIZE} failed:`, error);
          // Continue with next batch on error
        }
      }

      console.log(`  Migrated ${migratedCount}/${rows.length} records`);
      totalRecords += migratedCount;
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Migration completed in ${duration}s`);
    console.log(`Total records migrated: ${totalRecords}`);
  } catch (error) {
    console.error('\nMigration failed:', error);
    throw error;
  } finally {
    // Close connections
    await destClient.end();
  }
}

// Run migration
main()
  .then(() => {
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
