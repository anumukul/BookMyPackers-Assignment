import { connectDB } from '@/lib/mongodb';
import Provider from '@/models/Provider';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  // Protect with a secret header so random users can't wipe the DB
  const secret = req.headers.get('x-seed-secret');
  if (secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  await Provider.deleteMany({});

  const providers = Array.from({ length: 8 }, (_, i) => ({
    name: `Provider ${i + 1}`,
    monthlyQuota: 10,
    leadsThisMonth: 0,
  }));

  await Provider.insertMany(providers);
  return NextResponse.json({ message: 'Seeded 8 providers successfully' });
}