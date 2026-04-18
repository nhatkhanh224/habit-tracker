import mongoose, { Schema, Document } from 'mongoose'

export type BadgeType = 'flame' | 'warrior' | 'unbreakable' | 'legend' | 'god'

export interface IBadge extends Document {
  userId: string
  habitId: string
  type: BadgeType
  unlockedAt: Date
}

const BadgeSchema = new Schema<IBadge>({
  userId: { type: String, required: true },
  habitId: { type: String, required: true },
  type: { type: String, required: true },
  unlockedAt: { type: Date, default: Date.now },
})

BadgeSchema.index({ userId: 1, habitId: 1, type: 1 }, { unique: true })

export default mongoose.models.Badge || mongoose.model<IBadge>('Badge', BadgeSchema)