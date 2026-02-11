import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
// Load environment variables from .env file
dotenv.config();
console.log("API Key:", process.env.api_key);
const genAI = new GoogleGenerativeAI(process.env.api_key);

export async function callAI(prompt) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await model.generateContent(prompt);
  return result.response.text();
}
// Generate a draft support ticket based on user message
export async function generateSupportTicket(userMessage) {
  const prompt = `
You are an AI that creates draft support tickets.

User message:
"${userMessage}"

Return JSON:
{
  "title": "",
  "category": "",
  "summary": "",
  "suggestedSolution": [],
  "assignees": []
}
`;

  const text = await callAI(prompt);

  // Extract JSON from the AI response
  const cleaned = text.replace(/```json|```/g, "").trim();

  return JSON.parse(cleaned);
}


