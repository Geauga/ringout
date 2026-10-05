// test-package.mjs
// Request: Review local HTTP serving and verify a fresh portable package without PIN setup.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync } from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
let directory;
if (process.argv[2]) directory = path.resolve(process.argv[2]);
else {
  await import('./build.mjs');
  mkdirSync(path.join(root, '.tmp'), { recursive: true });
  directory = mkdtempSync(path.join(root, '.tmp/server-check-'));
  for (const name of ['server.cjs', 'scripts/local-db.mjs', 'dist/server', 'drizzle']) {
    const target = path.join(directory, name);
    mkdirSync(path.dirname(target), { recursive: true });
    cpSync(path.join(root, name), target, { recursive: true });
  }
}
assert(!existsSync(path.join(directory, '.data')), 'Use a fresh package; existing maps must not be changed.');
const runtime = process.platform === 'win32' && existsSync(path.join(directory, 'node.exe')) ? path.join(directory, 'node.exe') : process.execPath;
const probe = net.createServer();
await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve); });
const port = probe.address().port;
await new Promise(resolve => probe.close(resolve));
const origin = `http://127.0.0.1:${port}`, localhost = `http://localhost:${port}`;
let child;
async function start() {
  child = spawn(runtime, ['server.cjs'], { cwd: directory, env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stderr.on('data', data => process.stderr.write(data));
  await new Promise((resolve, reject) => {
    let output = '';
    const timeout = setTimeout(() => reject(new Error(`Server did not become ready. Staging: ${directory}`)), 10000);
    const done = error => { clearTimeout(timeout); child.off('error', onError); child.off('exit', onExit); error ? reject(error) : resolve(); };
    const onError = error => done(error), onExit = code => done(new Error(`Server exited before startup: ${code}`));
    child.once('error', onError); child.once('exit', onExit);
    child.stdout.on('data', data => { process.stdout.write(data); output += data; if (output.includes('RINGOUT game available on:')) done(); });
  });
}
async function stop() {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise(resolve => child.once('exit', resolve));
  child.kill(); await exited;
}
const map = { name: 'Package smoke map', platforms: [{ id: 'floor', x: 190, y: 540, w: 620, jumpPad: true }] };
const send = (route, input, host = origin) => new Promise((resolve, reject) => {
  const body = input ? JSON.stringify(input) : null;
  const request = http.request(origin + route, { method: body ? 'POST' : 'GET', headers: {
    Host: new URL(host).host, Origin: host, 'Content-Type': 'application/json',
    ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}),
  } }, response => {
    const chunks = []; response.on('data', chunk => chunks.push(chunk));
    response.on('error', reject);
    response.on('end', () => {
      const content = Buffer.concat(chunks).toString('utf8');
      resolve({ status: response.statusCode, json: async () => JSON.parse(content), text: async () => content });
    });
  });
  request.on('error', reject); request.end(body);
});
function rejectUnfinishedBody(declaredLength) {
  return new Promise((resolve, reject) => {
    const request = http.request(origin + '/api/maps', { method: 'POST', headers: {
      Origin: origin, 'Content-Type': 'application/json', ...(declaredLength ? { 'Content-Length': declaredLength } : {}),
    } });
    const timeout = setTimeout(() => { request.destroy(); reject(new Error('Oversized unfinished request was not rejected promptly')); }, 2500);
    request.on('error', error => { clearTimeout(timeout); reject(error); });
    request.on('response', response => {
      response.resume(); response.on('end', () => { clearTimeout(timeout); resolve(response.statusCode); request.destroy(); });
    });
    if (declaredLength) request.flushHeaders();
    else request.write(Buffer.alloc(8193, 'x')); // Deliberately leave the chunked upload open.
  });
}
try {
  await start();
  assert.equal((await send('/')).status, 200);
  assert.equal((await send('/engine.js')).status, 200, 'game assets need no obsolete PIN setup');
  assert.match(await (await send('/platformer.js')).text(), /PlatformerEngine/);
  const replay = await send('/replay.js'); assert.equal(replay.status, 200); assert.match(await replay.text(), /RingoutReplay/);
  assert.match(await (await send('/')).text(), /id="watch-replay"/);
  assert.deepEqual((await (await send('/api/maps')).json()).maps, []);
  const created = await send('/api/maps', { map }, localhost);
  assert.equal(created.status, 201, 'matching localhost Host and Origin can save a map');
  const saved = (await created.json()).map;
  assert.equal(saved.platforms[0].jumpPad, true);
  const updated = await send('/api/maps/' + saved.id, { map: { ...map, name: 'Updated map' }, revision: 1 });
  assert.equal(updated.status, 200, '127.0.0.1 can update the same library');
  assert.equal((await updated.json()).map.revision, 2);
  assert.equal((await send('/api/maps/' + saved.id, { map, revision: 1 })).status, 409);
  assert.equal((await fetch(origin + '/api/maps', { method: 'POST', headers: { Origin: 'https://wrong.example', 'Content-Type': 'application/json' }, body: JSON.stringify({ map }) })).status, 403);
  assert.equal((await send('/', undefined, 'http://wrong.example')).status, 403);
  const exact = { map, padding: '' };
  exact.padding = 'x'.repeat(8192 - Buffer.byteLength(JSON.stringify(exact)));
  assert.equal((await send('/api/maps', exact)).status, 201, '8192-byte request is accepted');
  assert.equal((await send('/api/maps', { ...exact, padding: exact.padding + 'x' })).status, 413);
  assert.equal((await send('/api/maps', { map, padding: 'é'.repeat(4500) })).status, 413, 'limit counts bytes, not characters');
  assert.equal(await rejectUnfinishedBody(8193), 413, 'declared oversized upload is rejected before reading');
  assert.equal(await rejectUnfinishedBody(), 413, 'chunked upload is bounded before completion');
  assert.equal((await send('/engine.js')).status, 200, 'server remains healthy after rejected requests');
  await stop(); await start();
  const persisted = (await (await send('/api/maps')).json()).maps.find(item => item.id === saved.id);
  assert.equal(persisted.revision, 2); assert.equal(persisted.platforms[0].jumpPad, true);
  assert.equal((await send('/api/maps/' + saved.id, { action: 'delete', revision: 1 })).status, 409);
  assert.equal((await send('/api/maps/' + saved.id, { action: 'delete', revision: 2 }, localhost)).status, 200);
  assert(!(await (await send('/api/maps')).json()).maps.some(item => item.id === saved.id));
  await stop();
  const failed = spawnSync(runtime, ['server.cjs'], { cwd: directory, env: { ...process.env, PORT: '-1' }, encoding: 'utf8' });
  process.stdout.write(failed.stdout); process.stderr.write(failed.stderr);
  assert.equal(failed.status, 1, 'startup failures return a failing process status');
  console.log(`PASS: fresh server/package assets, localhost saves, map conflicts/persistence, Host/Origin checks, bounded uploads and startup failures (${directory}).`);
} finally { await stop(); }
// Purpose: Exercise the actual HTTP adapter and portable runtime using an isolated, fresh map database.
// Upstream: server.cjs serves the built Worker; local-db.mjs applies drizzle migrations and persists map records.
// Environment: Node 24+ on Windows/Linux; explicit package paths use bundled Windows node.exe. Generated: 2026-10-04 America/New_York.
// Changes: lines 2-114 replace deleted PIN setup/session checks with fresh staging, HTTP regressions and restart persistence.
// Updated: 2026-10-05 America/New_York. Lines 84-85 also verify the replay script and Watch replay UI. Purpose: preserve incoming comprehensive HTTP checks while covering the replay release; upstream: replay asset/server bundle; environment: Node 24 and bundled Windows runtime.
