import { SystemPrompt } from "../../models/SystemPrompt"
import systemPrompts from "./data/systemPrompts.json"

export async function systemPrompt() {
  try {
    // Clear existing system prompts
    await SystemPrompt.deleteMany({})

    const transformedPrompts = systemPrompts.map((item: any) => ({
      name: item.label,
      category: item.value,
      prompt: item.systemPrompt,
    }))

    // Insert new system prompts
    const result = await SystemPrompt.insertMany(transformedPrompts)
    console.log(`✅ Seeded ${result.length} system prompts`)
  } catch (error) {
    console.error("Error seeding system prompts:", error)
    throw error
  }
}
