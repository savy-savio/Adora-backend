import mongoose from "mongoose"
import { subscription } from "../config/seeds/subscription"
import { systemPrompt } from "../config/seeds/systemPrompt"
import { voice } from "../config/seeds/voice"
import { availablePhoneNumber } from "../config/seeds/availableNumber"
import { seedCallLogs } from "../config/seeds/callLogs"

async function main() {
  console.warn("⏳ Connecting to MongoDB...")

  try {
    const mongoUri =
      process.env.MONGODB_URI || "mongodb+srv://adora_user:adora@adora.yehbkfx.mongodb.net/?appName=adora"
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 30000, // Increase timeout to 30 seconds
      socketTimeoutMS: 30000,
    })
    console.warn("✅ MongoDB connected successfully")

    console.warn("⏳ Running seed...")
    const start = Date.now()

    await subscription()
    await systemPrompt()
    await voice()
    await availablePhoneNumber()
    await seedCallLogs()

    const end = Date.now()
    console.warn(`✅ Seed completed in ${end - start}ms`)

    await mongoose.disconnect()
    console.warn("✅ MongoDB disconnected")
  } catch (error) {
    console.error("❌ Seed failed:", error)
    await mongoose.disconnect().catch(() => {})
    process.exit(1)
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
