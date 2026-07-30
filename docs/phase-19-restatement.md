# Pulseboard — Phase 19 Restatement (Locked)

**Status:** Phase 19 **in progress** → toward **S7**.  
**Platform:** Discord (OAuth2)  
**gstack:** Research → restatement → build → `/review` before Human sign.

## Research summary (go)

| Item | Notes |
|---|---|
| Auth | OAuth2 `identify` + `guilds` |
| V1 path | **Fixtures** for UAT message/reaction metrics; live OAuth + `@me` / guilds |
| Read | `GET /users/@me`, `GET /users/@me/guilds`; channel history needs bot — **deferred** |
| Publish | Message create deferred — `publish: false` |
| Cost | Free Discord developer application |

## Build

- `discord` PlatformAdapter + config + fixtures + sync
- Fixture OAuth start/callback
- Live authorize / token / me+guilds when configured
- Settings / Overview / Analytics / Health phase **19**
- Create drafts + fixture local Post only

## Security

- Encrypted tokens · OAuth state · tenancy
- L9 redact `DISCORD_*` secrets
- Strong secret checks from harden pass

## Tests

- Fixture connect → sync → Overview + Analytics
- Disconnect clears
- Adapter registered; live publish refused honestly
