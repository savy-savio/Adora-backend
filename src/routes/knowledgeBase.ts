import { Router } from "express"
import { KnowledgeBase } from "../models/KnowledgeBase"
import { Business } from "../models/Business"
import { authMiddleware, type AuthRequest } from "../middleware/auth"
import { AppError } from "../middleware/errorHandler"
import { vapiService } from "../utils/vapi"
import { createNotification } from "../utils/notification"
import multer from "multer"
import mongoose from "mongoose"

const router = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ["application/pdf", "text/plain", "text/markdown"]
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error("Only PDF, TXT, and MD files are allowed"))
    }
  },
})

// POST: Upload file and create knowledge base entry
router.post("/upload", authMiddleware, upload.single("file"), async (req: AuthRequest, res, next) => {
  try {
    const { businessId, title } = req.body

    if (!businessId || !title) {
      throw new AppError(400, "Missing required fields: businessId, title")
    }

    if (!req.file) {
      throw new AppError(400, "No file uploaded")
    }

    // Verify business ownership
    const business = await Business.findOne({
      _id: businessId,
      userId: req.userId,
    })

    if (!business) {
      throw new AppError(404, "Business not found")
    }

    // Upload file to VAPI
    const fileId = await vapiService.uploadKnowledgeBaseFile(req.file.buffer, req.file.originalname)

    const knowledgeBaseId = await vapiService.createKnowledgeBase(fileId, title)

    // Save KB record to database
    const kb = new KnowledgeBase({
      businessId,
      title,
      fileUrl: req.file.originalname,
      fileType: req.file.mimetype,
      vapiKnowledgeBaseId: knowledgeBaseId,
      isUploadedToVapi: true,
      vapiUploadedAt: new Date(),
    })

    await kb.save()

    if (req.userId) {
      await createNotification(
        req.userId,
        "success",
        "Knowledge Base Uploaded",
        `Your knowledge base "${title}" has been successfully uploaded and is ready to use.`,
        `/dashboard/knowledge-base/${kb._id}`,
      )
    }

    console.log("[v0] Knowledge base file uploaded and saved:", {
      kbId: kb._id,
      vapiKbId: knowledgeBaseId,
      fileName: req.file.originalname,
    })

    res.status(201).json({
      success: true,
      knowledgeBase: kb,
      vapiKnowledgeBaseId: knowledgeBaseId,
    })
  } catch (error) {
    next(error)
  }
})

// GET: Retrieve all knowledge base entries for a specific business
router.get("/business/:businessId", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const business = await Business.findOne({
      _id: req.params.businessId,
      userId: req.userId,
    })

    if (!business) {
      throw new AppError(404, "Business not found")
    }

    const knowledgeBase = await KnowledgeBase.find({
      businessId: business._id,
    })

    res.json({ success: true, knowledgeBase })
  } catch (error) {
    next(error)
  }
})

// POST: Create a new knowledge base entry (text-based)
router.post("/", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { businessId, title, content, fileUrl, fileType } = req.body

    if (!businessId || !title || !content) {
      throw new AppError(400, "Missing required fields: businessId, title, content")
    }

    const kb = new KnowledgeBase({
      businessId,
      title,
      content,
      fileUrl,
      fileType,
    })

    await kb.save()

    res.status(201).json({ success: true, knowledgeBase: kb })
  } catch (error) {
    next(error)
  }
})

// POST: Attach knowledge base to assistant
router.post("/:kbId/attach-to-assistant", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { assistantId } = req.body

    if (!assistantId) {
      throw new AppError(400, "assistantId is required")
    }

    console.log("[v0] Attach KB - kbId:", req.params.kbId, "Type:", typeof req.params.kbId)
    console.log("[v0] Is valid ObjectId:", mongoose.Types.ObjectId.isValid(req.params.kbId))

    if (!mongoose.Types.ObjectId.isValid(req.params.kbId)) {
      throw new AppError(400, `Invalid knowledge base ID format: ${req.params.kbId}`)
    }

    const kb = await KnowledgeBase.findById(req.params.kbId)

    if (!kb) {
      throw new AppError(404, "Knowledge base not found")
    }

    if (!kb.vapiKnowledgeBaseId) {
      throw new AppError(400, "This knowledge base has not been uploaded to VAPI yet")
    }

    const vapiKbId = kb.vapiKnowledgeBaseId as string
    const assistantIdStr = assistantId as string

    // Attach knowledge base to assistant
    const updatedAssistant = await vapiService.attachKnowledgeToAssistant(assistantIdStr, vapiKbId)

    console.log("[v0] Knowledge base attached to assistant:", {
      kbId: kb._id,
      assistantId,
      vapiKbId: kb.vapiKnowledgeBaseId,
    })

    res.json({
      success: true,
      message: "Knowledge base attached to assistant successfully",
      assistant: updatedAssistant,
    })
  } catch (error) {
    next(error)
  }
})

// PUT: Update an existing knowledge base entry
router.put("/:id", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const kb = await KnowledgeBase.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    })

    if (!kb) {
      throw new AppError(404, "Knowledge base entry not found")
    }

    if (req.userId) {
      await createNotification(
        req.userId,
        "info",
        "Knowledge Base Updated",
        `Your knowledge base "${kb.title}" has been successfully updated.`,
        `/dashboard/knowledge-base/${kb._id}`,
      )
    }

    res.json({ success: true, knowledgeBase: kb })
  } catch (error) {
    next(error)
  }
})

// DELETE: Remove a knowledge base entry
router.delete("/:id", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const kb = await KnowledgeBase.findByIdAndDelete(req.params.id)

    if (!kb) {
      throw new AppError(404, "Knowledge base entry not found")
    }

    if (req.userId) {
      await createNotification(
        req.userId,
        "warning",
        "Knowledge Base Deleted",
        `Your knowledge base "${kb.title}" has been deleted.`,
      )
    }

    res.json({ success: true, message: "Knowledge base entry deleted" })
  } catch (error) {
    next(error)
  }
})

export default router
