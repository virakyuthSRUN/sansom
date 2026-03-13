const express = require('express');
const router = express.Router();
const mockData = require('../data/mock-transactions.json');
const categorize = require('../utils/categorize');

// GET /api/transactions?userId=123&limit=20&category=Food
router.get('/', (req, res) => {
  try {
    const { userId, limit = 20, category, startDate, endDate } = req.query;
    
    let transactions = [...mockData.transactions];
    
    // Apply filters
    if (category && category !== 'All') {
      transactions = transactions.filter(t => t.category === category);
    }
    
    if (startDate) {
      transactions = transactions.filter(t => t.date >= startDate);
    }
    
    if (endDate) {
      transactions = transactions.filter(t => t.date <= endDate);
    }
    
    // Sort by date (newest first)
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Apply limit
    transactions = transactions.slice(0, parseInt(limit));
    
    res.json({
      success: true,
      count: transactions.length,
      transactions
    });
    
  } catch (error) {
    console.error('Transactions error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
  }
});

// GET /api/transactions/categories
router.get('/categories', (req, res) => {
  const categories = [...new Set(mockData.transactions.map(t => t.category))];
  res.json({ success: true, categories });
});

// POST /api/transactions/manual (for cash transactions)
router.post('/manual', (req, res) => {
  try {
    const { name, amount, category, date = new Date().toISOString() } = req.body;
    
    if (!name || !amount || !category) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }
    
    // Create new transaction
    const newTransaction = {
      id: `manual_${Date.now()}`,
      date,
      description: name,
      amount: -parseFloat(amount), // Negative for spending
      currency: 'USD',
      category,
      merchant: name,
      paymentMethod: 'Cash'
    };
    
    // In production: save to database
    // For hackathon: just return the transaction
    
    res.json({
      success: true,
      transaction: newTransaction
    });
    
  } catch (error) {
    console.error('Manual transaction error:', error);
    res.status(500).json({ success: false, error: 'Failed to add transaction' });
  }
});

module.exports = router;