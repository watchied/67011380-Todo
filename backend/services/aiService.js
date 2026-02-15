import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
// Load environment variables from .env file
dotenv.config();
console.log("API Key:", process.env.api_key);
const genAI = new GoogleGenerativeAI(process.env.api_key);
const categories = [
    { id: 1, name: 'IT Support' },
    { id: 2, name: 'Teach Support' },
    { id: 3, name: 'Network Team' },
    { id: 4, name: 'Account & Access Team' },
    { id: 5, name: 'Finance & Billing team' },
    { id: 6, name: 'HR Team' }
  ];
export async function callAI(prompt) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await model.generateContent(prompt);
  return result.response.text();
}
// Generate a draft support ticket based on user message
export async function generateSupportTicket(userMessage, availableAssignees) {
  const prompt = `
You are an AI that creates draft support tickets.

Assignee Categories:
${JSON.stringify(categories)}

User message:
"${userMessage}"
Task:
- Create a ticket title, category name, and summary.
- Provide a suggested solution as an array of steps.
- **assignee_category_id**: Identify the ID(s) from the Categories list that best match the nature of the issue.
- **assigned_to_id**: Select the best worker ID from the Available Assignees list based on their expertise.
List of available workers and their expertise categories:

${JSON.stringify(availableAssignees)}

Return JSON:
{
  "title": "...",
  "category": "...",
  "summary": "...",
  "suggestedSolution": [],
  "assignee_category_id": [],
  "assigned_to_id": null
}
`;

  const text = await callAI(prompt);

  // Extract JSON from the AI response
  const cleaned = text.replace(/```json|```/g, "").trim();

  return JSON.parse(cleaned);
}


