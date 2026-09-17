// test-package.mjs
// Request: Verify a clean extracted package boots and enforces PIN access over HTTP.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
const directory = path.resolve(process.argv[2] || '.tmp/package-smoke');
const setup = spawnSync(process.execPath, ['scripts/setup-pin.mjs'], { cwd: directory, encoding: 'utf8' });
process.stdout.write(setup.stdout); process.stderr.write(setup.stderr);
assert.equal(setup.status, 0);
const pin = readFileSync(path.join(directory, '.private/access-pin.txt'), 'utf8').match(/PIN: (\d{8})/)[1];
const origin = 'http://127.0.0.1:4174';
const child = spawn(process.execPath, ['server.cjs'], { cwd: directory, env: { ...process.env, PORT: '4174' }, stdio: ['ignore', 'pipe', 'pipe'] });
child.stderr.on('data', data => process.stderr.write(data));
try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Package server did not become ready')), 10000);
    child.on('error', error => { clearTimeout(timeout); reject(error); });
    child.on('exit', code => { clearTimeout(timeout); reject(new Error(`Package server exited: ${code}`)); });
    child.stdout.on('data', data => { process.stdout.write(data); if (data.toString().includes('RINGOUT ready')) { clearTimeout(timeout); resolve(); } });
  });
  assert.equal((await fetch(origin + '/engine.js')).status, 401);
  const login = await fetch(origin + '/unlock', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body: 'pin=' + pin, redirect: 'manual' });
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie').split(';')[0];
  assert.match(await (await fetch(origin + '/platformer.js', { headers: { cookie } })).text(), /PlatformerEngine/);
  assert.equal((await fetch(origin + '/lock', { method: 'POST', headers: { Origin: 'https://wrong.example', cookie }, redirect: 'manual' })).status, 403);
  assert.equal((await fetch(origin + '/lock', { method: 'POST', headers: { Origin: origin, cookie }, redirect: 'manual' })).status, 303);
  assert.equal((await fetch(origin + '/engine.js', { headers: { cookie } })).status, 401);
  console.log('Extracted package passed: setup, server startup, PIN sign-in, protected platformer, CSRF rejection and logout revocation.');
} finally { child.kill(); }
// Purpose: Release integration check. Upstream: extracted release and server adapter. Environment: Node 24. Generated: 2026-09-16 America/New_York. New file, all lines.
