# Pulseboard — Phase 3 exit (draft toward S2)

**Status:** Implementation complete — awaiting Human UAT (fixtures OK).  
**Date:** 2026-07-30  
**Note:** LinkedIn fixtures require `LINKEDIN_USE_FIXTURES=true` (no longer inherits Meta).

## Delivered

- LinkedIn adapter + OAuth/fixtures
- Fatigue + shadowban pure formulas
- Overview LI language + formula cards
- Health phase 3 + LinkedIn
- Tests: formulas unit + `phase3-linkedin`

## Human UAT

1. Set `LINKEDIN_USE_FIXTURES=true` → Connect LinkedIn → Overview shows LI / fatigue / heuristic cards
2. Health LinkedIn ok
3. Disconnect LI → LI gone; FB/IG remain if connected
4. Reply to sign **S2** when IG+FB+LI path feels good
