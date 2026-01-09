/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Redis as RedisRest } from "@upstash/redis"
import Redis from "ioredis"
import { env } from "../config/env"

class RedisService {
  private client: RedisRest
  private connected = false

  constructor() {
    // Upstash REST client
    this.client = new RedisRest({
      url: env.UPSTASH_REDIS_REST_URL || "",
      token: env.UPSTASH_REDIS_REST_TOKEN || "",
    })

    this.connected = true
    console.log("[v0] Redis (Upstash REST) initialized")
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.client.get(key)
      return data ? (data as T) : null
    } catch (error) {
      console.error("[v0] Redis get error for key", key, error)
      return null
    }
  }

  async set(key: string, value: any, ttl = 3600): Promise<void> {
    try {
      await this.client.setex(key, ttl, JSON.stringify(value))
    } catch (error) {
      console.error("[v0] Redis set error for key", key, error)
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key)
    } catch (error) {
      console.error("[v0] Redis del error for key", key, error)
    }
  }

  async delPattern(pattern: string): Promise<void> {
    console.warn("[v0] Pattern deletion not supported in Upstash REST API")
  }

  businessKey(businessId: string) {
    return `business:${businessId}`
  }

  userBusinessesKey(userId: string) {
    return `user:${userId}:businesses`
  }

  callsKey(businessId: string) {
    return `business:${businessId}:calls`
  }

  quotaKey(businessId: string) {
    return `business:${businessId}:quota`
  }

  isConnected() {
    return this.connected
  }

  async disconnect() {
    console.log("[v0] Redis disconnected")
  }
}

export const redisService = new RedisService()

// ------------------------------
// Real Pub/Sub Client (ioredis)
// ------------------------------

export const pubsubClient = new Redis(
  "rediss://default:AYsrAAIncDJmOWFiZWEzMDZmMjI0ZjBmOWUyMTg1YzUyZTc2NzU1MnAyMzU2Mjc@choice-finch-35627.upstash.io:6379"
)

pubsubClient.on("connect", () => {
  console.log("[v0] Pub/Sub client connected to Upstash")
})

pubsubClient.on("error", (err: any) => {
  console.error("[v0] Pub/Sub client error:", err)
})
