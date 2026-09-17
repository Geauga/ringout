// setup-pin.mjs
// Request: Generate a random eight-digit PIN without committing or bundling credentials.
import { randomInt } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createVerifier } from '../src/auth.mjs';
const root = new URL('../', import.meta.url);
let existing = false;
try { await readFile(new URL('.env', root)); existing = true; } catch (error) { if (error.code !== 'ENOENT') throw error; }
if (existing && !process.argv.includes('--rotate')) {
  console.log('PIN already configured. See .private/access-pin.txt. Use --rotate to replace it and revoke old sessions.');
} else {
  const pin = String(randomInt(0, 100000000)).padStart(8, '0');
  const verifier = await createVerifier(pin);
  await mkdir(new URL('.private/', root), { recursive: true });
  await writeFile(new URL('.private/access-pin.txt', root), `RINGOUT access PIN: ${pin}\nKeep this file private. Generated ${new Date().toISOString()}.\n`, { mode: 0o600 });
  await writeFile(new URL('.env', root), `RINGOUT_PIN_HASH='${verifier}'\n`, { mode: 0o600 });
  console.log('Generated an eight-digit PIN. Read .private/access-pin.txt; verifier saved in .env. Restart the server after rotation.');
}
// Purpose: Local PIN provisioning/rotation. Upstream: src/auth.mjs. Environment: Node 24. Generated: 2026-09-15 America/New_York. New file, all lines.
