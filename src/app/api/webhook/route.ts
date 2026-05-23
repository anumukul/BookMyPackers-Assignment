import { connectDB } from '@/lib/mongodb';
import Provider from '@/models/Provider';
import WebhookEvent from '@/models/WebhookEvent';
import { broadcastSSE } from '@/lib/sse';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { idempotencyKey, action } = body;

  if (!idempotencyKey || typeof idempotencyKey !== 'string') {
    return NextResponse.json(
      { error: 'idempotencyKey is required.' },
      { status: 400 }
    );
  }

  if (action !== 'reset-quota') {
    return NextResponse.json(
      { error: 'Unknown action.' },
      { status: 400 }
    );
  }

  await connectDB();

  // Idempotency check — if this key was already processed, return early
  const existing = await WebhookEvent.findOne({ idempotencyKey });
  if (existing) {
    return NextResponse.json({
      message: 'Already processed.',
      idempotent: true,
      processedAt: existing.processedAt,
    });
  }

  // Record the key BEFORE processing — prevents double processing on retry
  try {
    await WebhookEvent.create({ idempotencyKey, action });
  } catch (err: any) {
    // Race condition: two concurrent requests with the same key
    if (err.code === 11000) {
      return NextResponse.json({ message: 'Already processed.', idempotent: true });
    }
    throw err;
  }

  // Process: reset all provider quotas
  await Provider.updateMany({}, { $set: { leadsThisMonth: 0 } });

  // Notify all open dashboards
  broadcastSSE('quota-reset', { message: 'All provider quotas have been reset.' });

  return NextResponse.json({ message: 'Quota reset successful.', idempotent: false });
}