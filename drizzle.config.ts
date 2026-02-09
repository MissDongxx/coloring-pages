import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/config/db/schema.ts',
  out: './src/config/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || '',
  },
  // Schema filter: only manage the specified schema (avoid conflicts with other projects)
  // This ensures Drizzle only creates/modifies tables in your project's schema
  // Example: if DB_SCHEMA='coloring', only 'coloring' schema tables are managed
  schemaFilter: [process.env.DB_SCHEMA || 'public'],

  // Introspection options (optional, for advanced use)
  // strict: true,

  // Verbose output for debugging
  verbose: true,
  // Print statements to console
  strict: true,
});
