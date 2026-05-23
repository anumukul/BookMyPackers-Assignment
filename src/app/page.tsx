import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-[80vh] gap-4 text-center px-6">
      <h1 className="text-3xl font-semibold text-gray-900">Prowider</h1>
      <p className="text-gray-500 max-w-md">
        Lead distribution platform. Submit a service enquiry or view the provider dashboard.
      </p>
      <div className="flex gap-3 mt-2">
        <Link href="/request-service"
          className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          Request a service
        </Link>
        <Link href="/dashboard"
          className="bg-white border border-gray-200 text-gray-700 px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
          View dashboard
        </Link>
      </div>
    </main>
  );
}