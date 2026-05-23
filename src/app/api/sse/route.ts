import { addSSEClient, removeSSEClient } from '@/lib/sse';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const id = randomUUID();
  const encoder = new TextEncoder();

  let intervalHandle: ReturnType<typeof setInterval>;

  const stream = new ReadableStream({
    start(controller) {
      addSSEClient(id, controller);

      // Confirm connection to client
      controller.enqueue(encoder.encode(`event: ping\ndata: connected\n\n`));

      // Keep-alive ping every 15s — prevents Vercel from closing idle streams
      intervalHandle = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`:keepalive\n\n`));
        } catch {
          clearInterval(intervalHandle);
          removeSSEClient(id);
        }
      }, 15000);
    },
    cancel() {
      clearInterval(intervalHandle);
      removeSSEClient(id);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disables Nginx buffering (important for some hosts)
    },
  });
}