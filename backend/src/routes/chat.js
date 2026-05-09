const express = require("express");
const router = express.Router();
const GroqService = require("../services/groq-service");

// Currency exchange rates (relative to MYR)
const EXCHANGE_RATES = {
  MYR: 1,
  USD: 0.21,
  KHR: 850,
  IDR: 3400,
};

// Convert amount from MYR to target currency
const convertCurrency = (amountInMYR, currencyCode) => {
  const rate = EXCHANGE_RATES[currencyCode] || 1;
  return amountInMYR * rate;
};

// Initialize Groq service with API key
console.log(
  "🔑 Initializing Groq service with API key:",
  !!process.env.GROQ_API_KEY,
);
const groq = new GroqService(process.env.GROQ_API_KEY);

// POST /api/chat
router.post('/', async (req, res) => {
  try {
    const { userId, message, context, currency } = req.body;
    
    // Get currency code and symbol (default to MYR)
    const currencyCode = currency?.code || 'MYR';
    const currencySymbol = currency?.symbol || 'RM';
    
    console.log('=' .repeat(50));
    console.log('📨 Chat request received:');
    console.log('User:', userId);
    console.log('Message:', message);
    console.log('Currency:', currency);
    console.log('Context from frontend:', {
      monthlySpent: context?.monthlySpent,
      monthlyBudget: context?.monthlyBudget,
      debtRisk: context?.debtRisk,
      bnplCount: context?.bnplCount,
      bnplTotal: context?.bnplTotal,
      balance: context?.balance,
    });
    console.log('=' .repeat(50));
    
    // Get raw amounts in MYR from context
    const spentMYR = Number(context?.monthlySpent) || 0;
    const budgetMYR = Number(context?.monthlyBudget) || 10500;
    const remainingMYR = budgetMYR - spentMYR;
    const balanceMYR = Number(context?.balance) || remainingMYR;
    const bnplTotalMYR = Number(context?.bnplTotal) || 0;
    
    // Convert amounts to selected currency
    const spent = convertCurrency(spentMYR, currencyCode);
    const budget = convertCurrency(budgetMYR, currencyCode);
    const remaining = convertCurrency(remainingMYR, currencyCode);
    const balance = convertCurrency(balanceMYR, currencyCode);
    const bnplTotal = convertCurrency(bnplTotalMYR, currencyCode);
    
    // Calculate spending percentage (based on original MYR values, percentage is same)
    const spentPercent = budgetMYR > 0 ? (spentMYR / budgetMYR) * 100 : 0;
    
    // Calculate risk score based on real data
    const bnplCount = Number(context?.bnplCount) || 0;
    let riskScore = 0;
    if (bnplCount > 3 || spentPercent > 90) {
      riskScore = 80 + Math.min(20, (bnplCount - 3) * 5);
    } else if (bnplCount > 1 || spentPercent > 70) {
      riskScore = 40 + (bnplCount * 10) + (spentPercent - 70);
    } else if (bnplCount > 0) {
      riskScore = 20 + (bnplCount * 10);
    } else {
      riskScore = Math.min(30, spentPercent);
    }
    riskScore = Math.min(100, Math.round(riskScore));
    
    // Determine if over budget
    const isOverBudget = spent > budget;
    const overspentAmount = isOverBudget ? spent - budget : 0;
    
    console.log('📊 Calculated AI Context (converted to selected currency):', {
      spent: spent.toFixed(2),
      budget: budget.toFixed(2),
      remaining: remaining.toFixed(2),
      spentPercent: spentPercent.toFixed(1) + '%',
      isOverBudget,
      overspentAmount: overspentAmount.toFixed(2),
      riskScore,
      bnplCount,
      bnplTotal: bnplTotal.toFixed(2),
      balance: balance.toFixed(2),
      currencySymbol,
      currencyCode,
    });
    
    const aiContext = {
      balance: balance,
      spent: spent,
      budget: budget,
      remaining: remaining,
      isOverBudget: isOverBudget,
      overspentAmount: overspentAmount,
      riskScore: riskScore,
      bnplCount: bnplCount,
      bnplTotal: bnplTotal,
      recentTransactions: context?.recentTransactions || [],
      goals: context?.goals || [],
      debtRisk: context?.debtRisk || (riskScore > 70 ? 'HIGH' : riskScore > 40 ? 'MEDIUM' : 'LOW'),
      currencySymbol: currencySymbol,
      currencyCode: currencyCode,
    };
    
    const advice = await groq.getAdvice(aiContext, message);
    
    res.json({ success: true, response: advice });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get AI response' 
    });
  }
});

module.exports = router;