import { Voice } from "../../models/Voice"
import voices from "./data/voices.json"

export async function voice() {
  try {
    // Clear existing voices
    await Voice.deleteMany({})

    // Insert new voices
    const result = await Voice.insertMany(voices)
    console.log(`✅ Seeded ${result.length} voices`)
  } catch (error) {
    console.error("Error seeding voices:", error)
    throw error
  }
}
