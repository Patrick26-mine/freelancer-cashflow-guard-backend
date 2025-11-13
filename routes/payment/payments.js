import express from 'express';
import db from '../../db/index.js';

const router = express.Router();

// ✅ Get all payments
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM payment ORDER BY payment_date DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get payment by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM payment WHERE payment_id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Payment not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Create a new payment
router.post('/', async (req, res) => {
  try {
    const { invoice_id, payment_date, amount_paid, method, status } = req.body;
    const result = await db.query(
      `INSERT INTO payment (invoice_id, payment_date, amount_paid, method, status)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [invoice_id, payment_date, amount_paid, method, status]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Update payment details
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_date, amount_paid, method, status } = req.body;
    const result = await db.query(
      `UPDATE payment SET payment_date = $1, amount_paid = $2, method = $3, status = $4
       WHERE payment_id = $5 RETURNING *`,
      [payment_date, amount_paid, method, status, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Payment not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Delete payment
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM payment WHERE payment_id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Payment not found' });
    res.json({ message: 'Payment deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
