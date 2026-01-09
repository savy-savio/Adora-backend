/* eslint-disable @typescript-eslint/no-unused-vars */
import { Router } from "express"
import bcryptjs from "bcryptjs"
import crypto from "crypto"
import { User } from "../models/User"
import { Account } from "../models/Account"
import { ResetToken } from "../models/ResetToken"
import { authMiddleware, type AuthRequest } from "../middleware/auth"
import { AppError } from "../middleware/errorHandler"
import { sendVerificationEmail } from "../utils/email"
import { createNotification } from "../utils/notification"

const router = Router()

router.post("/forgot-password", async (req, res, next) => {
  try {
    const { email } = req.body

    if (!email) {
      throw new AppError(400, "Email required")
    }

    const user = await User.findOne({ email })
    if (!user) {
      return res.json({
        success: true,
        message: "If email exists, reset link will be sent",
      })
    }

    // Delete existing reset tokens
    await ResetToken.deleteMany({ userId: user._id })

    // Create new reset token
    const token = crypto.randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000) // 1 hour

    await ResetToken.create({
      userId: user._id,
      token,
      expiresAt,
    })

    // Send reset email
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`
    await sendVerificationEmail(email, token, user._id.toString())

    console.log("[v0] Password reset email sent to:", email)

    res.json({
      success: true,
      message: "If email exists, reset link will be sent",
    })
  } catch (error) {
    next(error)
  }
})

router.post("/reset-password", async (req, res, next) => {
  try {
    const { token, password, confirmPassword } = req.body

    if (!token || !password || !confirmPassword) {
      throw new AppError(400, "Missing required fields")
    }

    if (password !== confirmPassword) {
      throw new AppError(400, "Passwords do not match")
    }

    const resetToken = await ResetToken.findOne({ token })
    if (!resetToken) {
      throw new AppError(400, "Invalid or expired token")
    }

    if (resetToken.expiresAt < new Date()) {
      throw new AppError(400, "Token has expired")
    }

    const user = await User.findById(resetToken.userId)
    if (!user) {
      throw new AppError(404, "User not found")
    }

    const passwordHash = await bcryptjs.hash(password, 10)

    const account = await Account.findOne({ userId: user._id })
    if (account) {
      account.password = passwordHash
      await account.save()
    }

    await ResetToken.deleteOne({ _id: resetToken._id })

    console.log("[v0] Password reset successful for user:", user.email)

    res.json({
      success: true,
      message: "Password reset successfully",
    })
  } catch (error) {
    next(error)
  }
})

router.post("/change-password", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { oldPassword, password, confirmPassword } = req.body

    if (!oldPassword || !password || !confirmPassword) {
      throw new AppError(400, "Missing required fields")
    }

    if (password !== confirmPassword) {
      throw new AppError(400, "Passwords do not match")
    }

    const account = await Account.findOne({ userId: req.userId })
    if (!account?.password) {
      throw new AppError(400, "No password set for this account")
    }

    const isPasswordValid = await bcryptjs.compare(oldPassword, account.password)
    if (!isPasswordValid) {
      throw new AppError(400, "Old password is incorrect")
    }

    const passwordHash = await bcryptjs.hash(password, 10)
    account.password = passwordHash
    await account.save()

    // Create notification when password is changed
    try {
      if (req.userId) {
        const user = await User.findById(req.userId)
        if (user) {
          await createNotification(
            req.userId,
            "success",
            "Password Changed",
            "Your password has been successfully updated. If this wasn't you, please reset your password immediately.",
            "/dashboard/account-settings",
          )
        }
      }
    } catch (notificationError) {
      console.error("[v0] Failed to create password change notification:", notificationError)
    }

    console.log("[v0] Password changed for user:", req.userId)

    res.json({
      success: true,
      message: "Password changed successfully",
    })
  } catch (error) {
    next(error)
  }
})

export default router
