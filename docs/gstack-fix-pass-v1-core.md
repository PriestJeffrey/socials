# gstack fix pass - v1-core backlog (2026-07-31)

**Mode:** Implementation + evidence (not report-only)  
**Reference:** `docs/gstack-phase-addon.md`, prior `/cso` findings in `docs/gstack-security-review-v1-core.md`

## Scope

Close the open UI + security mediums backlog on `v1-core` while keeping Wave B paused.

## gstack add-ons applied

| Concern | Pass |
|---|---|
| Security | Fixed prior `/cso` mediums (draft URL leak, Postgres bind, Gemini key-in-URL) |
| Design / UI | Unified secondary surfaces on teal light + dark tokens, 3D panels, theme toggle |
| Review | Follow with Security Review subagent on uncommitted changes after this pass |

## Fixes shipped in this pass

### Security

1. **Draft assist body leak** - `draftAssistAction` now uses `setDraftSuggestFlash` (encrypted cookie). Redirect is `/create?suggested=1&platform=…` only (no `body=` query).
2. **Postgres exposure** - `docker-compose.yml` binds `127.0.0.1:5432` only; password/user/db overridable via `POSTGRES_*` env.
3. **Gemini API key** - key sent via `x-goog-api-key` header; URL no longer contains `?key=`.

### UI

1. Secondary pages (Competitors, Approvals, Calendar, Analytics, X, Health) use `pb-panel` / `pb-btn` / `pb-input` / depth cards.
2. Brand social dock: IG/FB/TikTok brand colors; X/Threads use theme `mono` so they remain visible in dark mode.
3. Mojibake cleaned in user-facing strings (`competitors`, `repurpose`).

## Residual (accepted / Human)

- S2–S6 still need Human UAT + `signed` replies (`docs/v1-core-ship.md`).
- Live Meta publish, Redis rate-limit, CSP tighten remain post-V1.
- For non-local Docker: set a strong `POSTGRES_PASSWORD` in `.env` (defaults remain for local fixtures only).

## Human next

1. Hard refresh http://localhost:3000 - toggle light/dark; check social dock + secondary pages.
2. Smoke: Create → Suggest draft → body fills without `body=` in the address bar.
3. When ready: reply `S2 signed` … `S6 signed` per ship pack.
