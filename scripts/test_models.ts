import dotenv from "dotenv";

dotenv.config();

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("API Key is missing!");
    return;
  }
  console.log(`API Key present: ${apiKey.substring(0, 5)}...`);

  try {
    console.log("Fetching available models via REST API...");
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    const data: any = await response.json();

    if (data.models) {
      console.log("Available models:");
      data.models.forEach((m: any) => {
        if (
          m.supportedGenerationMethods &&
          m.supportedGenerationMethods.includes("generateContent")
        ) {
          console.log(`- ${m.name}`);
        }
      });
    } else {
      console.log("No models found or error:", JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

listModels();
