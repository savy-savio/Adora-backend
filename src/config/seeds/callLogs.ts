import { CallLog } from "../../models/CallLog"

export const seedCallLogs = async () => {
  try {
    const existingCallLogs = await CallLog.countDocuments()

    if (existingCallLogs > 0) {
      console.log("✅ Call logs already seeded, skipping...")
      return
    }

    const dummyCallLog = new CallLog({
      agentId: "demo-agent-001",
      businessId: "demo-business-001",
      duration: 420, // 7 minutes
      transcript:
        "Client: Hi there, I'm having trouble placing an order on your website...\n\nAI Assistant: Hello! Thank you for contacting us. I'm happy to assist. What seems to be the issue?\n\nClient: It says 'Payment processing error' but I've double-checked my card details.\n\nAI Assistant: I understand. There could be a few reasons for this error. Have you tried using a different payment method or browser?\n\nClient: I haven't tried a different payment method yet.\n\nAI Assistant: Let me help you with that. First, let's try clearing your browser cache and attempting the transaction again. If it still fails, we can try a different payment method.\n\nClient: Okay, thanks for your help!\n\nAI Assistant: You're welcome! Is there anything else I can help you with today?",
      recordingUrl: "https://example.com/audio/call-demo-001.mp3",
      status: "completed",
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    })

    await dummyCallLog.save()
    console.log("✅ Dummy call log seeded successfully")
  } catch (error) {
    console.error("❌ Error seeding call logs:", error)
  }
}
