# Pulseboard — Phase 20 Restatement (Locked)

**Status:** Phase 20 **in progress** → toward **S7**.  
**Platform:** Slack (OAuth v2, free Slack app)  
**Branch tip:** from phase-19 Discord `f75eaf7` → `phase-20`  
**gstack:** Research → restatement → `/plan-eng-review` → build → `/review` before Human sign.

## Research summary (go)

| Item | Notes |
|---|---|
| Auth | OAuth v2 authorize `https://slack.com/oauth/v2/authorize` with **`user_scope`**; token exchange `https://slack.com/api/oauth.v2.access` (store `authed_user.access_token` / `xoxp-`) |
| V1 scopes (user) | `users:read` + `channels:read` — channel/message **history deferred** (rate limits + Marketplace policy) |
| Read (live) | `auth.test` (identity/team) + `users.conversations` — **channel membership count** as metrics proxy (same honesty class as Discord guilds) |
| Fixtures | Message / reaction / reply style snapshots for UAT (mirror Discord fixture posts → MetricSnapshot) |
| Publish | `chat.postMessage` deferred — adapter `publish: false` |
| Cost | Free Slack developer app |
| V1 path | **Fixtures** for UAT (`SLACK_USE_FIXTURES=true`); live when client id/secret set |

## Build

- `slack` PlatformAdapter + config + fixtures + sync
- Fixture OAuth start/callback
- Live authorize / `oauth.v2.access` / `auth.test` + `users.conversations` when configured
- Settings / Overview / Analytics / Health phase **20**
- Create drafts + fixture local Post only
- Overview reads **MetricSnapshot only**; live publish throws clear “not wired”

## Security

- Encrypted tokens (AES-GCM) · OAuth state · tenancy on disconnect/sync
- L9 redact `SLACK_*` secrets (`SLACK_CLIENT_SECRET`, tokens)
- Strong secret checks from harden pass (no weak compose defaults)

## Tests

- Fixture connect → sync → Overview + Analytics Slack
- Disconnect clears Slack snapshots/signal
- Adapter registered; live `chat.postMessage` / publish refused honestly
- Suite tag: `phase20-slack`

## Human inputs

- Go/no-go: **go** — Slack OAuth v2, fixtures-first, read-only V1 (no history, no live post)
- Fixture UAT per `docs/phase-20-exit.md`
- Sign or defer Phase 20 exit (does not auto-sign S7)
- Continue Wave B after sign

## gstack add-on (this phase)

- Architecture lock: `docs/gstack-plan-eng-phase20.md` (`/plan-eng-review`)
- Before Human sign: `/review` (and `/qa` if UI smoke needed)
