// local-db.mjs
// Request: Preserve installed maps across LF/CRLF migration files while rejecting changed SQL.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
export function openDatabase(filename, migrations) {
  const sqlite = new DatabaseSync(filename);
  try {
    sqlite.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL)');
    for (const name of readdirSync(migrations).filter(x => x.endsWith('.sql')).sort()) {
      const sql = readFileSync(new URL(name, migrations), 'utf8');
      const normalized = sql.replace(/\r\n/g, '\n');
      const hash = text => createHash('sha256').update(text).digest('hex');
      const checksum = hash(normalized);
      const previous = sqlite.prepare('SELECT checksum FROM local_migrations WHERE name = ?').get(name);
      if (previous) {
        const accepted = new Set([checksum, hash(sql), hash(normalized.replace(/\n/g, '\r\n'))]);
        if (!accepted.has(previous.checksum)) throw new Error(`Applied migration changed: ${name}`);
        continue;
      }
      sqlite.exec('BEGIN IMMEDIATE');
      try {
        sqlite.exec(sql);
        sqlite.prepare('INSERT INTO local_migrations (name, checksum) VALUES (?, ?)').run(name, checksum);
        sqlite.exec('COMMIT');
      } catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    }
  } catch (error) { sqlite.close(); throw error; }
  function prepare(sql, params = []) {
    return {
      bind: (...values) => prepare(sql, values),
      first: async () => sqlite.prepare(sql).get(...params) || null,
      all: async () => ({ success: true, results: sqlite.prepare(sql).all(...params) }),
      run: async () => ({ success: true, meta: sqlite.prepare(sql).run(...params) }),
      execute: () => {
        const query = sqlite.prepare(sql);
        if (query.columns().length) return { success: true, results: query.all(...params) };
        return { success: true, results: [], meta: query.run(...params) };
      },
    };
  }
  return { prepare, close: () => sqlite.close(), async batch(statements) {
    sqlite.exec('BEGIN IMMEDIATE');
    try { const results = statements.map(x => x.execute()); sqlite.exec('COMMIT'); return results; }
    catch (error) { sqlite.exec('ROLLBACK'); throw error; }
  } };
}
// Purpose: Local SQLite adapter and local migration runner. Upstream: generated drizzle SQL. Environment: Node 24. Generated: 2026-09-15 America/New_York. New file, all lines.
// Updated: 2026-09-18 America/New_York. Line 27 adds the D1 all() operation for map listing.
// Updated: 2026-10-18 America/New_York. Changed lines 2,8-28: hash new migrations with LF; accept exact legacy raw/LF/CRLF checksums without rewriting history or replaying SQL; reject content edits and close SQLite after startup failure.
// Purpose: Preserve existing local map databases during portable upgrades. Upstream: unchanged drizzle SQL and historical local_migrations checksums. Environment: Node 24 / Windows and Linux.
