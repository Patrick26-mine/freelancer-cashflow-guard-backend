const express = require('express');
const cors = require('cors');
require('dotenv').config();

const remindersRouter = require('./routes/reminders');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/reminders', remindersRouter);

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});
// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ error: 'Not found' });
});

// Central error handler
app.use((err, req, res, next) => {
  console.error(err && (err.stack || err));
  const status = err && err.status ? err.status : 500;
  res.status(status).json({ error: err && err.message ? err.message : 'Internal Server Error' });
});

module.exports = app;
