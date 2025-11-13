require('dotenv').config();
const db = require('../../db');

async function run() {
  try {
    const sql = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'reminder'
      ORDER BY ordinal_position;
    `;
    const res = await db.query(sql);
    console.log('Columns for table reminder:');
    res.rows.forEach((r) => console.log(`- ${r.column_name} (${r.data_type})`));
    process.exit(0);
  } catch (err) {
    console.error('Failed to query columns:', err && err.message ? err.message : err);
    process.exit(1);
  }
}

run();
