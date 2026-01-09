import mongoose, { Schema, type Document, type Types } from "mongoose"

export interface ISubscription extends Document {
  _id: Types.ObjectId
  plan: string
  period: "monthly" | "yearly"
  description: string
  amount: number
  currency?: string
  priceId: string
  paymentLink?: string
  paymentProvider: string
  features: string[]
  totalAllowedCalls?: number
  createdAt: Date
  updatedAt: Date
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    plan: {
      type: String,
      required: true,
      enum: ["basic", "standard", "premium", "enterprise"],
    },
    period: {
      type: String,
      required: true,
      enum: ["monthly", "yearly"],
    },
    description: {
      type: String,
      default: "",
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "USD",
    },
    priceId: {
      type: String,
      required: true,
    },
    paymentLink: {
      type: String,
      required: false,
    },
    paymentProvider: {
      type: String,
      required: true,
      enum: ["stripe", "paystack"],
    },
    features: [String],
    totalAllowedCalls: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
)

export const Subscription = mongoose.model<ISubscription>("Subscription", subscriptionSchema)
