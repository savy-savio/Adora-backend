/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose, { Schema, type Document } from "mongoose"

export interface ICallLog extends Document {
  vapiCallId?: string
  agentName?: string
  agentId: string
  businessId: string
  duration: number
  transcript?: string
  recordingUrl?: string
  stereoRecordingUrl?: string
  status: "completed" | "failed" | "missed"
  costBreakdown?: {
    transport: number
    stt: number
    llm: number
    tts: number
    vapi: number
    total: number
  }
  analysis?: {
    summary?: string
    structuredData?: Record<string, any>
  }
  endedReason?: string
  createdAt: Date
  updatedAt: Date
}

const callLogSchema = new Schema<ICallLog>(
  {
    vapiCallId: String,
    agentName: {
      type: String,
    },
    agentId: {
      type: String,
      required: true,
      ref: "Agent",
    },
    businessId: {
      type: String,
      required: true,
      ref: "Business",
    },
    duration: {
      type: Number,
      default: 0,
    },
    transcript: String,
    recordingUrl: String,
    stereoRecordingUrl: String,
    status: {
      type: String,
      enum: ["completed", "failed", "missed"],
      default: "completed",
    },
    costBreakdown: {
      transport: Number,
      stt: Number,
      llm: Number,
      tts: Number,
      vapi: Number,
      total: Number,
    },
    analysis: {
      summary: String,
      structuredData: Schema.Types.Mixed,
    },
    endedReason: String,
  },
  { timestamps: true },
)

export const CallLog = mongoose.model<ICallLog>("CallLog", callLogSchema)
