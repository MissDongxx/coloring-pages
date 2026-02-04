/**
 * Create config table migration script
 * Run with: npx tsx scripts/create-config-table.ts
 */

import { envConfigs } from '../src/config';
import postgres from 'postgres';

async function createConfigTable() {
  try {
    console.log('Creating config table...');

    // Create a direct postgres connection
    const sql = postgres(envConfigs.database_url!);

    // Execute raw SQL
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS config (
        name text UNIQUE NOT NULL,
        value text
      );
    `);

    // Close connection
    await sql.end();

    console.log('✓ Config table created successfully!');
  } catch (error) {
    console.error('Error creating config table:', error);
    process.exit(1);
  }
}

createConfigTable().then(() => process.exit(0));
