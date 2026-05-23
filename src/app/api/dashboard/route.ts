import { connectDB } from '@/lib/mongodb';
import Provider from '@/models/Provider';
import Lead from '@/models/Lead';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  await connectDB();

  const providers = await Provider.find().sort({ name: 1 });

  const data = await Promise.all(
    providers.map(async (p) => {
      const leads = await Lead.find({ assignedProviders: p._id })
        .sort({ createdAt: -1 })
        .lean();

      return {
        _id: p._id,
        name: p.name,
        monthlyQuota: p.monthlyQuota,
        leadsThisMonth: p.leadsThisMonth,
        remainingQuota: Math.max(0, p.monthlyQuota - p.leadsThisMonth),
        leads,
      };
    })
  );

  return NextResponse.json({ providers: data });
}