import mongoose, { Schema, Document } from 'mongoose'

export interface ICheckIn extends Document {
  habitId: string
  userId: string
  date: string   // format: "2024-04-18"
  note?: string
  createdAt: Date
}

const CheckInSchema = new Schema<ICheckIn>({
  habitId: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  date: { type: String, required: true },
  note: { type: String },
  createdAt: { type: Date, default: Date.now },
})

// Đảm bảo mỗi habit chỉ check-in 1 lần/ngày
CheckInSchema.index({ habitId: 1, date: 1 }, { unique: true })

export default mongoose.models.CheckIn || mongoose.model<ICheckIn>('CheckIn', CheckInSchema)