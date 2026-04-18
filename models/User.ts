import mongoose, { Schema, Document } from 'mongoose'

export interface IUser extends Document {
  email: string
  name: string
  password?: string
  coins: number
  createdAt: Date
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  password: { type: String },
  coins: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
})

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema)