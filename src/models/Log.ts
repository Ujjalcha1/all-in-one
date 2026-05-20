import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILog extends Document {
  deviceId: string;
  ip: string;
  tool: string;
  timestamp: Date;
}

const LogSchema = new Schema<ILog>({
  deviceId: { type: String, required: true, index: true },
  ip: { type: String, required: true, index: true },
  tool: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

export const Log: Model<ILog> = mongoose.models.Log || mongoose.model<ILog>("Log", LogSchema);
