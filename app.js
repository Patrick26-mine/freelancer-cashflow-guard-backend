import express from "express";
import cors from "cors";

import remindersRouter from "./routes/reminders.js";
import invoicesRouter from "./routes/invoice/invoiceRoutes.js";
import clientsRouter from "./routes/clients.js"; // ✅ add this

const app = express();

app.use(cors());
app.use(express.json());

// ✅ Mount all routers
app.use("/api/reminders", remindersRouter);
app.use("/api/invoices", invoicesRouter);
app.use("/api/clients", clientsRouter); // ✅ now clients API works

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

export default app;
