import mongoose, { Schema, type Document, type Types } from "mongoose"

export interface INotification extends Document {
  _id: Types.ObjectId
  userId: string
  type: "info" | "success" | "warning" | "error"
  title: string
  message: string
  actionUrl?: string
  isRead: boolean
  createdAt: Date
  updatedAt: Date
}

const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["info", "success", "warning", "error"],
      default: "info",
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    actionUrl: {
      type: String,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true },
)

export const Notification = mongoose.model<INotification>("Notification", notificationSchema)
