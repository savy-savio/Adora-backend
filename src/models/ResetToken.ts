import mongoose, { Schema, type Document } from "mongoose"

export interface IResetToken extends Document {
    userId: string
    token: string
    expiresAt: Date
    createdAt: Date
}

const resetTokenSchema = new Schema<IResetToken>(
    {
        userId: {
            type: String,
            required: true,
            ref: "User",
        },
        token: {
            type: String,
            required: true,
            unique: true,
        },
        expiresAt: {
            type: Date,
            required: true,
            index: {expireAfterSeconds: 0},
        },
    },
    {timestamps: true}
)

export const ResetToken = mongoose.model<IResetToken>("ResetToken", resetTokenSchema)