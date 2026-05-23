# Prowider — Mini Lead Distribution System

## Live Demo
https://book-my-packers-assignment.vercel.app/

## Tech Stack
- Next.js 14 (App Router)
- MongoDB Atlas + Mongoose
- Server-Sent Events (real-time)
- TypeScript + Tailwind CSS

## Setup Instructions

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free M0 tier works — it's a replica set, required for transactions)

### Local Development

```bash
git clone https://github.com/anumukul/BookMyPackers-Assignment
cd BookMyPackers-Assignment
npm install
```

Create `.env.local`:
```
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/prowider?retryWrites=true&w=majority
SEED_SECRET=prowider-seed-secret-2025
```

```bash
npm run dev
# Open http://localhost:3000
# Go to /test-tools and click "Seed providers" once
```

> Note: MongoDB transactions require a replica set. Use Atlas even for local dev,
> or start a local replica set with `mongosh` before running.

## Allocation Algorithm

Each lead must be assigned to exactly 3 providers. The algorithm runs in two steps inside a single MongoDB transaction:

**Step 1 — Mandatory assignment**
Each service has providers that must always be included (if within quota):
- Service 1 → Provider 1 always assigned
- Service 2 → Provider 5 always assigned
- Service 3 → Provider 1 + Provider 4 always assigned

**Step 2 — Fair pool round-robin**
Remaining slots are filled from a service-specific pool using a persistent
round-robin pointer stored in the `allocationState` collection. The pointer
advances only when a provider is actually assigned (not when skipped due to
quota exhaustion), ensuring true fairness over time. The pointer survives
server restarts and Vercel cold starts.

## Concurrency Handling

Every lead creation runs inside a `mongoose.startSession()` +
`session.withTransaction()` block. The allocation pointer update and the
provider quota increment (`$inc: { leadsThisMonth: 1 }`) both happen inside
the same transaction. MongoDB's optimistic concurrency retries conflicting
transactions automatically. This means two simultaneous requests cannot
corrupt the pointer or over-assign a provider past their quota.

As a second safety net, the `leads` collection has a compound unique index
`{ phone: 1, service: 1 }` at the database level — so even if two identical
requests arrive simultaneously, only one can succeed.

## Webhook Idempotency

Every webhook call must include an `idempotencyKey` string. Before processing:
1. The system checks `webhookEvents` collection for the key.
2. If found → returns a cached success response immediately (no re-processing).
3. If not found → writes the key first, then resets quotas.

Writing the key before processing (not after) is intentional: if the server
crashes mid-reset, a retry will re-run — but a completed webhook can never
double-process, because the key is already recorded. A MongoDB unique index on
`idempotencyKey` handles the race condition where two concurrent requests
arrive with the same key simultaneously.

## Pages

| Route | Description |
|-------|-------------|
| `/request-service` | Customer enquiry form |
| `/dashboard` | Real-time provider dashboard (SSE) |
| `/test-tools` | Internal: seed DB, trigger webhooks, generate bulk leads |