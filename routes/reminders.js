// routes/reminders.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { query, body, validationResult, param } = require('express-validator');
const { v4: uuidv4, validate: isUUID } = require('uuid');

// In-memory store for mock-mode created reminders (stable within process)
const mockStore = new Map();

// Seed sample data for mock mode (uses UUIDs for reminder_id)
const mockSample = [
  {
    reminder_id: uuidv4(),
    type: 'email',
    reminder_date: '2025-10-20T09:00:00.000Z',
    message_status: 'pending',
    invoice_id: uuidv4(),
    amount: 1500.0,
    invoice_status: 'unpaid',
    description: 'Website design - final payment',
    client_id: uuidv4(),
    client_name: 'Acme Corp',
    client_email: 'accounts@acme.example',
    company_name: 'Acme Corporation',
    phone: '+1-555-0100'
  },
  {
    reminder_id: uuidv4(),
    type: 'sms',
    reminder_date: '2025-10-25T10:00:00.000Z',
    message_status: 'sent',
    invoice_id: uuidv4(),
    amount: 750.5,
    invoice_status: 'partial',
    description: 'Monthly retainer',
    client_id: uuidv4(),
    client_name: 'Beta LLC',
    client_email: 'billing@beta.example',
    company_name: 'Beta LLC',
    phone: '+1-555-0200'
  }
];

// ✅ Get all reminders along with related invoice and client details
// GET /api/reminders with optional pagination and filtering
router.get(
  '/',
  [
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
    query('status').optional().isString().trim().escape(),
    query('from').optional().isISO8601(),
    query('to').optional().isISO8601(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      // If mock mode enabled, return sample data for local development
      if (process.env.USE_MOCK_DB === 'true') {
        // combine seeded sample and any created mock items
        const created = Array.from(mockStore.values());
        const combined = [...mockSample, ...created];
        const off = Number(req.query.offset) || 0;
        const lim = Number(req.query.limit) || combined.length;
        return res.json(combined.slice(off, off + lim));
      }

      const filters = [];
      const values = [];
      let idx = 1;

      let sql = `
        SELECT 
          r.reminder_id,
          r.type,
          r.reminder_date,
          r.message_status,
          i.invoice_id,
          i.amount,
          i.status AS invoice_status,
          i.description,
          c.client_id,
          c.client_name,
          c.email AS client_email,
          c.company_name,
          c.phone
        FROM reminder r
        INNER JOIN invoice i ON r.invoice_id = i.invoice_id
        INNER JOIN clients c ON i.client_id = c.client_id
      `;

      if (req.query.status) {
        filters.push(`i.status = $${idx++}`);
        values.push(req.query.status);
      }
      if (req.query.from) {
        filters.push(`r.reminder_date >= $${idx++}`);
        values.push(req.query.from);
      }
      if (req.query.to) {
        filters.push(`r.reminder_date <= $${idx++}`);
        values.push(req.query.to);
      }

      if (filters.length) sql += ` WHERE ${filters.join(' AND ')}`;

      sql += ` ORDER BY r.reminder_date ASC`;

      if (req.query.limit) {
        sql += ` LIMIT $${idx++}`;
        values.push(req.query.limit);
      }
      if (req.query.offset) {
        sql += ` OFFSET $${idx++}`;
        values.push(req.query.offset);
      }

      const result = await db.query(sql, values);
      res.json(result.rows);
    } catch (err) {
      console.error('\u274c Database query failed:', err.message);
      return res.status(500).json({ error: 'Failed to fetch reminders' });
    }
  }
);

// POST create a reminder (basic validation)
// POST create a reminder (validation + mock support)
router.post(
  '/',
  [
    body('invoice_id')
      .exists()
      .custom((v) => {
        if (typeof v === 'number') return true;
        if (typeof v === 'string' && /^[0-9]+$/.test(v)) return true; // numeric string
        if (typeof v === 'string' && isUUID(v)) return true;
        return false;
      })
      .withMessage('invoice_id is required and must be an integer or UUID'),
    body('client_name').exists().isString().trim().withMessage('client_name is required'),
    body('email').exists().isEmail().withMessage('A valid email is required').normalizeEmail(),
    body('due_date').optional().isISO8601().toDate(),
    body('message').optional().isString().trim(),
    body('status').optional().isString().trim().isIn(['pending', 'sent', 'failed', 'partial']).withMessage('Invalid status'),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { invoice_id, client_name, email, due_date, message, status } = req.body;

      // If mock mode enabled, create a stable in-memory object
      if (process.env.USE_MOCK_DB === 'true') {
        const id = uuidv4();
        const created = {
          reminder_id: id,
          type: 'email',
          reminder_date: due_date ? new Date(due_date).toISOString() : new Date().toISOString(),
          message_status: status || 'pending',
          invoice_id: invoice_id || uuidv4(),
          amount: null,
          invoice_status: null,
          description: message || null,
          client_id: uuidv4(),
          client_name,
          client_email: email,
          company_name: null,
          phone: null,
        };
        mockStore.set(id, created);
        return res.status(201).json(created);
      }

      // Persist to DB. Use the actual columns present in the `reminder` table.
      // Current table columns: reminder_id (uuid), invoice_id (uuid), reminder_date (date), type, message_status
      const insertQuery = `
        INSERT INTO reminder (invoice_id, reminder_date, type, message_status)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
      `;
      // Normalize types/status to match DB check constraints
      // Force known-good values to satisfy DB constraints
      const values = [
        invoice_id,
        due_date ? new Date(due_date).toISOString().slice(0,10) : new Date().toISOString().slice(0,10),
        'Polite',
        'Pending',
      ];
  console.log('Inserting reminder with values:', values);
  const result = await db.query(insertQuery, values);
      res.status(201).json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  }
);

// GET a single reminder by id (UUID)
router.get(
  '/:id',
  [param('id').custom((v) => isUUID(v)).withMessage('id must be a valid UUID')],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const id = req.params.id;
    if (process.env.USE_MOCK_DB === 'true') {
      // return from store or seeded sample
      if (mockStore.has(id)) return res.json(mockStore.get(id));
      const found = mockSample.find((s) => s.reminder_id === id);
      if (found) return res.json(found);
      return res.status(404).json({ error: 'Not found' });
    }

    try {
      const sql = `SELECT * FROM reminder WHERE reminder_id = $1`;
      const result = await db.query(sql, [id]);
      if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
      res.json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  }
);

// PUT update a reminder (UUID)
router.put(
  '/:id',
  [
    param('id').custom((v) => isUUID(v)).withMessage('id must be a valid UUID'),
    body('client_name').optional().isString().trim(),
    body('email').optional().isEmail().normalizeEmail(),
    body('due_date').optional().isISO8601().toDate(),
    body('message').optional().isString().trim(),
    body('status').optional().isString().isIn(['pending', 'sent', 'failed', 'partial']),
    // Allow updating reminder type and message status (validate against DB-allowed values)
    body('type').optional().isString().isIn(['Polite', 'Firm', 'Final']),
    body('message_status').optional().isString().isIn(['Pending', 'Sent']),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const id = req.params.id;
  const { client_name, email, due_date, message, status, type, message_status } = req.body;

    if (process.env.USE_MOCK_DB === 'true') {
      if (!mockStore.has(id)) return res.status(404).json({ error: 'Not found' });
      const existing = mockStore.get(id);
      const updated = Object.assign({}, existing, {
        client_name: client_name || existing.client_name,
        client_email: email || existing.client_email,
        // allow updating both the message_status and the generic status field
        message_status: message_status || status || existing.message_status,
        description: message || existing.description,
        due_date: due_date ? new Date(due_date).toISOString() : existing.due_date,
        type: type || existing.type,
      });
      mockStore.set(id, updated);
      return res.json(updated);
    }

    try {
      const fields = [];
      const values = [];
      let idx = 1;
      if (client_name) { fields.push(`client_name = $${idx++}`); values.push(client_name); }
      if (email) { fields.push(`email = $${idx++}`); values.push(email); }
      if (due_date) { fields.push(`due_date = $${idx++}`); values.push(due_date); }
  if (message) { fields.push(`message = $${idx++}`); values.push(message); }
  if (status) { fields.push(`status = $${idx++}`); values.push(status); }
  if (type) { fields.push(`type = $${idx++}`); values.push(type); }
  if (message_status) { fields.push(`message_status = $${idx++}`); values.push(message_status); }

      if (!fields.length) return res.status(400).json({ error: 'No updatable fields provided' });

      const sql = `UPDATE reminder SET ${fields.join(', ')} WHERE reminder_id = $${idx} RETURNING *`;
      values.push(id);
      const result = await db.query(sql, values);
      if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
      res.json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE a reminder (UUID)
router.delete(
  '/:id',
  [param('id').custom((v) => isUUID(v)).withMessage('id must be a valid UUID')],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const id = req.params.id;
    if (process.env.USE_MOCK_DB === 'true') {
      mockStore.delete(id);
      return res.status(204).send();
    }

    try {
      const sql = `DELETE FROM reminder WHERE reminder_id = $1 RETURNING *`;
      const result = await db.query(sql, [id]);
      if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;


