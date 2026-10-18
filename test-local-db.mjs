// test-local-db.mjs
// Request: Preserve installed maps when migration files switch between Windows and Unix line endings.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { openDatabase } from './scripts/local-db.mjs';

const root = fileURLToPath(new URL('./', import.meta.url));
mkdirSync(path.join(root, '.tmp'), { recursive: true });
const hash = sql => createHash('sha256').update(sql).digest('hex');
const names = ['0000_new_tusk.sql', '0001_slimy_deathbird.sql'];
const scripts = names.map(name => readFileSync(new URL('drizzle/' + name, import.meta.url), 'utf8').replace(/\r\n/g, '\n'));
const savedMap = JSON.stringify({ name: 'Keep my map', platforms: [{ id: 'floor', x: 190, y: 540, w: 620, jumpPad: true }] });

for (const oldEnding of ['\n', '\r\n']) for (const newEnding of ['\n', '\r\n']) {
  const directory = mkdtempSync(path.join(root, '.tmp/migration-endings-'));
  const migrations = path.join(directory, 'drizzle');
  mkdirSync(migrations);
  const location = pathToFileURL(migrations + path.sep);
  const filename = path.join(directory, 'maps.sqlite');
  const writeScripts = ending => names.forEach((name, i) => writeFileSync(path.join(migrations, name), scripts[i].replace(/\n/g, ending)));
  writeScripts(oldEnding);
  let DB = openDatabase(filename, location);
  await DB.prepare('INSERT INTO custom_maps (id,map_json,revision,updated_at) VALUES (?,?,?,?)').bind('saved', savedMap, 7, 123456).run();
  // Reproduce metadata written by the original runner, which hashed the raw file bytes.
  const legacyChecksums = scripts.map(sql => hash(sql.replace(/\n/g, oldEnding)));
  for (let i = 0; i < names.length; i++) await DB.prepare('UPDATE local_migrations SET checksum=? WHERE name=?').bind(legacyChecksums[i], names[i]).run();
  DB.close();
  writeScripts(newEnding);
  DB = openDatabase(filename, location);
  assert.deepEqual({ ...await DB.prepare('SELECT * FROM custom_maps WHERE id=?').bind('saved').first() }, { id: 'saved', map_json: savedMap, revision: 7, updated_at: 123456 });
  for (let i = 0; i < names.length; i++) assert.equal((await DB.prepare('SELECT checksum FROM local_migrations WHERE name=?').bind(names[i]).first()).checksum, legacyChecksums[i], 'accepted historical metadata is not rewritten');
  DB.close();

  const upgrade = 'CREATE INDEX saved_map_revision ON custom_maps (revision);\n';
  writeFileSync(path.join(migrations, '0002_upgrade.sql'), upgrade.replace(/\n/g, newEnding));
  DB = openDatabase(filename, location);
  assert.equal((await DB.prepare('SELECT checksum FROM local_migrations WHERE name=?').bind('0002_upgrade.sql').first()).checksum, hash(upgrade), 'new checksums use canonical LF');
  DB.close();
  DB = openDatabase(filename, location);
  assert.equal((await DB.prepare('SELECT count(*) AS count FROM custom_maps').first()).count, 1, 'reopening does not replay applied migrations');
  DB.close();

  writeFileSync(path.join(migrations, names[1]), scripts[1].replace('custom_maps', 'different_maps').replace(/\n/g, newEnding));
  assert.throws(() => openDatabase(filename, location), /Applied migration changed: 0001_slimy_deathbird.sql/, 'real SQL changes are still rejected');
  writeScripts(newEnding);
  DB = openDatabase(filename, location);
  assert.equal((await DB.prepare('SELECT map_json FROM custom_maps WHERE id=?').bind('saved').first()).map_json, savedMap, 'rejected changes preserve the saved map');
  DB.close();
}

const failureDirectory = mkdtempSync(path.join(root, '.tmp/migration-failure-'));
writeFileSync(path.join(failureDirectory, '0000_failure.sql'), 'CREATE TABLE rollback_probe (id INTEGER);\nINVALID SQL;\n');
const failureFile = path.join(failureDirectory, 'failure.sqlite');
assert.throws(() => openDatabase(failureFile, pathToFileURL(failureDirectory + path.sep)), /syntax error/);
const failed = new DatabaseSync(failureFile);
assert.equal(failed.prepare("SELECT count(*) AS count FROM sqlite_master WHERE name='rollback_probe'").get().count, 0, 'failed migrations roll back');
assert.equal(failed.prepare('SELECT count(*) AS count FROM local_migrations').get().count, 0, 'failed migrations are not recorded');
failed.close();
console.log('PASS: legacy LF/CRLF upgrades preserve saved maps and checksums, canonical new migrations, repeated starts, changed-SQL rejection and failed-migration rollback');

// Purpose: Reproduce installed package upgrade failures while retaining real SQLite records and strict migration checks.
// Upstream: scripts/local-db.mjs and drizzle SQL define local map persistence and migration tracking.
// Environment: Node 24 built-ins / Windows and Linux. Generated: 2026-10-18 America/New_York. New file, all lines.
