# Pulseboard - Phase 3 Restatement (Locked)

**Status:** Phase 3 **in progress** (toward **S2**). Phase 2 pushed; formal S2 after IG+FB+LI UAT.  
**Success bar:** S2 - IG + FB + LinkedIn platform-specific analytics + fatigue/shadowban formulas.  
**Depends on Human:** LinkedIn app (or fixtures). Confirm OAuth scopes at live connect time.

## Build

- LinkedIn `PlatformAdapter` (separate connections; fixture OAuth)
- Sync → `Post` / `MetricSnapshot` with `platform: "linkedin"`
- LinkedIn-specific Overview language (dwell/comment quality / first-hour velocity)
- Pure formulas: content fatigue + shadowban heuristic (no LLM)
- Settings Connect/Disconnect/Sync LinkedIn
- Health phase 3 + LinkedIn subsystem
- Env: `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` / `LINKEDIN_REDIRECT_URI` / `LINKEDIN_USE_FIXTURES`

## Security

- Token isolation per connection; tenancy on actions
- OAuth state CSRF + rate-limit start
- Disconnect clears LI posts/snapshots only
- Minimal field allowlist on LI payloads stored in `raw`

## Tests

- Formula unit tests (fatigue, shadowban)
- Fixture LI connect → Overview LI cards
- Disconnect LI does not wipe IG/FB

## Explicit non-goals

- X (Phase 4)
- Publish / schedule (Phase 5)
- LinkedIn Marketing partnership / advanced ads APIs
