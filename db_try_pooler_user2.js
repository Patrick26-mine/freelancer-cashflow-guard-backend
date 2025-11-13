require('dotenv').config();
const { Pool } = require('pg');
const { URL } = require('url');

const original = process.env.DATABASE_URL;
if (!original) {
  console.error('No DATABASE_URL in .env');
  process.exit(2);
}

async function test() {
  try {
    const u = new URL(original);
    // preserve the password exactly as present in DATABASE_URL (no extra encoding)
    const pwd = u.password;

    // build a connection string using pooler-style username and direct host
    const poolerUser = 'postgres.idtxtnsersuhafgtzaab';
    const host = 'db.idtxtnsersuhafgtzaab.supabase.co';
    const port = '5432';

    // Manually assemble to avoid double-encoding
    const cs = `postgresql://${poolerUser}:${pwd}@${host}:${port}${u.pathname}`;
    console.log('Trying exact-password pooler connection preview:', cs.substring(0,120));

    const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 });
    const client = await pool.connect();
    try {
      const r = await client.query('SELECT NOW()');
      console.log('Success:', r.rows[0]);
      process.exit(0);
    } finally {
      client.release();
      await pool.end();
    }
  } catch (err) {
    console.error('Pooler exact-password test failed:', err && err.message ? err.message : err);
    if (err && err.stack) console.error(err.stack);
    process.exit(1);
  }
}

test();
