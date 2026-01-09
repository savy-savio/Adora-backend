import mongoose, { Schema, type Document } from "mongoose"

export interface IVerifyEmailToken extends Document {
  userId: string
  token: string
  expiresAt: Date
  createdAt: Date
}

const verifyEmailTokenSchema = new Schema<IVerifyEmailToken>(
  {
    userId: {
      type: String,
      required: true,
      ref: "User",
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 },
    },
  },
  { timestamps: true },
)

export const VerifyEmailToken = mongoose.model<IVerifyEmailToken>("VerifyEmailToken", verifyEmailTokenSchema)
