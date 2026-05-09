const Groq = require("groq-sdk");

class GroqService {
  constructor(apiKey) {
    if (!apiKey) {
      console.error("❌ GROQ_API_KEY is missing!");
      this.groq = null;
    } else {
      this.groq = new Groq({ apiKey });
      console.log("✅ GroqService initialized");
    }
  }

  async getAdvice(context, question) {
    if (!this.groq) {
      return this.getFallbackResponse(question, context);
    }

    const models = [
      "llama-3.1-8b-instant",
      "gemma2-9b-it",
      "mixtral-8x7b-32768",
      "llama-3.3-70b-versatile",
    ];

    let lastError = null;

    for (const model of models) {
      try {
        console.log(`📤 Trying model: ${model}`);
        const prompt = this.buildPrompt(context, question);
        console.log("📝 Prompt being sent to AI");

        const completion = await this.groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: `You are SAMSOM, a friendly AI financial advisor for ASEAN students. 
Be warm, personal, and practical. Use local examples (ABA, ACLEDA, Atome, GrabPay). 
Keep responses under 200 words. 
IMPORTANT: Always use the EXACT numbers provided in the user's financial situation. 
Do not invent or change any amounts. 
If the user has no BNPL plans, their debt risk score should be 0/100.`,
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          model: model,
          temperature: 0.7,
          max_tokens: 800,
        });

        const response = completion.choices[0]?.message?.content;
        if (response) {
          console.log(`✅ Success with model: ${model}`);
          return response;
        }
      } catch (error) {
        console.log(`❌ Model ${model} failed:`, error.message);
        lastError = error;
      }
    }

    console.error("❌ All Groq models failed:", lastError);
    return this.getFallbackResponse(question, context);
  }

  buildPrompt(context, question) {
    const currencySymbol = context.currencySymbol || "$";
    
    const formatNumber = (num) => {
      if (num === undefined || num === null) return "0";
      return num.toFixed(2);
    };

    // Build BNPL section
    let bnplSection = "";
    if (context.bnplCount > 0) {
      bnplSection = `
BNPL DETAILS:
- Active BNPL plans: ${context.bnplCount}
- Total BNPL debt: ${currencySymbol}${formatNumber(context.bnplTotal)}
- Monthly BNPL payments: ${currencySymbol}${formatNumber(context.bnplMonthly)}
- BNPL debt-to-income ratio: ${context.dtiRatio.toFixed(1)}%`;
    } else {
      bnplSection = `
BNPL DETAILS:
- Active BNPL plans: 0
- No active BNPL debt - Great job!`;
    }

    // Build budget status
    let budgetStatus = "";
    if (context.hasBudget) {
      if (context.isOverBudget) {
        budgetStatus = `⚠️ You are OVER budget by ${currencySymbol}${formatNumber(context.overspentAmount)}`;
      } else {
        budgetStatus = `✅ You are UNDER budget with ${currencySymbol}${formatNumber(context.remainingBudget)} remaining (${context.spentPercent.toFixed(0)}% used)`;
      }
    } else {
      budgetStatus = `ℹ️ No monthly budget set. You've spent ${currencySymbol}${formatNumber(context.totalSpent)} this month.`;
    }

    return `Here is the user's CURRENT financial situation:

FINANCIAL SNAPSHOT:
- Current balance: ${currencySymbol}${formatNumber(context.currentBalance)}
- Total income this month: ${currencySymbol}${formatNumber(context.totalIncome)}
- Total spent this month: ${currencySymbol}${formatNumber(context.totalSpent)}
- Net cash flow: ${currencySymbol}${formatNumber(context.netCashFlow)}
- Savings rate: ${context.savingsRate.toFixed(1)}%
- Monthly budget: ${context.hasBudget ? currencySymbol + formatNumber(context.monthlyBudget) : "Not set"}
- Budget status: ${budgetStatus}

DEBT RISK ASSESSMENT:
- Debt risk score: ${context.riskScore}/100
- Risk level: ${context.debtRisk}
${bnplSection}

The user asks: "${question}"

INSTRUCTIONS:
1. Use the EXACT numbers shown above - do not recalculate anything
2. If the debt risk score is 0/100, acknowledge they have no debt risk
3. Always use ${currencySymbol} as the currency symbol
4. Be encouraging and practical with your advice
5. Provide specific, actionable recommendations

Based on their actual financial situation above, provide personalized financial advice.`;
  }

  getFallbackResponse(question, context) {
    const currencySymbol = context.currencySymbol || "$";
    const lower = question.toLowerCase();

    const spent = context.totalSpent || 0;
    const budget = context.monthlyBudget || 0;
    const remaining = context.remainingBudget || Math.max(0, budget - spent);
    const spentPercent = budget > 0 ? ((spent / budget) * 100).toFixed(0) : 0;
    const isOverBudget = context.isOverBudget || (spent > budget);
    const overspentAmount = context.overspentAmount || (isOverBudget ? spent - budget : 0);
    const riskScore = context.riskScore || 0;
    const bnplCount = context.bnplCount || 0;
    const bnplTotal = context.bnplTotal || 0;
    const savingsRate = context.savingsRate || 0;

    console.log("Fallback response using real numbers:", {
      spent,
      budget,
      remaining,
      spentPercent,
      riskScore,
      bnplCount,
      savingsRate,
    });

    // Handle debt/risk questions
    if (lower.includes("debt") || lower.includes("risk")) {
      if (riskScore === 0) {
        return `✅ Your debt risk score is 0/100 - NO DEBT RISK! You have no active BNPL plans. Current balance: ${currencySymbol}${spent.toFixed(2)}. Keep up the great financial habits!`;
      }
      if (isOverBudget) {
        return `⚠️ Your debt risk score is ${riskScore}/100. You are currently ${currencySymbol}${overspentAmount.toFixed(2)} over your ${currencySymbol}${budget.toFixed(2)} budget. I recommend focusing on reducing spending.`;
      }
      return `Your debt risk score is ${riskScore}/100. You have ${bnplCount} active BNPL plan${bnplCount !== 1 ? 's' : ''} totaling ${currencySymbol}${bnplTotal.toFixed(2)}. Keep your BNPL payments below 20% of income.`;
    }

    // Handle spending questions
    if (lower.includes("spend")) {
      if (isOverBudget) {
        return `You've spent ${currencySymbol}${spent.toFixed(2)} which is ${currencySymbol}${overspentAmount.toFixed(2)} OVER your ${currencySymbol}${budget.toFixed(2)} budget. Try to reduce expenses for the rest of the month.`;
      }
      return `You've spent ${currencySymbol}${spent.toFixed(2)} of your ${currencySymbol}${budget.toFixed(2)} budget (${spentPercent}%), with ${currencySymbol}${remaining.toFixed(2)} remaining. ${spentPercent > 80 ? "You're on track, but be careful." : "Great job staying within budget!"}`;
    }

    // Handle savings questions
    if (lower.includes("save") || lower.includes("trip")) {
      if (isOverBudget) {
        return `You're currently ${currencySymbol}${overspentAmount.toFixed(2)} over budget. Before saving, focus on reducing spending to get back within budget.`;
      }
      const suggestedSave = Math.max(0, Math.round(remaining * 0.3));
      return `You have ${currencySymbol}${remaining.toFixed(2)} remaining in your budget. I suggest saving ${currencySymbol}${suggestedSave} this month toward your goal (${Math.round((suggestedSave / remaining) * 100)}% of remaining budget).`;
    }

    // Default response
    return `📊 Your Financial Snapshot:
• Balance: ${currencySymbol}${spent.toFixed(2)}
• Income: ${currencySymbol}${(context.totalIncome || 0).toFixed(2)}
• Spent: ${currencySymbol}${spent.toFixed(2)}
• Savings rate: ${savingsRate.toFixed(0)}%
• Risk Score: ${riskScore}/100
• BNPL Plans: ${bnplCount}${bnplCount > 0 ? ` totaling ${currencySymbol}${bnplTotal.toFixed(2)}` : " (none)"}

How can I help you with your finances today?`;
  }
}

module.exports = GroqService;