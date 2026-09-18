// security-store.mjs
// Request: Persist rate limits and revocable sessions across server restarts and Workers.
export function securityStore(db) {
  const statement = (sql, ...values) => db.prepare(sql).bind(...values);
  return {
    async consumeAttempt(ipKey, now) {
      const window = Math.floor(now / 900), expiry = (window + 1) * 900;
      const ipBucket = `ip:${window}:${ipKey}`;
      const upsert = bucket => statement('INSERT INTO pin_attempts (bucket, attempts, expires_at) VALUES (?, 1, ?) ON CONFLICT(bucket) DO UPDATE SET attempts = attempts + 1 RETURNING attempts', bucket, expiry);
      const rows = await db.batch([
        statement('DELETE FROM pin_attempts WHERE expires_at <= ?', now),
        statement('DELETE FROM sessions WHERE expires_at <= ?', now),
        upsert(ipBucket),
        // The batch transaction admits only this address's first eight attempts to the shared budget.
        statement('INSERT INTO pin_attempts (bucket, attempts, expires_at) SELECT ?, 1, ? WHERE (SELECT attempts FROM pin_attempts WHERE bucket = ?) <= 8 ON CONFLICT(bucket) DO UPDATE SET attempts = attempts + 1 RETURNING attempts', `global:${window}`, expiry, ipBucket),
      ]);
      return { allowed: rows[2].results[0].attempts <= 8 && (rows[3].results[0]?.attempts ?? Infinity) <= 100, retryAfter: expiry - now };
    },
    findSession: (tokenHash, tag, now) => statement('SELECT expires_at FROM sessions WHERE token_hash = ? AND verifier_tag = ? AND expires_at > ?', tokenHash, tag, now).first(),
    addSession: (tokenHash, tag, expires) => statement('INSERT INTO sessions (token_hash, verifier_tag, expires_at) VALUES (?, ?, ?)', tokenHash, tag, expires).run(),
    deleteSession: tokenHash => statement('DELETE FROM sessions WHERE token_hash = ?', tokenHash).run(),
  };
}
// Purpose: Prepared, atomic security queries. Upstream: db/schema.ts and generated migrations. Environment: D1 / SQLite adapter. Generated: 2026-09-15 America/New_York. New file, all lines.
// Updated: 2026-09-17 America/New_York. Lines 8-17 condition global-budget consumption on per-address admission within the same transaction; blocked clients cannot consume other addresses' login budget.
