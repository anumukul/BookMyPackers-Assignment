'use client';
import { useState } from 'react';

// Generate a unique key — no Node.js crypto needed client-side
function generateKey() {
  return `wh-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// Fixed key for idempotency testing — always the same across calls
const FIXED_IDEMPOTENCY_KEY = 'fixed-idempotency-key-prowider-001';

interface LogEntry {
  time: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function TestToolsPage() {
  const [log, setLog] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setLog(prev => [
      { time: new Date().toLocaleTimeString(), message, type },
      ...prev,
    ]);
  };

  // ── Seed DB ─────────────────────────────────────────────────────────────
  const seedDB = async () => {
    setLoading('seed');
    try {
      const res = await fetch('/api/seed', {
        method: 'POST',
        headers: { 'x-seed-secret': 'prowider-seed-secret-2025' },
      });
      const data = await res.json();
      addLog(data.message || data.error, res.ok ? 'success' : 'error');
    } catch {
      addLog('Seed request failed', 'error');
    } finally {
      setLoading(null);
    }
  };

  // ── Webhook: new key each time ───────────────────────────────────────────
  const triggerWebhookNew = async () => {
    setLoading('webhook-new');
    const key = generateKey();
    try {
      const res = await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idempotencyKey: key, action: 'reset-quota' }),
      });
      const data = await res.json();
      addLog(`Webhook (new key: ${key}) → ${JSON.stringify(data)}`, res.ok ? 'success' : 'error');
    } catch {
      addLog('Webhook request failed', 'error');
    } finally {
      setLoading(null);
    }
  };

  // ── Webhook: fixed key (idempotency test) ────────────────────────────────
  const triggerWebhookFixed = async () => {
    setLoading('webhook-fixed');
    try {
      const res = await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idempotencyKey: FIXED_IDEMPOTENCY_KEY, action: 'reset-quota' }),
      });
      const data = await res.json();
      const idempotent = data.idempotent ? ' [IDEMPOTENT — not re-processed]' : ' [processed]';
      addLog(`Webhook (fixed key)${idempotent} → ${JSON.stringify(data)}`, res.ok ? 'success' : 'error');
    } catch {
      addLog('Webhook request failed', 'error');
    } finally {
      setLoading(null);
    }
  };

  // ── Bulk lead generation ─────────────────────────────────────────────────
  const generateBulkLeads = async () => {
    setLoading('bulk');
    addLog('Generating 10 leads concurrently...', 'info');
    try {
      const res = await fetch('/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bulk-leads' }),
      });
      const data = await res.json();
      addLog(
        `Bulk leads: ${data.succeeded} succeeded, ${data.failed} failed`,
        data.failed === 0 ? 'success' : 'error'
      );
      if (data.errors?.length) {
        data.errors.forEach((e: string) => addLog(`  Error: ${e}`, 'error'));
      }
    } catch {
      addLog('Bulk lead generation failed', 'error');
    } finally {
      setLoading(null);
    }
  };

  const btnBase = "text-sm px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Test tools</h1>
        <p className="text-sm text-gray-500 mt-1">
          Internal testing panel — simulates payment webhooks, concurrency, and DB seeding.
        </p>
      </div>

      <div className="space-y-4">

        {/* Seed */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 text-sm mb-1">Seed database</h2>
          <p className="text-xs text-gray-500 mb-3">
            Creates 8 providers with quota 10. Run once after first deploy. Clears existing providers.
          </p>
          <button onClick={seedDB} disabled={!!loading}
            className={`${btnBase} bg-gray-900 text-white hover:bg-gray-700`}>
            {loading === 'seed' ? 'Seeding...' : 'Seed providers'}
          </button>
        </div>

        {/* Webhook */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 text-sm mb-1">Webhook — reset provider quotas</h2>
          <p className="text-xs text-gray-500 mb-3">
            Simulates a payment gateway confirming subscription renewal.
            Quotas can only reset through this webhook, not through the UI.
          </p>
          <div className="flex gap-2 flex-wrap">
            <button onClick={triggerWebhookNew} disabled={!!loading}
              className={`${btnBase} bg-blue-600 text-white hover:bg-blue-700`}>
              {loading === 'webhook-new' ? 'Sending...' : 'Send new webhook'}
            </button>
            <button onClick={triggerWebhookFixed} disabled={!!loading}
              className={`${btnBase} bg-blue-100 text-blue-800 hover:bg-blue-200`}>
              {loading === 'webhook-fixed' ? 'Sending...' : 'Send same key (idempotency test)'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Calling "same key" multiple times must not reset quota more than once.
          </p>
        </div>

        {/* Bulk leads */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 text-sm mb-1">Generate 10 leads concurrently</h2>
          <p className="text-xs text-gray-500 mb-3">
            Fires 10 simultaneous lead creations to stress-test allocation and concurrency handling.
            Watch the dashboard update in real time.
          </p>
          <button onClick={generateBulkLeads} disabled={!!loading}
            className={`${btnBase} bg-orange-600 text-white hover:bg-orange-700`}>
            {loading === 'bulk' ? 'Generating...' : 'Generate 10 leads'}
          </button>
        </div>

        {/* Event log */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 text-sm">Event log</h2>
            {log.length > 0 && (
              <button onClick={() => setLog([])}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                Clear
              </button>
            )}
          </div>
          <div className="space-y-1.5 max-h-72 overflow-y-auto font-mono">
            {log.length === 0 ? (
              <p className="text-xs text-gray-400">No events yet. Run a test above.</p>
            ) : (
              log.map((entry, i) => (
                <div key={i} className={`text-xs px-2 py-1 rounded ${
                  entry.type === 'success' ? 'bg-green-50 text-green-800' :
                  entry.type === 'error'   ? 'bg-red-50 text-red-800' :
                                             'bg-gray-50 text-gray-600'
                }`}>
                  <span className="text-gray-400">[{entry.time}]</span> {entry.message}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </main>
  );
}