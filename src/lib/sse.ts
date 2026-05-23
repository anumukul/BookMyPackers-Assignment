type SSEController = ReadableStreamDefaultController;

// Global registry — persists across Next.js hot reloads in dev
const clients: Map<string, SSEController> =
  (global as any).__sseClients ?? new Map();
(global as any).__sseClients = clients;

export function addSSEClient(id: string, ctrl: SSEController) {
  clients.set(id, ctrl);
}

export function removeSSEClient(id: string) {
  clients.delete(id);
}

export function broadcastSSE(event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const encoded = new TextEncoder().encode(payload);
  for (const [id, ctrl] of clients) {
    try {
      ctrl.enqueue(encoded);
    } catch {
      // Client disconnected — clean up
      clients.delete(id);
    }
  }
}