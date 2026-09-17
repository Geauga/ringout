// drizzle.config.ts
// Request: Generate persistent security tables for PIN-protected RINGOUT hosting.
import { defineConfig } from 'drizzle-kit';
export default defineConfig({ out: './drizzle', schema: './db/schema.ts', dialect: 'sqlite' });
// Purpose: Schema-only migrations. Upstream: db/schema.ts defines security storage. Environment: Drizzle Kit / Node 24. Generated: 2026-09-15 America/New_York. New file, all lines.
