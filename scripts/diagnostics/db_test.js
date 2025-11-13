const db = require('../../db');

async function test() {
  try {
    console.log('Attempting simple SELECT NOW() to test DB connection...');
    const res = await db.query('SELECT NOW()');
    console.log('Success:', res.rows[0]);
    process.exit(0);
  } catch (err) {
    console.error('DB connection test failed:');
    console.error(err && err.message ? err.message : err);
    if (err && err.stack) console.error(err.stack);
    process.exit(1);
  }
}

test();
