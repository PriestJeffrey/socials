# Pulseboard - Scalability Addendum (Locked)

**Principle:** $0 V1 stays simple; nothing ships that paints into a single-instance corner. Scale via **seams + invariants**, not Redis/K8s on day one.

**Sources:** Architect · Backend · DevOps scalability plans (merged).

---

## Phase 0 seams (ship interfaces, memory/DB impls)

| Seam | Phase 0 impl | Later swap |
|---|---|---|
| `RateLimiter` | Memory (Map) | Redis |
| `CacheStore` | Memory + TTL | Redis / KV |
| `JobQueue` / `JobRunner` | DB / no-op stub | Queue (BullMQ/Inngest/Cloud Tasks) |
| `Clock` | SystemClock | Test clock |
| Prisma client | `globalThis` singleton | Same + pooler URL |
| Platform registry | Empty map + interface | Real adapters |

Env (commented in `.env.example`): `RATE_LIMIT_BACKEND`, `CACHE_BACKEND`, `JOB_BACKEND`, `DATABASE_POOL_URL`, `DIRECT_URL`, `CRON_SECRET`, `REDIS_URL`, `MAX_SYNC_CONCURRENCY`.

---

## Invariants (non-negotiable)

1. Stateless app - DB sessions; no process-local truth for sessions/quotas/jobs
2. Every query scoped by `session.userId` (never trust body `userId`)
3. Overview / Analytics read **MetricSnapshot + Post only** - never live platform APIs on page load
4. Sync/publish via jobs - HTTP enqueues; workers call `PlatformAdapter`
5. New platforms = new adapter modules + registry entry - core never rewritten
6. Cursor pagination for lists (no large OFFSET); hard cap page size
7. AI gateway: per-user limits; no unbounded fan-out (Phase 6)
8. Cache keys always include `userId`

### Read vs write

```
WRITE: Job → Adapter.fetch → normalize → upsert Post → MetricSnapshot → cache invalidate
READ:  Overview → Prisma(snapshots) + formulas → NEVER Adapter.fetch*
```

---

## Schema / index foresight

**Phase 0:** User (unique email), Session (userId, expiresAt), AuditLog (userId+createdAt).

**Later (design now):** SocialConnection unique(userId, platform, externalAccountId); Post unique(connectionId, platformPostId) + userId indexes; MetricSnapshot by userId/capturedAt; Job (status, runAfter) + idempotencyKey unique.

Denormalize `userId` on tenant rows for cheap scoped queries.

---

## Upgrade ladder (post-S6, metrics-gated)

1. Fix queries/indexes  
2. Vertical DB  
3. Connection pool / Prisma `connection_limit`  
4. Serverless concurrency caps  
5. Dedicated workers / cron  
6. Redis (rate limit + cache)  
7. External queue  
8. Read replicas  

**Order rule:** never jump to Redis/replicas to paper over N+1 or missing indexes.

---

## Anti-patterns (forbid in review)

- Platform API calls inside Overview RSC
- `findMany` / `findUnique` without userId scope on tenant rows
- Sequential public IDs; global Maps as source of truth
- Sync-all-users loops; unbounded `Promise.all` for AI/sync
- Direct Graph API fetch outside adapters
- Caching without `userId` in key
- Per-request `new PrismaClient()`
- SHA/Base64-as-encryption for tokens

---

## Residual risks (Human accepts)

Postgres as first bottleneck · Meta/LinkedIn rate limits · free Gemini tier · in-memory rate limits weak on multi-instance · snapshot retention TBD · single-region V1 · no org/workspace tenancy until product needs it

## Explicit non-goals (Phase 0–8)

No Kubernetes · no multi-region · no Redis required before measured pain · no microservices split
