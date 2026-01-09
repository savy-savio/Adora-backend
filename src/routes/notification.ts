import { Router } from "express";
import mongoose from "mongoose";
import { authMiddleware, type AuthRequest } from "../middleware/auth";
import { Notification } from "../models/Notification";
import { AppError } from "../middleware/errorHandler";

const router = Router();

router.get("/", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId; // string

    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      userId,
      isRead: false,
    });

    res.json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/unread/count", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId; // string

    const unreadCount = await Notification.countDocuments({
      userId,
      isRead: false,
    });

    res.json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
});

router.put("/:id/read", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId; // string
    const notificationId = new mongoose.Types.ObjectId(req.params.id);

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) throw new AppError(404, "Notification not found");

    res.json({
      success: true,
      notification,
    });
  } catch (error) {
    next(error);
  }
});

router.put("/all/read", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId; // string

    await Notification.updateMany({ userId, isRead: false }, { isRead: true });

    res.json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId; // string
    const notificationId = new mongoose.Types.ObjectId(req.params.id);

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      userId,
    });

    if (!notification) throw new AppError(404, "Notification not found");

    res.json({
      success: true,
      message: "Notification deleted",
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId; // string

    await Notification.deleteMany({ userId });

    res.json({
      success: true,
      message: "All notifications cleared",
    });
  } catch (error) {
    next(error);
  }
});

export default router;
