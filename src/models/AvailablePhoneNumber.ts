import mongoose, { Schema, type Document } from "mongoose"

export interface IAvailablePhoneNumber extends Document {
  phoneNumber: string
  vapiPhoneNumberId: string
  country: string
  provider: string
  isAvailable: boolean
  assistantId?: string
  createdAt: Date
  updatedAt: Date
}

const availablePhoneNumberSchema = new Schema<IAvailablePhoneNumber>(
  {
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
    },
    vapiPhoneNumberId: {
      type: String,
      required: true,
      unique: true,
    },
    country: {
      type: String,
      required: true,
    },
    provider: {
      type: String,
      required: true,
    },
    assistantId: String,
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
)

export const AvailablePhoneNumber = mongoose.model<IAvailablePhoneNumber>(
  "AvailablePhoneNumber",
  availablePhoneNumberSchema,
)
