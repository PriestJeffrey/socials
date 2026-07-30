# GSTACK Full Retro — Phases 0–10

**Date:** 2026-07-30  
**Tip:** `phase-10` @ `c6531dc`  
**Tests:** 75/75 (22 files)  
**Cadence:** Multi-role `/review` across BA/PO, Architect, Backend, FE/UI, AppSec, QA, DevOps, Domain honesty  
**Canvas:** `gstack-full-retro-phases-0-10.canvas.tsx`

## Verdict

Fixture-first Pulseboard through Phase 10 is **built and test-green**. It is **not** ready to claim live Graph publish or production go-live. **Only S0 and S1 (fixtures path) are Human-signed.** S2–S7 and phase exits 2–10 remain draft / awaiting UAT.

Prior P0–5 code remediations remain landed (`d1de141`).

---

## Inventory (what we built)

| Phase | Bar | Delivered | Sign-off |
|---|---|---|---|
| 0 | S0 | Landing, Argon2id auth, sessions, AES, tenancy, CI, Health | **Signed** |
| 1 | S1 | IG OAuth/fixtures, encrypted connections, sync → Overview | **Signed (fixtures)** |
| 2 | →S2 | Facebook adapter, Overview IG+FB | Draft |
| 3 | S2 | LinkedIn + fatigue/shadowban formulas | Draft |
| 4 | — | Honest X compose/copy (no fake OAuth) | Draft |
| 5 | S3 | Drafts, `/create`, `/calendar`, schedule/publish jobs, repurpose | Draft |
| 6 | S4 | AI gateway, competitors, draft assist, Overview “why” | Draft |
| 7 | S5 | Approvals FSM, sentiment, account hard-delete | Draft |
| 8 | S6 | Docker, L7 CI, L10 headers, runbook, smoke | Draft |
| 9 | →S7 | Threads adapter (fixtures-first) | Draft |
| 10 | →S7 | TikTok Login Kit + Display sync; Content Posting deferred | Draft |

**Stub page remaining:** `/analytics` only.

**Platforms:** IG/FB/LI/Threads/TikTok = OAuth + fixtures (+ coded live sync clients); live publish **refused or deferred**. X = `manualCopy` only.

---

## Role reports

### Product Owner / Business Analyst

| Good | Bad |
|---|---|
| Phase restatement/exit trail; X honesty; S1 fixture caveat explicit | S2–S7 unsigned; Create copy overclaims live publish; Analytics stub still in nav |

### Architect

| Good | Bad |
|---|---|
| Adapter registry; Overview snapshot-only; jobs + `userId` tenancy; health `phase: 10` | `refresh_token` / `recompute_overview` unsupported; claim not `FOR UPDATE`; Health UI copy stale |

### Backend

| Good | Bad |
|---|---|
| Draft FSM; publish claim; fail-closed cron; AI gateway; formulas; refuse live Graph when fixtures off | No live Meta/LI/Threads/TikTok publish; memory rate limiter; incomplete job types |

### Frontend / UI·UX

| Good | Bad |
|---|---|
| Brand-first landing; Settings fixture hints; honest X; Approvals UI | No fixture banner on Create/Approvals; Create intro lags Threads/TikTok; Health blurb IG-era |

### AppSec

| Good | Bad |
|---|---|
| Argon2id; hashed sessions; AES-GCM; HMAC OAuth state; tenancy; cascade delete; L9 path | Anonymous `/api/health` config; CSP `unsafe-inline`/`unsafe-eval`; L9 missing Threads/TikTok secret names; cron `===`; rate-limit backend no-op |

### QA

| Good | Bad |
|---|---|
| 75 tests; phase1–10 integration; cross-user samples; CI Postgres | No E2E; no live OAuth suite; shallow smoke; tenancy matrix incomplete |

### DevOps

| Good | Bad |
|---|---|
| Docker/compose; CI lint/unit/SAST/SCA/gitleaks; runbook + smoke | Sentry stub; SAST=eslint; no CD; compose fixture flag gaps; Human host/TLS open |

### Domain Expert (honesty)

| Good | Bad |
|---|---|
| X never auto-publishes; Overview never Graph-on-request; `fixture: true` tagging; TikTok posting deferred in docs | UI can still sound like real “publish to Instagram” |

---

## Must-fix (code) vs Human residual

### Code — landed 2026-07-30 (post Docker stack + gstack)

1. ~~Fixture/local-only banner on Create + Approvals~~  
2. ~~Extend L9 redact patterns for Threads/TikTok secrets~~  
3. ~~Lock down or strip anonymous `/api/health` config~~  
4. ~~Timing-safe `CRON_SECRET` compare~~  
5. ~~Refresh Health page copy + Create platform list~~  
6. ~~Implement or remove unused job types~~ (removed until handlers exist)  
7. Docker compose: `THREADS_USE_FIXTURES` / `TIKTOK_USE_FIXTURES`  
8. Sync `let` typing + `public/` for Docker image build  

### Human / residual

1. UAT + sign (or defer) S2–S7  
2. Developer access for live Meta / LinkedIn / TikTok  
3. Wire real Graph / Content Posting when access exists  
4. Prod: `CRON_SECRET`, cron schedule, TLS/host  
5. Shared rate-limit backend before multi-instance  
6. Real Sentry + CD for go-live  
7. CSP `unsafe-inline` / `unsafe-eval` tighten (deferred)  

---

## Demo

`demo@pulseboard.local` / `pulseboard-demo` → http://localhost:3000/login  
(`npm run db:seed` if needed)
