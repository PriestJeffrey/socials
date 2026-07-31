# Pulseboard - Phase 4 Restatement (Locked)

**Status:** Phase 4 **in progress** - four surfaces honest.  
**Success bar:** IG / FB / LinkedIn live-or-fixture analytics; **X** is compose + copy only with clear “not auto-publish” labeling.  
**Depends on Human:** Messaging UAT (no X API keys).

## Build

- `xAdapter` stub: `oauth: false`, `publish: false`, `manualCopy: true`
- `/x` compose surface + clipboard copy (no OAuth, no tokens)
- Settings: X section explains manual-only (no Connect button)
- Nav link to X
- Health phase 4 + X subsystem (`ok` / manual)

## Security

- No fake X OAuth secrets or env keys
- UI cannot call publish/API paths for X
- Adapter methods throw if invoked

## Tests

- Capability flags on `xAdapter`
- Adapter beginOAuth / publish reject
- listAdapters includes all four platforms

## Explicit non-goals

- Paid X API
- Auto-publish to X
- Create/calendar publish (Phase 5)
