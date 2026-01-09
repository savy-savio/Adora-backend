import mongoose, { Schema, type Document, type Types } from "mongoose"

export interface IPaymentHistory extends Document {
  _id: Types.ObjectId
  businessId: Types.ObjectId
  userId: string
  subscriptionId: string
  amount: number
  currency: string
  paymentProvider: "stripe" | "paystack"
  status: "completed" | "pending" | "failed"
  planName: string
  billingPeriod: "monthly" | "yearly"
  transactionId: string
  invoiceUrl?: string
  paymentMethod?: string
  description?: string
  createdAt: Date
  updatedAt: Date
}

const paymentHistorySchema = new Schema<IPaymentHistory>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Business",
    },
    userId: {
      type: String,
      required: true,
    },
    subscriptionId: {
      type: String,
      required: true,
      ref: "Subscription",
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "USD",
    },
    paymentProvider: {
      type: String,
      required: true,
      enum: ["stripe", "paystack"],
    },
    status: {
      type: String,
      required: true,
      enum: ["completed", "pending", "failed"],
      default: "completed",
    },
    planName: {
      type: String,
      required: true,
      enum: ["basic", "standard", "premium", "enterprise"],
    },
    billingPeriod: {
      type: String,
      required: true,
      enum: ["monthly", "yearly"],
    },
    transactionId: {
      type: String,
      required: true,
      unique: true,
    },
    invoiceUrl: String,
    paymentMethod: String,
    description: String,
  },
  { timestamps: true },
)

paymentHistorySchema.index({ businessId: 1, userId: 1 })
paymentHistorySchema.index({ createdAt: -1 })

export const PaymentHistory = mongoose.model<IPaymentHistory>("PaymentHistory", paymentHistorySchema)
