/* eslint-disable @typescript-eslint/no-require-imports */
import { Router } from "express"
import { PaymentHistory } from "../models/PaymentHistory"
import { Business } from "../models/Business"
import { authMiddleware, type AuthRequest } from "../middleware/auth"
import { AppError } from "../middleware/errorHandler"

const router = Router()

router.get("/history", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query

    // Get the user's primary business
    const business = await Business.findOne({
      userId: req.userId,
    })

    if (!business) {
      throw new AppError(404, "Business not found")
    }

    const pageNum = Math.max(1, Number(page))
    const limitNum = Math.min(50, Math.max(1, Number(limit)))
    const skip = (pageNum - 1) * limitNum

    const payments = await PaymentHistory.find({
      businessId: business._id,
      userId: req.userId,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean()

    const total = await PaymentHistory.countDocuments({
      businessId: business._id,
      userId: req.userId,
    })

    res.json({
      success: true,
      data: payments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    })
  } catch (error) {
    next(error)
  }
})

router.get("/history/:businessId", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { businessId } = req.params
    const { page = 1, limit = 10 } = req.query

    const business = await Business.findOne({
      _id: businessId,
      userId: req.userId,
    })

    if (!business) {
      throw new AppError(404, "Business not found")
    }

    const pageNum = Math.max(1, Number(page))
    const limitNum = Math.min(50, Math.max(1, Number(limit)))
    const skip = (pageNum - 1) * limitNum

    const payments = await PaymentHistory.find({
      businessId,
      userId: req.userId,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean()

    const total = await PaymentHistory.countDocuments({
      businessId,
      userId: req.userId,
    })

    res.json({
      success: true,
      data: payments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    })
  } catch (error) {
    next(error)
  }
})

router.get("/stats", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const business = await Business.findOne({
      userId: req.userId,
    })

    if (!business) {
      throw new AppError(404, "Business not found")
    }

    const stats = await PaymentHistory.aggregate([
      {
        $match: {
          businessId: business._id,
          userId: req.userId,
          status: "completed",
        },
      },
      {
        $group: {
          _id: null,
          totalPaid: { $sum: "$amount" },
          totalTransactions: { $sum: 1 },
          avgTransactionAmount: { $avg: "$amount" },
        },
      },
    ])

    res.json({
      success: true,
      data: stats[0] || {
        totalPaid: 0,
        totalTransactions: 0,
        avgTransactionAmount: 0,
      },
    })
  } catch (error) {
    next(error)
  }
})

router.get("/stats/:businessId", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { businessId } = req.params

    const business = await Business.findOne({
      _id: businessId,
      userId: req.userId,
    })

    if (!business) {
      throw new AppError(404, "Business not found")
    }

    const stats = await PaymentHistory.aggregate([
      {
        $match: {
          businessId: new (require("mongoose").Types.ObjectId)(businessId),
          userId: req.userId,
          status: "completed",
        },
      },
      {
        $group: {
          _id: null,
          totalPaid: { $sum: "$amount" },
          totalTransactions: { $sum: 1 },
          avgTransactionAmount: { $avg: "$amount" },
        },
      },
    ])

    res.json({
      success: true,
      data: stats[0] || {
        totalPaid: 0,
        totalTransactions: 0,
        avgTransactionAmount: 0,
      },
    })
  } catch (error) {
    next(error)
  }
})

router.get("/transaction/:transactionId", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { transactionId } = req.params

    const payment = await PaymentHistory.findOne({
      transactionId,
      userId: req.userId,
    })

    if (!payment) {
      throw new AppError(404, "Payment not found")
    }

    res.json({
      success: true,
      data: payment,
    })
  } catch (error) {
    next(error)
  }
})

export default router
