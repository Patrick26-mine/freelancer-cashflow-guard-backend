const express = require('express');
const cors = require('cors');
require('dotenv').config();

const remindersRouter = require('./routes/reminders.js');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/reminders', remindersRouter);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Start server
const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => {
  console.log(`🚀 nodeserver running on port ${PORT}`);
});

// Graceful shutdown helper
const shutdown = (signal) => {
  console.log(`Received ${signal}. Shutting down server...`);
  server.close(() => {
    console.log('HTTP server closed.');
    // close DB pool if available
    try {
      const db = require('./db');
      if (db && db.pool) db.pool.end(() => console.log('DB pool closed.'));
    } catch (err) {
      // ignore
    }
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

module.exports = { app, server };
