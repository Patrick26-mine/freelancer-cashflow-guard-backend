import express from 'express';
import db from '../../db/index.js';
import { body, param, validationResult } from 'express-validator';
import { v4 as uuidv4, validate as isUUID } from 'uuid';

const router = express.Router();

/* ------------------ GET ALL INVOICES ------------------ */
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT i.*, c.client_name, c.email, c.company_name
       FROM invoice i
       LEFT JOIN clients c ON i.client_id = c.client_id
       ORDER BY i.issue_date DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching invoices:', err.message);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

/* ------------------ GET SINGLE INVOICE ------------------ */
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  if (!isUUID(id)) return res.status(400).json({ error: 'Invalid invoice ID format' });

  try {
    const result = await db.query(
      `SELECT i.*, c.client_name, c.email, c.company_name
       FROM invoice i
       LEFT JOIN clients c ON i.client_id = c.client_id
       WHERE i.invoice_id = $1`,
      [id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Invoice not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error fetching invoice:', err.message);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

/* ------------------ CREATE INVOICE ------------------ */
router.post(
  '/',
  [
    body('client_id').notEmpty().withMessage('Client ID is required'),
    body('issue_date').isISO8601().withMessage('Valid issue date is required'),
    body('due_date').isISO8601().withMessage('Valid due date is required'),
    body('amount').isNumeric().withMessage('Amount must be a number'),
    body('status')
      .optional()
      .isIn(['Pending', 'Paid', 'Overdue'])
      .withMessage('Invalid status'),
    body('description').optional().isString()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { client_id, issue_date, due_date, amount, status = 'Pending', description } = req.body;

    try {
      // ✅ 1️⃣ Check if client exists before creating invoice
      const clientCheck = await db.query('SELECT client_id FROM clients WHERE client_id = $1', [client_id]);
      if (!clientCheck.rows.length) {
        return res.status(400).json({
          error: `Client with ID ${client_id} does not exist. Please create the client first.`,
        });
      }

      // ✅ 2️⃣ Create invoice safely
      const result = await db.query(
        `INSERT INTO invoice (invoice_id, client_id, issue_date, due_date, amount, status, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [uuidv4(), client_id, issue_date, due_date, amount, status, description || null]
      );

      res.status(201).json({ message: 'Invoice created successfully', invoice: result.rows[0] });
    } catch (err) {
      console.error('❌ Create invoice failed:', err.message);
      res.status(500).json({ error: 'Failed to create invoice', details: err.message });
    }
  }
);

/* ------------------ UPDATE INVOICE ------------------ */
router.put(
  '/:id',
  [
    param('id').custom(isUUID).withMessage('Invalid invoice ID'),
    body('issue_date').optional().isISO8601(),
    body('due_date').optional().isISO8601(),
    body('amount').optional().isNumeric(),
    body('status')
      .optional()
      .isIn(['Pending', 'Paid', 'Overdue']),
    body('description').optional().isString()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { id } = req.params;
    const { issue_date, due_date, amount, status, description } = req.body;

    try {
      const fields = [];
      const values = [];
      let idx = 1;

      if (issue_date) { fields.push(`issue_date = $${idx++}`); values.push(issue_date); }
      if (due_date) { fields.push(`due_date = $${idx++}`); values.push(due_date); }
      if (amount) { fields.push(`amount = $${idx++}`); values.push(amount); }
      if (status) { fields.push(`status = $${idx++}`); values.push(status); }
      if (description) { fields.push(`description = $${idx++}`); values.push(description); }

      if (!fields.length) return res.status(400).json({ error: 'No updatable fields provided' });

      const sql = `UPDATE invoice SET ${fields.join(', ')} WHERE invoice_id = $${idx} RETURNING *`;
      values.push(id);

      const result = await db.query(sql, values);
      if (!result.rows.length) return res.status(404).json({ error: 'Invoice not found' });

      res.json({ message: 'Invoice updated successfully', invoice: result.rows[0] });
    } catch (err) {
      console.error('❌ Error updating invoice:', err.message);
      res.status(500).json({ error: 'Failed to update invoice' });
    }
  }
);

/* ------------------ DELETE INVOICE ------------------ */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  if (!isUUID(id)) return res.status(400).json({ error: 'Invalid invoice ID' });

  try {
    const result = await db.query('DELETE FROM invoice WHERE invoice_id = $1 RETURNING *', [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Invoice not found' });
    res.status(204).send();
  } catch (err) {
    console.error('❌ Error deleting invoice:', err.message);
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
});

export default router;
