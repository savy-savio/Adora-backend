import { Business } from "../models/Business"
import { Subscription } from "../models/Subscription"

// Plan limits configuration
export const PLAN_LIMITS = {
  free: {
    calls_per_month: 10,
    concurrent_calls: 1,
  },
  basic: {
    calls_per_month: 50,
    concurrent_calls: 2,
  },
  standard: {
    calls_per_month: 500,
    concurrent_calls: 5,
  },
  premium: {
    calls_per_month: 2000,
    concurrent_calls: 10,
  },
  enterprise: {
    calls_per_month: 10000,
    concurrent_calls: 50,
  },
}

export interface QuotaCheckResult {
  allowed: boolean
  reason?: string
  callsRemaining: number
  callsUsed: number
  callLimit: number
  resetDate: Date
  concurrentCallsActive: number
  maxConcurrentCalls: number
}

/**
 * Check if business can make a VAPI call based on subscription quota
 */
export async function checkCallQuota(businessId: string): Promise<QuotaCheckResult> {
  try {
    const business = await Business.findById(businessId)
    if (!business) {
      return {
        allowed: false,
        reason: "Business not found",
        callsRemaining: 0,
        callsUsed: 0,
        callLimit: 0,
        resetDate: new Date(),
        concurrentCallsActive: 0,
        maxConcurrentCalls: 0,
      }
    }

    // Get plan based on subscription status
    let planType: keyof typeof PLAN_LIMITS = "free"
    if (business.subscriptionStatus === "active" && business.subscriptionId) {
      const subscription = await Subscription.findById(business.subscriptionId)
      if (subscription) {
        planType = subscription.plan as keyof typeof PLAN_LIMITS
      }
    }

    const planLimits = PLAN_LIMITS[planType]
    const callLimit = planLimits.calls_per_month
    const maxConcurrent = planLimits.concurrent_calls

    // Reset quota if billing period passed
    let quotaResetDate = business.quotaResetDate
    const now = new Date()

    if (!quotaResetDate || now > quotaResetDate) {
      // Reset quota - set to next month same date
      quotaResetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      business.callsUsed = 0
      business.quotaResetDate = quotaResetDate
      await business.save()
    }

    const callsRemaining = Math.max(0, callLimit - business.callsUsed)
    const concurrentCallsActive = business.activeCalls || 0

    // Check if quotas are exceeded
    const callsExceeded = business.callsUsed >= callLimit
    const concurrentExceeded = concurrentCallsActive >= maxConcurrent

    if (callsExceeded) {
      return {
        allowed: false,
        reason: `Call limit reached. Maximum: ${callLimit} calls per month`,
        callsRemaining: 0,
        callsUsed: business.callsUsed,
        callLimit,
        resetDate: quotaResetDate,
        concurrentCallsActive,
        maxConcurrentCalls: maxConcurrent,
      }
    }

    if (concurrentExceeded) {
      return {
        allowed: false,
        reason: `Concurrent call limit reached. Maximum: ${maxConcurrent} simultaneous calls`,
        callsRemaining,
        callsUsed: business.callsUsed,
        callLimit,
        resetDate: quotaResetDate,
        concurrentCallsActive,
        maxConcurrentCalls: maxConcurrent,
      }
    }

    return {
      allowed: true,
      callsRemaining,
      callsUsed: business.callsUsed,
      callLimit,
      resetDate: quotaResetDate,
      concurrentCallsActive,
      maxConcurrentCalls: maxConcurrent,
    }
  } catch (error) {
    console.error("[v0] Error checking quota:", error)
    return {
      allowed: false,
      reason: "Error checking quota",
      callsRemaining: 0,
      callsUsed: 0,
      callLimit: 0,
      resetDate: new Date(),
      concurrentCallsActive: 0,
      maxConcurrentCalls: 0,
    }
  }
}

/**
 * Increment call count after successful VAPI call
 */
export async function incrementCallUsage(businessId: string): Promise<void> {
  try {
    await Business.findByIdAndUpdate(
      businessId,
      {
        $inc: { callsUsed: 1 },
      },
      { new: true },
    )
  } catch (error) {
    console.error("[v0] Error incrementing call usage:", error)
    throw error
  }
}

/**
 * Increment active concurrent calls
 */
export async function incrementActiveCalls(businessId: string): Promise<void> {
  try {
    await Business.findByIdAndUpdate(
      businessId,
      {
        $inc: { activeCalls: 1 },
      },
      { new: true },
    )
  } catch (error) {
    console.error("[v0] Error incrementing active calls:", error)
    throw error
  }
}

/**
 * Decrement active concurrent calls
 */
export async function decrementActiveCalls(businessId: string): Promise<void> {
  try {
    await Business.findByIdAndUpdate(
      businessId,
      {
        $inc: { activeCalls: -1 },
      },
      { new: true },
    )
  } catch (error) {
    console.error("[v0] Error decrementing active calls:", error)
    throw error
  }
}
