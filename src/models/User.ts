import mongoose, { Schema, type Document } from "mongoose"

export interface IUser extends Document {
  _id: string
  email: string
  emailVerified: boolean
  isFirstTimeUser: boolean
  profileCompleted: boolean
  createdAt: Date
  updatedAt: Date
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    isFirstTimeUser: {
      type: Boolean,
      default: true,
    },
    profileCompleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
)

export const User = mongoose.model<IUser>("User", userSchema)
