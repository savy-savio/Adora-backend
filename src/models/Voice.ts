import mongoose, { Schema, type Document } from "mongoose"

export interface IVoice extends Document {
  voiceId: string // e.g., "rohan", "neha", "hana"
  name: string // Display name
  gender: "male" | "female"
  language: string
  provider: "vapi"
  createdAt: Date
  updatedAt: Date
}

const voiceSchema = new Schema<IVoice>(
  {
    voiceId: {
      type: String,
      required: true,
      unique: true,
      sparse: true,
    },
    name: {
      type: String,
      required: true,
    },
    gender: {
      type: String,
      enum: ["male", "female"],
      required: true,
    },
    language: {
      type: String,
      required: true,
    },
    provider: {
      type: String,
      default: "vapi",
      required: true,
    },
  },
  { timestamps: true },
)

voiceSchema.index({ language: 1, gender: 1 }, { unique: false })

export const Voice = mongoose.model<IVoice>("Voice", voiceSchema)
