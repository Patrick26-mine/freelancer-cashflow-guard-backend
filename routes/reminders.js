// routes/reminders.js
import express from 'express';
import db from '../db/index.js';
import { query, body, validationResult, param } from 'express-validator';
import { v4 as uuidv4, validate as isUUID } from 'uuid';

const router = express.Router();

// In-memory mock mode store
const mockStore = new Map();

// Mock sample data (for USE_MOCK_DB=true)
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

/* ------------------ GET ALL REMINDERS ------------------ */
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
      if (process.env.USE_MOCK_DB === 'true') {
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
      console.error('❌ Database query failed:', err.message);
      res.status(500).json({ error: 'Failed to fetch reminders' });
    }
  }
);

/* ------------------ CREATE REMINDER ------------------ */
router.post(
  '/',
  [
    body('invoice_id')
      .exists()
      .custom(v => typeof v === 'string' && (isUUID(v) || /^[0-9]+$/.test(v)))
      .withMessage('invoice_id must be an integer or UUID'),
    body('client_name').exists().isString().trim(),
    body('email').exists().isEmail().normalizeEmail(),
    body('due_date').optional().isISO8601(),
    body('message').optional().isString().trim(),
    body('status').optional().isIn(['pending', 'sent', 'failed', 'partial']),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { invoice_id, client_name, email, due_date, message, status } = req.body;

    try {
      if (process.env.USE_MOCK_DB === 'true') {
        const id = uuidv4();
        const created = {
          reminder_id: id,
          type: 'email',
          reminder_date: due_date ? new Date(due_date).toISOString() : new Date().toISOString(),
          message_status: status || 'pending',
          invoice_id: invoice_id || uuidv4(),
          description: message || '',
          client_name,
          client_email: email,
        };
        mockStore.set(id, created);
        return res.status(201).json(created);
      }

      const insertQuery = `
        INSERT INTO reminder (invoice_id, reminder_date, type, message_status)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
      `;
      const values = [
        invoice_id,
        due_date ? new Date(due_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        'Polite',
        'Pending',
      ];

      const result = await db.query(insertQuery, values);
      res.status(201).json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  }
);

/* ------------------ GET SINGLE REMINDER ------------------ */
router.get('/:id', async (req, res, next) => {
  const { id } = req.params;
  if (!isUUID(id)) return res.status(400).json({ error: 'Invalid UUID' });

  try {
    if (process.env.USE_MOCK_DB === 'true') {
      if (mockStore.has(id)) return res.json(mockStore.get(id));
      const found = mockSample.find(s => s.reminder_id === id);
      return found ? res.json(found) : res.status(404).json({ error: 'Not found' });
    }

    const sql = 'SELECT * FROM reminder WHERE reminder_id = $1';
    const result = await db.query(sql, [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

/* ------------------ UPDATE REMINDER ------------------ */
router.put('/:id', async (req, res, next) => {
  const { id } = req.params;
  if (!isUUID(id)) return res.status(400).json({ error: 'Invalid UUID' });

  const { client_name, email, due_date, message, status, type, message_status } = req.body;
  const reminder_date = due_date || req.body.reminder_date;

  try {
    if (process.env.USE_MOCK_DB === 'true') {
      if (!mockStore.has(id)) return res.status(404).json({ error: 'Not found' });
      const existing = mockStore.get(id);
      const updated = { ...existing, client_name, email, message_status: message_status || status || existing.message_status, description: message || existing.description, reminder_date: reminder_date || existing.reminder_date, type: type || existing.type };
      mockStore.set(id, updated);
      return res.json(updated);
    }

    const fields = [];
    const values = [];
    let idx = 1;

    if (client_name) { fields.push(`client_name = $${idx++}`); values.push(client_name); }
    if (email) { fields.push(`email = $${idx++}`); values.push(email); }
    if (reminder_date) { fields.push(`reminder_date = $${idx++}`); values.push(reminder_date); }
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
});

/* ------------------ DELETE REMINDER ------------------ */
router.delete('/:id', async (req, res, next) => {
  const { id } = req.params;
  if (!isUUID(id)) return res.status(400).json({ error: 'Invalid UUID' });

  try {
    if (process.env.USE_MOCK_DB === 'true') {
      mockStore.delete(id);
      return res.status(204).send();
    }

    const sql = 'DELETE FROM reminder WHERE reminder_id = $1 RETURNING *';
    const result = await db.query(sql, [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
