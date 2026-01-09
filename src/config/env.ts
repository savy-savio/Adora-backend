import dotenv from "dotenv"

dotenv.config()

export const env = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || "development",
  MONGODB_URI: process.env.MONGODB_URI,
  // "mongodb+srv://adora_user:adora@adora.yehbkfx.mongodb.net/?appName=adora"
  JWT_SECRET: process.env.JWT_SECRET || "your-secret-key",
  JWT_EXPIRE: process.env.JWT_EXPIRE || "30d", // increased from 7d to 30d
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || "",
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "",
  STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY || "",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",
  VAPI_PRIVATE_KEY: process.env.VAPI_PRIVATE_KEY || "",
  VAPI_PUBLIC_KEY: process.env.VAPI_PUBLIC_KEY || "",
  VAPI_CREDENTIAL_ID: process.env.VAPI_CREDENTIAL_ID,
  // "9079a30c-461a-4355-a193-56169227b1f8", 
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || "",
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || "",
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY || "",
  BACKEND_URL: process.env.BACKEND_URL || "http://localhost:5000",
  REDIS_HOST: process.env.REDIS_HOST || "localhost",
  REDIS_PORT: Number.parseInt(process.env.REDIS_PORT || "6379", 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  UPSTASH_REDIS_REST_URL: process.env.KV_REST_API_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.KV_REST_API_TOKEN,
}
