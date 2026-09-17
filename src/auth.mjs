// auth.mjs
// Request: Verify an eight-digit PIN on the server with a salted, slow verifier.
const encoder = new TextEncoder();
export const hex = bytes => Array.from(new Uint8Array(bytes), x => x.toString(16).padStart(2, '0')).join('');
const unhex = value => Uint8Array.from(value.match(/../g), x => parseInt(x, 16));
export const digest = async value => hex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
export const randomToken = () => hex(crypto.getRandomValues(new Uint8Array(32)));
const context = encoder.encode('ringout-pin-v1');
async function keyFor(pin, salt) {
  const material = await crypto.subtle.importKey('raw', encoder.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: unhex(salt), iterations: 100000, hash: 'SHA-256' }, material, 256);
  return crypto.subtle.importKey('raw', bits, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
export function validVerifier(value) { return typeof value === 'string' && /^pbkdf2-sha256\$100000\$[a-f0-9]{32}\$[a-f0-9]{64}$/.test(value); }
export async function createVerifier(pin) {
  if (!/^\d{8}$/.test(pin)) throw new Error('PIN must contain exactly eight digits');
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  const tag = hex(await crypto.subtle.sign('HMAC', await keyFor(pin, salt), context));
  return `pbkdf2-sha256$100000$${salt}$${tag}`;
}
export async function verifyPin(pin, verifier) {
  if (!validVerifier(verifier) || !/^\d{8}$/.test(pin)) return false;
  const [, , salt, tag] = verifier.split('$');
  return crypto.subtle.verify('HMAC', await keyFor(pin, salt), unhex(tag), context);
}
// Purpose: PIN verification and random tokens. Upstream: user access requirement. Environment: Workers Web Crypto / Node 24. Generated: 2026-09-15 America/New_York. New file, all lines.
