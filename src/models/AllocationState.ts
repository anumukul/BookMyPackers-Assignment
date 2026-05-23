import mongoose, { Schema, Document } from 'mongoose';

// Persists the round-robin pointer per service across server restarts
export interface IAllocationState extends Document {
  service: string;
  lastAssignedIndex: number;
}

const AllocationStateSchema = new Schema<IAllocationState>({
  service: { type: String, required: true, unique: true },
  lastAssignedIndex: { type: Number, default: -1 },
});

export default mongoose.models.AllocationState ||
  mongoose.model<IAllocationState>('AllocationState', AllocationStateSchema);