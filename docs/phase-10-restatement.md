# Pulseboard — Phase 10 Restatement (Locked)

**Status:** Phase 10 **in progress** → toward **S7**.  
**Platform:** TikTok (Login Kit + Display API)  
**gstack:** Research → restatement → build → `/review` before Human sign.

## Research summary (go)

| Item | Notes |
|---|---|
| Auth | Login Kit OAuth v2 (`tiktok.com/v2/auth/authorize/`) |
| Scopes (V1 read) | `user.info.basic`, `video.list` |
| Display | `POST /v2/video/list/` for recent videos |
| Publish | Content Posting API needs app audit + video upload — **deferred**; adapter `publish: false` |
| Cost | Free API; production audit-gated |
| V1 path | `TIKTOK_USE_FIXTURES=true` for local UAT |

## Build

- `tiktok` PlatformAdapter + config + fixtures + sync
- OAuth start/callback (+ fixtures)
- Settings / Overview / Health / jobs
- Create drafts allowed; fixture local Post publish only (no live video post)
- Honest: live publish throws clear “not wired / audit required”

## Security

- Encrypted tokens · OAuth state · tenancy on disconnect/sync

## Tests

- Fixture connect → sync → Overview TikTok cards
- Disconnect clears snapshots
- Adapter registered in oauthPlatforms
