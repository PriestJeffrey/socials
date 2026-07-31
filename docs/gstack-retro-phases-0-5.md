# GSTACK Review Report - Phases 0–5 (retro)

**Skill:** `/review` (retro across built phases)  
**Date:** 2026-07-30  
**Remediation:** landed 2026-07-30 (see below)

---

## Remediation status (post-fix)

| Finding | Status |
|---|---|
| #1 Fake live publish | **Fixed** - refuses when fixtures off |
| #2 Middleware `/x` | **Fixed** |
| #3 Adapter `userId` | **Fixed** on disconnect/refresh/fetch |
| Calendar global job drain | **Fixed** - scoped to user; `/api/cron` for global |
| META fixtures → LI | **Fixed** - LI only via `LINKEDIN_USE_FIXTURES` |
| Non-atomic draft publish | **Fixed** - claim `publishing` then finalize |
| No cron | **Fixed** - `POST/GET /api/cron` + `CRON_SECRET` |
| S2/S3 sign-off | **Human** - still awaiting UAT/sign (not auto-signed) |

---

## Executive verdict

| Area | Verdict |
|---|---|
| Auth / tenancy / crypto foundations | **Accurate** (S0/S1 solid) |
| Platform adapters + Overview snapshots | **Accurate** for fixture path |
| X honesty | **Accurate** |
| Live Meta/LinkedIn publish | **Honest refusal** until Graph APIs wired |
| Phase sign-offs | **S0 + S1 only**; S2/S3 unsigned |
| gstack process | Catch-up `/review` done; cadence restored going forward |

---

## Per-phase

### Phase 0 → S0 - **SIGNED** - Accurate
Residual: push S0 signed exit onto `origin/phase-0` if still unsigned there.

### Phase 1 → S1 - **SIGNED (fixtures)** - Accurate
Real Meta live deferred.

### Phase 2–4 - **UNSIGNED** - Accurate (fixtures / X honesty)
Needs Human UAT/sign for S2 (P2+P3).

### Phase 5 → toward S3 - **UNSIGNED** - Fixture path accurate
Live publish no longer mislabeled; Human UAT still required for S3.

---

## Accurate (keep)

- Argon2id + hashed sessions + login session revoke
- OAuth state HMAC CSRF; OAuth start rate limits; error redact
- AES-256-GCM tokens; Overview never hits Graph
- Snapshot / draft publish tenancy tests
- Disconnect clears posts/snapshots + overview cache
- X rejects OAuth/publish; Settings has no X Connect
- Fixture IG/FB/LI path for local UAT
- Rule-based repurpose (no LLM)

---

## Still Human / residual

1. Sign or explicitly defer **S2** (P2+P3) and **S3** (P5)
2. Sync signed S0 doc to `origin/phase-0` if needed
3. Wire real Graph/LinkedIn publish APIs when Meta/LI access available
4. Set `CRON_SECRET` and schedule `/api/cron` before production deploy
5. Set `LINKEDIN_USE_FIXTURES=true` explicitly for local LI (no longer inherits Meta)

---

## GSTACK REVIEW REPORT

- **Skill:** `/review` (retro Phases 0–5) + remediation
- **Critical/High code findings:** addressed in tree
- **Ship:** Do **not** `/ship` to production until S2/S3 signed or deferred and cron configured
