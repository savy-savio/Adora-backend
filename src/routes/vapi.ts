/* eslint-disable @typescript-eslint/no-unused-vars */
import { Router } from "express"
import { authMiddleware, type AuthRequest } from "../middleware/auth"
import { AppError } from "../middleware/errorHandler"
import { vapiService } from "../utils/vapi"
import { Business } from "../models/Business"
import { CallLog } from "../models/CallLog"

const router = Router()

/**
 * Get all available phone numbers
 */
router.get("/phone-numbers/available", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const availableNumbers = await vapiService.getAvailablePhoneNumbers()

    res.json({
      success: true,
      availableNumbers: availableNumbers || [],
    })
  } catch (error) {
    next(error)
  }
})

/**
 * Get phone number details for a business
 */
router.get("/business/:businessId/phone-number", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const business = await Business.findOne({
      _id: req.params.businessId,
      userId: req.userId,
    })

    if (!business) {
      throw new AppError(404, "Business not found")
    }

    if (!business.vapiPhoneNumberId) {
      throw new AppError(404, "Business does not have a phone number")
    }

    const phoneDetails = await vapiService.getPhoneNumberDetails(business.vapiPhoneNumberId)

    res.json({
      success: true,
      phoneNumber: business.vapiPhoneNumber,
      phoneNumberId: business.vapiPhoneNumberId,
      details: phoneDetails,
    })
  } catch (error) {
    next(error)
  }
})

/**
 * Get VAPI public key for frontend
 */
router.get("/config/public-key", (req, res) => {
  try {
    const publicKey = vapiService.getPublicKey()

    if (!publicKey) {
      return res.status(400).json({
        success: false,
        message: "VAPI public key not configured",
      })
    }

    res.json({
      success: true,
      publicKey,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve VAPI configuration",
    })
  }
})

/**
 * Add endpoint to sync VAPI calls to database
 */
router.post("/sync/calls/:businessId", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { businessId } = req.params
    const userId = req.userId

    console.log("[v0] Syncing VAPI calls for businessId:", businessId)

    const business = await Business.findOne({
      _id: businessId,
      userId: userId,
    })

    if (!business) {
      throw new AppError(404, "Business not found")
    }

    if (!business.vapiAssistantId) {
      throw new AppError(400, "Business does not have a VAPI assistant assigned")
    }

    // Fetch calls from VAPI
    const vapiCalls = await vapiService.getCallLogs(business.vapiAssistantId, 100)
    const callsArray = Array.isArray(vapiCalls) ? vapiCalls : vapiCalls.calls || []

    console.log("[v0] Fetched", callsArray.length, "calls from VAPI")

    const syncedCalls = []
    for (const vapiCall of callsArray) {
      try {
        // Check if call already exists in database
        const existingCall = await CallLog.findOne({
          vapiCallId: vapiCall.id,
        })

        if (existingCall) {
          console.log("[v0] Call already exists:", vapiCall.id)
          continue
        }

        // Create new call log from VAPI data
        const callLog = new CallLog({
          vapiCallId: vapiCall.id,
          agentId: business.agentId || "",
          businessId: businessId,
          duration: vapiCall.duration || 0,
          transcript: vapiCall.transcript,
          recordingUrl: vapiCall.recordingUrl,
          stereoRecordingUrl: vapiCall.stereoRecordingUrl,
          status: vapiCall.status || "completed",
          costBreakdown: vapiCall.costBreakdown,
          analysis: vapiCall.analysis,
          endedReason: vapiCall.endedReason,
        })

        await callLog.save()
        syncedCalls.push(callLog)
        console.log("[v0] Synced call:", vapiCall.id)
      } catch (error) {
        console.error("[v0] Error syncing individual call:", error)
        continue
      }
    }

    res.json({
      success: true,
      message: `Synced ${syncedCalls.length} calls from VAPI`,
      syncedCalls,
    })
  } catch (error) {
    next(error)
  }
})

/**
 * Add endpoint to sync VAPI phone numbers to database
 */
router.post("/sync/phone-numbers", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId

    console.log("[v0] Syncing VAPI phone numbers for userId:", userId)

    // Fetch phone numbers from VAPI
    const vapiPhoneNumbers = await vapiService.getAvailablePhoneNumbers()

    console.log("[v0] Fetched", vapiPhoneNumbers.length, "phone numbers from VAPI")

    const { AvailablePhoneNumber } = await import("../models/AvailablePhoneNumber")

    const syncedPhoneNumbers = []
    for (const vapiPhone of vapiPhoneNumbers) {
      try {
        // Check if phone number already exists
        const existingPhone = await AvailablePhoneNumber.findOne({
          vapiPhoneNumberId: vapiPhone.id,
        })

        if (existingPhone) {
          console.log("[v0] Phone number already exists:", vapiPhone.id)
          continue
        }

        // Create new phone number from VAPI data
        const phoneNumber = new AvailablePhoneNumber({
          phoneNumber: vapiPhone.phoneNumber,
          vapiPhoneNumberId: vapiPhone.id,
          country: vapiPhone.country || "US",
          provider: "Vapi",
          isAvailable: true,
        })

        await phoneNumber.save()
        syncedPhoneNumbers.push(phoneNumber)
        console.log("[v0] Synced phone number:", vapiPhone.id)
      } catch (error) {
        console.error("[v0] Error syncing individual phone number:", error)
        continue
      }
    }

    res.json({
      success: true,
      message: `Synced ${syncedPhoneNumbers.length} phone numbers from VAPI`,
      syncedPhoneNumbers,
    })
  } catch (error) {
    next(error)
  }
})

export default router
