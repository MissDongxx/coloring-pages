/**
 * Create missing authentication and core tables
 * Run with: npx tsx scripts/create-auth-tables.ts
 */

import { envConfigs } from '../src/config';
import postgres from 'postgres';

async function createTables() {
  try {
    console.log('Creating missing database tables...\n');

    const sql = postgres(envConfigs.database_url!);

    // Create user table
    console.log('Creating user table...');
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS "user" (
        id text PRIMARY KEY,
        name text NOT NULL,
        email text NOT NULL UNIQUE,
        email_verified boolean DEFAULT false NOT NULL,
        image text,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL,
        utm_source text DEFAULT '' NOT NULL,
        ip text DEFAULT '' NOT NULL
      );
    `);
    console.log('  ✓ user table created');

    // Create verification table
    console.log('Creating verification table...');
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS verification (
        id text PRIMARY KEY,
        identifier text NOT NULL,
        value text NOT NULL,
        expires_at timestamp NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      );
    `);

    // Create index for verification
    await sql.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_verification_identifier ON verification(identifier);
    `);
    console.log('  ✓ verification table created');

    // Create account table
    console.log('Creating account table...');
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS account (
        id text PRIMARY KEY,
        account_id text NOT NULL,
        provider_id text NOT NULL,
        user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        access_token text,
        refresh_token text,
        id_token text,
        access_token_expires_at timestamp,
        refresh_token_expires_at timestamp,
        scope text,
        password text,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      );
    `);

    // Create index for account
    await sql.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_account_user_id ON account(user_id);
    `);
    console.log('  ✓ account table created');

    // Create session table
    console.log('Creating session table...');
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS session (
        id text PRIMARY KEY,
        expires_at timestamp NOT NULL,
        token text NOT NULL UNIQUE,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL,
        ip_address text,
        user_agent text,
        user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
      );
    `);

    // Create index for session
    await sql.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_session_user_id ON session(user_id);
    `);
    console.log('  ✓ session table created');

    // Create taxonomy table
    console.log('Creating taxonomy table...');
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS taxonomy (
        id text PRIMARY KEY,
        user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        parent_id text,
        slug text NOT NULL UNIQUE,
        type text NOT NULL,
        title text NOT NULL,
        description text,
        image text,
        icon text,
        status text NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL,
        sort integer DEFAULT 0 NOT NULL
      );
    `);

    // Create index for taxonomy
    await sql.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_taxonomy_user_id ON taxonomy(user_id);
    `);
    console.log('  ✓ taxonomy table created');

    // Create post table (schema uses singular 'post' while DB has 'posts')
    console.log('Creating post table...');
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS post (
        id text PRIMARY KEY,
        user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        taxonomy_id text REFERENCES taxonomy(id) ON DELETE SET NULL,
        status text NOT NULL,
        type text NOT NULL,
        slug text NOT NULL UNIQUE,
        title text NOT NULL,
        excerpt text,
        content text,
        image text,
        metadata jsonb,
        template text DEFAULT 'default' NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL,
        published_at timestamp,
        sort integer DEFAULT 0 NOT NULL
      );
    `);

    // Create indexes for post
    await sql.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_post_user_id ON post(user_id);
      CREATE INDEX IF NOT EXISTS idx_post_status ON post(status);
      CREATE INDEX IF NOT EXISTS idx_post_type ON post(type);
      CREATE INDEX IF NOT EXISTS idx_post_slug ON post(slug);
    `);
    console.log('  ✓ post table created');

    await sql.end();

    console.log('\n✓ All tables created successfully!');
  } catch (error) {
    console.error('Error creating tables:', error);
    process.exit(1);
  }
}

createTables().then(() => process.exit(0));
