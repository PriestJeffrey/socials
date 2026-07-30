# Pulseboard — Phase 21 Restatement (Locked)

**Status:** Phase 21 **implemented** → Human UAT / sign toward **S7**.  
**Platform:** Vimeo (OAuth2, free developer app)  
**Branch tip:** from phase-20 tip `5f67d16` → `phase-21`  
**gstack:** Research → restatement → `/plan-eng-review` → `/cso` → build → `/review` (`docs/gstack-review-phase21.md`, **ship-with-nits**) before Human sign.

## Research summary (go)

| Item | Notes |
|---|---|
| Auth | OAuth2 authorization code: authorize `https://api.vimeo.com/oauth/authorize` (`response_type=code`); token `POST https://api.vimeo.com/oauth/access_token` with **Basic** `base64(client_id:client_secret)` + JSON body `{ grant_type: "authorization_code", code, redirect_uri }` |
| V1 scopes (read) | `public private stats` — **upload / edit deferred** (no `upload`, `edit`, `create`, `delete`, `video_files`) |
| Headers | API calls: `Authorization: Bearer <token>`; `Accept: application/vnd.vimeo.*+json` (pin version e.g. `3.4` on token + read calls) |
| Read (live) | `GET /me` (identity) + `GET /me/videos` → map `stats.plays` (and related) into MetricSnapshots |
| Fixtures | Views / engagement-style snapshots for UAT (mirror Twitch fixture videos → MetricSnapshot) |
| Publish | Upload / edit deferred — adapter `publish: false` |
| Cost | Free Vimeo developer app |
| V1 path | **Fixtures** for UAT (`VIMEO_USE_FIXTURES=true`); live video list + plays when client id/secret set |

## Build

- `vimeo` PlatformAdapter + config + fixtures + sync
- Fixture OAuth start/callback
- Live authorize / `oauth/access_token` / `GET /me` + `GET /me/videos` when configured
- Settings / Overview / Analytics / Health phase **21**
- Create drafts + fixture local Post only
- Overview reads **MetricSnapshot only**; live upload/publish throws clear “not wired”

## Security

- Encrypted tokens (AES-GCM) · OAuth state · tenancy on disconnect/sync
- L9 redact `VIMEO_*` secrets (`VIMEO_CLIENT_SECRET`, tokens)
- Strong secret checks from harden pass (no weak compose defaults)
- Never log Bearer tokens or Basic client credentials

## Tests

- Fixture connect → sync → Overview + Analytics Vimeo
- Disconnect clears Vimeo snapshots/signal
- Adapter registered; live upload / publish refused honestly
- Suite tag: `phase21-vimeo`

## Human inputs

- Go/no-go: **go** — Vimeo OAuth2, fixtures-first, read-only V1 (no upload/edit)
- Fixture UAT per `docs/phase-21-exit.md`
- Sign or defer Phase 21 exit (does not auto-sign S7)
- Continue Wave B after sign

## gstack add-on (this phase)

- Architecture lock: `docs/gstack-plan-eng-phase21.md` (`/plan-eng-review`)
- Before Human sign: `/review` (and `/qa` if UI smoke needed)
