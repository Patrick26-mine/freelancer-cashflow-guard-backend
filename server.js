// server.js - entrypoint that starts the app and tests DB connectivity
require('dotenv').config();
const app = require('./app');
const db = require('./db');

const PORT = process.env.PORT || 5001;

const startServer = async () => {
  try {
    // Lightweight DB test to show status on startup
    await db.pool.query('SELECT 1');
    console.log('\u2705 Database connected successfully');
  } catch (err) {
    console.error('\u26A0\ufe0f Database connection test failed:', err && (err.message || err));
    console.error('The server will still start so you can use mock mode or debug, but DB operations may fail.');
  }

  app.listen(PORT, () => {
    console.log(`\ud83d\ude80 Server running on port ${PORT}`);
  });
};

startServer();

