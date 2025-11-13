// controllers/paymentsController.js
import db from '../db/index.js';

/* ------------------ CREATE PAYMENT ------------------ */
export const createPayment = async (req, res) => {
  try {
    const { invoice_id, amount_paid, method, status, payment_date } = req.body;

    if (!invoice_id || !amount_paid || !method || !status) {
      return res.status(400).json({
        error: 'invoice_id, amount_paid, method, and status are required',
      });
    }

    const result = await db.query(
      `INSERT INTO payment (invoice_id, payment_date, amount_paid, method, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [invoice_id, payment_date || new Date(), amount_paid, method, status]
    );

    res.status(201).json({ message: 'Payment created successfully', payment: result.rows[0] });
  } catch (err) {
    console.error('❌ Error creating payment:', err.message);
    res.status(500).json({ error: 'Failed to create payment' });
  }
};

/* ------------------ GET ALL PAYMENTS ------------------ */
export const getAllPayments = async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM payment ORDER BY payment_date DESC`);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching payments:', err.message);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
};

/* ------------------ GET PAYMENTS BY INVOICE ------------------ */
export const getPaymentsByInvoice = async (req, res) => {
  try {
    const { invoice_id } = req.params;
    const result = await db.query(`SELECT * FROM payment WHERE invoice_id = $1`, [invoice_id]);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching payments by invoice:', err.message);
    res.status(500).json({ error: 'Failed to fetch payments by invoice' });
  }
};
