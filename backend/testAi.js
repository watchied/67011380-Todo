import { generateSupportTicket } from "./services/aiService.js";
// Simple test to verify AI ticket drafting
async function test() {
  try {
    const ticket = await generateSupportTicket(
      "Can't log in to my account."
    );

    console.log("AI RESPONSE:");
    console.log(ticket)
    console.log(JSON.stringify(ticket, null, 2));
  } catch (err) {
    console.error("AI ERROR:", err.message);
  }
}

test();