const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
  try {
    // Try to list available models
    const models = await genAI.listModels();
    console.log('✅ Available models:');
    models.models.forEach(m => {
      console.log(`  - ${m.name} (${m.supportedGenerationMethods?.join(', ')})`);
    });
  } catch (error) {
    console.error('❌ Error listing models:', error.message);
    
    // Try each model directly
    const modelsToTry = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-flash',
      'gemini-pro'
    ];
    
    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Hello');
        const response = await result.response;
        console.log(`✅ Model ${modelName} works!`);
      } catch (e) {
        console.log(`❌ Model ${modelName} failed:`, e.message);
      }
    }
  }
}

listModels();