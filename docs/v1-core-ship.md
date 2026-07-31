# Pulseboard - V1 Core Close & Ship Pack

**Branch:** `v1-core` (tracks `origin/v1-core`)  
**Date:** 2026-07-31  
**Scope:** Instagram · Facebook · LinkedIn · X only (Wave B frozen)  
**AI DoD:** Engineering close-out done — tests green (**80/80**) on `v1-core`.  
**Human DoD:** Fixture UAT + reply with each bar signed → then **S6** = V1 core complete.  
**gstack:** `/qa` pass recorded below — does **not** sign S2–S6 (Human only).  
**Handoff:** [docs/v1-core-ready-for-uat.md](v1-core-ready-for-uat.md) (one screen) · freeze [docs/scope-freeze-v1-core.md](scope-freeze-v1-core.md)

Demo login: `demo@pulseboard.local` / `pulseboard-demo` → http://localhost:3000/login

Local stack: fixtures on (`META_USE_FIXTURES`, `LINKEDIN_USE_FIXTURES`, `GEMINI_USE_FIXTURES`). Rebuild app after pulling `v1-core`:

```bash
docker compose up -d --build --force-recreate app
```

Health must show **phase 8** and platforms **IG / FB / LI / X only** (no Threads/TikTok/…).  
Public `GET /api/health` returns liveness only (`ok`, `phase`, `status`). Full platform rows are on `/settings/health` (auth).

---

## Pre-UAT AI checklist (engineering readiness)

All items checked by AI before Human starts S2–S6. **Does not** equal Human bar sign-off.

- [x] On branch `v1-core` (synced with `origin/v1-core` at tip)
- [x] `npm test` → **80/80** passed (24 files)
- [x] App reachable at http://localhost:3000
- [x] `npm run smoke -- http://localhost:3000` → passed (`/`, `/login`, `/signup`, `/api/health`, `/overview` → 307)
- [x] `GET /api/health` → `{"ok":true,"phase":8,"status":"ok"}`
- [x] Platform registry = IG · FB · LI · X only (unit: `listAdapters()` ids)
- [x] Health report subsystems = auth · database · instagram · facebook · linkedin · x · ai · runtime (no Wave B)
- [x] Scope freeze documented; Wave B not in active app path
- [x] Demo seed credentials documented for fixture UAT
- [x] Residuals listed (accepted for V1; track later)

---

## Sign order (reply with the phrase)

| # | Bar | Reply when green | Status |
|---|---|---|---|
| 1 | **S2** - IG + FB + LinkedIn analytics | `S2 signed` | **UNSIGNED** |
| 2 | **S3** - Create / calendar / publish + X copy | `S3 signed` | **UNSIGNED** |
| 3 | **S4** - AI why + competitors + draft assist | `S4 signed` | **UNSIGNED** |
| 4 | **S5** - Approvals + sentiment + account delete | `S5 signed` | **UNSIGNED** |
| 5 | **S6** - Prod smoke + runbook comfort | `S6 signed` | **UNSIGNED** |

S0 + S1 already signed historically (fixtures).

---

## S2 - Platform analytics (Phases 2–3)

1. Settings → Connect **Instagram** (fixtures) → Overview shows IG cards  
2. Connect **Facebook** → FB cards; disconnect FB → FB gone, IG remains  
3. Connect **LinkedIn** → LI / fatigue / heuristic signal  
4. `/settings/health` - IG/FB/LI ok or fixture mode; phase **8**; only core platforms (no Threads/TikTok/…)  
5. Optional: `/analytics/instagram` (and fb/li) loads snapshot metrics  

---

## S3 - Create / publish / X (Phases 4–5)

1. Open **X** → “not auto-publish”; type → Copy works; Settings has no X Connect  
2. Connect IG → **Create** → Publish now (fixtures) → Calendar / Overview has post  
3. Schedule a future draft → stays scheduled until due / cron  
4. With Meta fixtures **off**, live publish fails with a clear message (no fake Graph)  
5. Repurpose toward X → `/x` handoff  

---

## S4 - AI (Phase 6)

1. **Competitors** → paste caption → hook appears in library  
2. **Create** → Suggest draft → body fills in the editor (no auto-publish). **URL must NOT contain the draft body or a `body=` query param** (body stays in form state / POST, not the address bar)  
3. Overview with data → plain-language **Why:** line  
4. Health → AI ok (fixtures)  

---

## S5 - Approvals / deletion (Phase 7)

1. Create draft → **Approvals** → Submit → Approve → Publish approved  
2. Run **sentiment** on a draft  
3. Settings delete: wrong confirm phrase → error; do **not** delete demo unless intentional  

---

## S6 - Production bar (Phase 8)

1. `docker compose up --build` (or host) → login works  
2. `npm run smoke -- http://localhost:3000` (or your host)  
3. Health phase **8** + runtime row (`/settings/health`)  
4. For real HTTPS: `COOKIE_SECURE=true`, strong secrets, cron `Authorization: Bearer $CRON_SECRET`  
5. Runbook: [docs/runbook.md](runbook.md)  

**Residual (accepted for V1 sign, track later):** live Meta Graph publish (needs your apps); full Sentry SDK; CSP/`unsafe-inline` tighten; Redis rate-limit (job claim hardened with Postgres `SKIP LOCKED`, not Redis).

---

## After all bars signed

V1 core is **closed**. Next only if you ask:

- Live Meta/LinkedIn wiring with real credentials  
- Hosting vendor / DNS / TLS  
- Wave B expansion (name platform + go)  

---

## AI evidence (this pack) — gstack `/qa` 2026-07-31

| Check | Result |
|---|---|
| Branch | `v1-core` ↔ `origin/v1-core` (tip pushed; local WIP docs/CI may exist uncommitted) |
| Platforms in registry | `instagram`, `facebook`, `linkedin`, `x` only |
| `npm test` | **80/80** passed (24 files), 2026-07-31 |
| Docker rebuild on `v1-core` | Done previously — OAuth routes IG/FB/LI only |
| `GET /api/health` | `{"ok":true,"phase":8,"status":"ok"}` (public liveness; no subsystems leak) |
| Authenticated health | subsystems: auth, database, instagram, facebook, linkedin, x, ai, runtime |
| `npm run smoke` | Passed vs http://localhost:3000 (`/`, `/login`, `/signup`, `/api/health` 200; `/overview` 307) |
| Wave B in active app | Removed / frozen |
| Scope freeze | `docs/scope-freeze-v1-core.md` |
| S2–S6 Human signs | **UNSIGNED** (Human only) |
