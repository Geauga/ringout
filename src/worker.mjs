// worker.mjs
// Request: Require server-verified PIN access before serving either four-player game mode.
import { digest, randomToken, validVerifier, verifyPin } from './auth.mjs';
import { securityStore } from './security-store.mjs';
import { mapsApi } from './maps-api.mjs';
const securityHeaders = {
  'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
};
const lockPage = message => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#14171d"><title>Unlock RINGOUT</title><style>
*{box-sizing:border-box}body{margin:0;background:#14171d;color:#f3f0e8;font-family:Arial,sans-serif;min-height:100svh;display:grid;place-items:center;padding:24px}main{width:min(100%,460px);border:1px solid #34383c;border-radius:24px;padding:40px;background:#1c2026;box-shadow:0 30px 90px #0004}.brand{font-size:25px;font-weight:900;letter-spacing:-1px}.brand span{color:#dcf87b}.eyebrow{font-size:11px;letter-spacing:2px;color:#a5ad9a;margin-top:44px}h1{font-size:40px;letter-spacing:-2px;margin:14px 0}p{color:#b9bdc4;line-height:1.6}label{display:block;margin:28px 0 12px;font-size:13px;font-weight:bold}input{width:100%;background:#12151a;border:1px solid #656e76;border-radius:10px;color:#fff;padding:17px;font-size:24px;letter-spacing:8px;text-align:center}input:focus-visible,button:focus-visible{outline:3px solid #fff;outline-offset:4px}button{width:100%;margin-top:18px;background:#dcf87b;border:0;border-radius:10px;color:#14171d;padding:18px;font-size:14px;font-weight:900;cursor:pointer}.error{color:#ffbba6;min-height:24px;font-size:14px}.note{font-size:12px;margin:26px 0 0}@media(max-width:440px){main{padding:28px}h1{font-size:34px}}
</style><script defer src="/unlock.js"></script></head><body><main><div class="brand">RINGOUT<span>.</span></div><div class="eyebrow">THE COUCH COMPETITION</div><h1>Your arena awaits.</h1><p>Enter the access PIN to play Arena or Platformer with up to four players.</p><form method="post" action="/unlock"><label for="pin">8-DIGIT ACCESS PIN</label><input id="pin" name="pin" type="password" inputmode="numeric" autocomplete="current-password" pattern="[0-9]{8}" minlength="8" maxlength="8" required autofocus aria-describedby="error"><p class="error" id="error" role="status">${message}</p><button type="submit">UNLOCK & PLAY ↗</button></form><p class="note">Access lasts 8 hours. Use “Lock game” when you’re finished.</p></main></body></html>`;
function reply(body, status = 200, headers = {}) { return new Response(body, { status, headers: { ...securityHeaders, ...headers } }); }
function page(message = '', status = 200, headers = {}) { return reply(lockPage(message), status, { 'Content-Type': 'text/html; charset=utf-8', ...headers }); }
function cookieName(url) { return url.protocol === 'https:' ? '__Host-ringout' : 'ringout-local'; }
function sessionCookie(url, token, age) { return `${cookieName(url)}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${url.protocol === 'https:' ? '; Secure' : ''}`; }
function tokenFrom(request, url) {
  const name = cookieName(url) + '=';
  const cookie = (request.headers.get('cookie') || '').split(';').map(x => x.trim()).find(x => x.startsWith(name));
  const value = cookie?.slice(name.length);
  return /^[a-f0-9]{64}$/.test(value || '') ? value : null;
}
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
      if (!validVerifier(env.RINGOUT_PIN_HASH) || !env.DB) return reply('Access is unavailable. The owner must finish PIN setup.', 503);
      if (url.protocol !== 'https:' && !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) return reply('HTTPS is required.', 403);
      const store = securityStore(env.DB), tag = await digest(env.RINGOUT_PIN_HASH), now = clock();
      const token = tokenFrom(request, url), tokenHash = token ? await digest(token) : null;
      if(url.pathname==='/api/maps'||url.pathname.startsWith('/api/maps/')){
        if(!tokenHash||!await store.findSession(tokenHash,tag,now))return reply('{"error":"Unlock the game to use saved maps."}',401,{'Content-Type':'application/json'});
        const result=await mapsApi(request,url,env.DB,now,boundedBody);
        return reply(result.body,result.status,{'Content-Type':'application/json'});
      }
      if (request.method === 'POST') {
        if (request.headers.get('origin') !== url.origin) return reply('Request origin rejected.', 403);
        if (url.pathname === '/lock') {
          if (tokenHash) await store.deleteSession(tokenHash);
          return reply(null, 303, { Location: '/unlock', 'Set-Cookie': sessionCookie(url, '', 0), 'Clear-Site-Data': '"cache"' });
        }
        if (url.pathname !== '/unlock') return reply('Not found', 404);
        if (!(request.headers.get('content-type') || '').startsWith('application/x-www-form-urlencoded')) return reply('Unsupported form', 415);
        // Cloudflare supplies this address; the local adapter replaces it with the socket peer.
        const ipKey = await digest(`${tag}:${request.headers.get('cf-connecting-ip') || 'unknown'}`);
        const attempt = await store.consumeAttempt(ipKey, now);
        if (!attempt.allowed) return page('Too many attempts. Try again in 15 minutes.', 429, { 'Retry-After': String(attempt.retryAfter) });
        const form = new URLSearchParams(await boundedBody(request));
        if (form.getAll('pin').length !== 1 || !await verifyPin(form.get('pin') || '', env.RINGOUT_PIN_HASH)) return page('That PIN did not match. Please try again.', 401);
        if (tokenHash) await store.deleteSession(tokenHash);
        const nextToken = randomToken();
        await store.addSession(await digest(nextToken), tag, now + 28800);
        if (request.headers.get('accept') === 'application/json') return reply('{"authenticated":true}', 200, { 'Content-Type': 'application/json', 'Set-Cookie': sessionCookie(url, nextToken, 28800) });
        return reply(null, 303, { Location: '/', 'Set-Cookie': sessionCookie(url, nextToken, 28800) });
      }
      if (!['GET', 'HEAD'].includes(request.method)) return reply('Method not allowed', 405, { Allow: 'GET, HEAD, POST' });
      if (url.pathname === '/unlock.js' && Object.hasOwn(assets, '/unlock.js')) return reply(request.method === 'HEAD' ? null : assets['/unlock.js'].body, 200, { 'Content-Type': 'text/javascript; charset=utf-8' });
      const authorized = tokenHash && await store.findSession(tokenHash, tag, now);
      if (url.pathname === '/api/session') return reply(request.method === 'HEAD' ? null : JSON.stringify({ authenticated: !!authorized }), authorized ? 200 : 401, { 'Content-Type': 'application/json' });
      if (!authorized) {
        if (url.pathname === '/' || url.pathname === '/unlock') return request.method === 'HEAD' ? reply(null) : page();
        return reply('Unlock the game first.', 401);
      }
      if (url.pathname === '/unlock') return reply(null, 303, { Location: '/' });
      const name = url.pathname === '/' ? '/index.html' : url.pathname;
      if (!Object.hasOwn(assets, name)) return reply('Not found', 404);
      const asset = assets[name];
      return reply(request.method === 'HEAD' ? null : asset.body, 200, { 'Content-Type': asset.type });
    } catch (error) {
      if (error.message === 'BODY_LIMIT') return reply('Form too large.', 413);
      console.error('RINGOUT access request failed:', error);
      return reply('Access is temporarily unavailable. Please try again.', 503);
    }
  } };
}
// Purpose: Fail-closed access gate with no public game assets. Upstream: auth.mjs, security-store.mjs and game files. Environment: Workers / Node 24. Generated: 2026-09-15 America/New_York. New file, all lines.
// Updated: 2026-09-18 America/New_York. Lines 5,22-33,47-51 add authenticated map routes and a route-specific request limit; PIN forms retain their 1024-byte limit.
