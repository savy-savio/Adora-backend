import mongoose from "mongoose"

export const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/adora"
        await mongoose.connect(mongoUri)
        console.log("MongoDB connected successfuly")
    } catch (error: any) {
        console.error("MongoDB connection error:", error)
        process.exit(1)
    }
}