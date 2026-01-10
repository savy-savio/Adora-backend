import dotenv from "dotenv"

dotenv.config()

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`❌ Missing environment variable: ${name}`)
  }
  return value
}

function optionalEnv(name: string, defaultValue = ""): string {
  return process.env[name] ?? defaultValue
}

export const env = {
  // Server
  PORT: Number(process.env.PORT) || 5000,
  NODE_ENV: optionalEnv("NODE_ENV", "development"),

  // Database
  MONGODB_URI: requiredEnv("MONGODB_URI"),

  // Auth / JWT
  JWT_SECRET: requiredEnv("JWT_SECRET"),
  JWT_EXPIRE: optionalEnv("JWT_EXPIRE", "30d"),

  // Email
  SENDGRID_API_KEY: optionalEnv("SENDGRID_API_KEY"),

  // Payments
  STRIPE_SECRET_KEY: optionalEnv("STRIPE_SECRET_KEY"),
  STRIPE_PUBLISHABLE_KEY: optionalEnv("STRIPE_PUBLISHABLE_KEY"),
  PAYSTACK_SECRET_KEY: optionalEnv("PAYSTACK_SECRET_KEY"),

  // Frontend / Backend URLs
  FRONTEND_URL: optionalEnv("FRONTEND_URL", "http://localhost:3000"),
  BACKEND_URL: optionalEnv("BACKEND_URL", "http://localhost:5000"),

  // Google OAuth (CRITICAL)
  GOOGLE_CLIENT_ID: requiredEnv("GOOGLE_CLIENT_ID"),
  GOOGLE_CLIENT_SECRET: requiredEnv("GOOGLE_CLIENT_SECRET"),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: optionalEnv("CLOUDINARY_CLOUD_NAME"),
  CLOUDINARY_API_KEY: optionalEnv("CLOUDINARY_API_KEY"),
  CLOUDINARY_API_SECRET: optionalEnv("CLOUDINARY_API_SECRET"),

  // VAPI
  VAPI_PRIVATE_KEY: optionalEnv("VAPI_PRIVATE_KEY"),
  VAPI_PUBLIC_KEY: optionalEnv("VAPI_PUBLIC_KEY"),
  VAPI_CREDENTIAL_ID: optionalEnv("VAPI_CREDENTIAL_ID"),

  // Redis (local)
  REDIS_HOST: optionalEnv("REDIS_HOST", "localhost"),
  REDIS_PORT: Number(optionalEnv("REDIS_PORT", "6379")),
  REDIS_PASSWORD: optionalEnv("REDIS_PASSWORD"),

  // Upstash Redis
  UPSTASH_REDIS_REST_URL: optionalEnv("KV_REST_API_URL"),
  UPSTASH_REDIS_REST_TOKEN: optionalEnv("KV_REST_API_TOKEN"),
}
