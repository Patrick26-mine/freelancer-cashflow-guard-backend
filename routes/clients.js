import express from 'express';
import db from '../db/index.js';
import { body, param, validationResult } from 'express-validator';
import { v4 as uuidv4, validate as isUUID } from 'uuid';

const router = express.Router();

/* ------------------ GET ALL CLIENTS ------------------ */
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM clients ORDER BY client_name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching clients:', err.message);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

/* ------------------ GET SINGLE CLIENT ------------------ */
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  if (!isUUID(id)) return res.status(400).json({ error: 'Invalid client ID format' });

  try {
    const result = await db.query('SELECT * FROM clients WHERE client_id = $1', [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Client not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error fetching client:', err.message);
    res.status(500).json({ error: 'Failed to fetch client' });
  }
});

/* ------------------ CREATE CLIENT ------------------ */
router.post(
  '/',
  [
    body('client_name').notEmpty().withMessage('Client name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('company_name').optional().isString(),
    body('phone').optional().isString()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { client_name, email, company_name, phone } = req.body;

    try {
      const result = await db.query(
        `INSERT INTO clients (client_id, client_name, email, company_name, phone)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [uuidv4(), client_name, email, company_name || null, phone || null]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('❌ Error creating client:', err.message);
      if (err.message.includes('duplicate key'))
        return res.status(400).json({ error: 'Email already exists' });
      res.status(500).json({ error: 'Failed to create client' });
    }
  }
);

/* ------------------ UPDATE CLIENT ------------------ */
router.put(
  '/:id',
  [
    param('id').custom(isUUID).withMessage('Invalid client ID'),
    body('client_name').optional().isString(),
    body('email').optional().isEmail(),
    body('company_name').optional().isString(),
    body('phone').optional().isString()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { id } = req.params;
    const { client_name, email, company_name, phone } = req.body;

    try {
      const fields = [];
      const values = [];
      let idx = 1;

      if (client_name) { fields.push(`client_name = $${idx++}`); values.push(client_name); }
      if (email) { fields.push(`email = $${idx++}`); values.push(email); }
      if (company_name) { fields.push(`company_name = $${idx++}`); values.push(company_name); }
      if (phone) { fields.push(`phone = $${idx++}`); values.push(phone); }

      if (!fields.length) return res.status(400).json({ error: 'No updatable fields provided' });

      const sql = `UPDATE clients SET ${fields.join(', ')} WHERE client_id = $${idx} RETURNING *`;
      values.push(id);

      const result = await db.query(sql, values);
      if (!result.rows.length) return res.status(404).json({ error: 'Client not found' });

      res.json(result.rows[0]);
    } catch (err) {
      console.error('❌ Error updating client:', err.message);
      res.status(500).json({ error: 'Failed to update client' });
    }
  }
);

/* ------------------ DELETE CLIENT ------------------ */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  if (!isUUID(id)) return res.status(400).json({ error: 'Invalid client ID' });

  try {
    const result = await db.query('DELETE FROM clients WHERE client_id = $1 RETURNING *', [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Client not found' });
    res.status(204).send();
  } catch (err) {
    console.error('❌ Error deleting client:', err.message);
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

export default router;
