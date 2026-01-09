/* eslint-disable @typescript-eslint/no-explicit-any */
import { Notification } from "../models/Notification"
import { redisService, pubsubClient } from "./redis"

export type NotificationType = "info" | "success" | "warning" | "error"

export interface NotificationPayload {
  userId: string
  type: NotificationType
  title: string
  message: string
  actionUrl?: string
  timestamp: Date
  data?: Record<string, any>
}

export const createNotification = async (
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  actionUrl?: string,
  data?: Record<string, any>,
) => {
  try {
    const notification = new Notification({
      userId,
      type,
      title,
      message,
      actionUrl,
      isRead: false,
    })

    await notification.save()

    const payload: NotificationPayload = {
      userId,
      type,
      title,
      message,
      actionUrl,
      timestamp: new Date(),
      data,
    }

    // Use pubsubClient instead of private redisService.client
    await pubsubClient.publish(`notifications:${userId}`, JSON.stringify(payload))

    const notificationsKey = `user:${userId}:notifications`
    const existingNotifications = await redisService.get<NotificationPayload[]>(notificationsKey)
    const updatedNotifications = [
      payload,
      ...(existingNotifications || []).slice(0, 9), // Keep last 10
    ]
    await redisService.set(notificationsKey, updatedNotifications, 604800) // 7 days

    console.log(`[v0] Notification created for user ${userId}: ${title}`)
    return notification
  } catch (error) {
    console.error(`[v0] Error creating notification:`, error)
  }
}

export const subscribeToNotifications = (userId: string, callback: (notification: NotificationPayload) => void) => {
  // Use pubsubClient directly instead of trying to construct new instance
  pubsubClient.subscribe(`notifications:${userId}`, (err: any, count: any) => {
    if (err) {
      console.error("[v0] Failed to subscribe to notifications:", err)
    } else {
      console.log(`[v0] Subscribed to notifications channel, listening on ${count} channel(s)`)
    }
  })

  // Add proper typing for channel and message parameters
  pubsubClient.on("message", (channel: string, message: string) => {
    try {
      const notification = JSON.parse(message) as NotificationPayload
      callback(notification)
    } catch (error) {
      console.error("[v0] Error parsing notification:", error)
    }
  })

  return pubsubClient
}

export const getCachedNotifications = async (userId: string): Promise<NotificationPayload[]> => {
  return (await redisService.get<NotificationPayload[]>(`user:${userId}:notifications`)) || []
}
