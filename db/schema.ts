// schema.ts
// Request: Persist login throttling and revocable access sessions.
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const pinAttempts = sqliteTable('pin_attempts', {
  bucket: text('bucket').primaryKey(),
  attempts: integer('attempts').notNull(),
  expiresAt: integer('expires_at').notNull(),
}, t => [index('pin_attempts_expiry').on(t.expiresAt)]);
export const sessions = sqliteTable('sessions', {
  tokenHash: text('token_hash').primaryKey(),
  expiresAt: integer('expires_at').notNull(),
  verifierTag: text('verifier_tag').notNull(),
}, t => [index('sessions_expiry').on(t.expiresAt)]);
// Purpose: Authentication storage. Upstream: user PIN requirement. Environment: Drizzle SQLite / D1. Generated: 2026-09-15 America/New_York. New file, all lines.
export const customMaps = sqliteTable('custom_maps', {
  id: text('id').primaryKey(),
  mapJson: text('map_json').notNull(),
  revision: integer('revision').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
// Updated: 2026-09-18 America/New_York. Lines 15-20 add a bounded shared map library with optimistic revisions.
