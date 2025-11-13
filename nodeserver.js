// nodeserver.js
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Basic route to test
app.get('/', (req, res) => {
  res.send(`🧪 Mock server running on port ${process.env.PORT || 5002}`);
});

// Example mock endpoint
app.get('/api/mockdata', (req, res) => {
  res.json({
    success: true,
    message: 'Mock API is live!',
    data: [
      { id: 1, name: 'Alice', balance: 2300 },
      { id: 2, name: 'Bob', balance: 1450 },
    ],
  });
});

// Start the server
const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  console.log(`✅ Mock server running on port ${PORT}`);
});
