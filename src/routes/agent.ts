import { Router } from "express"
import { Agent } from "../models/Agent"
import { authMiddleware, type AuthRequest } from "../middleware/auth"
import { AppError } from "../middleware/errorHandler"
import { Business } from "../models/Business"

const router = Router()

router.get("/business/:businessId", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const business = await Business.findOne({
      _id: req.params.businessId,
      userId: req.userId,
    })

    if (!business) {
      throw new AppError(404, "Business not found")
    }

    const agents = await Agent.find({ _id: { $in: [business.agentId] } })
    res.json({ success: true, agents })
  } catch (error) {
    next(error)
  }
})

router.post("/", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const {
      businessId,
      language,
      voiceId,
      phoneNumberId,
      categoryId,
      name,
      provider,
      assistantId,
      agentName,
      vapiPhoneNumber,
      agentGender,
    } = req.body

    if (!businessId) {
      throw new AppError(400, "businessId is required")
    }

    if (!voiceId || !phoneNumberId || !categoryId) {
      throw new AppError(400, "Missing required fields: voiceId, phoneNumberId, and categoryId are required")
    }

    if (!assistantId) {
      throw new AppError(400, "assistantId is required")
    }

    if (!vapiPhoneNumber) {
      throw new AppError(400, "vapiPhoneNumber is required")
    }

    const business = await Business.findOne({
      _id: businessId,
      userId: req.userId,
    })

    if (!business) {
      throw new AppError(404, "Business not found or you don't have access")
    }

    const agent = new Agent({
      businessId,
      language: language || "english",
      voiceId,
      phoneNumberId,
      categoryId,
      agentName: agentName || name || `${business.name} Agent`,
      provider,
      vapiAssistantId: assistantId, // Now validated as required string
      vapiPhoneNumber: vapiPhoneNumber,
      agentGender: agentGender || "male",
    })

    await agent.save()

    console.log("[v0] Agent created successfully:", agent._id)

    res.status(201).json({ success: true, agent })
  } catch (error) {
    next(error)
  }
})

router.put("/:id", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const agent = await Agent.findByIdAndUpdate(req.params.id, req.body, { new: true })

    if (!agent) {
      throw new AppError(404, "Agent not found")
    }

    res.json({ success: true, agent })
  } catch (error) {
    next(error)
  }
})

export default router
