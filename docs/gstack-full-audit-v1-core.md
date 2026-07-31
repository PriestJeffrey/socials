# Pulseboard - Full gstack multi-role audit (v1-core)

**Date:** 2026-07-31  
**Branch:** `v1-core` (working tree includes UI + security fix pass - largely uncommitted)  
**Reference:** `docs/gstack-phase-addon.md`, prior `docs/gstack-full-retro-phases-0-10.md` cadence  
**Health phase:** `8`  
**Platforms (registry):** Instagram · Facebook · LinkedIn · X (copy-only)  
**Tests:** 77/77 (Vitest)  
**Scope freeze:** Wave B paused (`docs/scope-freeze-v1-core.md`)

## Overall verdict

V1 core is **built, fixture-honest, and test-green**. Prior `/cso` mediums are **closed**. Product is **not** Human-shipped: **S2–S6 unsigned**. Live Meta Graph publish remains deferred. Do **not** `/ship` to production until Human signs S2–S6 and hosting/TLS is ready.

**Security Review (this pass):** [Security Review](318634c1-6f92-4db9-bf08-07b6014461ea) - no new medium+ findings.  
**Bugbot (this pass):** [Bugbot](fadb2dbf-7d60-428d-ac25-51471e580f57) - 2 medium UX/ops bugs (theme desync; compose `DATABASE_URL` encoding).

---

## Inventory (what we built)

| Area | Status |
|---|---|
| Auth (Argon2id, hashed sessions, AES-GCM) | Done |
| IG / FB / LI OAuth + fixtures + sync → Overview | Done |
| X compose / copy (no API) | Done |
| Create / calendar / jobs / repurpose | Done |
| AI gateway, competitors, draft assist, Overview why | Done |
| Approvals FSM, sentiment, account delete | Done |
| Analytics hub + per-platform | Done |
| Docker, CI (lint/unit/SAST/SCA/gitleaks), runbook | Done |
| UI redesign + light/dark + Integrevise-structured landing | Done (local / Docker) |
| Security mediums (flash cookie, Postgres loopback, Gemini header) | Done |
| Live Graph publish | Deferred |
| Human S2–S6 | **Awaiting** |

---

## Role reports

### 1. Product Owner / Business Analyst (`/office-hours`, `/spec`)

| Good | Bad / open |
|---|---|
| Locked V1 promise: broken / working / next post | S2–S6 still draft - no Human ship |
| Scope freeze documented; Wave B not auto-expanding | Large uncommitted UI/security diff vs `origin/v1-core` |
| Demo path clear for UAT | Marketing Threads/TikTok glyphs can imply product platforms |
| Ship pack exists (`docs/v1-core-ship.md`) | Live publish still residual - must not overclaim in sales |

**PO decision needed:** Commit/push fix+UI pass → Human UAT S2→S6 → only then discuss prod.

---

### 2. Architect (`/plan-eng-review`)

| Good | Bad / open |
|---|---|
| Adapter registry clean (4 platforms) | Job `claim` still findMany→updateMany (race under concurrent cron) |
| Snapshot-only Overview; publish fixture-gated | `RATE_LIMIT_BACKEND` env is a no-op (always memory) |
| Health phase typed to `8`; public health liveness-only | Theme script + CSP `unsafe-inline` coupling |
| Flash suggest pattern is sound (encrypt + userId bind) | Compose `DATABASE_URL` interpolation breaks special-char passwords |

**Arch residual:** Redis rate-limit + locking job claim before multi-instance.

---

### 3. Design / UI (`/plan-design-review`, `/design-consultation`)

| Good | Bad / open |
|---|---|
| Integrevise-style landing structure shipped | First-viewport denser than original Phase 0 “hero budget” |
| Integrevise palette + Cormorant/Host Grotesk applied | Theme toggle can desync icon vs `data-theme` until hydration |
| App shell + secondary pages on `pb-*` system | Brand dock still lists Threads/TikTok (marketing only) |
| Light/dark toggle on landing, auth, app | Uncommitted - not yet the durable SoT on GitHub |

**Design residual:** Fix theme hydration; optionally drop Wave B glyphs from brand dock until platforms return.

---

### 4. Code review (`/review` / Bugbot)

| Severity | Location | Finding |
|---|---|---|
| Medium | `components/theme/theme-provider.tsx` | State init `light` while script may set `dark` → wrong icon / double-toggle |
| Medium | `docker-compose.yml` | `DATABASE_URL` embeds raw `POSTGRES_PASSWORD` - reserved chars break Prisma URI |

No critical functional regressions called out in auth/publish paths by Bugbot.

---

### 5. AppSec (`/cso` / Security Review)

| Severity | Status | Notes |
|---|---|---|
| Prior medium: draft `body=` URL | **Fixed** | Encrypted `pb_draft_suggest` flash |
| Prior medium: Postgres `0.0.0.0:5432` | **Fixed** | `127.0.0.1:5432` |
| Prior medium: Gemini `?key=` | **Fixed** | `x-goog-api-key` header |
| New medium+ in fix/UI diff | **None** | Security Review clean |
| CSP `unsafe-inline` / `unsafe-eval` | Accepted residual | Needed by theme bootstrap today |
| In-memory rate limit | Accepted residual | Multi-instance bypass |
| App published `3000:3000` | Accepted local residual | Optional loopback bind later |
| Demo seed user | Local only | Never seed prod |

**AppSec verdict:** Safe for **local Human UAT**; not a production go-live certificate.

---

### 6. Backend

| Good | Bad / open |
|---|---|
| Draft FSM; fixture publish gate; X refuse | No live Meta/LI Graph publish |
| Cron fail-closed + timing-safe secret | Concurrent job claim race |
| AI gateway + redact + fixtures | Rate limiter memory-only |
| Tenancy on drafts/connections/jobs | - |

---

### 7. Frontend / UI·UX

| Good | Bad / open |
|---|---|
| Fixture banners on Create / Approvals / X | Theme flash/desync |
| Analytics surfaces real (not stub) | Landing H1 is value prop (Integrevise pattern) vs older brand-as-H1 SoT |
| Settings honesty for X | Social dock “coming soon” Wave B icons |

---

### 8. QA (`/qa`)

| Good | Bad / open |
|---|---|
| 77 automated tests covering auth, platforms, AI, approvals | No browser E2E suite |
| Public health does not leak secrets (unit) | No automated theme toggle / landing regression tests |
| CI unit job uses fixtures + Postgres | CI `push` branches omit `v1-core` (PRs still run) |

**QA Human pack:** Follow `docs/v1-core-ship.md` S2–S6 checklists; include “Suggest draft → no `body=` in URL”.

---

### 9. DevOps

| Good | Bad / open |
|---|---|
| Docker compose; strong secrets required | App port still all-interfaces |
| CI: lint, unit, SAST(eslint), SCA, gitleaks | No CD; Sentry stub |
| Postgres loopback hardened | `DATABASE_URL` password encoding bug for strong passwords |
| Smoke script exists | Push CI does not list `v1-core` |

---

### 10. Domain expert (honesty)

| Good | Bad / open |
|---|---|
| X never auto-publishes | Threads/TikTok marketing glyphs |
| Fixture/local publish labeled | Aspirational hero copy still broad |
| Overview snapshot-only | Must keep “Publish” language fixture-qualified in UAT |

---

### 11. Ship (`/ship`)

| Gate | Status |
|---|---|
| S0 / S1 | Historically signed (fixtures) |
| S2–S6 | **Not signed** - `/ship` **blocked** |
| Security mediums | Closed for V1 local |
| Live Graph | Deferred - must stay residual in ship notes |
| Hosting / TLS / Sentry | Open |

**Ship rule:** Do not run `/ship` until Human replies `S2 signed` … `S6 signed`.

---

## Priority backlog (engineering)

1. ~~Fix theme provider hydration desync (Bugbot).~~ **Fixed**  
2. ~~Fix compose `DATABASE_URL` encoding / use separate env without URI interpolation.~~ **Fixed**  
3. Add `v1-core` to CI push branches (or always rely on PRs).  
4. Commit + push UI/security pass when Human asks.  
5. Human UAT S2–S6.  
6. Post-V1: Redis rate-limit, locking job claim, CSP nonces, live Graph, Sentry SDK.

---

## Human next actions

1. Open the audit canvas beside chat (if available) or this doc.  
2. UAT per `docs/v1-core-ship.md`.  
3. Reply `S2 signed` … `S6 signed` when ready.  
4. Ask to **commit/push** the working tree when you want GitHub to match Docker.
