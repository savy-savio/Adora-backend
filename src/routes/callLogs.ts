/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router } from "express"
import { CallLog } from "../models/CallLog"
import { Business } from "../models/Business"
import { authMiddleware, type AuthRequest } from "../middleware/auth"
import { AppError } from "../middleware/errorHandler"
import { vapiService } from "../utils/vapi"
import { createNotification } from "../utils/notification"
import { checkCallQuota, incrementCallUsage } from "../utils/quota"
import { redisService } from "../utils/redis"

const router = Router()

const trackActivity = async (businessId: string, userId: string, activity: string, details?: Record<string, any>) => {
  try {
    const activityKey = `business:${businessId}:activity`
    const activities = (await redisService.get<any[]>(activityKey)) || []

    activities.unshift({
      timestamp: new Date(),
      activity,
      details,
      userId,
    })

    // Keep only last 50 activities
    await redisService.set(activityKey, activities.slice(0, 50), 604800) // 7 days
  } catch (error) {
    console.error("[v0] Failed to track activity:", error)
  }
}

router.get("/vapi/business/:businessId", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { businessId } = req.params
    const { limit } = req.query
    // <CHANGE> Add null coalescing to handle undefined userId
    const userId = req.userId || ""

    console.log("[v0] Fetching VAPI call logs for businessId:", businessId)

    const business = await Business.findById(businessId)
    if (!business) {
      throw new AppError(404, "Business not found")
    }

    if (business.userId !== userId) {
      throw new AppError(403, "Unauthorized to access this business")
    }

    if (!business.vapiAssistantId) {
      throw new AppError(400, "Business does not have a VAPI assistant assigned")
    }

    const callLogs = await vapiService.getCallLogs(
      business.vapiAssistantId,
      limit ? Number.parseInt(limit as string) : 50,
    )

    res.json({
      success: true,
      callLogs: callLogs.calls || callLogs,
      total: callLogs.total || (Array.isArray(callLogs) ? callLogs.length : 0),
    })
  } catch (error) {
    next(error)
  }
})

router.get("/vapi/:callId", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { callId } = req.params

    console.log("[v0] Fetching VAPI call details for callId:", callId)

    const callDetails = await vapiService.getCallById(callId)

    res.json({
      success: true,
      call: callDetails,
    })
  } catch (error) {
    next(error)
  }
})

router.get("/business/:businessId", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { businessId } = req.params
    // <CHANGE> Add null coalescing to handle undefined userId
    const userId = req.userId || ""

    console.log("[v0] Fetching call logs - businessId:", businessId, "userId:", userId)

    const cacheKey = `business:${businessId}:call-logs`
    const cachedCallLogs = await redisService.get<any[]>(cacheKey)

    if (cachedCallLogs) {
      return res.json({ success: true, callLogs: cachedCallLogs, cached: true })
    }

    const callLogs = await CallLog.find({
      businessId: businessId,
    }).sort({ createdAt: -1 })

    console.log("[v0] Found", callLogs.length, "call logs")

    await redisService.set(cacheKey, callLogs, 300)

    res.json({ success: true, callLogs })
  } catch (error) {
    next(error)
  }
})

router.post("/", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { agentId, businessId, duration, transcript, recordingUrl, status, agentName } = req.body
    // <CHANGE> Add null coalescing to handle undefined userId
    const userId = req.userId || ""

    if (!agentId || !businessId) {
      throw new AppError(400, "Agent ID and Business ID required")
    }

    const quotaCheck = await checkCallQuota(businessId)
    if (!quotaCheck.allowed) {
      throw new AppError(403, quotaCheck.reason || "Call quota exceeded")
    }

    const callLog = new CallLog({
      agentId,
      agentName: agentName || "AI Agent",
      businessId,
      duration: duration || 0,
      transcript,
      recordingUrl,
      status: status || "completed",
    })

    await callLog.save()

    await incrementCallUsage(businessId)

    await redisService.del(`business:${businessId}:call-logs`)
    await trackActivity(businessId, userId, "New call recorded", {
      duration,
      status,
      agentName,
    })

    try {
      const business = await Business.findById(businessId)
      if (business) {
        const quotaInfo = await checkCallQuota(businessId)
        // <CHANGE> Convert _id to string safely
        await createNotification(
          business.userId,
          "info",
          "New Call Recorded",
          `A new call has been recorded by ${agentName || "AI Agent"}. Duration: ${duration}s. Calls used: ${quotaInfo.callsUsed}/${quotaInfo.callLimit}`,
          "/dashboard/call-logs",
          {
            callId: String(callLog._id),
            duration,
            agentName,
          },
        )
      }
    } catch (notificationError) {
      console.error("[v0] Failed to create call log notification:", notificationError)
    }

    res.status(201).json({ success: true, callLog })
  } catch (error) {
    next(error)
  }
})

router.get("/activity/:businessId", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { businessId } = req.params

    const activityKey = `business:${businessId}:activity`
    const activities = await redisService.get<any[]>(activityKey)

    res.json({
      success: true,
      activities: activities || [],
    })
  } catch (error) {
    next(error)
  }
})

export default router
