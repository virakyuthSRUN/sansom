const axios = require('axios');

class ClaudeService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.apiUrl = 'https://api.anthropic.com/v1/messages';
  }

  async getAdvice(context, question) {
    const prompt = this.buildPrompt(context, question);
    
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: 'claude-3-haiku-20240307',
          max_tokens: 500,
          messages: [{ role: 'user', content: prompt }],
          system: "You are SAMSOM, a friendly AI financial advisor for ASEAN students. Be warm and practical. Use local examples (ABA, ACLEDA, Atome, GrabPay). Keep responses under 150 words."
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          }
        }
      );
      
      return response.data.content[0].text;
    } catch (error) {
      console.error('Claude API error:', error.response?.data || error.message);
      return "I'm having trouble connecting. Please try again in a moment.";
    }
  }

  buildPrompt(context, question) {
    return `Student's finances:
    - Balance: $${context.balance}
    - Spent this month: $${context.spent}
    - Left in budget: $${context.remaining}
    - Debt risk: ${context.riskScore}/100
    - BNPL plans: ${context.bnplCount} totaling $${context.bnplTotal}
    
    Question: "${question}"
    
    Give personalized advice based on these numbers.`;
  }
}

module.exports = ClaudeService;