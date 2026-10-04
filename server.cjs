// server.cjs
// Request: Fix localhost map saves, bound uploads before buffering, and report startup failures.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

async function main() {
  const envFile = path.join(__dirname, '.env');
  if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

  const { default: worker } = await import('./dist/server/index.js');
  const { openDatabase } = await import('./scripts/local-db.mjs');

  fs.mkdirSync(path.join(__dirname, '.data'), { recursive: true });
  const DB = openDatabase(path.join(__dirname, '.data/security.sqlite'), pathToFileURL(path.join(__dirname, 'drizzle') + path.sep));

  const port = Number(process.env.PORT || 4173);
  const origin = `http://127.0.0.1:${port}`;

  const server = http.createServer(async (req, res) => {
    try {
      if (![`127.0.0.1:${port}`, `localhost:${port}`].includes(req.headers.host)) { res.writeHead(403); res.end('Host rejected'); return; }
      if (!req.url.startsWith('/')) { res.writeHead(400); res.end('Request target rejected'); return; }
      const rejectBody = () => {
        res.writeHead(413, { 'Content-Type': 'application/json', Connection: 'close' });
        res.end(JSON.stringify({ error: 'Map is too large.' }));
        req.resume();
      };
      if (Number(req.headers['content-length'] || 0) > 8192) { rejectBody(); return; }
      const buffer = [];
      let bytes = 0;
      for await (const chunk of req.iterator({ destroyOnReturn: false })) {
        bytes += chunk.length;
        if (bytes > 8192) { rejectBody(); return; }
        buffer.push(chunk);
      }
      const reqBody = buffer.length ? Buffer.concat(buffer) : null;

      const request = new Request(`http://${req.headers.host}${req.url}`, {
        method: req.method,
        headers: req.headers,
        body: reqBody,
        duplex: reqBody ? 'half' : undefined
      });
      
      const response = await worker.fetch(request, { DB });
      
      res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
      if (response.body) {
        for await (const chunk of response.body) res.write(chunk);
      }
      res.end();
    } catch (error) {
      console.error('Server error:', error);
      if (res.headersSent) { res.destroy(error); return; }
      res.writeHead(500);
      res.end('Internal Server Error');
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;

  server.listen(port, '127.0.0.1', () => {
    console.log(`RINGOUT game available on: ${origin}`);
  });
}

main().catch(error => { console.error(error); process.exitCode = 1; });
// Purpose: Serve local gameplay and shared maps while bounding HTTP input and preserving matching browser origins.
// Upstream: dist/server/index.js is generated from game assets/maps-api/worker; local-db.mjs supplies migrated SQLite storage.
// Environment: Node 24+ / local Windows, macOS or Linux. Updated: 2026-10-04 America/New_York.
// Changes: lines 2,24-40 validate targets, reject uploads above 8192 bytes and use the validated Host; 56 preserves streaming errors; 61-62 set timeouts; 69 returns a failing startup status.
