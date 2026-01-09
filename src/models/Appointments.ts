import mongoose, { type Model, Schema } from "mongoose"
import type { IAppointment } from "../types"

const appointmentSchema = new Schema<IAppointment>(
  {
    businessId: {
      type: String,
      required: true,
      ref: "Business",
    },
    callerName: {
      type: String,
      required: true,
    },
    callerEmail: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
    timezone: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
    },
    scenarioId: {
      type: Number,
    },
    webhookUrl: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
)

// Indexes
appointmentSchema.index({ businessId: 1 })
appointmentSchema.index({ date: 1 })
appointmentSchema.index({ callerEmail: 1 })
appointmentSchema.index({ status: 1 })

const Appointment: Model<IAppointment> = mongoose.model<IAppointment>("Appointment", appointmentSchema)

export default Appointment
