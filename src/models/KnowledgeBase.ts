import mongoose, { Schema, type Document } from "mongoose"

export interface IKnowledgeBase extends Document {
  businessId: mongoose.Types.ObjectId
  title: string
  content?: string
  fileUrl?: string
  fileType?: string
  vapiKnowledgeBaseId?: string
  isUploadedToVapi?: boolean
  vapiUploadedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const knowledgeBaseSchema = new Schema<IKnowledgeBase>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Business",
    },
    title: {
      type: String,
      required: true,
    },
    content: String,
    fileUrl: String,
    fileType: String,
    vapiKnowledgeBaseId: String,
    isUploadedToVapi: {
      type: Boolean,
      default: false,
    },
    vapiUploadedAt: Date,
  },
  { timestamps: true },
)

export const KnowledgeBase = mongoose.model<IKnowledgeBase>("KnowledgeBase", knowledgeBaseSchema)
