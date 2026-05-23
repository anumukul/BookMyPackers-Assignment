import mongoose, { Schema, Document } from 'mongoose';

export interface IProvider extends Document {
  name: string;
  monthlyQuota: number;
  leadsThisMonth: number;
}

const ProviderSchema = new Schema<IProvider>({
  name: { type: String, required: true, unique: true },
  monthlyQuota: { type: Number, default: 10 },
  leadsThisMonth: { type: Number, default: 0 },
});

export default mongoose.models.Provider ||
  mongoose.model<IProvider>('Provider', ProviderSchema);