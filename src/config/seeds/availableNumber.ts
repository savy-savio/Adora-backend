import { AvailablePhoneNumber } from "../../models/AvailablePhoneNumber"
import availablePhoneNumbers from "./data/availablePhoneNumber.json"

export async function availablePhoneNumber() {
  try {
    // Clear existing phone numbers
    await AvailablePhoneNumber.deleteMany({})

    // Insert new phone numbers
    const result = await AvailablePhoneNumber.insertMany(availablePhoneNumbers)
    console.log(`✅ Seeded ${result.length} available phone numbers`)
  } catch (error) {
    console.error("Error seeding available phone numbers:", error)
    throw error
  }
}
