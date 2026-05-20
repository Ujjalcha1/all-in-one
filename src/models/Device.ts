import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDevice extends Document {
  deviceId: string;
  email: string | null;
  userAgent: string;
  ip: string;
  os: string;
  browser: string;
  lastActive: Date;
  createdAt: Date;
}

const DeviceSchema = new Schema<IDevice>({
  deviceId: { type: String, required: true, unique: true, index: true },
  email: { type: String, lowercase: true, default: null },
  userAgent: { type: String, default: "" },
  ip: { type: String, required: true },
  os: { type: String, default: "Unknown OS" },
  browser: { type: String, default: "Unknown Browser" },
  lastActive: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

export const Device: Model<IDevice> = mongoose.models.Device || mongoose.model<IDevice>("Device", DeviceSchema);
