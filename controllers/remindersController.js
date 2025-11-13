// controllers/remindersController.js
const db = require('../db');

// GET all reminders
const getAll = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM reminders ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

// GET one reminder by ID
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM reminders WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Reminder not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// CREATE a new reminder
const create = async (req, res, next) => {
  try {
    const { invoice_id, client_name, email, due_date, message, status } = req.body;
    const query = `
      INSERT INTO reminders (invoice_id, client_name, email, due_date, message, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const values = [invoice_id, client_name, email, due_date, message, status || 'pending'];
    const result = await db.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// UPDATE a reminder
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fields = [];
    const values = [];
    const allowed = ['invoice_id', 'client_name', 'email', 'due_date', 'message', 'status'];
    let index = 1;

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        fields.push(`${key} = $${index}`);
        values.push(req.body[key]);
        index++;
      }
    }

    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

    const query = `UPDATE reminders SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${index} RETURNING *;`;
    values.push(id);
    const result = await db.query(query, values);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Reminder not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// DELETE a reminder
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM reminders WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Reminder not found' });
    res.json({ deleted: true, id });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getById, create, update, remove };
