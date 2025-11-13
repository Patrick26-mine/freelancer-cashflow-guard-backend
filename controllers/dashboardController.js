import db from '../db/index.js';

export const getSummary = async (req, res) => {
  try {
    const totalInvoices = await db.query('SELECT COUNT(*) FROM invoice');
    const totalAmount = await db.query('SELECT COALESCE(SUM(amount), 0) FROM invoice');
    const totalPaid = await db.query("SELECT COALESCE(SUM(amount_paid), 0) FROM payment WHERE status = 'Completed'");
    const totalPending = totalAmount.rows[0].coalesce - totalPaid.rows[0].coalesce;

    const overdueCount = await db.query(`
      SELECT COUNT(*) FROM invoice
      WHERE due_date < CURRENT_DATE AND status != 'Paid'
    `);

    res.json({
      total_invoices: parseInt(totalInvoices.rows[0].count),
      total_amount: parseFloat(totalAmount.rows[0].coalesce),
      total_paid: parseFloat(totalPaid.rows[0].coalesce),
      total_pending: parseFloat(totalPending),
      overdue_count: parseInt(overdueCount.rows[0].count)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load dashboard summary' });
  }
};

export const getActivity = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 'Invoice Created' AS type, invoice_id AS entity, issue_date AS date FROM invoice
      UNION ALL
      SELECT 'Payment Received' AS type, invoice_id AS entity, payment_date AS date FROM payment
      ORDER BY date DESC
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load activity feed' });
  }
};
