// server.cjs
// Request: Serve the local four-player game.
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
      
      const buffer = [];
      for await (const chunk of req) buffer.push(chunk);
      const reqBody = buffer.length ? Buffer.concat(buffer) : null;
      
      const request = new Request(`${origin}${req.url}`, {
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
      res.writeHead(500);
      res.end('Internal Server Error');
    }
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(`RINGOUT game available on: ${origin}`);
  });
}

main().catch(console.error);
