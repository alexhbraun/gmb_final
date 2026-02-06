const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env") });

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY not found in .env");
    return;
  }
  console.log("Using API Key starting with:", apiKey.substring(0, 7) + "...");

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelsToTest = ["gemini-3-pro-preview", "gemini-3-pro", "gemini-2.5-pro", "gemini-1.5-pro"];

  for (const modelId of modelsToTest) {
    try {
      console.log(`Checking for '${modelId}'...`);
      const model = genAI.getGenerativeModel({ model: modelId });
      const result = await model.generateContent("test");
      console.log(`${modelId} is available! Output:`, result.response.text().substring(0, 50));
      return; // Stop at first working model
    } catch (e) {
      console.log(`${modelId} failed:`, e.message);
    }
  }
}

listModels();
