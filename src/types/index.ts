/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Document, Types } from "mongoose"

export interface IUser extends Document {
  _id: Types.ObjectId
  email: string
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
}

export interface IProfile extends Document {
  userId: string
  name: string
  avatar?: string
  phone?: string
  createdAt: Date
  updatedAt: Date
}

export interface IAccount extends Document {
  userId: string
  type: "email" | "google"
  password?: string
  googleId?: string
  createdAt: Date
  updatedAt: Date
}

export interface IBusiness extends Document {
  _id: Types.ObjectId
  userId: Types.ObjectId
  name: string
  industry?: string
  website?: string
  phone?: string
  email?: string
  description?: string
  logo?: string
  stripeCustomerId?: string
  customerBase?: number
  country?: string
  subscriptionStartDate?: Date
  subscriptionEndDate?: Date
  subscriptionId?: Types.ObjectId
  agentId?: Types.ObjectId
  isFreeTrial: boolean
  isProfileCompleted: boolean
  createdAt: Date
  updatedAt: Date
}

export interface IAgent extends Document {
  _id: Types.ObjectId
  businessId: string
  name: string
  assistantId?: string
  phoneNumberId?: string
  voiceId?: string
  categoryId?: string
  systemPrompt?: string
  createdAt: Date
  updatedAt: Date
}

export interface IAppointment extends Document {
  _id: Types.ObjectId
  businessId: string
  callerName: string
  callerEmail: string
  date: Date
  time: string
  timezone: string
  status: "pending" | "confirmed" | "cancelled"
  scenarioId?: number
  webhookUrl?: string
  createdAt: Date
  updatedAt: Date
}

export interface ISession extends Document {
  userId: string
  token: string
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface IVerifyEmailToken extends Document {
  userId: string
  token: string
  expiresAt: Date
  createdAt: Date
}

export interface IPasswordResetToken extends Document {
  userId: string
  token: string
  expiresAt: Date
  createdAt: Date
}

export interface JWTPayload {
  id: string
  email: string
}

export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  error?: string
}
