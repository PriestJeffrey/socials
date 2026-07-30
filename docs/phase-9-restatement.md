# Pulseboard — Phase 9 Restatement (Locked)

**Status:** Phase 9 **in progress** → toward **S7** (extensible adapters).  
**Platform:** Threads (Meta Threads API · `graph.threads.net`)  
**gstack:** Research → restatement → build → `/review` before Human sign.

## Research summary (go)

| Item | Notes |
|---|---|
| Auth | OAuth via `threads.net/oauth/authorize`; tokens on `graph.threads.net` |
| Scopes | `threads_basic`, `threads_manage_insights`, `threads_content_publish` |
| Insights | `/{user-id}/threads_insights` |
| Publish | Container + publish (live deferred; fixtures local Post) |
| Cost | Own-account / App Review for others — same Meta bias as IG/FB |
| V1 path | `THREADS_USE_FIXTURES=true` for local UAT without Meta Threads app |

## Build

- `threads` PlatformAdapter + config + fixtures + sync
- OAuth start/callback (+ fixtures)
- Settings Connect/Sync/Disconnect
- Overview Threads cards from snapshots
- Health phase 9 + Threads subsystem
- Create/publish/repurpose include Threads (fixture publish only)
- Job runner `sync` platform threads

## Security

- Encrypted tokens · OAuth state · tenancy on disconnect/sync
- Live publish refused until Graph publish wired (same honesty as IG/FB)

## Tests

- Fixture connect → sync → Overview non-empty Threads signal
- Disconnect clears Threads snapshots
- Adapter registered; oauthPlatforms includes Threads
