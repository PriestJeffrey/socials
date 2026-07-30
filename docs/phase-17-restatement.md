# Pulseboard — Phase 17 Restatement (Locked)

**Status:** Phase 17 **in progress** → toward **S7**.  
**Platform:** Tumblr (OAuth2 + v2 API)  
**gstack:** Research → restatement → build → `/review` before Human sign.

## Research summary (go)

| Item | Notes |
|---|---|
| Auth | OAuth2 (`basic` + `offline_access`); `write` deferred |
| V1 path | **Fixtures** for UAT; live when consumer key/secret set |
| Read | `GET /v2/user/info` + `GET /v2/blog/{id}/posts` |
| Publish | NPF create post deferred — `publish: false` |
| Cost | Free self-serve app registration |

## Build

- `tumblr` PlatformAdapter + config + fixtures + sync
- Fixture OAuth start/callback
- Live authorize / token / posts client when configured
- Settings / Overview / Analytics / Health phase **17**
- Create drafts + fixture local Post only

## Security

- Encrypted tokens · OAuth state · tenancy
- L9 redact `TUMBLR_*` secrets

## Tests

- Fixture connect → sync → Overview + Analytics
- Disconnect clears
- Adapter registered; live publish refused honestly
