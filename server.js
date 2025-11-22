// server.js - Entry point (ESM)
import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import db from "./db/index.js";

const PORT = process.env.PORT || 5001;

const startServer = async () => {
  try {
    // Test DB connection
    const result = await db.query("SELECT 1");
    console.log("✅ Database connected successfully");
  } catch (err) {
    console.error("⚠️ Database connection test failed:");
    console.error(err.message || err);

    console.log(
      "🚨 WARNING: The server will continue running, but database operations may fail."
    );
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
};

startServer();
