require('dotenv').config();
const { Pool } = require('pg');

const pwd = encodeURIComponent('Yuichi%407499463854');
// Build connection string using pooler-style username
const cs = `postgresql://postgres.idtxtnsersuhafgtzaab:${pwd}@db.idtxtnsersuhafgtzaab.supabase.co:5432/postgres`;

async function test() {
  try {
    console.log('Trying pooler-style username with connection string preview:', cs.substring(0,120));
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
    console.error('Pooler user test failed:', err && err.message ? err.message : err);
    if (err && err.stack) console.error(err.stack);
    process.exit(1);
  }
}

test();
