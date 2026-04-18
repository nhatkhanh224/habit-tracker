import mongoose, { Schema, Document } from 'mongoose'

export interface IHabit extends Document {
  userId: string
  name: string
  description?: string
  color: string
  createdAt: Date
  isArchived: boolean
}

const HabitSchema = new Schema<IHabit>({
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String },
  color: { type: String, default: 'teal' },
  createdAt: { type: Date, default: Date.now },
  isArchived: { type: Boolean, default: false },
})

export default mongoose.models.Habit || mongoose.model<IHabit>('Habit', HabitSchema)