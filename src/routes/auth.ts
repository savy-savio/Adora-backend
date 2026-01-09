/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router } from "express"
import bcryptjs from "bcryptjs"
import passport from "../models/Passport"
import { User } from "../models/User"
import { Account } from "../models/Account"
import { Profile } from "../models/Profile"
import { Business } from "../models/Business"
import { Agent } from "../models/Agent"
import { VerifyEmailToken } from "../models/VerifyEmailToken"
import { generateToken } from "../utils/jwt"
import { sendVerificationEmail } from "../utils/email"
import { type AuthRequest, authMiddleware } from "../middleware/auth"
import { AppError } from "../middleware/errorHandler"
import { createNotification } from "../utils/notification"
import { env } from "../config/env"
import { upload } from "../config/multer"
import cloudinary from "../config/cloudinary"
import type { Express } from "express"

const router = Router()

router.post("/signup", async (req, res, next) => {
  try {
    const { email, password, name } = req.body

    console.log("[v0] Signup attempt for:", email)

    if (!email || !password || !name) {
      throw new AppError(400, "Missing required fields")
    }

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      throw new AppError(400, "Email already in use")
    }

    const passwordHash = await bcryptjs.hash(password, 10)

    const user = new User({ email, emailVerified: false, isFirstTimeUser: true, profileCompleted: false })
    await user.save()

    await createNotification(
      user._id.toString(),
      "success",
      "Welcome to Adora!",
      "Your account has been created successfully. Please verify your email to continue.",
    )

    await Account.create({
      userId: user._id,
      type: "email",
      password: passwordHash,
    })

    await Profile.create({
      userId: user._id,
      name,
    })

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    await VerifyEmailToken.create({
      userId: user._id,
      token: verificationCode,
      expiresAt,
    })

    await sendVerificationEmail(email, verificationCode, name)

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      userId: user._id,
      isFirstTimeUser: true,
      profileCompleted: false,
    })
  } catch (error) {
    next(error)
  }
})

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body

    console.log("[v0] Login attempt for:", email)

    if (!email || !password) {
      throw new AppError(400, "Email and password required")
    }

    const user = await User.findOne({ email })
    if (!user) {
      throw new AppError(401, "Invalid email or password")
    }

    if (!user.emailVerified) {
      throw new AppError(401, "Please verify your email first")
    }

    const account = await Account.findOne({ userId: user._id })
    if (!account?.password) {
      throw new AppError(401, "Invalid email or password")
    }

    const isPasswordValid = await bcryptjs.compare(password, account.password)
    if (!isPasswordValid) {
      throw new AppError(401, "Invalid email or password")
    }

    const profile = await Profile.findOne({ userId: user._id })
    console.log("[v0] Profile found:", profile)

    // The profile should always be created during signup with the correct name
    if (!profile) {
      console.log("[v0] Profile missing for user:", user._id)
      throw new AppError(404, "Profile not found. Please contact support.")
    }

    const jwtToken = generateToken(user._id.toString())

    console.log("[v0] Login successful for:", email)

    res.json({
      success: true,
      token: jwtToken,
      isFirstTimeUser: user.isFirstTimeUser,
      profileCompleted: user.profileCompleted,
      user: {
        id: user._id,
        email: user.email,
        emailVerified: user.emailVerified,
        profile,
      },
    })
  } catch (error) {
    next(error)
  }
})

router.post("/verify-email", async (req, res, next) => {
  try {
    const { token } = req.body

    console.log("[v0] Email verification attempt")

    if (!token) {
      throw new AppError(400, "Token required")
    }

    const verifyToken = await VerifyEmailToken.findOne({ token })
    if (!verifyToken) {
      throw new AppError(400, "Invalid or expired token")
    }

    if (verifyToken.expiresAt < new Date()) {
      throw new AppError(400, "Token has expired")
    }

    const user = await User.findById(verifyToken.userId)
    if (!user) {
      throw new AppError(404, "User not found")
    }

    user.emailVerified = true
    await user.save()

    await VerifyEmailToken.deleteOne({ _id: verifyToken._id })

    await createNotification(
      user._id.toString(),
      "success",
      "Email Verified!",
      "Your email has been verified successfully. You can now proceed to set up your profile.",
    )

    console.log("[v0] Email verified for:", user.email)

    res.json({
      success: true,
      message: "Email verified successfully",
    })
  } catch (error) {
    next(error)
  }
})

router.post("/resend-verification", async (req, res, next) => {
  try {
    const { email } = req.body

    console.log("[v0] Resend verification for:", email)

    if (!email) {
      throw new AppError(400, "Email required")
    }

    const user = await User.findOne({ email })
    if (!user) {
      throw new AppError(404, "User not found")
    }

    const profile = await Profile.findOne({ userId: user._id })
    if (!profile) {
      throw new AppError(404, "Profile not found")
    }

    await VerifyEmailToken.deleteMany({ userId: user._id })

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    await VerifyEmailToken.create({
      userId: user._id,
      token: verificationCode,
      expiresAt,
    })

    await sendVerificationEmail(email, verificationCode, profile.name)

    console.log("[v0] Verification email resent")

    res.json({
      success: true,
      message: "Verification email sent successfully",
    })
  } catch (error) {
    next(error)
  }
})

router.get("/me", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const user = await User.findById(req.userId)
    if (!user) {
      throw new AppError(404, "User not found")
    }

    const profile = await Profile.findOne({ userId: user._id })

    const business = await Business.findOne({ userId: user._id })
    const agent = business ? await Agent.findOne({ businessId: business._id.toString() }) : null

    console.log("[v0] /me endpoint - user found:", user.email)
    console.log("[v0] /me endpoint - business found:", business)
    console.log("[v0] /me endpoint - agent found:", agent)

    res.json({
      success: true,
      isFirstTimeUser: user.isFirstTimeUser,
      profileCompleted: user.profileCompleted,
      user: {
        id: user._id,
        email: user.email,
        emailVerified: user.emailVerified,
        profile,
      },
      business: business || null,
      agent: agent || null,
    })
  } catch (error) {
    next(error)
  }
})

// ============ Google OAuth Authentication ============

router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }))

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login", session: false }),
  async (req, res, next) => {
    try {
      const user = req.user as any

      if (!user || !user._id) {
        throw new AppError(401, "Authentication failed")
      }

      const jwtToken = generateToken(user._id.toString())
      const profile = await Profile.findOne({ userId: user._id })

      console.log("[v0] Google OAuth successful for:", user.email)

      const redirectUrl = `${env.FRONTEND_URL}/auth/callback?token=${jwtToken}&email=${user.email}&isFirstTimeUser=${user.isFirstTimeUser}&profileCompleted=${user.profileCompleted}`

      res.redirect(redirectUrl)
    } catch (error) {
      console.error("[v0] Google callback error:", error)
      res.redirect(`${env.FRONTEND_URL}/login?error=authentication_failed`)
    }
  },
)

router.get("/google/user", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const user = await User.findById(req.userId)
    if (!user) {
      throw new AppError(404, "User not found")
    }

    const account = await Account.findOne({ userId: user._id, type: "google" })
    const profile = await Profile.findOne({ userId: user._id })

    res.json({
      success: true,
      hasGoogleAuth: !!account,
      user: {
        id: user._id,
        email: user.email,
        emailVerified: user.emailVerified,
        profile,
      },
    })
  } catch (error) {
    next(error)
  }
})

// ============ Refresh Token ============

router.post("/refresh-token", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const user = await User.findById(req.userId)
    if (!user) {
      throw new AppError(404, "User not found")
    }

    const jwtToken = generateToken(user._id.toString())
    const profile = await Profile.findOne({ userId: user._id })

    console.log("[v0] Token refreshed for:", user.email)

    res.json({
      success: true,
      token: jwtToken,
      user: {
        id: user._id,
        email: user.email,
        emailVerified: user.emailVerified,
        profile,
      },
    })
  } catch (error) {
    next(error)
  }
})

// ============ Logout ============

router.post("/logout", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    console.log("[v0] Logout for user:", req.userId)
    req.logout((err) => {
      if (err) return next(err)
      res.json({ success: true, message: "Logged out" })
    })
  } catch (error) {
    next(error)
  }
})

router.put("/profile", authMiddleware, upload.single("avatar"), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId
    if (!userId) {
      throw new AppError(401, "User not authenticated")
    }

    const { name, bio, phone, country } = req.body

    const profile = await Profile.findOne({ userId })
    if (!profile) {
      throw new AppError(404, "Profile not found")
    }

    // Update profile fields
    if (name) profile.name = name
    if (bio) profile.bio = bio
    if (phone) profile.phone = phone
    if (country) profile.country = country

    if (req.file) {
      const file = req.file as Express.Multer.File
      const imageUrl = await new Promise<string>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "adora/avatars",
            resource_type: "auto",
            quality: "auto",
            fetch_format: "auto",
          },
          (error, result) => {
            if (error) reject(error)
            else resolve(result?.secure_url || "")
          },
        )
        stream.end(file.buffer)
      })
      profile.avatar = imageUrl
    }

    await profile.save()

    // Check if profile is complete
    const user = await User.findById(userId)
    if (user) {
      const isComplete = !!(profile.name && profile.phone && profile.country && profile.bio && profile.avatar)

      if (isComplete && !user.profileCompleted) {
        user.profileCompleted = true
        user.isFirstTimeUser = false
        await user.save()
        console.log("[v0] User profile marked as complete:", userId)
      }
    }

    await createNotification(
      userId,
      "success",
      "Profile Updated!",
      "Your profile has been updated successfully.",
      "/dashboard/account-settings",
    )

    console.log("[v0] User profile updated:", {
      userId,
      name: profile.name,
      country: profile.country,
      hasAvatar: !!profile.avatar,
    })

    res.json({
      success: true,
      message: "Profile updated successfully",
      profile,
    })
  } catch (error) {
    next(error)
  }
})

export default router
