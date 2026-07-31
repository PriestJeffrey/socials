# Pulseboard - Phase 2 Restatement (Locked)

**Status:** Phase 2 **in progress** (S1 signed 2026-07-30).  
**Success bar:** Toward S2 - Instagram + Facebook connections, platform-specific Overview signal, Health shows both.  
**Depends on Human:** Meta developer unlock (or fixtures). FB Page already linked for live later.

## Build

- Facebook `PlatformAdapter` (separate connection rows from Instagram)
- Meta OAuth → Page token · AES at rest · sync jobs → `Post` / `MetricSnapshot` with `platform: "facebook"`
- FB metric hierarchy fixtures: impressions, engaged users, fans delta, organic share
- Overview reads IG + FB snapshots (labeled cards); still no live Graph on page load
- Settings: Connect / Disconnect / Sync Facebook
- Health phase 2 + Facebook subsystem
- Fixture mode reuses `META_USE_FIXTURES`

## Security

- Separate `SocialConnection` per platform; tenancy on every action
- OAuth state CSRF; rate-limit OAuth start
- Disconnect clears that platform’s posts/snapshots + overview cache
- Tokens never in redirects/logs

## Tests

- Fixture FB connect → Overview includes Facebook cards
- Tenancy: user B cannot see user A FB snapshots
- Disconnect FB empties FB signal (IG signal untouched if present)

## Explicit non-goals

- LinkedIn (Phase 3)
- Publish / schedule
- Real Redis
