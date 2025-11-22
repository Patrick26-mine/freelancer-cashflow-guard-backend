// controllers/remindersController.js
const db = require("../db");
const { v4: uuidv4, validate: isUUID } = require("uuid");

// -------------------------------
// Utility: Validate invoice_id
// Accepts: integer, numeric string, UUID
// -------------------------------
function validateInvoiceId(v) {
  if (typeof v === "number") return true;
  if (typeof v === "string" && /^[0-9]+$/.test(v)) return true;
  if (typeof v === "string" && isUUID(v)) return true;
  return false;
}

// -------------------------------
// GET ALL REMINDERS
// -------------------------------
const getAll = async (req, res, next) => {
  try {
    const sql = `
      SELECT *
      FROM reminders
      ORDER BY reminder_date ASC;
    `;

    const result = await db.query(sql);
    return res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

// -------------------------------
// GET REMINDER BY ID
// -------------------------------
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isUUID(id)) {
      return res.status(400).json({ error: "Invalid reminder_id format" });
    }

    const sql = `SELECT * FROM reminders WHERE reminder_id = $1;`;
    const result = await db.query(sql, [id]);

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Reminder not found" });

    return res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// -------------------------------
// CREATE REMINDER
// -------------------------------
const create = async (req, res, next) => {
  try {
    const { invoice_id, client_name, email, due_date, message, status } =
      req.body;

    if (!invoice_id || !validateInvoiceId(invoice_id)) {
      return res.status(400).json({
        error: "invoice_id must be an integer or valid UUID",
      });
    }

    if (!client_name) {
      return res.status(400).json({ error: "client_name is required" });
    }

    if (!email) {
      return res.status(400).json({ error: "email is required" });
    }

    const reminder_date = due_date
      ? new Date(due_date).toISOString()
      : new Date().toISOString();

    const newId = uuidv4();

    const sql = `
      INSERT INTO reminders 
      (reminder_id, invoice_id, client_name, email, reminder_date, message, status, type, message_status)
      VALUES
      ($1, $2, $3, $4, $5, $6, $7, 'Polite', 'Pending')
      RETURNING *;
    `;

    const values = [
      newId,
      invoice_id,
      client_name.trim(),
      email.trim(),
      reminder_date,
      message || null,
      status || "pending",
    ];

    const result = await db.query(sql, values);
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// -------------------------------
// UPDATE REMINDER (PARTIAL UPDATE)
// -------------------------------
const update = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isUUID(id)) {
      return res.status(400).json({ error: "Invalid reminder_id format" });
    }

    const allowed = [
      "invoice_id",
      "client_name",
      "email",
      "reminder_date",
      "message",
      "status",
      "type",
      "message_status",
    ];

    const fields = [];
    const values = [];
    let idx = 1;

    for (const key of allowed) {
      if (req.body[key] !== undefined && req.body[key] !== null) {
        fields.push(`${key} = $${idx}`);
        values.push(req.body[key]);
        idx++;
      }
    }

    if (!fields.length) {
      return res.status(400).json({ error: "No fields provided for update" });
    }

    const sql = `
      UPDATE reminders
      SET ${fields.join(", ")}, updated_at = NOW()
      WHERE reminder_id = $${idx}
      RETURNING *;
    `;
    values.push(id);

    const result = await db.query(sql, values);

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Reminder not found" });

    return res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// -------------------------------
// DELETE REMINDER
// -------------------------------
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isUUID(id)) {
      return res.status(400).json({ error: "Invalid reminder_id format" });
    }

    const sql = `
      DELETE FROM reminders 
      WHERE reminder_id = $1 
      RETURNING reminder_id;
    `;

    const result = await db.query(sql, [id]);

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Reminder not found" });

    return res.json({ deleted: true, reminder_id: id });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};
