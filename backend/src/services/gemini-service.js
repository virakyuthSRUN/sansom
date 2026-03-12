const { GoogleGenerativeAI } = require("@google/generative-ai");

class GeminiService {
  constructor(apiKey) {
    if (!apiKey) {
      console.error("GEMINI_API_KEY is missing!");
      this.genAI = null;
    } else {
      this.genAI = new GoogleGenerativeAI(apiKey);
      console.log("✅ GeminiService initialized");
    }
    // Track request count for rate limiting
    this.requestTimestamps = [];
  }

  async getAdvice(context, question) {
    if (!this.genAI) {
      return "I'm not configured properly. Please contact support.";
    }

    // Simple rate limiting (max 5 requests per minute)
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter(t => now - t < 60000);
    if (this.requestTimestamps.length >= 10) {
      console.log("⚠️ Rate limit approached, using fallback");
      return this.getFallbackResponse(question, context);
    }
    this.requestTimestamps.push(now);

    // Try models in order of preference
    const models = [
      "gemini-2.0-flash-001",  // Try this first
      "gemini-1.5-pro",        // Then this
      "gemini-pro",             // Then this
    ];

    let lastError = null;

    for (const modelName of models) {
      try {
        console.log(`📤 Trying model: ${modelName}`);
        
        const model = this.genAI.getGenerativeModel({ 
          model: modelName,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800,
          },
        });

        const prompt = this.buildPrompt(context, question);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log(`✅ Success with model: ${modelName}`);
        return text;
      } catch (error) {
        console.log(`❌ Model ${modelName} failed:`, error.message);
        lastError = error;
        // Continue to next model
      }
    }

    // If all models fail, use fallback
    console.error("❌ All Gemini models failed:", lastError);
    return this.getFallbackResponse(question, context);
  }

  getFallbackResponse(question, context) {
    const lower = question.toLowerCase();
    
    if (lower.includes('debt') || lower.includes('risk')) {
      return `Your current debt risk score is ${context.riskScore}/100. You have ${context.bnplCount} active BNPL plans totaling $${context.bnplTotal}. Based on your monthly budget of $${context.budget} and current spending of $${context.spent}, you're managing reasonably well. However, I recommend paying down your BNPL balances before taking on new debt.`;
    }
    
    if (lower.includes('spend') || lower.includes('spending')) {
      return `You've spent $${context.spent} of your $${context.budget} budget, leaving $${context.remaining} for the rest of the month. You're on track but watch your discretionary spending.`;
    }
    
    if (lower.includes('save') || lower.includes('trip')) {
      return `With $${context.remaining} left in your budget, you could save $${Math.round(context.remaining * 0.3)} this month. At that rate, you'll reach your savings goal in about ${Math.round(1000 / (context.remaining * 0.3))} months.`;
    }
    
    if (lower.includes('bnpl')) {
      return `BNPL (Buy Now Pay Later) plans like Atome and GrabPay can be helpful but risky. You currently have ${context.bnplCount} plans totaling $${context.bnplTotal} with a risk score of ${context.riskScore}/100. Try to pay these off within their interest-free periods.`;
    }
    
    return `Based on your finances, you've spent $${context.spent} of your $${context.budget} budget with $${context.remaining} remaining. Your debt risk score is ${context.riskScore}/100. Is there something specific you'd like to know?`;
  }

  buildPrompt(context, question) {
    return `You are SAMSOM, a friendly AI financial advisor for ASEAN students. Be warm, personal, and practical. Use local examples (ABA, ACLEDA, Atome, GrabPay). Keep responses under 150 words.

Here is the student's CURRENT financial situation:
- Current balance: $${context.balance}
- Spent so far this month: $${context.spent}
- Monthly budget: $${context.budget}
- Remaining in budget: $${context.remaining}
- Debt risk score: ${context.riskScore}/100
- Active BNPL plans: ${context.bnplCount} totaling $${context.bnplTotal}

The student asks: "${question}"

Based on their ACTUAL numbers above, provide personalized financial advice. Be specific to their situation. Don't just give generic tips - reference their actual spending, risk score, and BNPL plans.`;
  }
}

module.exports = GeminiService;