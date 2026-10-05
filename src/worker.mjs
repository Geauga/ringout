// worker.mjs
// Request: Serve the static files and maps API without PIN protection.
import { mapsApi } from './maps-api.mjs';

const securityHeaders = {
  'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
};

function reply(body, status = 200, headers = {}) { return new Response(body, { status, headers: { ...securityHeaders, ...headers } }); }

async function boundedBody(request, limit = 1024) {
  if (Number(request.headers.get('content-length') || 0) > limit) throw new Error('BODY_LIMIT');
  const reader = request.body?.getReader();
  if (!reader) return '';
  let body = '', count = 0;
  const decoder = new TextDecoder();
  try {
    while (true) {
      const chunk = await reader.read(); if (chunk.done) break;
      count += chunk.value.byteLength;
      if (count > limit) { await reader.cancel(); throw new Error('BODY_LIMIT'); }
      body += decoder.decode(chunk.value, { stream: true });
    }
    return body + decoder.decode();
  } finally { reader.releaseLock(); }
}

export function createWorker(assets, clock = () => Math.floor(Date.now() / 1000)) {
  return { async fetch(request, env) {
    try {
      const url = new URL(request.url);
      if (url.protocol !== 'https:' && !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) return reply('HTTPS is required.', 403);
      const now = clock();
      if(url.pathname==='/api/maps'||url.pathname.startsWith('/api/maps/')){
        const result=await mapsApi(request,url,env.DB,now,boundedBody);
        return reply(result.body,result.status,{'Content-Type':'application/json'});
      }
      
      if (!['GET', 'HEAD'].includes(request.method)) return reply('Method not allowed', 405, { Allow: 'GET, HEAD, POST' });
      
      let target = url.pathname;
      if (target === '/') target = '/index.html';
      
      if (Object.hasOwn(assets, target)) {
        const ext = target.split('.').pop();
        const types = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8' };
        return reply(request.method === 'HEAD' ? null : assets[target].body, 200, { 'Content-Type': types[ext] || 'application/octet-stream' });
      }
      return reply('Not found', 404);
    } catch (error) { console.error('RINGOUT request failed:', error); return reply('Internal Server Error', 500); }
  }};
}
// Purpose: Serve game assets and the map API with response headers and visible failure diagnostics.
// Upstream: maps-api.mjs validates/persists shared maps; build.mjs embeds game assets in the Worker bundle.
// Environment: Workers/D1 or Node 24+ local adapter. Updated: 2026-10-04 America/New_York.
// Changes: line 51 restores error logging removed with the PIN gate; no authentication is reintroduced.
