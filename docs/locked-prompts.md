# Pulseboard - Locked Prompts & Operating Rules

Single place for AI/agent operating prompts derived from the Complete SDLC and recent Human locks (scalability, multi-agent roles).

---

## Master AI builder rules

1. Read `docs/Pulseboard-Complete-SDLC.md` and companion locked docs in `docs/`.
2. Work **one phase at a time**.
3. Before coding: restate **Build / Security / Tests / Human inputs**.
4. After coding: run that phase’s tests; present checklist + ATT&CK residual risk.
5. **Stop** at phase boundary. Wait for Human approval.
6. Never mark a phase done without green acceptance criteria.
7. New networks = new **PlatformAdapter** modules - do not rewrite core.
8. Scalability: use seams (`RateLimiter`, `CacheStore`, `JobQueue`, `Clock`); Overview never live-fetches platforms; always `userId`-scope queries.
9. Crypto: AES-256-GCM for secrets at rest; Argon2id/bcrypt for passwords; never SHA-as-encryption.
10. Do not build until Human says **run Phase N**.
11. **Scope freeze (2026-07-30):** V1 core only until Human ends the freeze. See `docs/scope-freeze-v1-core.md`. Do **not** add Wave B platforms on “continue building.” Parked adapters stay; expansion needs Human name + go.

---

## Decision rights

| Decision | Owner |
|---|---|
| Priority, cut/keep, phase passed | Human |
| Stack details inside approved design, implementation, tests | AI |
| Security strength if cost/time tradeoff | Human (AI recommends) |
| New platform start order | Human |
| **Wave B expansion resume** | **Human only** (name platform + go) |
| Paid API spend | Human only |
| Scale upgrades (Redis, queue, replicas) | Human on measured triggers |

---

## Phase 0 role prompts (summary)

### Architect
Propose HLD/LLD, adapter contract, tenancy, scalability seams, file skeleton. No app code until run Phase 0.

### UI/UX
Landing brand + selective 3D; auth secondary depth; flat Overview shell; locked palette/fonts; Human taste UAT.

### Frontend
App Router routes/layouts; shadcn/Magic/Aceternity split; auth forms → server actions; never put secrets in client; `data-testid` hooks for QA.

### Backend
Prisma User/Session/AuditLog; Argon2id; DB sessions; AES helper; rate-limit via interface; PlatformAdapter stub; logger; Health stub; Prisma singleton.

### AppSec
Threat-model seed; ATT&CK map; L1–L11 ship/defer; crypto enforcement; security tests; residual-risk template; CI secret-scan; forbid SHA-as-encryption / IDOR / secret logging.

### QA
Unit/integration/security/UAT matrix; Vitest + Playwright; evidence pack; Human UAT script; hard exit gate.

### DevOps
Local Node/Postgres bootstrap; `.env.example`; GHA lint/unit/secret-scan; branch strategy; no prod deploy Phase 0; scale ladder documented; `phase-0:` commit after approval.

---

## Forbidden patterns (all agents)

- Building before Human **run Phase N**
- Fake live API for unpaid/blocked networks
- Secrets in git, logs, LLM prompts, or client bundles
- Overview hitting Meta/LinkedIn/X on page load
- Hardcoding Map rate limits inside handlers (use `RateLimiter`)
- Purple-on-white / cream-terracotta cliché / all-3D dashboard

---

## Companion locked docs

- `docs/Pulseboard-Complete-SDLC.md` - single source of truth (full spec)
- `docs/phase-0-restatement.md` - Build/Security/Tests/Human inputs
- `docs/scalability-addendum.md` - seams, invariants, upgrade ladder
- `docs/agent-roster.md` - roles + multi-agent phase map
- `docs/ui-direction-phase-0.md` - visual tokens and composition
- `docs/full-project-needs-trace.md` - master needs checklist across all phases
