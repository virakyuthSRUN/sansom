const express = require('express');
const router = express.Router();
const GroqService = require('../services/groq-service');
const mockData = require('../data/mock-transactions.json');

// Initialize Groq service with API key
console.log('🔑 Initializing Groq service with API key:', !!process.env.GROQ_API_KEY);
const groq = new GroqService(process.env.GROQ_API_KEY);

// POST /api/chat
router.post('/', async (req, res) => {
  try {
    const { userId, message } = req.body;
    
    console.log(`📨 Chat request from user ${userId}: "${message}"`);
    
    // Use mock data
    const userData = mockData;
    
    // Calculate stats
    const spent = userData.transactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const bnplTotal = userData.bnplPlans.reduce((sum, p) => sum + p.remaining, 0);
    const riskScore = Math.min(100, Math.round((bnplTotal / 1500) * 70));
    
    const context = {
      balance: 450.75,
      spent,
      budget: 900,
      remaining: 900 - spent,
      riskScore,
      bnplCount: userData.bnplPlans.length,
      bnplTotal
    };
    
    // Get advice from Groq
    const advice = await groq.getAdvice(context, message);
    
    res.json({ 
      success: true, 
      response: advice 
    });
    
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get AI response' 
    });
  }
});

module.exports = router;