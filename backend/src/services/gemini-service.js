const { GoogleGenerativeAI } = require("@google/generative-ai");

class GeminiService {
  constructor(apiKey) {
    if (!apiKey) {
      console.error("GEMINI_API_KEY is missing!");
      this.genAI = null;
    } else {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  async getAdvice(context, question) {
    if (!this.genAI) {
      return "I'm not configured properly. Please contact support.";
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      });

      const prompt = this.buildPrompt(context, question);
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return text;
    } catch (error) {
      console.error("Gemini API error:", error);

      // Handle rate limiting with fallback responses
      if (error.status === 429) {
        if (question.toLowerCase().includes("bnpl")) {
          return `BNPL (Buy Now Pay Later) like Atome and GrabPay can be helpful but risky. You currently have ${context.bnplCount} plans totaling $${context.bnplTotal}. Your debt risk score is ${context.riskScore}/100. I recommend paying these off before taking on new BNPL debt.`;
        }

        if (question.toLowerCase().includes("save")) {
          return `To save for a trip, you have $${context.remaining} left in your budget this month. Try setting aside $${Math.round(context.remaining * 0.3)} each month. With your current spending, you could reach your goal in a few months!`;
        }

        return "I'd love to help with that! Due to high demand, I'm using a simplified response. Please try again in a moment.";
      }

      return "I'm having trouble connecting. Please try again in a moment.";
    }
  }

  buildPrompt(context, question) {
    // Ensure context exists
    const safeContext = context || {
      balance: 0,
      spent: 0,
      budget: 0,
      remaining: 0,
      riskScore: 0,
      bnplCount: 0,
      bnplTotal: 0,
    };

    const systemPrompt =
      "You are SAMSOM, a friendly AI financial advisor for ASEAN students. Be warm, personal, and practical. Use local examples (ABA, ACLEDA, Atome, GrabPay). Keep responses under 150 words.\n\n";

    const financialData = `Here is the student's CURRENT financial situation:
- Current balance: $${safeContext.balance || 0}
- Spent so far this month: $${safeContext.spent || 0}
- Monthly budget: $${safeContext.budget || 0}
- Remaining in budget: $${safeContext.remaining || 0}
- Debt risk score: ${safeContext.riskScore || 0}/100
- Active BNPL plans: ${safeContext.bnplCount || 0} totaling $${safeContext.bnplTotal || 0}\n\n`;

    const instruction = `The student asks: "${question || "No question provided"}"

Based on their ACTUAL numbers above, provide personalized financial advice. Be specific to their situation. Don't just give generic tips - reference their actual spending, risk score, and BNPL plans.`;

    return systemPrompt + financialData + instruction;
  }
}

module.exports = GeminiService;