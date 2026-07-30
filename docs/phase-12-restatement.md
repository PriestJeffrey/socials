# Pulseboard — Phase 12 Restatement (Locked)

**Status:** Phase 12 **in progress** → toward **S7**.  
**Platform:** YouTube (Data API v3)  
**gstack:** Research → restatement → build → `/review` before Human sign.

## Research summary (go)

| Item | Notes |
|---|---|
| Auth | Google OAuth 2.0 (`accounts.google.com`) |
| Scope (V1 read) | `https://www.googleapis.com/auth/youtube.readonly` |
| Read path | `channels.list(mine)` → uploads playlist → `playlistItems` → `videos.list(statistics)` |
| Publish | Upload / `youtube.upload` deferred — adapter `publish: false` |
| Cost | Free quota (units); fixtures for local UAT |
| V1 path | `YOUTUBE_USE_FIXTURES=true` |

## Build

- `youtube` PlatformAdapter + config + fixtures + sync
- OAuth start/callback (+ fixtures)
- Settings / Overview / Analytics / Health phase **12**
- Create drafts allowed; fixture local Post publish only
- Honest: live upload throws clear “not wired”

## Security

- Encrypted tokens · OAuth state · tenancy on disconnect/sync
- L9 redact includes `YOUTUBE_CLIENT_SECRET`

## Tests

- Fixture connect → sync → Overview + Analytics YouTube
- Disconnect clears snapshots
- Adapter in `oauthPlatforms`
