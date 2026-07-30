# Pulseboard — Phase 21 exit (draft toward S7)

**Status:** Implementation + gstack `/review` complete — awaiting **Human UAT** + sign (does not auto-sign S7).  
**Date:** 2026-07-30  
**Platform:** Vimeo  
**Review:** `docs/gstack-review-phase21.md` — verdict **ship-with-nits**

## Expected deliverables

- Vimeo adapter + OAuth (fixtures + live OAuth2 client path) — **done**
- Live: `GET /me` + `GET /me/videos` → video posts + plays/views MetricSnapshots; fixtures: views/engagement snapshots for UAT — **done**
- Settings / Overview / Analytics / Health phase **21** — **done**
- Create drafts + competitors + repurpose; live upload/edit deferred (`publish: false`) — **done**
- Tests: `phase21-vimeo` — **done**
- Eng plan: `docs/gstack-plan-eng-phase21.md` · CSO: `docs/gstack-cso-phase21.md` · Review: `docs/gstack-review-phase21.md`

## Human UAT

1. `VIMEO_USE_FIXTURES=true` → Settings → Connect Vimeo → Overview shows Vimeo signal + `/analytics/vimeo` loads fixture metrics  
2. Disconnect clears Vimeo snapshots/signal from Overview / analytics  
3. Confirm live publish/upload remains refused (honest “not wired”)  
4. Reply when ready to sign Phase 21 / continue Wave B

**Demo login (local):** `demo@pulseboard.local` / `pulseboard-demo` at http://localhost:3000/login (`npm run db:seed` if needed).
