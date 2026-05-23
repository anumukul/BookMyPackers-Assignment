import mongoose, { Schema, Document } from 'mongoose';

// Idempotency store — prevents duplicate webhook processing
export interface IWebhookEvent extends Document {
  idempotencyKey: string;
  action: string;
  processedAt: Date;
}

const WebhookEventSchema = new Schema<IWebhookEvent>({
  idempotencyKey: { type: String, required: true, unique: true },
  action: { type: String, required: true },
  processedAt: { type: Date, default: Date.now },
});

export default mongoose.models.WebhookEvent ||
  mongoose.model<IWebhookEvent>('WebhookEvent', WebhookEventSchema);