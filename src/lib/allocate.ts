import mongoose from 'mongoose';
import Provider from '@/models/Provider';
import AllocationState from '@/models/AllocationState';

// Mandatory providers per service (must always be assigned if quota available)
const MANDATORY: Record<string, string[]> = {
  'Service 1': ['Provider 1'],
  'Service 2': ['Provider 5'],
  'Service 3': ['Provider 1', 'Provider 4'],
};

// Fair-pool providers per service (round-robin from these after mandatory)
const FAIR_POOL: Record<string, string[]> = {
  'Service 1': ['Provider 2', 'Provider 3', 'Provider 4'],
  'Service 2': ['Provider 6', 'Provider 7', 'Provider 8'],
  'Service 3': ['Provider 2', 'Provider 3', 'Provider 5', 'Provider 6', 'Provider 7', 'Provider 8'],
};

const TOTAL_SLOTS = 3;

export async function assignProviders(
  service: string,
  session: mongoose.ClientSession
): Promise<mongoose.Types.ObjectId[]> {
  const mandatoryNames = MANDATORY[service] || [];
  const fairPool = FAIR_POOL[service] || [];

  // Fetch all relevant providers in one query
  const allNames = [...new Set([...mandatoryNames, ...fairPool])];
  const providers = await Provider.find({ name: { $in: allNames } }).session(session);
  const byName = Object.fromEntries(providers.map(p => [p.name, p]));

  const assigned: mongoose.Types.ObjectId[] = [];

  // Step 1: Assign mandatory providers (skip if over quota)
  for (const name of mandatoryNames) {
    const p = byName[name];
    if (!p || p.leadsThisMonth >= p.monthlyQuota) continue;
    assigned.push(p._id as mongoose.Types.ObjectId);
  }

  // Step 2: Fill remaining slots using persistent round-robin
  const slotsNeeded = TOTAL_SLOTS - assigned.length;

  if (slotsNeeded > 0 && fairPool.length > 0) {
    // Get or create the allocation state for this service
    let stateDoc = await AllocationState.findOne({ service }).session(session);
    if (!stateDoc) {
      const created = await AllocationState.create(
        [{ service, lastAssignedIndex: -1 }],
        { session }
      );
      stateDoc = created[0];
    }

    let pointer = stateDoc.lastAssignedIndex;
    let added = 0;

    while (added < slotsNeeded) {
      let foundInThisPass = false;

      // Try every candidate starting from the next position
      for (let i = 0; i < fairPool.length; i++) {
        const tryIndex = (pointer + 1 + i) % fairPool.length;
        const candidate = byName[fairPool[tryIndex]];

        const alreadyAssigned = assigned.some(id =>
          id.equals(candidate?._id as mongoose.Types.ObjectId)
        );

        if (
          candidate &&
          candidate.leadsThisMonth < candidate.monthlyQuota &&
          !alreadyAssigned
        ) {
          assigned.push(candidate._id as mongoose.Types.ObjectId);
          pointer = tryIndex; // Advance pointer ONLY on actual assignment
          added++;
          foundInThisPass = true;
          break;
        }
      }

      // No eligible provider found — all quota exhausted
      if (!foundInThisPass) break;
    }

    // Persist the updated pointer back to DB (inside same transaction)
    await AllocationState.findOneAndUpdate(
      { service },
      { lastAssignedIndex: pointer },
      { session }
    );
  }

  // Step 3: Increment leadsThisMonth for all assigned providers atomically
  if (assigned.length > 0) {
    await Provider.updateMany(
      { _id: { $in: assigned } },
      { $inc: { leadsThisMonth: 1 } },
      { session }
    );
  }

  return assigned;
}