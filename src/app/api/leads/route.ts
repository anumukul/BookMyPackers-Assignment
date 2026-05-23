import { connectDB } from '@/lib/mongodb';
import Lead from '@/models/Lead';
import { assignProviders } from '@/lib/allocate';
import { broadcastSSE } from '@/lib/sse';
import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { customerName, phone, city, service, description } = body;

  if (!customerName || !phone || !city || !service || !description) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
  }

  const validServices = ['Service 1', 'Service 2', 'Service 3'];
  if (!validServices.includes(service)) {
    return NextResponse.json({ error: 'Invalid service.' }, { status: 400 });
  }

  await connectDB();
  const session = await mongoose.startSession();

  try {
    let populatedLead: any;

    await session.withTransaction(async () => {
      // Check duplicate inside transaction for consistency
      const existing = await Lead.findOne({ phone, service }).session(session);
      if (existing) {
        throw Object.assign(new Error('DUPLICATE'), { code: 'DUPLICATE' });
      }

      const assignedProviders = await assignProviders(service, session);

      const [lead] = await Lead.create(
        [{ customerName, phone, city, service, description, assignedProviders }],
        { session }
      );

      populatedLead = await Lead.findById(lead._id)
        .populate('assignedProviders')
        .session(session);
    });

    // Broadcast outside transaction (transaction already committed)
    broadcastSSE('new-lead', { lead: populatedLead });

    return NextResponse.json({ lead: populatedLead }, { status: 201 });
  } catch (err: any) {
    if (err.code === 'DUPLICATE') {
      return NextResponse.json(
        { error: 'This phone number already has a lead for this service.' },
        { status: 409 }
      );
    }
    // MongoDB unique index violation (race condition safety net)
    if (err.code === 11000) {
      return NextResponse.json(
        { error: 'Duplicate lead detected.' },
        { status: 409 }
      );
    }
    console.error('Lead creation error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  } finally {
    await session.endSession();
  }
}