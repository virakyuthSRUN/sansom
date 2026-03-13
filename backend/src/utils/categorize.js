// Simple rule-based categorization (can be enhanced with AI later)
const categoryKeywords = {
  'Food': ['pizza', 'restaurant', 'cafe', 'lunch', 'dinner', 'food', 'grab'],
  'Transport': ['tuktuk', 'taxi', 'grab', 'fuel', 'petrol'],
  'Shopping': ['mall', 'shop', 'market', 'clothing'],
  'BNPL': ['atome', 'kredivo', 'grabpay later', 'bnpl'],
  'Entertainment': ['movie', 'cinema', 'game'],
  'Income': ['salary', 'transfer from', 'allowance']
};

const categorize = (description) => {
  const lowerDesc = description.toLowerCase();
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => lowerDesc.includes(keyword))) {
      return category;
    }
  }
  
  return 'Other';
};

module.exports = categorize;