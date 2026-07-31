# Pulseboard — V1 Core Close & Ship Pack

**Branch:** `v1-core`  
**Date:** 2026-07-31  
**Scope:** Instagram · Facebook · LinkedIn · X only (Wave B frozen)  
**AI DoD:** Implementation + tests green (**77/77**) on `v1-core`.  
**Human DoD:** Fixture UAT + reply with each bar signed → then **S6** = V1 core complete.

Demo login: `demo@pulseboard.local` / `pulseboard-demo` → http://localhost:3000/login

Local stack: fixtures on (`META_USE_FIXTURES`, `LINKEDIN_USE_FIXTURES`, `GEMINI_USE_FIXTURES`). Rebuild app after pulling `v1-core`:

```bash
docker compose up -d --build --force-recreate app
```

Health must show **phase 8** and platforms **IG / FB / LI / X only** (no Threads/TikTok/…).

---

## Sign order (reply with the phrase)

| # | Bar | Reply when green |
|---|---|---|
| 1 | **S2** — IG + FB + LinkedIn analytics | `S2 signed` |
| 2 | **S3** — Create / calendar / publish + X copy | `S3 signed` |
| 3 | **S4** — AI why + competitors + draft assist | `S4 signed` |
| 4 | **S5** — Approvals + sentiment + account delete | `S5 signed` |
| 5 | **S6** — Prod smoke + runbook comfort | `S6 signed` |

S0 + S1 already signed historically (fixtures).

---

## S2 — Platform analytics (Phases 2–3)

1. Settings → Connect **Instagram** (fixtures) → Overview shows IG cards  
2. Connect **Facebook** → FB cards; disconnect FB → FB gone, IG remains  
3. Connect **LinkedIn** → LI / fatigue / heuristic signal  
4. `/settings/health` — IG/FB/LI ok or fixture mode; phase **8**  
5. Optional: `/analytics/instagram` (and fb/li) loads snapshot metrics  

---

## S3 — Create / publish / X (Phases 4–5)

1. Open **X** → “not auto-publish”; type → Copy works; Settings has no X Connect  
2. Connect IG → **Create** → Publish now (fixtures) → Calendar / Overview has post  
3. Schedule a future draft → stays scheduled until due / cron  
4. With Meta fixtures **off**, live publish fails with a clear message (no fake Graph)  
5. Repurpose toward X → `/x` handoff  

---

## S4 — AI (Phase 6)

1. **Competitors** → paste caption → hook appears in library  
2. **Create** → Suggest draft → body fills (no auto-publish)  
3. Overview with data → plain-language **Why:** line  
4. Health → AI ok (fixtures)  

---

## S5 — Approvals / deletion (Phase 7)

1. Create draft → **Approvals** → Submit → Approve → Publish approved  
2. Run **sentiment** on a draft  
3. Settings delete: wrong confirm phrase → error; do **not** delete demo unless intentional  

---

## S6 — Production bar (Phase 8)

1. `docker compose up --build` (or host) → login works  
2. `npm run smoke -- http://localhost:3000` (or your host)  
3. Health phase **8** + runtime row  
4. For real HTTPS: `COOKIE_SECURE=true`, strong secrets, cron `Authorization: Bearer $CRON_SECRET`  
5. Runbook: [docs/runbook.md](runbook.md)  

**Residual (accepted for V1 sign, track later):** live Meta Graph publish (needs your apps); full Sentry SDK; CSP/`unsafe-inline` tighten; Redis rate-limit.

---

## After all bars signed

V1 core is **closed**. Next only if you ask:

- Live Meta/LinkedIn wiring with real credentials  
- Hosting vendor / DNS / TLS  
- Wave B expansion (name platform + go)  

---

## AI evidence (this pack)

| Check | Result |
|---|---|
| Branch | `v1-core` pushed |
| Platforms in registry | IG, FB, LI, X |
| `npm test` | 77/77 |
| Docker rebuild on `v1-core` | Done — OAuth routes IG/FB/LI only |
| `/api/health` | `phase: 8`, `ok` |
| `npm run smoke` | Passed against http://localhost:3000 |
| Wave B in active app | Removed |
| Scope freeze | `docs/scope-freeze-v1-core.md` |
