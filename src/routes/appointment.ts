/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router } from "express"
import Appointment from "../models/Appointments"
import { Business } from "../models/Business"
import { authMiddleware, type AuthRequest } from "../middleware/auth"
import { AppError } from "../middleware/errorHandler"
import { createNotification } from "../utils/notification"
import { redisService } from "../utils/redis"

const router = Router()

router.post("/", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId
    if (!userId) {
      throw new AppError(401, "User not authenticated")
    }

    const { businessId, callerName, callerEmail, date, time, timezone, scenarioId, webhookUrl } = req.body

    if (!businessId || !callerName || !callerEmail || !date || !time || !timezone) {
      throw new AppError(400, "Missing required fields: businessId, callerName, callerEmail, date, time, timezone")
    }

    const business = await Business.findById(businessId)
    if (!business) {
      throw new AppError(404, "Business not found")
    }

    if (business.userId.toString() !== userId) {
      throw new AppError(403, "Unauthorized to create appointments for this business")
    }

    const appointment = new Appointment({
      businessId,
      callerName,
      callerEmail,
      date: new Date(date),
      time,
      timezone,
      status: "pending",
      scenarioId,
      webhookUrl,
    })

    await appointment.save()

    await redisService.del(`business:${businessId}:appointments`)

    await createNotification(
      userId,
      "success",
      "Appointment Created",
      `New appointment scheduled with ${callerName} on ${new Date(date).toLocaleDateString()} at ${time}`,
      `/dashboard/appointments/${appointment._id}`,
    )

    res.status(201).json({
      success: true,
      appointment,
      message: "Appointment created successfully",
    })
  } catch (error) {
    next(error)
  }
})

router.get("/business/:businessId", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId
    if (!userId) {
      throw new AppError(401, "User not authenticated")
    }

    const { businessId } = req.params
    const { status, startDate, endDate } = req.query

    const business = await Business.findById(businessId)
    if (!business) {
      throw new AppError(404, "Business not found")
    }

    if (business.userId.toString() !== userId) {
      throw new AppError(403, "Unauthorized to access appointments for this business")
    }

    const cacheKey = `business:${businessId}:appointments`
    const cachedAppointments = await redisService.get<any[]>(cacheKey)

    if (cachedAppointments && !status && !startDate && !endDate) {
      return res.json({ success: true, appointments: cachedAppointments, cached: true })
    }

    const query: any = { businessId }

    if (status) {
      query.status = status
    }

    if (startDate || endDate) {
      query.date = {}
      if (startDate) {
        query.date.$gte = new Date(startDate as string)
      }
      if (endDate) {
        query.date.$lte = new Date(endDate as string)
      }
    }

    const appointments = await Appointment.find(query).sort({ date: 1, time: 1 })

    if (!status && !startDate && !endDate) {
      await redisService.set(cacheKey, appointments, 300)
    }

    res.json({
      success: true,
      appointments,
    })
  } catch (error) {
    next(error)
  }
})

router.get("/:id", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId
    if (!userId) {
      throw new AppError(401, "User not authenticated")
    }

    const appointment = await Appointment.findById(req.params.id)
    if (!appointment) {
      throw new AppError(404, "Appointment not found")
    }

    const business = await Business.findById(appointment.businessId)
    if (!business) {
      throw new AppError(404, "Business not found")
    }

    if (business.userId.toString() !== userId) {
      throw new AppError(403, "Unauthorized to access this appointment")
    }

    res.json({
      success: true,
      appointment,
    })
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

    const appointment = await Appointment.findById(req.params.id)
    if (!appointment) {
      throw new AppError(404, "Appointment not found")
    }

    const business = await Business.findById(appointment.businessId)
    if (!business) {
      throw new AppError(404, "Business not found")
    }

    if (business.userId.toString() !== userId) {
      throw new AppError(403, "Unauthorized to update this appointment")
    }

    const { callerName, callerEmail, date, time, timezone, status, scenarioId, webhookUrl } = req.body

    if (callerName) appointment.callerName = callerName
    if (callerEmail) appointment.callerEmail = callerEmail
    if (date) appointment.date = new Date(date)
    if (time) appointment.time = time
    if (timezone) appointment.timezone = timezone
    if (status) appointment.status = status
    if (scenarioId !== undefined) appointment.scenarioId = scenarioId
    if (webhookUrl !== undefined) appointment.webhookUrl = webhookUrl

    await appointment.save()

    await redisService.del(`business:${appointment.businessId}:appointments`)

    await createNotification(
      userId,
      "info",
      "Appointment Updated",
      `Appointment with ${appointment.callerName} has been updated`,
      `/dashboard/appointments/${appointment._id}`,
    )

    res.json({
      success: true,
      appointment,
      message: "Appointment updated successfully",
    })
  } catch (error) {
    next(error)
  }
})

router.delete("/:id", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId
    if (!userId) {
      throw new AppError(401, "User not authenticated")
    }

    const appointment = await Appointment.findById(req.params.id)
    if (!appointment) {
      throw new AppError(404, "Appointment not found")
    }

    const business = await Business.findById(appointment.businessId)
    if (!business) {
      throw new AppError(404, "Business not found")
    }

    if (business.userId.toString() !== userId) {
      throw new AppError(403, "Unauthorized to delete this appointment")
    }

    await Appointment.findByIdAndDelete(req.params.id)

    await redisService.del(`business:${appointment.businessId}:appointments`)

    await createNotification(
      userId,
      "info",
      "Appointment Deleted",
      `Appointment with ${appointment.callerName} has been deleted`,
      "/dashboard/appointments",
    )

    res.json({
      success: true,
      message: "Appointment deleted successfully",
    })
  } catch (error) {
    next(error)
  }
})

export default router
