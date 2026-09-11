// server.cjs
// Request: Serve the local four-player knockout game without package installation.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, 'dist');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400);res.end('Bad request');return; }
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep)) {res.writeHead(403);res.end('Forbidden');return;}
  fs.readFile(file, (error, data) => {
    if (error) {if(error.code!=='ENOENT')console.error('Asset read failed:',file,error);res.writeHead(error.code === 'ENOENT' ? 404 : 500);res.end('Asset unavailable');return;}
    res.writeHead(200, {'Content-Type':types[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-cache', 'X-Content-Type-Options':'nosniff'});res.end(data);
  });
}).listen(4173, '127.0.0.1', () => console.log('RINGOUT ready at http://127.0.0.1:4173'));
// Purpose: Local static preview. Upstream: dist/ browser game assets. Environment: Node.js 18+ on Windows, macOS, or Linux. Generated: 2026-09-11 America/New_York. New file: all lines.
