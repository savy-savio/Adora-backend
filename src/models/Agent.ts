import mongoose, { Schema, type Document } from "mongoose"

export interface IAgent extends Document {
  language: "french" | "english"
  voiceId: string
  provider?: string
  name?: string
  assistantId?: string
  phoneNumberId?: string
  categoryId: string
  businessId: string // Added businessId reference for agent-business relationship
  agentName: string
  agentGender: "male" | "female"
  vapiAssistantId: string
  vapiPhoneNumber: string
  systemPrompt?: string
  createdAt: Date
  updatedAt: Date
}

const agentSchema = new Schema<IAgent>(
  {
    language: {
      type: String,
      enum: ["french", "english"],
      default: "english",
    },
    voiceId: {
      type: String,
      required: true,
      ref: "Voice",
    },
    provider: String,
    name: String,
    assistantId: String,
    phoneNumberId: {
      type: String,
      required: true,
      ref: "AvailablePhoneNumber",
    },
    businessId: {
      type: String,
      ref: "Business", // Added businessId reference
      required: true,
    },
    agentName: {
      type: String,
      required: true,
    },
    agentGender: {
      type: String,
      enum: ["male", "female"],
      default: "male",
    },
    vapiAssistantId: {
      type: String,
      required: true,
      unique: true,
    },
    vapiPhoneNumber: {
      type: String,
      required: true,
    },
    systemPrompt: String,
    categoryId: {
      type: String,
      required: true,
      ref: "SystemPrompt",
    },
  },
  { timestamps: true },
)

export const Agent = mongoose.model<IAgent>("Agent", agentSchema)
