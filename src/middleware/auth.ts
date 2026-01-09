import type { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import { env } from "../config/env"

export interface AuthRequest extends Request {
  userId?: string
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader?.split(" ")[1]

    // console.log("[v0] Auth Debug - Header:", authHeader ? "Present" : "Missing")
    // console.log("[v0] Auth Debug - Token:", token ? `Present (${token.substring(0, 20)}...)` : "Missing")

    if (!token) {
      return res.status(401).json({ error: "No token provided" })
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string }
    req.userId = decoded.userId
    next()
  } catch (error) {
    console.error("[v0] Auth middleware error:", error instanceof Error ? error.message : error)
    console.error("[v0] JWT_SECRET exists:", !!env.JWT_SECRET)
    res.status(401).json({ error: "Invalid token" })
  }
}
