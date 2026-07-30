# Pulseboard — Phase 18 Restatement (Locked)

**Status:** Phase 18 **in progress** → toward **S7**.  
**Platform:** Twitch (Helix API, free self-serve)  
**Branch tip:** from phase-17 Tumblr `9448524` → `phase-18`  
**gstack:** Research → restatement → build → `/review` before Human sign.

## Research summary (go)

| Item | Notes |
|---|---|
| Auth | OAuth2 authorization code: authorize `https://id.twitch.tv/oauth2/authorize`; token `https://id.twitch.tv/oauth2/token` |
| Scope (V1 read) | `user:read:email` — user token for identity; videos readable with that user token |
| Headers | Every Helix call requires `Client-Id` + `Authorization: Bearer <token>` |
| Read path | `GET https://api.twitch.tv/helix/users` → `GET …/helix/videos?user_id=` |
| Publish | Live create / broadcast / stream management deferred — adapter `publish: false` |
| Cost | Free self-serve Twitch developer app registration |
| V1 path | **Fixtures** for UAT (`TWITCH_USE_FIXTURES=true`); live when client id/secret set |

## Build

- `twitch` PlatformAdapter + config + fixtures + sync
- Fixture OAuth start/callback
- Live authorize / token / Helix users+videos client when configured
- Settings / Overview / Analytics / Health phase **18**
- Create drafts + fixture local Post only
- Overview reads **snapshots only**; honest: live broadcast/create throws clear “not wired”

## Security

- Encrypted tokens · OAuth state · tenancy on disconnect/sync
- L9 redact `TWITCH_*` secrets (`TWITCH_CLIENT_SECRET`, tokens)

## Tests

- Fixture connect → sync → Overview + Analytics Twitch
- Disconnect clears Twitch snapshots/signal
- Adapter registered; live publish/broadcast refused honestly

## Human inputs

- Go/no-go: **go** — Twitch Helix, fixtures-first, read-only V1 (no live broadcast)
- Fixture UAT per `docs/phase-18-exit.md`
- Sign or defer Phase 18 exit (does not auto-sign S7)
- Continue Wave B after sign
