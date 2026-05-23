'use client';
import { useEffect, useState, useCallback } from 'react';

interface Lead {
  _id: string;
  customerName: string;
  service: string;
  city: string;
  createdAt: string;
}

interface ProviderData {
  _id: string;
  name: string;
  monthlyQuota: number;
  leadsThisMonth: number;
  remainingQuota: number;
  leads: Lead[];
}

export default function DashboardPage() {
  const [providers, setProviders] = useState<ProviderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState('');

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard');
      const data = await res.json();
      setProviders(data.providers);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();

    // SSE: listen for real-time events — auto-reconnects natively
    const es = new EventSource('/api/sse');

    // Both events trigger a full re-fetch for consistency
    es.addEventListener('new-lead', () => fetchDashboard());
    es.addEventListener('quota-reset', () => fetchDashboard());

    es.onerror = () => {
      // EventSource will automatically retry — no manual handling needed
      console.log('SSE connection lost, retrying...');
    };

    return () => es.close();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-53px)]">
        <p className="text-gray-400 text-sm">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <main className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Provider dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Updates in real time as leads come in.</p>
        </div>
        {lastUpdate && (
          <span className="text-xs text-gray-400 bg-white border border-gray-200 px-3 py-1.5 rounded-full">
            Last updated: {lastUpdate}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {providers.map(p => {
          const pct = Math.round((p.leadsThisMonth / p.monthlyQuota) * 100);
          const isFull = p.remainingQuota === 0;

          return (
            <div key={p._id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 text-sm">{p.name}</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  isFull
                    ? 'bg-red-100 text-red-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {isFull ? 'Quota full' : `${p.remainingQuota} left`}
                </span>
              </div>

              {/* Quota bar */}
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                  <span>Leads this month</span>
                  <span>{p.leadsThisMonth} / {p.monthlyQuota}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-500 ${isFull ? 'bg-red-400' : 'bg-blue-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Lead list */}
              <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto max-h-52">
                {p.leads.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No leads assigned yet</p>
                ) : (
                  p.leads.map(l => (
                    <div key={l._id} className="bg-gray-50 rounded-lg p-2.5">
                      <p className="text-xs font-medium text-gray-800">{l.customerName}</p>
                      <p className="text-xs text-gray-500">{l.service} · {l.city}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(l.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}