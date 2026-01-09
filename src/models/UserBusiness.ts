import mongoose, { Schema, type Document, type Types } from "mongoose"

export interface IUserBusiness extends Document {
  _id: Types.ObjectId
  userId: string
  businessId: string
  role: "owner" | "admin" | "member"
  joinedAt: Date
}

const userBusinessSchema = new Schema<IUserBusiness>(
  {
    userId: {
      type: String,
      required: true,
      ref: "User",
    },
    businessId: {
      type: String,
      required: true,
      ref: "Business",
    },
    role: {
      type: String,
      enum: ["owner", "admin", "member"],
      default: "member",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
)

userBusinessSchema.index({ userId: 1, businessId: 1 }, { unique: true })
userBusinessSchema.index({ userId: 1 })
userBusinessSchema.index({ businessId: 1 })

export const UserBusiness = mongoose.model<IUserBusiness>("UserBusiness", userBusinessSchema)
