# Pulseboard — Phase 18 exit (draft toward S7)

**Status:** Draft UAT checklist — awaiting implementation + Human UAT.  
**Date:** 2026-07-30  
**Platform:** Twitch

## Expected deliverables

- Twitch adapter + OAuth (fixtures + live Helix client path)
- `GET /helix/users` + `GET /helix/videos?user_id=` → posts/snapshots (views, videos_7d, engagement)
- Settings / Overview / Analytics / Health phase **18**
- Create drafts + competitors + repurpose; live create/broadcast deferred
- Tests: `phase18-twitch`

## Human UAT

1. `TWITCH_USE_FIXTURES=true` → Settings → Connect Twitch → Overview + `/analytics/twitch`  
2. Disconnect clears Twitch signal  
3. Confirm live publish/broadcast remains refused (honest “not wired”)  
4. Reply when ready to sign Phase 18 / continue Wave B
