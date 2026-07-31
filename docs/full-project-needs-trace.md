# Pulseboard - Full Project Needs Trace (Locked)

Derived from graphify traversal of locked docs + Complete SDLC.  
**Use this as the master “what we need” checklist across V1 (S0→S6) and Wave B (S7).**

---

## 1. North star

**Product:** Pulseboard - *Know what's broken, what's working, and what to post next.*  
**Within 30 seconds on Overview** (after core phases): see broken / working / what to post next - act without leaving the app.

| Bar | Meaning | Phase |
|---|---|---|
| S0 | Landing + password auth + tenancy shell | 0 |
| S1 | Instagram live → real Overview signal | 1 |
| S2 | IG + FB + LinkedIn platform-specific analytics | 2–3 |
| S3 | Create / calendar / publish (X = copy) | 5 |
| S4 | AI “why” + competitor hooks + drafting | 6 |
| S5 | Approvals, sentiment, hard account deletion | 7 |
| S6 | Production + security CI + runbook | 8 |
| S7 | Extensible adapters (Threads, TikTok, …) | 9+ |

**Hard priority:** S1 before S3.

---

## 2. Who does what (always needed)

### Human (you) - never automated away

| Need | When |
|---|---|
| Say **run Phase N** / sign phase exit | Every phase |
| Priority, cut/keep, residual security risk | Every phase |
| Create empty **GitHub repo** + branch choice (A: `phase-N`→main / B: main) | Before Phase 0 push |
| Local **Postgres** (Docker OK) | Phase 0 |
| **Meta developer app** + IG (then FB) credentials | Phase 1–2 |
| LinkedIn app / scopes confirm | Phase 3 |
| Taste UAT (brand, 3D mixture, messaging) | Phase 0, 4, 7 |
| Real account UAT (IG/FB/LI live posts) | Phases 1–5 |
| Hosting account (Vercel), domain/DNS, managed Postgres | Phase 8 |
| Paid API spend approval (X, Gemini upgrade, Redis, …) | When triggered |
| Domain expert: “is this recommendation honest?” | Ongoing |
| Legal: Terms / Privacy / cookies | Before public multi-user |

### AI agents (spin by phase)

| Phase | Parallel agents |
|---|---|
| 0 | Architect · UI/UX · Frontend · Backend · QA · AppSec · DevOps |
| 1 | Backend(Adapters) · Frontend · QA · AppSec |
| 2 | Backend · Frontend · QA |
| 3 | Backend · Frontend · QA · AppSec |
| 4 | Frontend · QA |
| 5–7 | Backend · Frontend · QA · AppSec |
| 8 | DevOps · AppSec · QA · Backend |
| 9+ | Backend · Frontend · QA · AppSec |

---

## 3. Stack (build with this - locked)

| Layer | Need |
|---|---|
| App | Next.js App Router + React + TypeScript |
| UI | shadcn/ui + Magic UI micro + selective Aceternity-style CSS 3D |
| Fonts | Fraunces + Plus Jakarta Sans |
| Palette | ink / chalk / pulse teal (see `ui-direction-phase-0.md`) |
| API | Route Handlers / server actions |
| DB | PostgreSQL + Prisma |
| Auth | Email + password (**Argon2id** preferred) + DB sessions |
| Crypto | **AES-256-GCM** for secrets at rest; never SHA-as-encryption |
| Jobs | DB jobs / cron → queue later via `JobQueue` seam |
| AI | Provider interface → Gemini first (Phase 6) |
| Host | Vercel + managed Postgres (Phase 8) |
| CI | GitHub Actions: lint, test, secret scan; SAST/SCA deepen Phase 8 |
| Monitor | Structured logs Phase 0+; Health UI Phase 1+; Sentry Phase 8 |

### Scalability seams (Phase 0 - interfaces now)

`RateLimiter` · `CacheStore` · `JobQueue`/`JobRunner` · `Clock` · Prisma singleton · Platform registry  
**Invariant:** Overview reads `MetricSnapshot` only - never live platform APIs on page load.

```
WRITE: JobQueue → PlatformAdapter → Post + MetricSnapshot → cache invalidate
READ:  Overview → snapshots (+ CacheStore) + formulas
```

---

## 4. Secrets & env (provision when phase needs them)

| Variable | Phase | Purpose |
|---|---|---|
| `DATABASE_URL` | 0 | Postgres |
| `DATABASE_POOL_URL` / `DIRECT_URL` | 8 (comment Phase 0) | Serverless pooler vs migrate |
| `SESSION_SECRET` | 0 | Session / future signing |
| `TOKEN_ENCRYPTION_KEY` | 0 (helper); used Phase 1+ | AES-256-GCM 32-byte key |
| `APP_URL` | 0 | Canonical URL |
| `COOKIE_SECURE` | 0 local false / 8 true | Cookie flag |
| Meta App ID/Secret + OAuth redirect | 1–2 | Instagram / Facebook |
| LinkedIn client credentials | 3 | LinkedIn OAuth |
| `GEMINI_API_KEY` | 6 | AI gateway |
| `CRON_SECRET` | 5+/8 | Protect job drain |
| `SENTRY_DSN` | 8 | Error monitoring |
| `REDIS_URL` + `*_BACKEND=redis` | Post-S6 trigger | Shared rate limit/cache |
| X paid API | **V2 / Human only** | Not V1 |

**Never commit** `.env` - only `.env.example`.

---

## 5. Data model (entities we need)

| Entity | First needed | Purpose |
|---|---|---|
| User | 0 | Email + password hash |
| Session | 0 | Server session |
| AuditLog | 0 | Auth/security trail |
| SocialConnection | 1 | Platform link + AES tokens |
| Post | 1 | Local + remote ids |
| MetricSnapshot | 1 | Trends (source of truth for Overview) |
| Job | 1 | Sync / publish / refresh |
| CompetitorPaste · HookPattern | 6 | Manual competitor → library |
| ApprovalEvent | 7 | Workflow audit |
| ConversionLog | 5 | Manual attribution |
| (Future indexes) | as tables land | See scalability-addendum |

---

## 6. Routes / product surfaces

| Route | Phase live |
|---|---|
| `/` Landing or → Overview | 0 |
| `/signup` `/login` | 0 |
| `/overview` | 0 empty → 1+ signals |
| `/analytics/[platform]` | 1+ |
| `/create` `/calendar` | 5 |
| `/competitors` | 6 |
| `/approvals` | 7 |
| `/settings` (+ Health) | 0 stub → 1+ real |

**Nav:** Overview | Analytics ▾ | Create | Calendar | Competitors | Approvals | Settings

---

## 7. Phase-by-phase needs (build spine)

### Phase 0 → S0 - Foundation
**Need:** Node LTS, Postgres, GitHub repo, branch choice, Argon2id confirm.  
**Build:** Landing+3D, auth, tenancy, AES helper, adapter stub, seams, CI, Health stub, logger.  
**Agents:** full swarm. **Human UAT:** brand / 3D / auth / reduced-motion.

### Phase 1 → S1 - Instagram
**Need:** Meta developer app, IG Business/Creator account, OAuth redirect URLs.  
**Build:** IG adapter, posts/metrics, snapshots, cache, Overview win+issue, Health sync status.  
**Security:** AES tokens, OAuth state CSRF, scoped OAuth.

### Phase 2 - Facebook (toward S2)
**Need:** FB Page connection under same Meta stack.  
**Build:** FB adapter, metric hierarchy, Overview IG+FB, hardened Meta client.

### Phase 3 → S2 - LinkedIn + formulas
**Need:** LinkedIn app; **confirm scopes** at build time.  
**Build:** LI adapter + UI language; fatigue + shadowban formulas.

### Phase 4 - X honest
**Need:** None (no paid API).  
**Build:** Compose + copy-to-clipboard; capability flags; no fake OAuth.

### Phase 5 → S3 - Create / calendar / publish
**Need:** Live IG/FB/LI for UAT posts.  
**Build:** Composer, schedule/publish, calendar, goals, conversions, repurpose.  
**Security:** publish authz, audit, idempotent publish.

### Phase 6 → S4 - AI + competitors
**Need:** `GEMINI_API_KEY` (free tier first).  
**Build:** AI gateway, paste→hook library, drafting, plain-language why.  
**Security:** L9 redaction; no tokens to LLM; rate limits.

### Phase 7 → S5 - Approvals / sentiment / deletion
**Need:** Human UX + delete dry-run.  
**Build:** draft→review→approved→published; sentiment; Overview depth moment; hard-delete cascade.

### Phase 8 → S6 - Deploy
**Need:** Vercel + managed Postgres + DNS; enable CI gates.  
**Build:** prod migrate, TLS, SAST/SCA/secret scan, Sentry, runbook, smoke.  
**Human:** signs 30-second north star + go-live.

### Phase 9+ → S7 - Threads / TikTok / …
**Need:** Human names platform → AI research cost/API → Human go/no-go → adapter pack.

---

## 8. Security spine (every phase)

- Frameworks: MITRE ATT&CK + NIST SSDF + OWASP ASVS L2 mindset + SAMM + SLSA-inspired  
- Phase 0 ATT&CK seed: TA0043, TA0001, TA0004, TA0006, TA0007 (+ TA0002 partial)  
- Every exit: tactics touched → controls shipped → **residual risk for Human**  
- Forbidden: SHA-as-encryption, secrets in logs/LLM/client, IDOR, eval on user/AI text  

---

## 9. Testing spine

| Type | When |
|---|---|
| Unit | Every phase with logic (crypto/auth/formulas/AI mocks) |
| Integration | Auth, DB, adapters, publish, AI |
| Security | Tenancy, AES ciphertext, OAuth state, AI redaction, publish authz |
| System/smoke | Phase 8+ and each Wave B adapter |
| UAT | Human every phase exit |

**DoD:** checklist green + security evidence + ATT&CK residual + Human sign-off → `phase-N:` commit + **push GitHub**.

---

## 10. Scale upgrade triggers (post-S6 - not Phase 0 spend)

Indexes → vertical DB → connection pool → concurrency caps → workers → **Redis** → external queue → read replicas  

Leave $0 path only when measured pain (connections, job lag, multi-instance rate-limit bypass).

---

## 11. Explicit V1 outs (do not build)

True ad A/B · auto competitor crawl · paid X API · ad-pixel attribution · Meta App Review for other users · LinkedIn Marketing partnership · Pricing/FAQ pages · full export · MFA · K8s/multi-region · SOC2 · native mobile

---

## 12. Still open (Human decisions)

- [ ] **run Phase 0**
- [ ] GitHub repo URL + branch A/B
- [ ] Argon2id vs bcrypt confirm
- [ ] Exact hosting vendor + domain (by Phase 8)
- [ ] Legal docs before public multi-user
- [ ] Snapshot retention window (before heavy history)
- [ ] MFA / passkeys (post-S6 backlog)

---

## 13. Graph hubs (why this map holds together)

God nodes from `graphify-out`: **Phase 0**, **Pulseboard**, **Locked Prompts**, **Phase 0 Restatement**, **PlatformAdapter**, **MITRE ATT&CK**, **Scalability Seams Principle**.

Critical path:
`JobQueue → PlatformAdapter → MetricSnapshot → Overview`  
guarded by **Read vs Write Path** and agent/security communities.
