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

    // Try models in order of preference (fastest/most reliable first)
    const models = [
      "llama-3.1-8b-instant", // Fast, good for chat
      "gemma2-9b-it", // Good for instructions
      "mixtral-8x7b-32768", // Good for complex reasoning
      "llama-3.3-70b-versatile", // Most powerful
    ];

    let lastError = null;

    for (const model of models) {
      try {
        console.log(`📤 Trying model: ${model}`);

        const prompt = this.buildPrompt(context, question);
        console.log("📝 Prompt being sent to AI:", prompt); // Debug log

        const completion = await this.groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content:
                "You are SANSOM, a friendly AI financial advisor for ASEAN students. Be warm, personal, and practical. Use local examples (ABA, ACLEDA, Atome, GrabPay). Keep responses under 150 words. IMPORTANT: Always use the exact numbers provided in the user's financial situation. Do not invent or change any amounts.",
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
          console.log("📝 AI Response:", response);
          return response;
        }
      } catch (error) {
        console.log(`❌ Model ${model} failed:`, error.message);
        lastError = error;
        // Continue to next model
      }
    }

    // If all models fail, use fallback
    console.error("❌ All Groq models failed:", lastError);
    return this.getFallbackResponse(question, context);
  }

  buildPrompt(context, question) {
    // Get currency symbol from context, default to $
    const currencySymbol = context.currencySymbol || "$";

    // Format numbers properly
    const formatNumber = (num) => {
      if (num === undefined || num === null) return "0";
      return num.toFixed(2);
    };

    // Pre-calculate the status to help the AI
    const spent = context.spent || 0;
    const budget = context.budget || 0;
    const remaining = context.remaining || budget - spent;
    const isOverBudget = spent > budget;
    const overspentAmount = isOverBudget ? spent - budget : 0;
    const budgetStatus = isOverBudget
      ? `⚠️ You are OVER budget by ${currencySymbol}${overspentAmount.toFixed(2)}`
      : `✅ You are UNDER budget with ${currencySymbol}${remaining.toFixed(2)} remaining`;

    return `Here is the student's CURRENT financial situation (USE THESE EXACT NUMBERS - I have done the math for you):

ACTUAL NUMBERS:
- Current balance: ${currencySymbol}${formatNumber(context.balance)}
- Spent so far this month: ${currencySymbol}${formatNumber(spent)}
- Monthly budget: ${currencySymbol}${formatNumber(budget)}
- Remaining in budget: ${currencySymbol}${formatNumber(remaining)}
- Budget status: ${budgetStatus}
- Debt risk score: ${context.riskScore}/100
- Active BNPL plans: ${context.bnplCount} totaling ${currencySymbol}${formatNumber(context.bnplTotal || 0)}

CRITICAL FACTS (These are mathematically correct):
- The student has spent ${currencySymbol}${formatNumber(spent)} out of ${currencySymbol}${formatNumber(budget)}
- The student has ${currencySymbol}${formatNumber(remaining)} LEFT in their budget
- ${spent > budget ? `The student has OVERSPENT by ${currencySymbol}${(spent - budget).toFixed(2)}` : `The student is WITHIN their budget by ${currencySymbol}${(budget - spent).toFixed(2)}`}

The student asks: "${question}"

INSTRUCTIONS:
1. DO NOT recalculate anything - use the numbers above exactly as shown
2. The student has ${currencySymbol}${formatNumber(remaining)} REMAINING (not overspent) unless stated otherwise above
3. Always use ${currencySymbol} as the currency symbol
4. Be encouraging and practical with your advice

Based on their ACTUAL numbers above, provide personalized financial advice. Be specific to their situation.`;
  }
  getFallbackResponse(question, context) {
    const currencySymbol = context.currencySymbol || "$";
    const lower = question.toLowerCase();

    // Use actual context values
    const spent = context.spent || 0;
    const budget = context.budget || 0;
    const remaining = context.remaining || budget - spent;
    const spentPercent = budget > 0 ? ((spent / budget) * 100).toFixed(0) : 0;
    const isOverBudget = spent > budget;
    const overspentAmount = isOverBudget ? spent - budget : 0;

    console.log("📊 Fallback response using real numbers:", {
      spent,
      budget,
      remaining,
      spentPercent,
      currencySymbol,
      isOverBudget,
    });

    if (lower.includes("debt") || lower.includes("risk")) {
      if (isOverBudget) {
        return `⚠️ Your debt risk score is ${context.riskScore}/100. You are currently ${currencySymbol}${overspentAmount.toFixed(2)} over your ${currencySymbol}${budget.toFixed(2)} budget. I recommend focusing on reducing spending to get back within budget.`;
      } else {
        return `✅ Your debt risk score is ${context.riskScore}/100, which is considered LOW RISK. You have ${currencySymbol}${remaining.toFixed(2)} remaining in your budget. You have ${context.bnplCount} active BNPL plans totaling ${currencySymbol}${(context.bnplTotal || 0).toFixed(2)}. Keep up the good financial habits!`;
      }
    }

    if (lower.includes("spend")) {
      if (isOverBudget) {
        return `📊 You have spent ${currencySymbol}${spent.toFixed(2)} which is ${currencySymbol}${overspentAmount.toFixed(2)} OVER your ${currencySymbol}${budget.toFixed(2)} budget. Try to reduce expenses for the rest of the month.`;
      } else {
        return `📊 You've spent ${currencySymbol}${spent.toFixed(2)} of your ${currencySymbol}${budget.toFixed(2)} budget (${spentPercent}%), with ${currencySymbol}${remaining.toFixed(2)} remaining. ${spentPercent > 80 ? "You are on track, but be careful with remaining spending." : "Great job staying within budget!"}`;
      }
    }

    if (lower.includes("save") || lower.includes("trip")) {
      if (isOverBudget) {
        const reduceAmount = overspentAmount + 100;
        return `⚠️ You are currently ${currencySymbol}${overspentAmount.toFixed(2)} over budget. Before saving for a trip, focus on reducing your spending by ${currencySymbol}${reduceAmount.toFixed(2)} to get back within budget.`;
      } else {
        const suggestedSave = Math.max(0, Math.round(remaining * 0.3));
        return `🎯 You have ${currencySymbol}${remaining.toFixed(2)} remaining in your budget. I suggest saving ${currencySymbol}${suggestedSave} this month toward your trip goal. This is ${Math.round((suggestedSave / remaining) * 100)}% of your remaining budget.`;
      }
    }

    // Default response with actual numbers and correct math
    if (isOverBudget) {
      return `📊 Your Financial Snapshot:
• Spent: ${currencySymbol}${spent.toFixed(2)} / ${currencySymbol}${budget.toFixed(2)}
• OVER budget by: ${currencySymbol}${overspentAmount.toFixed(2)}
• Risk Score: ${context.riskScore}/100

You are currently over budget. Would you like help creating a plan to reduce spending?`;
    } else {
      return `📊 Your Financial Snapshot:
• Spent: ${currencySymbol}${spent.toFixed(2)} / ${currencySymbol}${budget.toFixed(2)} (${spentPercent}%)
• Remaining: ${currencySymbol}${remaining.toFixed(2)}
• Risk Score: ${context.riskScore}/100
• BNPL Plans: ${context.bnplCount} totaling ${currencySymbol}${(context.bnplTotal || 0).toFixed(2)}

You are within budget! How can I help you with your finances today?`;
    }
  }
}

module.exports = GroqService;
