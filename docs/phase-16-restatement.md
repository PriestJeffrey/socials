# Pulseboard — Phase 16 Restatement (Locked)

**Status:** Phase 16 **in progress** → toward **S7**.  
**Platform:** Mastodon (ActivityPub / OAuth2)  
**gstack:** Research → restatement → build → `/review` before Human sign.

## Research summary (go)

| Item | Notes |
|---|---|
| Auth | OAuth2 on chosen instance (`MASTODON_INSTANCE_URL`) |
| V1 path | **Fixtures** for UAT; live OAuth when client id/secret set |
| Read | `GET /api/v1/accounts/verify_credentials` + `…/accounts/:id/statuses` |
| Publish | `POST /api/v1/statuses` deferred — `publish: false` |
| Cost | Free self-serve on public instances; rate limits apply |

## Build

- `mastodon` PlatformAdapter + config + fixtures + sync
- Fixture OAuth start/callback
- Live authorize / token / statuses client when configured
- Settings / Overview / Analytics / Health phase **16**
- Create drafts + fixture local Post only

## Security

- Encrypted tokens · OAuth state · tenancy
- L9 redact `MASTODON_*` secrets

## Tests

- Fixture connect → sync → Overview + Analytics
- Disconnect clears
- Adapter registered; live publish refused honestly
