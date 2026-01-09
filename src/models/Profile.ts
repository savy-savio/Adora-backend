import mongoose, { Schema, type Document } from "mongoose"

export interface IProfile extends Document {
  userId: string
  name: string
  avatar?: string
  bio?: string
  phone?: string
  country?: string
  businessName?: string
  businessDescription?: string
  agentName?: string
  agentGender?: string
  createdAt: Date
  updatedAt: Date
}

const profileSchema = new Schema<IProfile>(
  {
    userId: {
      type: String,
      required: true,
      ref: "User",
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    avatar: String,
    bio: String,
    phone: String,
    country: String,
    businessName: String,
    businessDescription: String,
    agentName: String,
    agentGender: String,
  },
  { timestamps: true },
)

export const Profile = mongoose.model<IProfile>("Profile", profileSchema)
