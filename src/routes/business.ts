/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router } from "express"
import { Business } from "../models/Business"
import { UserBusiness } from "../models/UserBusiness"
import { Agent } from "../models/Agent"
import { Voice } from "../models/Voice"
import { Profile } from "../models/Profile"
import { User } from "../models/User"
import { authMiddleware, type AuthRequest } from "../middleware/auth"
import { AppError } from "../middleware/errorHandler"
import { vapiService } from "../utils/vapi"
import { createNotification } from "../utils/notification"
import { redisService } from "../utils/redis"
import { AvailablePhoneNumber } from "../models/AvailablePhoneNumber"

const router = Router()

router.post("/", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId
    if (!userId) {
      throw new AppError(401, "User not authenticated")
    }

    const {
      name,
      description,
      logo,
      country,
      customerBase,
      voice,
      phoneNumberId,
      categoryId,
      vapiPhoneNumber,
      agentName,
    } = req.body

    // Check if business already exists
    const existingBusiness = await Business.findOne({ userId })
    if (existingBusiness) {
      throw new AppError(400, "Business already exists for this user")
    }

    // Create VAPI assistant
    const assistantData = await vapiService.createAssistant(name, voice || "Rohan")

    const now = new Date()
    const freeTrialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    // Create business
    const business = new Business({
      userId,
      name,
      description,
      logo,
      country: country || "US",
      customerBase,
      agentName: agentName || `${name} Agent`,
      voiceId: voice || "Rohan",
      vapiAssistantId: assistantData.id,
      isProfileCompleted: true,
      isFreeTrial: true,
      freeTrialStartDate: now,
      freeTrialEndDate: freeTrialEnd,
      vapiEnabledUntil: freeTrialEnd,
    })
    await business.save()

    if (categoryId && phoneNumberId && vapiPhoneNumber) {
      const agent = new Agent({
        businessId: business._id.toString(),
        agentName: agentName || `${name} Agent`,
        vapiAssistantId: assistantData.id,
        phoneNumberId: phoneNumberId,
        voiceId: voice || "Rohan",
        vapiPhoneNumber: vapiPhoneNumber, // Use vapiPhoneNumber from request body
        categoryId: categoryId,
      })
      await agent.save()
    }

    const userBusiness = new UserBusiness({
      userId,
      businessId: business._id.toString(),
      role: "owner",
    })
    await userBusiness.save()

    await redisService.set(redisService.businessKey(business._id.toString()), business, 3600)
    await redisService.del(redisService.userBusinessesKey(userId))

    const activityKey = `business:${business._id}:activity`
    await redisService.set(
      activityKey,
      [
        {
          timestamp: new Date(),
          activity: "Business created",
          details: { name, country },
          userId,
        },
      ],
      604800,
    )

    await createNotification(
      userId,
      "success",
      "Business Created",
      `Your business "${name}" has been successfully created with a 7-day free trial.`,
      `/dashboard/business/${business._id}`,
    )

    const profile = await Profile.findOne({ userId })
    if (profile) {
      const isComplete = !!(
        profile.name &&
        profile.phone &&
        profile.country &&
        profile.bio &&
        profile.avatar &&
        business
      )

      if (isComplete) {
        await User.findByIdAndUpdate(userId, {
          profileCompleted: true,
          isFirstTimeUser: false,
        })
        business.isProfileCompleted = true
        await business.save()
        console.log("[v0] Profile marked as complete after business creation for user:", userId)

        await createNotification(
          userId,
          "success",
          "Setup Complete!",
          "Your profile and business setup is complete. You're ready to start receiving calls!",
          "/dashboard",
        )
      }
    }

    res.status(201).json({
      success: true,
      data: business,
    })
  } catch (error) {
    next(error)
  }
})

router.get("/user/all", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId
    if (!userId) {
      throw new AppError(401, "User not authenticated")
    }

    const cached = await redisService.get(redisService.userBusinessesKey(userId))
    if (cached) {
      return res.json({ success: true, businesses: cached })
    }

    const userBusinesses = await UserBusiness.find({ userId }).lean()
    const businessIds = userBusinesses.map((ub) => ub.businessId)
    const businesses = await Business.find({ _id: { $in: businessIds } }).lean()

    await redisService.set(redisService.userBusinessesKey(userId), businesses, 3600)

    res.json({ success: true, businesses })
  } catch (error) {
    next(error)
  }
})

router.put("/:id", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId
    if (!userId) {
      throw new AppError(401, "User not authenticated")
    }

    const { name, description, logo, country, customerBase, voice } = req.body

    const userBusiness = await UserBusiness.findOne({
      userId,
      businessId: req.params.id,
    })

    if (!userBusiness) {
      throw new AppError(403, "You don't have access to this business")
    }

    const business = await Business.findById(req.params.id)

    if (!business) {
      throw new AppError(404, "Business not found")
    }

    // Update business
    business.name = name || business.name
    business.description = description || business.description
    business.logo = logo || business.logo
    business.country = country || business.country
    business.customerBase = customerBase || business.customerBase
    await business.save()

    // Update agent if voice changed
    if (voice && business.vapiAssistantId) {
      const agent = await Agent.findOne({ businessId: business._id.toString() })
      if (agent && agent.vapiAssistantId) {
        await vapiService.updateAssistant(agent.vapiAssistantId, name, voice)
        agent.voiceId = voice
        await agent.save()
      }
    }

    await redisService.set(redisService.businessKey(business._id.toString()), business, 3600)
    await redisService.del(redisService.userBusinessesKey(userId))

    res.json({
      success: true,
      data: business,
    })
  } catch (error) {
    next(error)
  }
})

router.post("/:id/assign-phone-number", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId
    if (!userId) {
      throw new AppError(401, "User not authenticated")
    }

    let businessId = req.params.id && req.params.id !== "undefined" ? req.params.id : req.body.businessId

    if (!businessId || businessId === "undefined") {
      console.log("[v0] No businessId provided, attempting to find user's business...")
      const userBusiness = await UserBusiness.findOne({ userId, role: "owner" })
      if (userBusiness) {
        businessId = userBusiness.businessId
        console.log("[v0] Found businessId from UserBusiness:", businessId)
      }
    }

    console.log("[v0] Assign phone number request received for business:", businessId)
    console.log("[v0] Current User ID:", userId)

    const { vapiPhoneNumber, voiceId, agentName, categoryId, phoneNumberId: manualPhoneNumberId } = req.body

    console.log("[v0] Destructured values:", { vapiPhoneNumber, voiceId, agentName, categoryId, manualPhoneNumberId })

    if (!businessId || businessId === "undefined") {
      throw new AppError(400, "Business ID is required")
    }

    if (!vapiPhoneNumber) {
      throw new AppError(400, "Phone number is required")
    }

    if (!categoryId) {
      throw new AppError(
        400,
        "categoryId is required. Available categories: ecommerce, fashion, electronics, grocery, furniture, hospitals, pharmacy, telemedicine, restaurants, hotels, airlines, banks, insurance, and more",
      )
    }

    // Check for explicit UserBusiness relationship
    let userBusiness = await UserBusiness.findOne({
      userId,
      businessId: businessId,
    })

    const business = await Business.findById(businessId)

    if (!business) {
      throw new AppError(404, "Business not found")
    }

    // Fallback: If no UserBusiness record exists, check if the user is the original creator
    if (!userBusiness && business.userId === userId) {
      console.log("[v0] No UserBusiness found, but user is the creator. Creating missing relationship.")
      userBusiness = new UserBusiness({
        userId,
        businessId: business._id.toString(),
        role: "owner",
      })
      await userBusiness.save()
    }

    if (!userBusiness) {
      console.log("[v0] Permission denied. No UserBusiness record and user is not the creator.")
      throw new AppError(403, "You don't have access to this business")
    }

    let phoneNumberId: string = manualPhoneNumberId

    if (!phoneNumberId) {
      console.log("[v0] No phoneNumberId provided, checking database for pre-purchased number...")
      const existingAvailable = await AvailablePhoneNumber.findOne({ phoneNumber: vapiPhoneNumber, isAvailable: true })
      if (existingAvailable) {
        phoneNumberId = existingAvailable.vapiPhoneNumberId
        console.log("[v0] Found pre-purchased number in database, ID:", phoneNumberId)
      }
    }

    if (business.vapiPhoneNumberId && business.vapiPhoneNumberId !== phoneNumberId) {
      try {
        console.log("[v0] Releasing old phone number:", business.vapiPhoneNumber)
        // Only release if it's not the one we're about to assign
        await vapiService.releasePhoneNumber(business.vapiPhoneNumberId)
        console.log("[v0] Old phone number released successfully")
      } catch (error: any) {
        console.error("[v0] Error releasing old phone number:", error.message)
      }
    }

    if (!phoneNumberId) {
      console.log("[v0] No existing ID found, attempting to purchase phone number from VAPI:", vapiPhoneNumber)
      try {
        phoneNumberId = await vapiService.purchasePhoneNumber(vapiPhoneNumber)
        console.log("[v0] Phone number purchased successfully, ID:", phoneNumberId)
      } catch (error: any) {
        console.error("[v0] Failed to purchase phone number:", error.message)
        throw new AppError(
          400,
          `Failed to acquire phone number ${vapiPhoneNumber}. ${error.message}. Please select an available number from the list.`,
        )
      }
    } else {
      // Verify the ID actually exists in Vapi before proceeding
      console.log("[v0] Verifying existing phone number ID in VAPI:", phoneNumberId)
      try {
        const exists = await vapiService.checkPhoneNumberExists(phoneNumberId)
        if (!exists) {
          throw new Error("Phone number ID not found in VAPI account")
        }
      } catch (error: any) {
        console.error("[v0] VAPI verification failed:", error.message)
        throw new AppError(400, `The selected phone number is no longer available in your VAPI account.`)
      }
    }

    // Update business with new phone number
    business.vapiPhoneNumberId = phoneNumberId
    business.vapiPhoneNumber = vapiPhoneNumber

    let selectedVoiceId: string = business.voiceId || "Rohan"
    let agentGender: "male" | "female" = "male"

    if (voiceId) {
      const validVoices = [
        "Elliot",
        "Kylie",
        "Rohan",
        "Lily",
        "Savannah",
        "Hana",
        "Neha",
        "Cole",
        "Harry",
        "Paige",
        "Spencer",
        "Leah",
        "Tara",
      ]

      if (validVoices.includes(voiceId)) {
        selectedVoiceId = voiceId
        const femaleVoices = ["Kylie", "Lily", "Hana", "Savannah", "Neha", "Paige", "Leah", "Tara"]
        agentGender = femaleVoices.includes(voiceId) ? "female" : "male"
        console.log("[v0] Using valid voice:", selectedVoiceId, "Gender:", agentGender)
      } else {
        // Try to find voice in Voice collection
        try {
          const voice = await Voice.findOne({ _id: voiceId })
          if (voice && voice.voiceId) {
            selectedVoiceId = voice.voiceId.charAt(0).toUpperCase() + voice.voiceId.slice(1)
            agentGender = voice.gender as "male" | "female"
            console.log("[v0] Found custom voice:", selectedVoiceId)
          } else {
            console.log("[v0] Voice not found, using business default:", business.voiceId || "Rohan")
            selectedVoiceId = business.voiceId || "Rohan"
          }
        } catch (error) {
          console.error("[v0] Error fetching voice:", error)
          selectedVoiceId = business.voiceId || "Rohan"
        }
      }
    } else if (!selectedVoiceId) {
      // Default to male voice if no voice selected
      const maleVoice = await Voice.findOne({ gender: "male" })
      if (maleVoice?.voiceId) {
        selectedVoiceId = maleVoice.voiceId
        agentGender = "male"
        console.log("[v0] Defaulting to male voice:", selectedVoiceId)
      } else {
        selectedVoiceId = "Rohan"
        console.log("[v0] Defaulting to Rohan voice")
      }
    }

    let vapiAssistant: any
    const finalAgentName = agentName || business.agentName || `${business.name} Agent`
    const systemPrompt = `You are a helpful AI assistant for ${business.name}. You will handle customer calls professionally and courteously.`

    if (business.vapiAssistantId) {
      // Update existing assistant
      console.log("[v0] Updating existing assistant:", business.vapiAssistantId)
      try {
        vapiAssistant = await vapiService.updateAssistant(
          business.vapiAssistantId,
          finalAgentName,
          selectedVoiceId,
          systemPrompt,
        )
        console.log("[v0] Assistant updated successfully")
      } catch (error: any) {
        console.error("[v0] Failed to update assistant:", error.message)
        // Create new assistant if update fails
        console.log("[v0] Creating new assistant instead")
        vapiAssistant = await vapiService.createAssistant(finalAgentName, selectedVoiceId, systemPrompt)
        business.vapiAssistantId = vapiAssistant.id
      }

      if (!business.vapiAssistantId) {
        throw new AppError(500, "Failed to get assistant ID")
      }

      // Attach assistant to phone number
      try {
        await vapiService.attachAssistantToPhoneNumber(phoneNumberId, business.vapiAssistantId)
        console.log("[v0] Assistant attached to phone number")
      } catch (error: any) {
        console.error("[v0] Failed to attach assistant to phone number:", error.message)
        // Clean up: release the phone number
        await vapiService.releasePhoneNumber(phoneNumberId)
        throw new AppError(400, `Failed to attach assistant to phone number: ${error.message}`)
      }

      const existingAgent = await Agent.findOne({ businessId: business._id.toString() })
      if (existingAgent) {
        existingAgent.agentName = finalAgentName
        existingAgent.voiceId = selectedVoiceId
        existingAgent.phoneNumberId = phoneNumberId
        existingAgent.vapiPhoneNumber = vapiPhoneNumber
        existingAgent.vapiAssistantId = business.vapiAssistantId
        existingAgent.categoryId = categoryId
        existingAgent.systemPrompt = systemPrompt
        existingAgent.agentGender = agentGender
        await existingAgent.save()
        console.log("[v0] Updated existing agent:", existingAgent._id)
      } else {
        // Create new agent if none exists
        const newAgent = new Agent({
          businessId: business._id.toString(),
          agentName: finalAgentName,
          voiceId: selectedVoiceId,
          phoneNumberId: phoneNumberId,
          vapiAssistantId: business.vapiAssistantId,
          vapiPhoneNumber: vapiPhoneNumber,
          systemPrompt: systemPrompt,
          categoryId: categoryId,
          agentGender: agentGender,
        })
        await newAgent.save()
        console.log("[v0] Created new agent:", newAgent._id)
      }
    } else {
      // Create new assistant
      console.log("[v0] Creating new assistant")
      try {
        vapiAssistant = await vapiService.createAssistant(finalAgentName, selectedVoiceId, systemPrompt)
        business.vapiAssistantId = vapiAssistant.id
        console.log("[v0] Assistant created successfully, ID:", vapiAssistant.id)
      } catch (error: any) {
        console.error("[v0] Failed to create assistant:", error.message)
        // Clean up: release the phone number
        await vapiService.releasePhoneNumber(phoneNumberId)
        throw new AppError(400, `Failed to create AI assistant: ${error.message}`)
      }

      if (!business.vapiAssistantId) {
        throw new AppError(500, "Failed to create assistant ID")
      }

      // Attach assistant to phone number
      try {
        await vapiService.attachAssistantToPhoneNumber(phoneNumberId, business.vapiAssistantId)
        console.log("[v0] Assistant attached to phone number")
      } catch (error: any) {
        console.error("[v0] Failed to attach assistant to phone number:", error.message)
        // Clean up: release the phone number
        await vapiService.releasePhoneNumber(phoneNumberId)
        throw new AppError(400, `Failed to attach assistant to phone number: ${error.message}`)
      }

      const existingAgent = await Agent.findOne({ businessId: business._id.toString() })
      if (existingAgent) {
        existingAgent.agentName = finalAgentName
        existingAgent.voiceId = selectedVoiceId
        existingAgent.phoneNumberId = phoneNumberId
        existingAgent.vapiPhoneNumber = vapiPhoneNumber
        existingAgent.vapiAssistantId = business.vapiAssistantId
        existingAgent.categoryId = categoryId
        existingAgent.systemPrompt = systemPrompt
        existingAgent.agentGender = agentGender
        await existingAgent.save()
        console.log("[v0] Updated existing agent:", existingAgent._id)
      } else {
        const agent = new Agent({
          businessId: business._id.toString(),
          agentName: finalAgentName,
          voiceId: selectedVoiceId,
          phoneNumberId: phoneNumberId,
          vapiAssistantId: business.vapiAssistantId,
          vapiPhoneNumber: vapiPhoneNumber,
          systemPrompt: systemPrompt,
          categoryId: categoryId,
          agentGender: agentGender,
        })
        await agent.save()
        console.log("[v0] Created new agent:", agent._id)
      }
    }

    business.voiceId = selectedVoiceId
    business.agentName = finalAgentName
    await business.save()
    console.log("[v0] Business updated successfully")

    // Clear cache
    await redisService.set(redisService.businessKey(business._id.toString()), business, 3600)
    await redisService.del(redisService.userBusinessesKey(userId))

    // Create notification
    await createNotification(
      userId,
      "success",
      "Phone Number Assigned!",
      `Your business is now live on ${vapiPhoneNumber}. Your AI agent "${finalAgentName}" is ready to handle calls.`,
      "/dashboard/business",
    )

    console.log("[v0] Phone number assignment completed successfully")

    res.json({
      success: true,
      business,
      phoneNumberId,
      assistantId: vapiAssistant.id,
      message: `Phone number ${vapiPhoneNumber} assigned and AI agent activated successfully. Ready to receive calls!`,
    })
  } catch (error) {
    console.error("[v0] Error in assign-phone-number:", error)
    next(error)
  }
})

router.get("/:id", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId
    if (!userId) {
      throw new AppError(401, "User not authenticated")
    }

    const cached = await redisService.get(redisService.businessKey(req.params.id))
    if (cached) {
      const userBusiness = await UserBusiness.findOne({
        userId,
        businessId: req.params.id,
      })
      if (!userBusiness) {
        throw new AppError(403, "You don't have access to this business")
      }
      const agent = await Agent.findOne({ businessId: req.params.id })
      return res.json({
        success: true,
        business: cached,
        agent: agent || null,
      })
    }

    const userBusiness = await UserBusiness.findOne({
      userId,
      businessId: req.params.id,
    })

    if (!userBusiness) {
      throw new AppError(403, "You don't have access to this business")
    }

    const business = await Business.findById(req.params.id)

    if (!business) {
      throw new AppError(404, "Business not found")
    }

    const agent = await Agent.findOne({ businessId: business._id.toString() })

    await redisService.set(redisService.businessKey(business._id.toString()), business, 3600)

    res.json({
      success: true,
      business,
      agent: agent || null,
    })
  } catch (error) {
    next(error)
  }
})

router.get("/", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId
    if (!userId) {
      throw new AppError(401, "User not authenticated")
    }

    const userBusiness = await UserBusiness.findOne({ userId, role: "owner" }).sort({ joinedAt: 1 })

    if (!userBusiness) {
      throw new AppError(404, "No business found for this user")
    }

    const cached = await redisService.get(redisService.businessKey(userBusiness.businessId))
    if (cached) {
      const agent = await Agent.findOne({ businessId: userBusiness.businessId })
      return res.json({
        success: true,
        business: cached,
        agent: agent || null,
      })
    }

    const business = await Business.findById(userBusiness.businessId)

    if (!business) {
      throw new AppError(404, "Business not found")
    }

    const agent = await Agent.findOne({ businessId: business._id.toString() })

    await redisService.set(redisService.businessKey(business._id.toString()), business, 3600)

    res.json({
      success: true,
      business,
      agent: agent || null,
    })
  } catch (error) {
    next(error)
  }
})

export default router
