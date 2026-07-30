# Pulseboard — Phase 15 Restatement (Locked)

**Status:** Phase 15 **in progress** → toward **S7**.  
**Platform:** Reddit  
**gstack:** Research → restatement → build → `/review` before Human sign.

## Research summary (go)

| Item | Notes |
|---|---|
| Auth | OAuth 2.0 (`reddit.com/api/v1/authorize`) |
| Scopes (V1 read) | `identity`, `read`, `history` |
| Read path | `/api/v1/me` + `/user/{name}/submitted` |
| Publish | `submit` scope deferred — `publish: false` |
| Cost | Free; requires User-Agent; app credentials |
| V1 path | `REDDIT_USE_FIXTURES=true` |

## Build

- `reddit` PlatformAdapter + config + fixtures + sync
- OAuth start/callback (+ live client)
- Settings / Overview / Analytics / Health phase **15**
- Create drafts + fixture local Post only
- Honest: live submit throws clear “not wired”

## Security

- Encrypted tokens · OAuth state · tenancy
- L9 redact `REDDIT_CLIENT_SECRET`

## Tests

- Fixture connect → sync → Overview + Analytics
- Disconnect clears
- Adapter in oauthPlatforms
