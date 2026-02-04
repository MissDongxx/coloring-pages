/**
 * Check database tables
 * Run with: npx tsx scripts/check-db-tables.ts
 */

import { envConfigs } from '../src/config';
import postgres from 'postgres';

async function checkTables() {
  try {
    console.log('Checking database tables...\n');

    const sql = postgres(envConfigs.database_url!);

    // Get all tables in the database
    const tables = await sql.unsafe(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log('Existing tables:');
    tables.forEach((t: any) => {
      console.log(`  - ${t.table_name}`);
    });

    await sql.end();

    // Expected tables from schema
    const expectedTables = [
      'user',
      'account',
      'session',
      'verification',
      'config',
      'post',
      'taxonomy',
      'coloring_job',
      'coloring_page',
      'affiliates',
      'apikeys',
      'credits',
      'feedbacks',
      'orders',
      'rate_limits',
    ];

    console.log('\nExpected tables that are missing:');
    const existingTables = tables.map((t: any) => t.table_name);
    expectedTables.forEach(t => {
      if (!existingTables.includes(t)) {
        console.log(`  ❌ ${t}`);
      }
    });

    console.log('\n✓ Database check complete!');
  } catch (error) {
    console.error('Error checking tables:', error);
    process.exit(1);
  }
}

checkTables().then(() => process.exit(0));
