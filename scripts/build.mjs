// build.mjs
// Request: Produce a server bundle.
import { readFile, mkdir, writeFile, cp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const assets = {};
for (const name of ['index.html', 'style.css', 'engine.js', 'maps.js', 'map-editor.js', 'platformer.js', 'game.js']) {
  assets['/' + name] = { body: await readFile(new URL('game/' + name, root), 'utf8'), type: name.endsWith('.html') ? 'text/html; charset=utf-8' : name.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/javascript; charset=utf-8' };
}
let bundle = '// index.js\n// Request: Generated Worker. Rebuild with node scripts/build.mjs.\n';
bundle += await readFile(new URL('game/maps.js', root), 'utf8');
bundle += '\nconst MapDefinitions = globalThis.RingoutMaps;\n';
for (const name of ['maps-api.mjs', 'worker.mjs']) {
  bundle += (await readFile(new URL('src/' + name, root), 'utf8')).replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '') + '\n';
}
bundle += `\nconst assets = ${JSON.stringify(assets)};\nexport default createWorker(assets);\n`;
await mkdir(new URL('dist/server/', root), { recursive: true });
await writeFile(new URL('dist/server/index.js', root), bundle);
await writeFile(new URL('dist/server/package.json', root), '{"type":"module"}\n');
await mkdir(new URL('dist/.openai/', root), { recursive: true });
await cp(new URL('.openai/hosting.json', root), new URL('dist/.openai/hosting.json', root)).catch(error => {
  if (error.code !== 'ENOENT') throw error;
  console.warn('Optional hosting manifest is absent; building the local server only.');
});
await cp(new URL('drizzle/', root), new URL('dist/.openai/drizzle/', root), { recursive: true });
console.log(`Built game: ${fileURLToPath(new URL('dist/server/index.js', root))} (${Buffer.byteLength(bundle)} bytes)`);
// Purpose: Generate the embedded server bundle and optional hosting metadata without hiding unexpected copy errors.
// Upstream: game assets and maps-api/worker handlers; drizzle migrations provide map storage.
// Environment: Node 24+ built-ins. Updated: 2026-10-04 America/New_York. Changes: lines 21-24 only allow missing optional hosting metadata and retain a visible diagnostic.
