# Pulseboard - Phase 1 Restatement (Locked)

**Status:** Phase 1 **complete** - **S1 signed** 2026-07-30 (fixtures; real Meta deferred).  
**Success bar:** S1 - Instagram connected, snapshots feed Overview, Health shows IG sync.  
**Depends on Human (deferred):** Meta developer app unlock + IG Business/Creator + redirect URI for live OAuth.

## Build

- Meta OAuth (Facebook Login → IG Graph) via `PlatformAdapter` Instagram
- Persist `SocialConnection` with AES-256-GCM token fields
- Enqueue `sync` jobs; runner persists `Post` + `MetricSnapshot`
- Overview reads snapshots only (no live Graph on page load)
- Settings: Connect / Disconnect Instagram + consent copy
- Health: Instagram connection + last sync status
- Fixture mode (`META_USE_FIXTURES=true`) for CI / local without Meta

## Security

- OAuth `state` CSRF (`SESSION_SECRET` HMAC)
- Tokens encrypted at rest; never logged or returned in API errors
- Connection rows scoped by `userId` on every read/write
- ATT&CK: Credential Access / Lateral Movement residual noted at S1 exit

## Tests

- OAuth state create/verify
- Encrypted token round-trip on connection shape
- Snapshot tenancy (user A cannot read user B)
- Fixture sync produces Overview non-empty

## gstack add-on

- Eng shape: this restatement (+ `/plan-eng-review` if architecture conflicts arise)
- Before S1 sign: `/review` (+ `/qa` for Settings connect path)

## Explicit non-goals (Phase 1)

- Facebook Page analytics UI (Phase 2)
- Publish / schedule
- Real Redis
