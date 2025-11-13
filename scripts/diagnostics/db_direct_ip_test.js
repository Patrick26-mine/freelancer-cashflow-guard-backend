/**
 * Attempt a direct connection to a specific pooler IP to diagnose ETIMEDOUT vs auth issues.
 * Usage: node scripts/diagnostics/db_direct_ip_test.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const { URL } = require('url');

const original = process.env.DATABASE_URL;
if (!original) {
  console.error('No DATABASE_URL found in .env');
  process.exit(2);
}

async function tryIp(ip) {
  try {
    const u = new URL(original);
    u.hostname = ip;
    // keep same port
    const cs = u.toString();
    console.log('Attempting direct IP connect to', ip, 'connection string preview:', cs.substring(0,120));

    const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 });
    const client = await pool.connect();
    try {
      const r = await client.query('SELECT NOW()');
      console.log('Success:', r.rows[0]);
    } finally {
      client.release();
      await pool.end();
    }
  } catch (err) {
    console.error('Direct IP connect failed:', err && err.message ? err.message : err);
    if (err && err.stack) console.error(err.stack);
    process.exit(1);
  }
}

(async () => {
  // Try the two IPs you saw earlier
  await tryIp('13.200.110.68');
  await tryIp('3.111.225.200');
})();
