const express = require('express');
const router = express.Router();
const mockData = require('../data/mock-transactions.json');

// GET /api/budget-summary?userId=123
router.get('/', (req, res) => {
  try {
    const { userId } = req.query;
    
    const transactions = mockData.transactions;
    const bnplPlans = mockData.bnplPlans;
    
    // Calculate current month spending
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM
    
    const monthTransactions = transactions.filter(t => 
      t.date.startsWith(currentMonth) && t.amount < 0
    );
    
    const totalSpent = monthTransactions
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    // Category breakdown
    const categorySpend = {};
    monthTransactions.forEach(t => {
      if (!categorySpend[t.category]) {
        categorySpend[t.category] = 0;
      }
      categorySpend[t.category] += Math.abs(t.amount);
    });
    
    // BNPL summary
    const bnplTotal = bnplPlans.reduce((sum, p) => sum + p.remaining, 0);
    const bnplMonthly = bnplPlans.reduce((sum, p) => sum + p.monthly, 0);
    
    // Income (mock)
    const income = 1500;
    
    // Simple risk score
    const debtToIncome = (bnplTotal / income) * 100;
    const riskScore = Math.min(100, Math.round(debtToIncome * 1.5));
    let riskLevel = 'Low';
    if (riskScore > 60) riskLevel = 'High';
    else if (riskScore > 30) riskLevel = 'Medium';
    
    res.json({
      success: true,
      summary: {
        balance: mockData.accounts.reduce((sum, a) => sum + a.balance, 0),
        spent: totalSpent,
        budget: 900,
        remaining: 900 - totalSpent,
        income,
        categoryBreakdown: categorySpend,
        bnpl: {
          total: bnplTotal,
          monthly: bnplMonthly,
          plans: bnplPlans.length
        },
        risk: {
          score: riskScore,
          level: riskLevel
        },
        accounts: mockData.accounts
      }
    });
    
  } catch (error) {
    console.error('Budget summary error:', error);
    res.status(500).json({ success: false, error: 'Failed to get summary' });
  }
});

module.exports = router;