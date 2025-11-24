// routes/reminders.js (Final polished version)
import express from "express";
import db from "../db/index.js";
import {
  query,
  body,
  param,
  validationResult
} from "express-validator";

import { v4 as uuidv4, validate as isUUID } from "uuid";

const router = express.Router();

// ----------------------
// Mock Mode Store
// ----------------------
const mockStore = new Map();

const mockSample = [
  {
    reminder_id: uuidv4(),
    type: "email",
    reminder_date: "2025-10-20T09:00:00.000Z",
    message_status: "pending",
    invoice_id: uuidv4(),
    amount: 1500.0,
    invoice_status: "unpaid",
    description: "Website design - final payment",
    client_id: uuidv4(),
    client_name: "Acme Corp",
    client_email: "accounts@acme.example",
    company_name: "Acme Corporation",
    phone: "+1-555-0100"
  }
];

// ----------------------
// GET all reminders
// ----------------------
router.get(
  "/",
  [
    query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
    query("offset").optional().isInt({ min: 0 }).toInt(),
    query("status").optional().isString().trim(),
    query("from").optional().isISO8601(),
    query("to").optional().isISO8601()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    try {
      if (process.env.USE_MOCK_DB === "true") {
        const created = [...mockStore.values()];
        const combined = [...mockSample, ...created];

        const off = req.query.offset || 0;
        const lim = req.query.limit || combined.length;

        return res.json(combined.slice(off, off + lim));
      }

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

      const filters = [];
      const values = [];
      let idx = 1;

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

      if (filters.length) sql += ` WHERE ${filters.join(" AND ")}`;
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
      return res.json(result.rows);
    } catch (err) {
      console.error("❌ Error fetching reminders:", err.message);
      return res.status(500).json({ error: "Failed to fetch reminders" });
    }
  }
);

// ----------------------
// POST create reminder
// ----------------------
router.post(
  "/",
  [
    body("invoice_id")
      .exists()
      .custom(v => isUUID(v))
      .withMessage("invoice_id must be a valid UUID"),

    body("due_date").optional().isISO8601(),
    body("type").optional().isString(),
    body("message_status")
      .optional()
      .isIn(["pending", "sent", "failed", "partial"])
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    try {
      const { invoice_id, due_date, type, message_status } = req.body;

      if (process.env.USE_MOCK_DB === "true") {
        const id = uuidv4();
        const created = {
          reminder_id: id,
          invoice_id,
          reminder_date: due_date || new Date().toISOString(),
          type: type || "email",
          message_status: message_status || "pending"
        };
        mockStore.set(id, created);
        return res.status(201).json(created);
      }

      const sql = `
      INSERT INTO reminder (reminder_id, invoice_id, reminder_date, type, message_status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
      `;

      const newId = uuidv4();
      const values = [
        newId,
        invoice_id,
        due_date || new Date().toISOString(),
        type || "email",
        message_status || "pending"
      ];

      const result = await db.query(sql, values);
      return res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error("❌ Insert error:", err.message);
      return res.status(500).json({ error: "Failed to create reminder" });
    }
  }
);

// ----------------------
// GET single reminder by ID
// ----------------------
router.get("/:id", param("id").custom(isUUID), async (req, res) => {
  const id = req.params.id;

  if (process.env.USE_MOCK_DB === "true") {
    if (mockStore.has(id)) return res.json(mockStore.get(id));
    return res.status(404).json({ error: "Not found" });
  }

  const sql = `SELECT * FROM reminder WHERE reminder_id = $1`;
  const result = await db.query(sql, [id]);

  if (!result.rows.length) return res.status(404).json({ error: "Not found" });
  return res.json(result.rows[0]);
});

// ----------------------
// PUT update reminder
// ----------------------
router.put(
  "/:id",
  [
    param("id").custom(isUUID),
    body("due_date").optional().isISO8601(),
    body("type").optional().isString(),
    body("message_status").optional().isString()
  ],
  async (req, res) => {
    const id = req.params.id;
    const body = req.body;

    const updatableFields = ["due_date", "type", "message_status"];
    const fields = [];
    const values = [];
    let idx = 1;

    for (const f of updatableFields) {
      if (body[f] !== undefined) {
        fields.push(`${f === "due_date" ? "reminder_date" : f} = $${idx}`);
        values.push(body[f]);
        idx++;
      }
    }

    if (!fields.length)
      return res.status(400).json({ error: "No updatable fields provided" });

    const sql = `
    UPDATE reminder
    SET ${fields.join(", ")}
    WHERE reminder_id = $${idx}
    RETURNING *;
    `;

    values.push(id);

    const result = await db.query(sql, values);
    if (!result.rows.length)
      return res.status(404).json({ error: "Not found" });

    return res.json(result.rows[0]);
  }
);

// ----------------------
// DELETE reminder
// ----------------------
router.delete("/:id", param("id").custom(isUUID), async (req, res) => {
  const id = req.params.id;

  if (process.env.USE_MOCK_DB === "true") {
    mockStore.delete(id);
    return res.status(204).send();
  }

  const sql = `DELETE FROM reminder WHERE reminder_id = $1 RETURNING *`;
  const result = await db.query(sql, [id]);

  if (!result.rows.length)
    return res.status(404).json({ error: "Not found" });

  return res.status(204).send();
});

export default router;
router.get("/:id", 
  param("id").custom(isUUID), 
  async (req, res) => {

    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const id = req.params.id;

    if (process.env.USE_MOCK_DB === "true") {
      if (mockStore.has(id)) return res.json(mockStore.get(id));
      return res.status(404).json({ error: "Not found" });
    }

    const sql = `SELECT * FROM reminder WHERE reminder_id = $1`;
    const result = await db.query(sql, [id]);

    if (!result.rows.length)
      return res.status(404).json({ error: "Not found" });

    return res.json(result.rows[0]);
});
