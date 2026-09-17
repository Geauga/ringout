// server.cjs
// Request: Serve the local four-player game through the hosted PIN gate.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
async function main() {
  const envFile = path.join(__dirname, '.env');
  if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
  const { validVerifier } = await import('./src/auth.mjs');
  if (!validVerifier(process.env.RINGOUT_PIN_HASH)) throw new Error('PIN not configured. Run node scripts/setup-pin.mjs first.');
  const { default: worker } = await import('./dist/server/index.js');
  const { openDatabase } = await import('./scripts/local-db.mjs');
  fs.mkdirSync(path.join(__dirname, '.data'), { recursive: true });
  const DB = openDatabase(path.join(__dirname, '.data/security.sqlite'), pathToFileURL(path.join(__dirname, 'drizzle') + path.sep));
  const port = Number(process.env.PORT || 4173);
  const origin = `http://127.0.0.1:${port}`;
  const server = http.createServer(async (req, res) => {
    try {
      if (![`127.0.0.1:${port}`, `localhost:${port}`].includes(req.headers.host)) { res.writeHead(403); res.end('Host rejected'); return; }
      const host = req.headers.host;
      const url = new URL(req.url, `http://${host}`);
      if (url.origin !== `http://${host}`) { res.writeHead(403); res.end('Host rejected'); return; }
      const chunks = []; let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 1024) { res.writeHead(413); res.end('Form too large'); return; }
        chunks.push(chunk);
      }
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
      headers.set('cf-connecting-ip', req.socket.remoteAddress || 'local');
      const request = new Request(url, { method: req.method, headers, ...(!['GET', 'HEAD'].includes(req.method) ? { body: Buffer.concat(chunks) } : {}) });
      const response = await worker.fetch(request, { DB, RINGOUT_PIN_HASH: process.env.RINGOUT_PIN_HASH });
      if (req.method === 'POST') console.log('RINGOUT access form:', url.pathname, response.status);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      console.error('Local request failed:', error);
      if (!res.headersSent) res.writeHead(503, { 'Cache-Control': 'no-store' });
      res.end('Access temporarily unavailable');
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.listen(port, '127.0.0.1', () => console.log(`RINGOUT ready at ${origin} (PIN required)`));
  const stop = () => server.close(() => { DB.close(); process.exit(0); });
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
}
main().catch(error => { console.error('RINGOUT startup failed:', error); process.exitCode = 1; });
// Purpose: Protected local preview and portable launch. Upstream: built Worker and generated migrations. Environment: Node 24 on Windows/macOS/Linux. Generated: 2026-09-15 America/New_York. Changes: lines 3-49 replace static serving with authentication, SQLite, bounded requests and loopback access.
