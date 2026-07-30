# Pulseboard — Phase 15 exit (draft toward S7)

**Status:** Implementation complete — awaiting Human UAT.  
**Date:** 2026-07-30  
**Platform:** Reddit

## Delivered

- Reddit adapter + OAuth (fixtures + live client path)
- Submitted posts → posts/snapshots (comments, score, upvote_ratio, engagement)
- Settings / Overview / Analytics / Health phase **15**
- Create drafts + competitors + repurpose (~300 title-style); live submit deferred
- Tests: `phase15-reddit`

## Human UAT

1. `REDDIT_USE_FIXTURES=true` → Settings → Connect Reddit → Overview + `/analytics/reddit`  
2. Disconnect clears Reddit signal  
3. Reply when ready to sign Phase 15 / continue Wave B
