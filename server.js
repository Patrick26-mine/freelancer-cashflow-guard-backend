// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './db/index.js';

// ✅ Route imports
import clientRoutes from './routes/clients.js';
import invoiceRoutes from './routes/invoice/invoiceRoutes.js';
import paymentRoutes from './routes/payment/payments.js';
import dashboardRoutes from './routes/dashboard/dashboard.js'; // ✅ Dashboard

dotenv.config();
const app = express();

// ✅ Middleware
app.use(cors());
app.use(express.json());

// ✅ Base route
app.get('/', (req, res) => {
  res.send('🚀 Freelancer Cashflow Guard Backend is running ✅');
});

// ✅ Mount routes
app.use('/api/clients', clientRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes); // ✅ Added this line

// ✅ Start server
const PORT = process.env.PORT || 5001;

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  try {
    const result = await db.query('SELECT NOW()');
    console.log('✅ Connected to Supabase PostgreSQL');
    console.log('✅ Database connected successfully:', result.rows[0].now);
  } catch (err) {
    console.error('⚠️ Database connection test failed:', err.message);
  }
});
