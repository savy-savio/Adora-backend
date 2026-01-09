import express from "express"
import cors from "cors"
import helmet from "helmet"
import path from "path"
import session from "express-session"
import { connectDB } from "./config/database"
import { env } from "./config/env"
import { errorHandler } from "./middleware/errorHandler"
import passport from "./models/Passport"
import { systemPrompt } from "./config/seeds/systemPrompt"
// import { subscription } from "./config/seeds/subscription"

import authRoutes from "./routes/auth"
import businessRoutes from "./routes/business"
import agentRoutes from "./routes/agent"
import callLogsRoutes from "./routes/callLogs"
import knowledgeBaseRoutes from "./routes/knowledgeBase"
import subscriptionRoutes from "./routes/subscription"
import profileRoutes from "./routes/profile"
import passwordRoutes from "./routes/password"
import vapiRoutes from "./routes/vapi"
import voiceRoutes from "./routes/voice"
import notificationRoutes from "./routes/notification"
import paymentRoutes from "./routes/payment"
import appointmentRoutes from "./routes/appointment"

const app = express()

// Middleware
app.use(helmet())
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use(
  session({
    secret: env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
    },
  }),
)

app.use(passport.initialize())
app.use(passport.session())

app.use("/uploads", express.static(path.join(__dirname, "../uploads")))

// Connect to database
connectDB().then(async () => {
  try {
    console.log("[v0] Running seeds...")
    // await subscription()
    await systemPrompt()
    console.log("[v0] Seeds completed successfully")
  } catch (error) {
    console.error("[v0] Error running seeds:", error)
  }
})

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/business", businessRoutes)
app.use("/api/agent", agentRoutes)
app.use("/api/call-logs", callLogsRoutes)
app.use("/api/knowledge-base", knowledgeBaseRoutes)
app.use("/api/subscription", subscriptionRoutes)
app.use("/api/profile", profileRoutes)
app.use("/api/password", passwordRoutes)
app.use("/api/vapi", vapiRoutes)
app.use("/api/voice", voiceRoutes)
app.use("/api/notifications", notificationRoutes)
app.use("/api/payment", paymentRoutes)
app.use("/api/appointments", appointmentRoutes)

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" })
})

// Error handling
app.use(errorHandler)

// Start server
const PORT = env.PORT
app.listen(PORT, () => {
  console.log(`[v0] Server running on port ${PORT}`)
})
