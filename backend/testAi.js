import { generateSupportTicket } from "./services/aiService.js";

async function test() {
  try {
    // จำลองข้อมูล Assignee ที่ดึงมาจาก Database
    // โดยแต่ละคนจะมีทักษะที่เลือกมาจากตาราง categories
    const mockAssignees = [
      { id: 22, full_name: "Wrawalur", expertise: "Graphic Design" },
      { id: 16, full_name: "Kittisak Chalongkulwat", expertise: "LMS, Teaching Tools" },
      { id: 17, full_name: "Rick Astley", expertise: "Network, Account & Access team" }
    ];

    console.log("--- Testing AI Ticket Drafting with Assignee Matching ---");
    console.log(typeof(mockAssignees));
    // ส่งทั้ง Message และรายชื่อ Assignee เข้าไป
    const ticket = await generateSupportTicket(
      "can't connect to kmitl network and need urgent help",
      mockAssignees
    );

    console.log("AI RESPONSE:");
    console.log(JSON.stringify(ticket, null, 2));

    // ตรวจสอบว่า AI เลือก Assignee ได้ตรงกับทักษะหรือไม่
    if (ticket.assignee_category_id.length > 0) {
      console.log(`\n✅ AI Suggested Category IDs: ${ticket.assignee_category_id.join(', ')}`);
    }

  } catch (err) {
    console.error("AI ERROR:", err.message);
  }
}

test();