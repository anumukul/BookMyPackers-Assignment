'use client';
import { useState } from 'react';

type Status = 'idle' | 'loading' | 'success' | 'error';

const INITIAL_FORM = {
  customerName: '',
  phone: '',
  city: '',
  service: 'Service 1',
  description: '',
};

export default function RequestServicePage() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed.');
      setStatus('success');
      setMessage('Your enquiry has been submitted successfully. Providers have been notified.');
      setForm(INITIAL_FORM);
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message);
    }
  };

const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400";

  return (
    <main className="flex items-center justify-center min-h-[calc(100vh-53px)] p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 w-full max-w-lg">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Request a service</h1>
        <p className="text-gray-500 text-sm mb-6">
          We'll connect you with the right providers automatically.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
            <input className={inputClass} value={form.customerName}
              onChange={set('customerName')} required placeholder="Your name" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone number</label>
            <input className={inputClass} value={form.phone}
              onChange={set('phone')} required placeholder="e.g. 9999999999" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input className={inputClass} value={form.city}
              onChange={set('city')} required placeholder="Your city" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service type</label>
            <select className={inputClass} value={form.service} onChange={set('service')}>
              <option>Service 1</option>
              <option>Service 2</option>
              <option>Service 3</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className={`${inputClass} h-24 resize-none`} value={form.description}
              onChange={set('description')} required placeholder="Describe what you need..." />
          </div>

          {message && (
            <div className={`text-sm px-4 py-3 rounded-lg ${
              status === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message}
            </div>
          )}

          <button type="submit" disabled={status === 'loading'}
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium
              hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
            {status === 'loading' ? 'Submitting...' : 'Submit enquiry'}
          </button>
        </form>
      </div>
    </main>
  );
}