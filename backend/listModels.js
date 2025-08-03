// Use built-in fetch (Node 18+)
require("dotenv").config();

async function listModels() {
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) {
    console.error("❌ API_KEY is not set. Add it to your .env file.");
    return;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
  const resp = await fetch(url);
  const data = await resp.json();
  console.log(data);
}

listModels();
