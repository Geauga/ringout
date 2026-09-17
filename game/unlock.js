// unlock.js
// Request: Submit the PIN with visible progress and recoverable errors.
const form = document.querySelector('form');
const button = form.querySelector('button');
const error = document.getElementById('error');
form.addEventListener('submit', async event => {
  event.preventDefault();
  button.disabled = true; button.textContent = 'CHECKING PIN…'; error.textContent = '';
  try {
    const response = await fetch('/unlock', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body: new URLSearchParams(new FormData(form)), credentials: 'same-origin' });
    if (response.ok) { location.replace('/'); return; }
    error.textContent = response.status === 429 ? 'Too many attempts. Try again in 15 minutes.' : response.status === 401 ? 'That PIN did not match. Please try again.' : 'Access is unavailable. Please try again.';
  } catch { error.textContent = 'Connection lost. Please try again.'; }
  finally { button.disabled = false; button.textContent = 'UNLOCK & PLAY ↗'; }
});
// Purpose: Accessible PIN submission feedback. Upstream: protected server endpoint. Environment: browser. Generated: 2026-09-15 America/New_York. New file, all lines.
