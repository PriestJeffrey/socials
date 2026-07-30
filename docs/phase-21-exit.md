# Pulseboard — Phase 21 exit (draft toward S7)

**Status:** Draft UAT checklist — awaiting implementation + Human UAT.  
**Date:** 2026-07-30  
**Platform:** Vimeo

## Expected deliverables

- Vimeo adapter + OAuth (fixtures + live OAuth2 client path)
- Live: `GET /me` + `GET /me/videos` → video posts + plays/views MetricSnapshots; fixtures: views/engagement snapshots for UAT
- Settings / Overview / Analytics / Health phase **21**
- Create drafts + competitors + repurpose; live upload/edit deferred (`publish: false`)
- Tests: `phase21-vimeo`
- Eng plan: `docs/gstack-plan-eng-phase21.md`

## Human UAT

1. `VIMEO_USE_FIXTURES=true` → Settings → Connect Vimeo → Overview shows Vimeo signal + `/analytics/vimeo` loads fixture metrics  
2. Disconnect clears Vimeo snapshots/signal from Overview / analytics  
3. Confirm live publish/upload remains refused (honest “not wired”)  
4. Reply when ready to sign Phase 21 / continue Wave B
