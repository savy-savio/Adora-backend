/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router } from "express"
import { Voice } from "../models/Voice"
import { authMiddleware } from "../middleware/auth"
import { vapiService } from "../utils/vapi"

const router = Router()

router.get("/available", authMiddleware, async (req, res, next) => {
  try {
    const { gender, language } = req.query

    const query: { gender?: string; language?: string } = {}
    if (gender) {
      query.gender = gender as "male" | "female"
    }
    if (language) {
      query.language = language as string
    }

    let voices = await Voice.find(query)

    // If database is empty, fetch from VAPI
    if (voices.length === 0) {
      const vapiVoices = await vapiService.getAvailableVoices()

      if (vapiVoices.length > 0) {
        const voiceMap = new Map<string, { language: string; gender: "male" | "female" }>()

        for (const voice of vapiVoices) {
          if (voice.gender === "male" || voice.gender === "female") {
            const language = voice.language || "en"
            const key = `${language}_${voice.gender}`
            if (!voiceMap.has(key)) {
              voiceMap.set(key, {
                language,
                gender: voice.gender as "male" | "female",
              })
            }
          }
        }

        const voicesToInsert = Array.from(voiceMap.values())

        if (voicesToInsert.length > 0) {
          voices = await Voice.insertMany(voicesToInsert, { ordered: false }).catch(() => {
            // Ignore duplicates if they already exist
            return Voice.find(query)
          })
        }
      }
    }

    res.json({
      success: true,
      voices: voices || [],
    })
  } catch (error) {
    next(error)
  }
})

router.post("/sync", async (req, res, next) => {
  try {
    const vapiVoices = await vapiService.getAvailableVoices()

    if (vapiVoices.length === 0) {
      return res.json({
        success: false,
        message: "No voices found. Unable to sync VAPI voices.",
        voices: [],
      })
    }

    const validVoices = vapiVoices.filter((voice) => voice.vapiVoiceId && voice.vapiVoiceId.trim() !== "")

    if (validVoices.length === 0) {
      return res.json({
        success: false,
        message: "No valid voices found to sync.",
        voices: [],
      })
    }

    try {
      await Voice.collection.dropIndex("voiceId_1")
    } catch (e) {
      // Index doesn't exist, continue
    }

    try {
      await Voice.collection.dropIndex("vapiVoiceId_1")
    } catch (e) {
      // Index doesn't exist, continue
    }

    await Voice.deleteMany({})

    const voicesToInsert = validVoices.map((voice) => ({
      voiceId: voice.vapiVoiceId,
      name: voice.name,
      gender: voice.gender || "male",
      language: voice.language || "en",
      provider: "vapi",
    }))

    const insertedVoices = await Voice.insertMany(voicesToInsert, { ordered: true })

    console.log("[v0] Successfully synced voices:", insertedVoices.length)

    res.json({
      success: true,
      voiceCount: insertedVoices.length,
      voices: insertedVoices,
    })
  } catch (error: any) {
    console.error("[v0] Error syncing voices:", error.message)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to sync voices",
      error: error.code === 11000 ? "Duplicate key error - clear the collection and try again" : error.message,
    })
  }
})

export default router
