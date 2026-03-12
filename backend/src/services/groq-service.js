const Groq = require('groq-sdk');

class GroqService {
  constructor(apiKey) {
    if (!apiKey) {
      console.error('❌ GROQ_API_KEY is missing!');
      this.groq = null;
    } else {
      this.groq = new Groq({ apiKey });
      console.log('✅ GroqService initialized');
    }
  }

  async getAdvice(context, question) {
    if (!this.groq) {
      return this.getFallbackResponse(question, context);
    }

    // Try models in order of preference (fastest/most reliable first)
    const models = [
      "llama-3.1-8b-instant",  // Fast, good for chat
      "gemma2-9b-it",          // Good for instructions
      "mixtral-8x7b-32768",    // Good for complex reasoning
      "llama-3.3-70b-versatile" // Most powerful
    ];

    let lastError = null;

    for (const model of models) {
      try {
        console.log(`📤 Trying model: ${model}`);
        
        const prompt = this.buildPrompt(context, question);
        
        const completion = await this.groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: "You are SAMSOM, a friendly AI financial advisor for ASEAN students. Be warm, personal, and practical. Use local examples (ABA, ACLEDA, Atome, GrabPay). Keep responses under 150 words."
            },
            {
              role: "user",
              content: prompt
            }
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
        // Continue to next model
      }
    }

    // If all models fail, use fallback
    console.error('❌ All Groq models failed:', lastError);
    return this.getFallbackResponse(question, context);
  }

  buildPrompt(context, question) {
    return `Here is the student's CURRENT financial situation:
- Current balance: $${context.balance}
- Spent so far this month: $${context.spent}
- Monthly budget: $${context.budget}
- Remaining in budget: $${context.remaining}
- Debt risk score: ${context.riskScore}/100
- Active BNPL plans: ${context.bnplCount} totaling $${context.bnplTotal}

The student asks: "${question}"

Based on their ACTUAL numbers above, provide personalized financial advice. Be specific to their situation. Reference their actual spending, risk score, and BNPL plans.`;
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
}

module.exports = GroqService;