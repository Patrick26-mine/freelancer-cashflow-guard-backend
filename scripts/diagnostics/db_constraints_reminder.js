require('dotenv').config();
const db = require('../../db');

async function run() {
  try {
    const sql = `
      SELECT conname, pg_get_constraintdef(c.oid) AS constraint_def
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'reminder';
    `;
    const res = await db.query(sql);
    console.log('Constraints for table reminder:');
    res.rows.forEach((r) => console.log(`- ${r.conname}: ${r.constraint_def}`));
    process.exit(0);
  } catch (err) {
    console.error('Failed to query constraints:', err && err.message ? err.message : err);
    process.exit(1);
  }
}

run();
