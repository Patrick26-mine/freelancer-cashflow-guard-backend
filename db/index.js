import pkg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pkg;

// Validate
if (!process.env.DATABASE_URL) {
  console.error("❌ Missing DATABASE_URL in .env file");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool
  .connect()
  .then(() => console.log("✅ Connected to Supabase PostgreSQL"))
  .catch((err) =>
    console.error("❌ DB connection failed:", err.message)
  );

export default pool;
