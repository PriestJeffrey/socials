# Pulseboard — Phase 2 exit (draft)

**Status:** Implementation complete — awaiting Human UAT (fixtures OK).  
**Date:** 2026-07-30

## Delivered

- Facebook adapter + OAuth start/callback (+ fixtures)
- Separate `SocialConnection` / sync / disconnect from Instagram
- Overview IG+FB labeled cards from snapshots
- Health phase 2 + Facebook subsystem
- Tests: `tests/integration/phase2-facebook.test.ts`

## Human UAT

1. `META_USE_FIXTURES=true` → Settings → Connect Facebook → Overview has Facebook cards
2. Health shows Facebook ok
3. Disconnect Facebook → FB cards gone; IG cards remain if connected
