/**
 * Attempt several common connection-string variants to diagnose/fix
 * "Tenant or user not found" issues without modifying .env directly.
 *
 * Usage: node scripts/diagnostics/db_try_variants.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const { URL } = require('url');

const original = process.env.DATABASE_URL;
if (!original) {
  console.error('No DATABASE_URL found in .env');
  process.exit(2);
}

function tryConnect(opts) {
  return new Promise(async (resolve) => {
    const pool = new Pool(opts);
    let client;
    try {
      client = await pool.connect();
      const r = await client.query('SELECT NOW()');
      resolve({ success: true, now: r.rows[0], detail: opts.connectionString || '(object)' });
    } catch (err) {
      resolve({ success: false, error: err, detail: opts.connectionString || '(object)' });
    } finally {
      try { if (client) client.release(); } catch (e) {}
      try { await pool.end(); } catch (e) {}
    }
  });
}

function decodeAuth(urlString) {
  try {
    const u = new URL(urlString);
    if (!u.username && !u.password) return urlString;
    u.username = decodeURIComponent(u.username);
    u.password = decodeURIComponent(u.password);
    return u.toString();
  } catch (e) {
    return urlString;
  }
}

function replacePct40(urlString) {
  // common case where %40 appeared in password but should be literal @ (rare)
  return urlString.replace(/%40/g, '@');
}

async function run() {
  console.log('Original:', original);

  const variants = [];

  variants.push({ name: 'original', cs: original });

  // decoded auth
  variants.push({ name: 'decoded-auth', cs: decodeAuth(original) });

  // replace %40 with @ (if applicable)
  variants.push({ name: 'replace-%40->@', cs: replacePct40(original) });

  // fully decode entire connection string
  try {
    variants.push({ name: 'fully-decoded', cs: decodeURIComponent(original) });
  } catch (e) {
    // ignore
  }

  for (const v of variants) {
    console.log('\nTrying variant:', v.name);
    console.log('Connection string preview:', v.cs.substring(0, 120) + (v.cs.length>120? '...':''));

    // Standard attempts: a few SSL permutations
    const sslVariants = [
      { label: 'ssl: {rejectUnauthorized:false}', opts: { connectionString: v.cs, ssl: { rejectUnauthorized: false } } },
      { label: 'ssl: true', opts: { connectionString: v.cs, ssl: true } },
      { label: 'ssl: {rejectUnauthorized:true}', opts: { connectionString: v.cs, ssl: { rejectUnauthorized: true } } },
      { label: 'no-ssl', opts: { connectionString: v.cs } },
    ];

    for (const s of sslVariants) {
      const attempt = await tryConnect(s.opts);
      if (attempt.success) {
        console.log(`\u2705 Success with ${s.label}:`, attempt.now);
        process.exit(0);
      }
      console.error(`\u274c Failed with ${s.label}:`, attempt.error && attempt.error.message ? attempt.error.message : attempt.error);
    }

    // Try alternate common Postgres port (5432) if the variant uses a nonstandard port
    try {
      const u = new URL(v.cs);
      if (u.port && u.port !== '5432') {
        const alt = new URL(v.cs);
        alt.port = '5432';
        console.log('\nTrying alternate port 5432 for variant:', v.name);
        const attemptAlt = await tryConnect({ connectionString: alt.toString(), ssl: { rejectUnauthorized: false } });
        if (attemptAlt.success) {
          console.log('\u2705 Success on port 5432:', attemptAlt.now);
          process.exit(0);
        }
        console.error('\u274c Failed on port 5432:', attemptAlt.error && attemptAlt.error.message ? attemptAlt.error.message : attemptAlt.error);
      }
    } catch (e) {
      // ignore URL parse errors
    }
  }

  console.error('\nAll variants failed. See errors above.');
  process.exit(1);
}

run();
/**
 * Attempt several common connection-string variants to diagnose/fix
 * "Tenant or user not found" issues without modifying .env directly.
 *
 * Usage: node scripts/diagnostics/db_try_variants.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const { URL } = require('url');

const original = process.env.DATABASE_URL;
if (!original) {
  console.error('No DATABASE_URL found in .env');
  process.exit(2);
}

function tryConnect(opts) {
  return new Promise(async (resolve) => {
    const pool = new Pool(opts);
    let client;
    try {
      client = await pool.connect();
      const r = await client.query('SELECT NOW()');
      resolve({ success: true, now: r.rows[0], detail: opts.connectionString || '(object)' });
    } catch (err) {
      resolve({ success: false, error: err, detail: opts.connectionString || '(object)' });
    } finally {
      try { if (client) client.release(); } catch (e) {}
      try { await pool.end(); } catch (e) {}
    }
  });
}

function decodeAuth(urlString) {
  try {
    const u = new URL(urlString);
    if (!u.username && !u.password) return urlString;
    u.username = decodeURIComponent(u.username);
    u.password = decodeURIComponent(u.password);
    return u.toString();
  } catch (e) {
    return urlString;
  }
}

function replacePct40(urlString) {
  // common case where %40 appeared in password but should be literal @ (rare)
  return urlString.replace(/%40/g, '@');
}

async function run() {
  console.log('Original:', original);

  const variants = [];

  variants.push({ name: 'original', cs: original });

  // decoded auth
  variants.push({ name: 'decoded-auth', cs: decodeAuth(original) });

  // replace %40 with @ (if applicable)
  variants.push({ name: 'replace-%40->@', cs: replacePct40(original) });

  // fully decode entire connection string
  try {
    variants.push({ name: 'fully-decoded', cs: decodeURIComponent(original) });
  } catch (e) {
    // ignore
  }

  for (const v of variants) {
    console.log('\nTrying variant:', v.name);
    console.log('Connection string preview:', v.cs.substring(0, 120) + (v.cs.length>120? '...':''));

    // Standard attempts: a few SSL permutations
    const sslVariants = [
      { label: 'ssl: {rejectUnauthorized:false}', opts: { connectionString: v.cs, ssl: { rejectUnauthorized: false } } },
      { label: 'ssl: true', opts: { connectionString: v.cs, ssl: true } },
      { label: 'ssl: {rejectUnauthorized:true}', opts: { connectionString: v.cs, ssl: { rejectUnauthorized: true } } },
      { label: 'no-ssl', opts: { connectionString: v.cs } },
    ];

    for (const s of sslVariants) {
      const attempt = await tryConnect(s.opts);
      if (attempt.success) {
        console.log(`✅ Success with ${s.label}:`, attempt.now);
        process.exit(0);
      }
      console.error(`❌ Failed with ${s.label}:`, attempt.error && attempt.error.message ? attempt.error.message : attempt.error);
    }

    // Try alternate common Postgres port (5432) if the variant uses a nonstandard port
    try {
      const u = new URL(v.cs);
      if (u.port && u.port !== '5432') {
        const alt = new URL(v.cs);
        alt.port = '5432';
        console.log('\nTrying alternate port 5432 for variant:', v.name);
        const attemptAlt = await tryConnect({ connectionString: alt.toString(), ssl: { rejectUnauthorized: false } });
        if (attemptAlt.success) {
          console.log('✅ Success on port 5432:', attemptAlt.now);
          process.exit(0);
        }
        console.error('❌ Failed on port 5432:', attemptAlt.error && attemptAlt.error.message ? attemptAlt.error.message : attemptAlt.error);
      }
    } catch (e) {
      // ignore URL parse errors
    }
  }

  console.error('\nAll variants failed. See errors above.');
  process.exit(1);
}

run();
