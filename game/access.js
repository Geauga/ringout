// access.js
// Request: Return to the PIN screen when a session expires or is revoked.
(() => {
  async function checkAccess() {
    try { const response = await fetch('/api/session', { cache: 'no-store' }); if (!response.ok) location.replace('/unlock'); }
    catch { location.replace('/unlock'); }
  }
  setInterval(checkAccess, 60000);
  addEventListener('pageshow', event => { if (event.persisted) checkAccess(); });
  document.querySelector('form[action="/lock"]').addEventListener('submit', async event => {
    event.preventDefault();
    const button = event.currentTarget.querySelector('button');
    button.disabled = true;
    try {
      const response = await fetch('/lock', { method: 'POST', credentials: 'same-origin' });
      if (!response.ok) throw new Error('Session could not be revoked');
      location.replace('/unlock');
    } catch (error) { console.error('Lock game failed:', error); button.textContent = 'Retry locking'; button.disabled = false; }
  });
})();
// Purpose: Expiry/revocation UX. Upstream: server session endpoint. Environment: browser. Generated: 2026-09-15 America/New_York. New file, all lines.
// Updated: 2026-09-16 America/New_York. Lines 12-18 report failed revocation and keep the retry action available.
