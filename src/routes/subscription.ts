/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router } from "express"
import Stripe from "stripe"
import axios from "axios"
import express from "express"
import { Subscription } from "../models/Subscription"
import { Business } from "../models/Business"
import { PaymentHistory } from "../models/PaymentHistory"
import { authMiddleware, type AuthRequest } from "../middleware/auth"
import { AppError } from "../middleware/errorHandler"
import { env } from "../config/env"
import { createNotification } from "../utils/notification"

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-09-30.clover" as any,
})

const router = Router()

router.get("/status/:businessId", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    console.log("[v0] GET /status/:businessId - Business ID:", req.params.businessId)

    const business = await Business.findOne({
      _id: req.params.businessId,
      userId: req.userId,
    }).populate("subscriptionId")

    console.log("[v0] Business found:", {
      id: business?._id,
      subscriptionId: business?.subscriptionId, // Fixed: subscriptionId is already a string, not an object with _id
      isFreeTrial: business?.isFreeTrial,
      subscriptionStartDate: business?.subscriptionStartDate,
      subscriptionEndDate: business?.subscriptionEndDate,
      vapiEnabledUntil: business?.vapiEnabledUntil,
    })

    if (!business) {
      throw new AppError(404, "Business not found")
    }

    const now = new Date()
    const isVapiActive = !business.vapiEnabledUntil || business.vapiEnabledUntil > now
    const daysLeftInTrial = business.freeTrialEndDate
      ? Math.ceil((business.freeTrialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0

    const response = {
      success: true,
      subscription: business.subscriptionId,
      isFreeTrial: business.isFreeTrial,
      isVapiActive,
      freeTrialStartDate: business.freeTrialStartDate,
      freeTrialEndDate: business.freeTrialEndDate,
      daysLeftInTrial: Math.max(0, daysLeftInTrial),
      subscriptionStartDate: business.subscriptionStartDate,
      subscriptionEndDate: business.subscriptionEndDate,
    }

    console.log("[v0] /status response:", response)
    res.json(response)
  } catch (error) {
    console.error("[v0] /status error:", error)
    next(error)
  }
})

// Get all subscription plans
router.get("/plans", async (req, res, next) => {
  try {
    console.log("[v0] GET /plans request received")

    const plans = await Subscription.find()

    console.log("[v0] Subscription plans fetched from database:", {
      count: plans.length,
      plans: plans.map((p) => ({ id: p._id, plan: p.plan, period: p.period, provider: p.paymentProvider })),
    })

    res.json({ success: true, plans })
  } catch (error) {
    console.error("[v0] Error in /plans endpoint:", error)
    next(error)
  }
})

// Get subscription for business
router.get("/business/:businessId", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const business = await Business.findOne({
      _id: req.params.businessId,
      userId: req.userId,
    }).populate("subscriptionId")

    if (!business) {
      return res.json({
        success: true,
        subscription: null,
        isFreeTrial: false,
        subscriptionStartDate: undefined,
        subscriptionEndDate: undefined,
      })
    }

    res.json({
      success: true,
      subscription: business.subscriptionId,
      isFreeTrial: business.isFreeTrial,
      subscriptionStartDate: business.subscriptionStartDate,
      subscriptionEndDate: business.subscriptionEndDate,
    })
  } catch (error) {
    next(error)
  }
})

router.post("/checkout", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { businessId, subscriptionId, paymentProvider, email, paymentId } = req.body as {
      businessId: string
      subscriptionId: string
      paymentProvider?: "stripe" | "paystack"
      email?: string
      paymentId?: string
    }

    if (!businessId || !subscriptionId) {
      throw new AppError(400, "Business ID and Subscription ID required")
    }

    const business = await Business.findOne({
      _id: businessId,
      userId: req.userId,
    })

    if (!business) {
      throw new AppError(404, "Business not found")
    }

    const subscription = await Subscription.findById(subscriptionId)
    if (!subscription) {
      throw new AppError(404, "Subscription plan not found")
    }

    const provider = paymentProvider || (business.country === "Nigeria" ? "paystack" : "stripe")

    if (provider === "paystack") {
      return await handlePaystackCheckout(business, subscription, email, res, paymentId)
    } else {
      return await handleStripeCheckout(business, subscription, email, res)
    }
  } catch (error) {
    next(error)
  }
})

async function handleStripeCheckout(business: any, subscription: any, email: string | undefined, res: any) {
  try {
    let customerId = business.stripeCustomerId

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: email ?? undefined,
        metadata: {
          businessId: business._id.toString(),
        },
      })

      customerId = customer.id
      business.stripeCustomerId = customerId
      await business.save()
    }

    const existingSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
    })

    console.log("[v0] Found existing subscriptions:", existingSubscriptions.data.length)

    for (const existingSub of existingSubscriptions.data) {
      const existingCurrency = (existingSub.items.data[0]?.price?.currency || "").toLowerCase()
      const newCurrency = (subscription.currency || "USD").toLowerCase()

      if (existingCurrency && existingCurrency !== newCurrency) {
        console.log("[v0] Cancelling existing subscription with different currency:", {
          existingCurrency,
          newCurrency,
          subscriptionId: existingSub.id,
        })

        await stripe.subscriptions.cancel(existingSub.id, { prorate: true })
      }
    }

    const allSchedules = await stripe.subscriptionSchedules.list({
      limit: 100,
    })

    const customerSchedules = allSchedules.data.filter(
      (schedule) => schedule.customer === customerId && schedule.status === "active",
    )

    console.log("[v0] Found subscription schedules:", customerSchedules.length)

    for (const schedule of customerSchedules) {
      console.log("[v0] Cancelling subscription schedule:", schedule.id)
      await stripe.subscriptionSchedules.cancel(schedule.id)
    }

    try {
      await stripe.customers.deleteDiscount(customerId)
      console.log("[v0] Deleted customer discount")
    } catch (error: any) {
      // Ignore if no discount exists
      console.log("[v0] No discount to delete or error deleting discount:", error.message)
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: subscription.currency || "USD",
            product_data: {
              name: `${subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)} Plan`,
              description: subscription.description || `Adora ${subscription.plan} Plan`,
            },
            unit_amount: Math.round(subscription.amount * 100),
            recurring: {
              interval: subscription.period === "yearly" ? "year" : "month",
              interval_count: 1,
            },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${env.FRONTEND_URL}/dashboard/payment?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.FRONTEND_URL}/dashboard/subscription`,
      metadata: {
        businessId: business._id.toString(),
        subscriptionId: subscription._id.toString(),
      },
    } as any)

    console.log("[v0] Stripe checkout session created:", session.id)

    res.json({
      success: true,
      sessionId: session.id,
      url: session.url,
      provider: "stripe",
    })
  } catch (error) {
    console.error("[v0] Stripe checkout error:", error)
    throw error
  }
}

async function handlePaystackCheckout(
  business: any,
  subscription: any,
  email: string | undefined,
  res: any,
  paymentId?: string,
) {
  try {
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY

    if (!paystackSecretKey) {
      console.error("[v0] WEBHOOK - Paystack secret key not configured")
      console.error(
        "[v0] WEBHOOK - ENV vars available:",
        Object.keys(process.env).filter((k) => k.includes("PAYSTACK")),
      )
      throw new AppError(500, "Paystack configuration missing")
    }

    const amount = Math.round(subscription.amount * 100) // Convert to kobo

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: email || business.email,
        amount,
        metadata: {
          businessId: business._id.toString(),
          subscriptionId: subscription._id.toString(),
          paymentId: paymentId || subscription._id.toString(),
          planName: subscription.plan,
          currency: subscription.currency,
          period: subscription.period,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
      },
    )

    console.log("[v0] Paystack checkout session created:", response.data.data.reference)

    if (response.data.data.customer && response.data.data.customer.customer_code) {
      business.payStackCustomerId = response.data.data.customer.customer_code
    }
    await business.save()

    res.json({
      success: true,
      reference: response.data.data.reference,
      authorizationUrl: response.data.data.authorization_url,
      provider: "paystack",
    })
  } catch (error: any) {
    console.error("[v0] WEBHOOK - Error:", error.response?.data || error.message)
    throw new AppError(500, "Failed to initialize Paystack payment")
  }
}

router.post("/webhook/stripe", express.raw({ type: "application/json" }), async (req, res, next) => {
  try {
    console.log("[v0] WEBHOOK STRIPE RECEIVED")

    const sig = req.headers["stripe-signature"] as string
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!webhookSecret) {
      console.error("[v0] WEBHOOK - Stripe webhook secret not configured")
      console.error(
        "[v0] WEBHOOK - ENV vars available:",
        Object.keys(process.env).filter((k) => k.includes("STRIPE")),
      )
      throw new AppError(500, "Webhook secret not configured")
    }

    let event

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
      console.log("[v0] WEBHOOK STRIPE - ✓ Event verified, type:", event.type)
    } catch (err: any) {
      console.error("[v0] WEBHOOK STRIPE - ✗ Signature verification failed:", err.message)
      return res.status(400).send(`Webhook Error: ${err}`)
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session
      const businessId = session.metadata?.businessId
      const subscriptionId = session.metadata?.subscriptionId

      console.log("[v0] WEBHOOK STRIPE - ✓ checkout.session.completed event received", {
        businessId,
        subscriptionId,
        sessionId: session.id,
      })

      if (businessId && subscriptionId) {
        const business = await Business.findById(businessId)

        if (business) {
          console.log("[v0] WEBHOOK STRIPE - ✓ Business found, updating subscription...")

          business.subscriptionId = subscriptionId as any
          business.isFreeTrial = false
          business.subscriptionStatus = "active" as const
          business.subscriptionStartDate = new Date()

          const subscription = await Subscription.findById(subscriptionId)
          const daysToAdd = subscription?.period === "yearly" ? 365 : 30
          business.subscriptionEndDate = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000)
          business.vapiEnabledUntil = business.subscriptionEndDate

          await business.save()

          if (subscription) {
            try {
              await PaymentHistory.create({
                businessId: business._id,
                userId: business.userId,
                subscriptionId: subscriptionId,
                amount: subscription.amount,
                currency: subscription.currency || "USD",
                paymentProvider: "stripe",
                status: "completed",
                planName: subscription.plan,
                billingPeriod: subscription.period === "yearly" ? "yearly" : "monthly",
                transactionId: session.id,
                invoiceUrl: session.url || undefined,
                paymentMethod: "card",
                description: `${subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)} Plan Subscription`,
              })

              console.log("[v0] WEBHOOK STRIPE - ✓ Payment history created for transaction:", session.id)
            } catch (historyError) {
              console.error("[v0] WEBHOOK STRIPE - ✗ Failed to create payment history:", historyError)
            }

            try {
              await createNotification(
                business.userId,
                "success",
                "Subscription Activated",
                `Your ${subscription.plan} plan has been activated successfully. You can now use all features.`,
                "/dashboard/account-settings?tab=subscription",
              )
            } catch (notificationError) {
              console.error("[v0] WEBHOOK STRIPE - Failed to create subscription notification:", notificationError)
            }
          }

          console.log("[v0] WEBHOOK STRIPE - ✓✓✓ SUBSCRIPTION ACTIVATED ✓✓✓", {
            businessId: business._id,
            subscriptionId: subscription?.plan,
            subscriptionName: subscription?.plan,
            startDate: business.subscriptionStartDate,
            endDate: business.subscriptionEndDate,
            vapiUntil: business.vapiEnabledUntil,
          })
        } else {
          console.error("[v0] WEBHOOK STRIPE - ✗ Business NOT found for ID:", businessId)
        }
      } else {
        console.error("[v0] WEBHOOK STRIPE - ✗ Missing metadata:", { businessId, subscriptionId })
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string

      console.log("[v0] WEBHOOK STRIPE - customer.subscription.deleted for customer:", customerId)

      const business = await Business.findOne({ stripeCustomerId: customerId })
      if (business) {
        business.subscriptionId = undefined
        business.subscriptionStatus = "inactive" as const
        business.isFreeTrial = false
        business.vapiEnabledUntil = new Date()
        await business.save()

        try {
          await createNotification(
            business.userId,
            "warning",
            "Subscription Cancelled",
            "Your subscription has been cancelled. Your account is now inactive. You can reactivate it anytime by subscribing again.",
            "/dashboard/account-settings?tab=subscription",
          )
        } catch (notificationError) {
          console.error("[v0] WEBHOOK STRIPE - Failed to create cancellation notification:", notificationError)
        }

        console.log("[v0] WEBHOOK STRIPE - ✓ Subscription cancelled for business:", business._id)
      }
    }

    res.json({ received: true })
  } catch (error) {
    console.error("[v0] WEBHOOK STRIPE - ✗ Error:", error)
    next(error)
  }
})

router.post("/webhook/paystack", express.json(), async (req, res, next) => {
  try {
    console.log("[v0] WEBHOOK PAYSTACK RECEIVED")

    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY

    if (!paystackSecretKey) {
      console.error("[v0] WEBHOOK PAYSTACK - Paystack secret key not configured")
      console.error(
        "[v0] WEBHOOK PAYSTACK - ENV vars available:",
        Object.keys(process.env).filter((k) => k.includes("PAYSTACK")),
      )
      return res.status(500).json({ error: "Paystack configuration missing" })
    }

    const crypto = require("crypto")
    const hash = crypto.createHmac("sha512", paystackSecretKey).update(JSON.stringify(req.body)).digest("hex")

    console.log("[v0] WEBHOOK PAYSTACK - Signature check:", {
      received: (req.headers["x-paystack-signature"] as string)?.substring(0, 20) + "...",
      computed: hash.substring(0, 20) + "...",
      match: hash === req.headers["x-paystack-signature"],
    })

    if (hash !== req.headers["x-paystack-signature"]) {
      console.error("[v0] WEBHOOK PAYSTACK - ✗ Invalid signature")
      return res.status(400).json({ error: "Invalid signature" })
    }

    const event = req.body

    if (event.event === "charge.success") {
      const { metadata, reference } = event.data

      console.log("[v0] WEBHOOK PAYSTACK - ✓ charge.success event received", {
        businessId: metadata?.businessId,
        subscriptionId: metadata?.subscriptionId,
        reference,
      })

      if (metadata?.businessId && metadata?.subscriptionId) {
        try {
          const business = await Business.findById(metadata.businessId)
          const subscription = await Subscription.findById(metadata.subscriptionId)

          if (business && subscription) {
            console.log("[v0] WEBHOOK PAYSTACK - ✓ Updating subscription...")

            business.subscriptionId = metadata.subscriptionId as any
            business.isFreeTrial = false
            business.subscriptionStatus = "active" as const
            business.subscriptionStartDate = new Date()
            const daysToAdd = subscription.period === "yearly" ? 365 : 30
            business.subscriptionEndDate = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000)
            business.vapiEnabledUntil = business.subscriptionEndDate
            await business.save()

            try {
              await PaymentHistory.create({
                businessId: business._id,
                userId: business.userId,
                subscriptionId: metadata.subscriptionId,
                amount: subscription.amount,
                currency: subscription.currency || "NGN",
                paymentProvider: "paystack",
                status: "completed",
                planName: subscription.plan,
                billingPeriod: subscription.period === "yearly" ? "yearly" : "monthly",
                transactionId: reference,
                paymentMethod: "paystack",
                description: `${subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)} Plan Subscription`,
              })

              console.log("[v0] WEBHOOK PAYSTACK - ✓ Payment history created for reference:", reference)
            } catch (historyError) {
              console.error("[v0] WEBHOOK PAYSTACK - ✗ Failed to create payment history:", historyError)
            }

            try {
              await createNotification(
                business.userId!,
                "success",
                "Subscription Activated",
                `Your ${subscription.plan} plan has been activated successfully. You can now use all features.`,
                "/dashboard/account-settings?tab=subscription",
              )
            } catch (notificationError) {
              console.error("[v0] WEBHOOK PAYSTACK - Failed to create subscription notification:", notificationError)
            }

            console.log("[v0] WEBHOOK PAYSTACK - ✓✓✓ SUBSCRIPTION ACTIVATED ✓✓✓", {
              businessId: business._id,
              subscriptionName: subscription.plan,
              startDate: business.subscriptionStartDate,
              endDate: business.subscriptionEndDate,
              vapiUntil: business.vapiEnabledUntil,
            })
          } else {
            console.error("[v0] WEBHOOK PAYSTACK - ✗ Business or subscription NOT found", {
              businessFound: !!business,
              subscriptionFound: !!subscription,
            })
          }
        } catch (dbError) {
          console.error("[v0] WEBHOOK PAYSTACK - ✗ Database error:", dbError)
        }
      } else {
        console.error("[v0] WEBHOOK PAYSTACK - ✗ Missing metadata:", {
          businessId: metadata?.businessId,
          subscriptionId: metadata?.subscriptionId,
        })
      }
    }

    res.json({ success: true })
  } catch (error) {
    console.error("[v0] WEBHOOK PAYSTACK - ✗ Unhandled error:", error)
    res.status(500).json({ error: "Webhook processing failed" })
  }
})

// Cancel subscription
router.post("/cancel", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { businessId } = req.body

    if (!businessId) {
      throw new AppError(400, "Business ID required")
    }

    if (!req.userId) {
      throw new AppError(401, "User not authenticated")
    }

    const business = await Business.findOne({
      _id: businessId,
      userId: req.userId,
    })

    if (!business) {
      throw new AppError(404, "Business not found")
    }

    if (business.stripeCustomerId) {
      const subscriptions = await stripe.subscriptions.list({
        customer: business.stripeCustomerId,
        status: "active",
      })

      for (const sub of subscriptions.data) {
        await stripe.subscriptions.cancel(sub.id)
      }
    }

    business.subscriptionId = undefined
    business.subscriptionStatus = "inactive" as const
    business.isFreeTrial = false
    business.vapiEnabledUntil = new Date()
    await business.save()

    try {
      await createNotification(
        req.userId!,
        "warning",
        "Subscription Cancelled",
        "Your subscription has been cancelled. Your account is now inactive. You can reactivate it anytime by subscribing again.",
        "/dashboard/account-settings?tab=subscription",
      )
    } catch (notificationError) {
      console.error("[v0] Failed to create cancellation notification:", notificationError)
    }

    console.log("[v0] Subscription cancelled for business:", businessId)

    res.json({ success: true, message: "Subscription cancelled" })
  } catch (error) {
    next(error)
  }
})

// Test endpoint to verify webhook setup
router.get("/webhook-test/:provider", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { provider } = req.params
    const secretKey = provider === "stripe" ? process.env.STRIPE_WEBHOOK_SECRET : process.env.PAYSTACK_SECRET_KEY

    res.json({
      success: true,
      provider,
      configured: !!secretKey,
      stripeWebhookSecretConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
      paystackSecretKeyConfigured: !!process.env.PAYSTACK_SECRET_KEY,
      backendUrl: env.BACKEND_URL || "NOT SET",
      frontendUrl: env.FRONTEND_URL || "NOT SET",
    })
  } catch (error) {
    next(error)
  }
})

export default router
