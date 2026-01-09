/* eslint-disable @typescript-eslint/no-explicit-any */
import passport from "passport"
import { Strategy as GoogleStrategy } from "passport-google-oauth20"
import type { VerifyCallback } from "passport-google-oauth20"
import type { Profile } from "passport-google-oauth20"
import { User } from "./User"
import { Account } from "./Account"
import { Profile as UserProfile } from "./Profile"
import { env } from "../config/env"

interface UserDocument {
  id: string
  email: string
  emailVerified: boolean
}

passport.use(
  new GoogleStrategy(
    {
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${env.FRONTEND_URL}/api/auth/google/callback`,
    },
    async (accessToken: string, refreshToken: string, profile: Profile, done: VerifyCallback) => {
      try {
        const email = profile.emails?.[0]?.value
        const verified = profile.emails?.[0]?.verified ?? false
        const googleId = profile.id
        const name = profile.displayName || profile.name?.givenName || "User"

        if (!email) {
          return done(new Error("No email found in profile"), undefined)
        }

        let user = await User.findOne({ email })

        if (!user) {
          user = await User.create({
            email,
            emailVerified: verified,
            isFirstTimeUser: true,
            profileCompleted: false,
          })

          await Account.create({
            userId: user._id,
            type: "google",
            googleId,
          })

          await UserProfile.create({
            userId: user._id,
            name,
          })

          console.log("[v0] New Google user created:", email)
        } else {
          let account = await Account.findOne({ userId: user._id })

          if (!account) {
            account = await Account.create({
              userId: user._id,
              type: "google",
              googleId,
            })
            console.log("[v0] Google account linked to existing user:", email)
          }

          if (account.googleId !== googleId) {
            account.googleId = googleId
            await account.save()
          }
        }

        return done(null, user as UserDocument)
      } catch (err) {
        console.error("[v0] Google OAuth error:", err)
        return done(err as Error, undefined)
      }
    },
  ),
)

passport.serializeUser((user: any, done: (err: Error | null, id?: string) => void) => {
  done(null, user._id?.toString() || user.id)
})

passport.deserializeUser(async (id: string, done: (err: Error | null, user?: UserDocument | null) => void) => {
  try {
    const user = await User.findById(id)
    done(null, user as UserDocument | null)
  } catch (err) {
    console.error("[v0] Deserialize user error:", err)
    done(err as Error, null)
  }
})

export default passport
