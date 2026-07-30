# Pulseboard — Phase 14 Restatement (Locked)

**Status:** Phase 14 **in progress** → toward **S7**.  
**Platform:** Bluesky (AT Protocol)  
**gstack:** Research → restatement → build → `/review` before Human sign.

## Research summary (go)

| Item | Notes |
|---|---|
| Auth | ATProto OAuth (DPoP) preferred; app passwords deprecated |
| V1 path | **Fixtures** for UAT; live OAuth DPoP **deferred** (honest refuse) |
| Read | `app.bsky.feed.getAuthorFeed` (+ like/repost counts on posts) |
| Publish | `com.atproto.repo.createRecord` deferred — `publish: false` |
| Cost | Free public AppView; PDS rate limits apply |

## Build

- `bluesky` PlatformAdapter + config + fixtures + sync
- Fixture OAuth start/callback
- Live beginOAuth / exchange refuse with clear “DPoP deferred” message
- Live `getAuthorFeed` client ready when accessJwt exists
- Settings / Overview / Analytics / Health phase **14**
- Create drafts + fixture local Post only

## Security

- Encrypted tokens · OAuth state · tenancy
- L9 redact `BLUESKY_*` secrets if present

## Tests

- Fixture connect → sync → Overview + Analytics
- Disconnect clears
- Adapter registered; live OAuth throws honestly
