# Pulseboard — Phase 20 exit (draft toward S7)

**Status:** Draft UAT checklist — awaiting implementation + Human UAT.  
**Date:** 2026-07-30  
**Platform:** Slack

## Expected deliverables

- Slack adapter + OAuth (fixtures + live OAuth v2 client path)
- Live: `auth.test` + `users.conversations` → membership-count MetricSnapshots; fixtures: message/reaction/reply posts + engagement snapshots
- Settings / Overview / Analytics / Health phase **20**
- Create drafts + competitors + repurpose; live `chat.postMessage` deferred (`publish: false`)
- Tests: `phase20-slack`
- Eng plan: `docs/gstack-plan-eng-phase20.md`

## Human UAT

1. `SLACK_USE_FIXTURES=true` → Settings → Connect Slack → Overview shows Slack signal + `/analytics/slack` loads fixture metrics  
2. Disconnect clears Slack snapshots/signal from Overview / analytics  
3. Confirm live publish (`chat.postMessage`) remains refused (honest “not wired”)  
4. Reply when ready to sign Phase 20 / continue Wave B
