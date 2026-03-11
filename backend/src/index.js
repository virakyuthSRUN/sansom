require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Import routes
const tellerRoutes = require('./routes/teller');
const chatRoutes = require('./routes/chat');
const transactionRoutes = require('./routes/transactions');
const budgetRoutes = require('./routes/budget');

// Use routes
app.use('/api/teller', tellerRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/budget-summary', budgetRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    teller: {
      configured: !!process.env.TELLER_APP_ID,
      environment: process.env.TELLER_ENVIRONMENT,
      certsExist: require('fs').existsSync(path.resolve(process.env.TELLER_CERT_PATH))
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 SAMSOM Backend running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔑 Teller: ${process.env.TELLER_APP_ID ? 'Configured' : 'Not configured'}\n`);
});