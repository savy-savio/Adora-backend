import { Subscription } from "../../models/Subscription"
import subscriptions from "./data/subscriptions.json"

export async function subscription() {
  try {
    // Clear existing subscriptions
    await Subscription.deleteMany({})

    // Insert new subscriptions
    const result = await Subscription.insertMany(subscriptions)
    console.log(`✅ Seeded ${result.length} subscriptions`)
  } catch (error) {
    console.error("Error seeding subscriptions:", error)
    throw error
  }
}
