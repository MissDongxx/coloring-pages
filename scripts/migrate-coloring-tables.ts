/**
 * Migration script to create coloring_job and coloring_page tables
 */

import { db } from '../src/core/db';
import { sql } from 'drizzle-orm';

async function migrate() {
  console.log('Starting migration...');

  try {
    // Create coloring_job table
    await db().execute(sql`
      CREATE TABLE IF NOT EXISTS "coloring_job" (
        "id" text PRIMARY KEY NOT NULL,
        "user_id" text NOT NULL,
        "status" text NOT NULL,
        "job_type" text NOT NULL,
        "keywords_data" text,
        "kaggle_run_id" text,
        "total_keywords" integer DEFAULT 0,
        "processed_pages" integer DEFAULT 0,
        "failed_pages" integer DEFAULT 0,
        "error_message" text,
        "started_at" timestamp,
        "completed_at" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp NOT NULL
      );
    `);
    console.log('✓ Created coloring_job table');

    // Create coloring_page table
    await db().execute(sql`
      CREATE TABLE IF NOT EXISTS "coloring_page" (
        "id" text PRIMARY KEY NOT NULL,
        "job_id" text,
        "user_id" text NOT NULL,
        "slug" text NOT NULL,
        "title" text NOT NULL,
        "description" text,
        "category" text NOT NULL,
        "keyword" text NOT NULL,
        "prompt" text,
        "image_url" text NOT NULL,
        "mdx_path" text,
        "status" text NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp NOT NULL,
        "published_at" timestamp,
        "deleted_at" timestamp,
        "sort" integer DEFAULT 0 NOT NULL,
        CONSTRAINT "coloring_page_slug_unique" UNIQUE("slug")
      );
    `);
    console.log('✓ Created coloring_page table');

    // Create indexes for coloring_job
    await db().execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_coloring_job_user_status" ON "coloring_job" USING btree ("user_id","status");
    `);
    await db().execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_coloring_job_status_created" ON "coloring_job" USING btree ("status","created_at");
    `);
    console.log('✓ Created indexes for coloring_job');

    // Create indexes for coloring_page
    await db().execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_coloring_page_job" ON "coloring_page" USING btree ("job_id");
    `);
    await db().execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_coloring_page_category_status" ON "coloring_page" USING btree ("category","status");
    `);
    await db().execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_coloring_page_slug" ON "coloring_page" USING btree ("slug");
    `);
    await db().execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_coloring_page_status_published" ON "coloring_page" USING btree ("status","published_at");
    `);
    console.log('✓ Created indexes for coloring_page');

    // Add foreign key constraints (skip if they already exist)
    try {
      await db().execute(sql`
        ALTER TABLE "coloring_job" ADD CONSTRAINT "coloring_job_user_id_user_id_fk"
          FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
      `);
      console.log('✓ Added FK: coloring_job -> user');
    } catch (e: any) {
      if (!e.message.includes('already exists')) {
        console.log('Note: FK coloring_job -> user may already exist');
      }
    }

    try {
      await db().execute(sql`
        ALTER TABLE "coloring_page" ADD CONSTRAINT "coloring_page_job_id_coloring_job_id_fk"
          FOREIGN KEY ("job_id") REFERENCES "public"."coloring_job"("id") ON DELETE set null ON UPDATE no action;
      `);
      console.log('✓ Added FK: coloring_page -> coloring_job');
    } catch (e: any) {
      if (!e.message.includes('already exists')) {
        console.log('Note: FK coloring_page -> coloring_job may already exist');
      }
    }

    try {
      await db().execute(sql`
        ALTER TABLE "coloring_page" ADD CONSTRAINT "coloring_page_user_id_user_id_fk"
          FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
      `);
      console.log('✓ Added FK: coloring_page -> user');
    } catch (e: any) {
      if (!e.message.includes('already exists')) {
        console.log('Note: FK coloring_page -> user may already exist');
      }
    }

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
