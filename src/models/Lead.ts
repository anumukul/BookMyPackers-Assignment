import mongoose, { Schema, Document } from 'mongoose';

export interface ILead extends Document {
  customerName: string;
  phone: string;
  city: string;
  service: 'Service 1' | 'Service 2' | 'Service 3';
  description: string;
  assignedProviders: mongoose.Types.ObjectId[];
  createdAt: Date;
}

const LeadSchema = new Schema<ILead>({
  customerName: { type: String, required: true },
  phone: { type: String, required: true },
  city: { type: String, required: true },
  service: {
    type: String,
    enum: ['Service 1', 'Service 2', 'Service 3'],
    required: true,
  },
  description: { type: String, required: true },
  assignedProviders: [{ type: Schema.Types.ObjectId, ref: 'Provider' }],
  createdAt: { type: Date, default: Date.now },
});

// DB-level enforcement: same phone + service cannot repeat
LeadSchema.index({ phone: 1, service: 1 }, { unique: true });

export default mongoose.models.Lead ||
  mongoose.model<ILead>('Lead', LeadSchema);