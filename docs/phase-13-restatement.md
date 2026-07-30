# Pulseboard — Phase 13 Restatement (Locked)

**Status:** Phase 13 **in progress** → toward **S7**.  
**Platform:** Pinterest (API v5)  
**gstack:** Research → restatement → build → `/review` before Human sign.

## Research summary (go)

| Item | Notes |
|---|---|
| Auth | Pinterest OAuth 2.0 (`pinterest.com/oauth/`) |
| Scopes (V1 read) | `boards:read`, `pins:read` |
| Read path | `GET /v5/user_account` + `GET /v5/pins?pin_metrics=true` |
| Publish | `pins:write` / media upload deferred — adapter `publish: false` |
| Cost | Free developer app; trial/standard access gated |
| V1 path | `PINTEREST_USE_FIXTURES=true` |

## Build

- `pinterest` PlatformAdapter + config + fixtures + sync
- OAuth start/callback (+ fixtures)
- Settings / Overview / Analytics / Health phase **13**
- Create drafts allowed; fixture local Post publish only
- Honest: live pin create throws clear “not wired”

## Security

- Encrypted tokens · OAuth state · tenancy on disconnect/sync
- L9 redact includes `PINTEREST_APP_SECRET`

## Tests

- Fixture connect → sync → Overview + Analytics Pinterest
- Disconnect clears snapshots
- Adapter in `oauthPlatforms`
