// test-package.mjs
// Request: Verify a clean extracted package boots, serves replay assets and stores custom maps.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
const directory = path.resolve(process.argv[2] || '.tmp/package-smoke');
const runtime = process.platform === 'win32' && existsSync(path.join(directory, 'node.exe')) ? path.join(directory, 'node.exe') : process.execPath;
const origin = 'http://127.0.0.1:4174';
const child = spawn(runtime, ['server.cjs'], { cwd: directory, env: { ...process.env, PORT: '4174' }, stdio: ['ignore', 'pipe', 'pipe'] });
child.stderr.on('data', data => process.stderr.write(data));
try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Package server did not become ready')), 10000);
    child.on('error', error => { clearTimeout(timeout); reject(error); });
    child.on('exit', code => { clearTimeout(timeout); reject(new Error(`Package server exited: ${code}`)); });
    child.stdout.on('data', data => { process.stdout.write(data); if (data.toString().includes('RINGOUT game available')) { clearTimeout(timeout); resolve(); } });
  });
  assert.equal((await fetch(origin + '/engine.js')).status, 200);
  const replay=await fetch(origin+'/replay.js');assert.equal(replay.status,200);assert.match(await replay.text(),/RingoutReplay/);
  assert.match(await (await fetch(origin)).text(),/id="watch-replay"/);
  const maps = await fetch(origin + '/api/maps');
  assert.equal(maps.status, 200); assert.deepEqual((await maps.json()).maps, []);
  const mapBody=JSON.stringify({map:{name:'Package smoke map',platforms:[{id:'floor',x:190,y:540,w:620,jumpPad:true}]}});
  assert.equal((await fetch(origin+'/api/maps',{method:'POST',headers:{Origin:'https://wrong.example','Content-Type':'application/json'},body:mapBody})).status,403);
  const newMap = await fetch(origin + '/api/maps', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: mapBody });
  assert.equal(newMap.status,201,'fresh package applies custom-map migration');
  assert.equal((await newMap.json()).map.platforms[0].jumpPad,true,'portable bundle preserves jump pads');
  assert.match(await (await fetch(origin + '/platformer.js')).text(), /PlatformerEngine/);
  assert.equal((await (await fetch(origin+'/api/maps')).json()).maps.length,1);
  console.log('Extracted package passed: bundled runtime, server startup, replay/platformer assets, map creation and cross-origin rejection.');
} finally { child.kill(); }
// Purpose: Release integration check. Upstream: extracted release and server adapter. Environment: Node 24. Generated: 2026-09-16 America/New_York. New file, all lines.
// Updated: 2026-09-18 America/New_York. Lines 26-29 verify the new map migration and authenticated create/list API in a fresh package.
// Updated: 2026-09-23 America/New_York. Lines 5,8-9,14 run setup and server with the bundled Windows runtime when present. Purpose: detect broken portable releases; upstream: extracted package; environment: Node on Windows or host Node elsewhere.
// Updated: 2026-10-03 America/New_York. Lines 30-32 assert the extracted portable bundle creates a map with jumpPad preserved. Purpose: release verification; upstream: protected bundle and generated migrations; environment: bundled Node 24/SQLite.
// Updated: 2026-10-04 America/New_York. Lines 2-37 replace obsolete PIN-setup assertions after existing commit 181d583 removed access, and verify replay assets/UI plus map storage/CSRF. Purpose: current portable release verification; upstream: built Worker and local server; environment: bundled Node 24.
