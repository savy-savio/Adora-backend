import mongoose, { Schema, type Document } from "mongoose"

export interface ISystemPrompt extends Document {
  name: string
  prompt: string
  category: string
  createdAt: Date
  updatedAt: Date
}

const systemPromptSchema = new Schema<ISystemPrompt>(
  {
    name: {
      type: String,
      required: true,
    },
    prompt: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
)

export const SystemPrompt = mongoose.model<ISystemPrompt>("SystemPrompt", systemPromptSchema)
