/**
 * Create System User Script
 *
 * This script creates a system user for background tasks and cron jobs.
 *
 * Usage:
 *   npx tsx scripts/create-system-user.ts
 */

import { eq } from 'drizzle-orm';

import { db } from '@/core/db';
import { getUuid } from '@/shared/lib/hash';

async function loadSchemaTables(): Promise<any> {
  // Default: PostgreSQL
  return (await import('@/config/db/schema')) as any;
}

async function createSystemUser() {
  console.log('🔧 Creating system user...\n');

  try {
    const { user } = (await loadSchemaTables()) as any;

    // Check if system user already exists
    const [existingUser] = await db()
      .select()
      .from(user)
      .where(eq(user.id, 'system'));

    if (existingUser) {
      console.log('✅ System user already exists!');
      return;
    }

    // Create system user
    await db()
      .insert(user)
      .values({
        id: 'system',
        name: 'System',
        email: 'system@localhost',
        emailVerified: true,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        utmSource: 'system',
        ip: '127.0.0.1',
        locale: 'en',
      });

    console.log('✅ System user created successfully!');
    console.log('\n📊 User details:');
    console.log('   - ID: system');
    console.log('   - Name: System');
    console.log('   - Email: system@localhost');
  } catch (error) {
    console.error('\n❌ Error creating system user:', error);
    process.exit(1);
  }
}

// Run the script
createSystemUser()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
