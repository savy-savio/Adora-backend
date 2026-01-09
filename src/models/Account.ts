import mongoose, { Schema, type Document } from "mongoose"

export interface IAccount extends Document {
  userId: string
  type: "email" | "google"
  password?: string
  googleId?: string
  createdAt: Date
  updatedAt: Date
}

const accountSchema = new Schema<IAccount>(
  {
    userId: {
      type: String,
      required: true,
      ref: "User",
    },
    type: {
      type: String,
      enum: ["email", "google"],
      required: true,
    },
    password: String,
    googleId: String,
  },
  { timestamps: true },
)

export const Account = mongoose.model<IAccount>("Account", accountSchema)
