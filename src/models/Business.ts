import mongoose, { Schema, type Document, type Types } from "mongoose"

export interface IBusiness extends Document {
  _id: Types.ObjectId
  userId: string
  name: string
  description?: string
  logo?: string
  stripeCustomerId?: string
  payStackCustomerId?: string
  customerBase?: string
  country?: string
  subscriptionStartDate?: Date
  subscriptionEndDate?: Date
  subscriptionId?: string
  agentId?: string
  vapiPhoneNumberId?: string
  vapiPhoneNumber?: string
  voiceId?: string
  agentName?: string
  vapiAssistantId?: string
  isFreeTrial: boolean
  freeTrialStartDate?: Date
  freeTrialEndDate?: Date
  vapiEnabledUntil?: Date
  isProfileCompleted: boolean
  subscriptionStatus: "free" | "active" | "inactive"
  callsUsed: number
  quotaResetDate?: Date
  maxConcurrentCalls: number
  activeCalls: number
  createdAt: Date
  updatedAt: Date
}

const businessSchema = new Schema<IBusiness>(
  {
    userId: {
      type: String,
      required: true,
      ref: "User",
    },
    name: {
      type: String,
      required: true,
    },
    description: String,
    logo: String,
    stripeCustomerId: String,
    payStackCustomerId: String,
    customerBase: {
      type: String,
      enum: ["Retail", "Corporate", "Enterprise", "Other"],
    },
    country: String,
    subscriptionStartDate: Date,
    subscriptionEndDate: Date,
    subscriptionId: {
      type: String,
      ref: "Subscription",
    },
    agentId: {
      type: String,
      ref: "Agent",
    },
    vapiPhoneNumberId: String,
    vapiPhoneNumber: String,
    voiceId: {
      type: String,
      ref: "Voice",
    },
    agentName: String,
    vapiAssistantId: String,
    isFreeTrial: {
      type: Boolean,
      default: true,
    },
    freeTrialStartDate: Date,
    freeTrialEndDate: Date,
    vapiEnabledUntil: Date,
    isProfileCompleted: {
      type: Boolean,
      default: false,
    },
    subscriptionStatus: {
      type: String,
      enum: ["free", "active", "inactive"],
      default: "free",
    },
    callsUsed: {
      type: Number,
      default: 0,
    },
    quotaResetDate: Date,
    maxConcurrentCalls: {
      type: Number,
      default: 1,
    },
    activeCalls: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
)

businessSchema.index({ userId: 1 }, { unique: true })

export const Business = mongoose.model<IBusiness>("Business", businessSchema)
