import db from '../db/index.js';

// ✅ Get all invoices
export const getAllInvoices = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM invoice ORDER BY issue_date DESC');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching invoices:', err);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
};

// ✅ Get invoice by ID
export const getInvoiceById = async (req, res) => {
  const { invoice_id } = req.params;
  try {
    const result = await db.query('SELECT * FROM invoice WHERE invoice_id = $1', [invoice_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching invoice:', err);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
};

// ✅ Create new invoice
export const createInvoice = async (req, res) => {
  const { client_id, issue_date, due_date, amount, status, description } = req.body;
  try {
    const result = await db.query(
      `INSERT INTO invoice (client_id, issue_date, due_date, amount, status, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [client_id, issue_date, due_date, amount, status || 'Pending', description]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating invoice:', err);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
};

// ✅ Update invoice
export const updateInvoice = async (req, res) => {
  const { invoice_id } = req.params;
  const fields = req.body;

  // Dynamically build update query
  const keys = Object.keys(fields);
  if (keys.length === 0) {
    return res.status(400).json({ error: 'No fields provided for update' });
  }

  const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
  const values = Object.values(fields);
  values.push(invoice_id);

  const query = `UPDATE invoice SET ${setClause}, updated_at = NOW() WHERE invoice_id = $${values.length} RETURNING *`;

  try {
    const result = await db.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error updating invoice:', err);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
};

// ✅ Delete invoice
export const deleteInvoice = async (req, res) => {
  const { invoice_id } = req.params;
  try {
    const result = await db.query('DELETE FROM invoice WHERE invoice_id = $1 RETURNING *', [invoice_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.status(200).json({ message: 'Invoice deleted successfully' });
  } catch (err) {
    console.error('Error deleting invoice:', err);
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
};
