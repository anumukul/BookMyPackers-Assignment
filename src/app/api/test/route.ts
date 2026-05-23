import { connectDB } from '@/lib/mongodb';
import Lead from '@/models/Lead';
import { assignProviders } from '@/lib/allocate';
import { broadcastSSE } from '@/lib/sse';
import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';

const SERVICES = ['Service 1', 'Service 2', 'Service 3'] as const;

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.action !== 'bulk-leads') {
    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  }

  await connectDB();

  // Fire 10 leads concurrently to stress-test the allocation engine
  const results = await Promise.allSettled(
    Array.from({ length: 10 }, async (_, i) => {
      const service = SERVICES[i % 3];
      const session = await mongoose.startSession();

      try {
        let populatedLead: any;

        await session.withTransaction(async () => {
          const assignedProviders = await assignProviders(service, session);

          const [lead] = await Lead.create(
            [{
              customerName: `Test Customer ${i + 1}`,
              // Unique phone per run to avoid duplicate index collisions
              phone: `test-${Date.now()}-${i}`,
              city: 'Test City',
              service,
              description: `Auto-generated test lead #${i + 1}`,
              assignedProviders,
            }],
            { session }
          );

          populatedLead = await Lead.findById(lead._id)
            .populate('assignedProviders')
            .session(session);
        });

        broadcastSSE('new-lead', { lead: populatedLead });
        return populatedLead;
      } finally {
        await session.endSession();
      }
    })
  );

  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map(r => r.reason?.message);

  return NextResponse.json({ succeeded, failed, errors });
}