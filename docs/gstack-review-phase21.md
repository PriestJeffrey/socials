# Pulseboard — gstack `/review` Phase 21 (Vimeo)

**Date:** 2026-07-30  
**Branch:** `phase-21`  
**Mode:** Pre-Human-sign code review (add-on; does not replace SDLC / UAT)  
**Compared to:** Twitch (`lib/platforms/twitch/*`) / Slack Wave B pattern + `docs/gstack-cso-phase21.md` + `docs/gstack-plan-eng-phase21.md`  
**Tests skimmed:** `phase21-vimeo` (5) + `health-public` (phase **21**) green path assumed; suite target ~140  

---

## Verdict

**ship-with-nits**

Vimeo mirrors Twitch/Slack on OAuth CSRF bind, AES-GCM at rest, tenancy-scoped sync/disconnect, fixture gate, rate-limited start, honest `publish: false` + throw, Basic-auth token exchange, scopes `public private stats` (no upload/edit), and Settings copy that admits upload is deferred. No critical honesty or security bugs found that warrant blocking Human fixture UAT or changing application code in this pass.

Ship to Human UAT on fixtures. Do **not** treat this as phase exit signed.

---

## Honesty skim (Vimeo vs Twitch / plan)

| Surface | Assessment |
|---|---|
| Adapter capabilities | `publish: false` — matches Twitch / eng plan |
| `publish()` | Throws clear Phase-21 deferral (`upload/edit deferred`) — honest |
| Live scopes | `VIMEO_OAUTH_SCOPES = "public private stats"` — **no** `upload` / `edit` / `create` / `delete` / `video_files` |
| Live sync | `GET /me` + `GET /me/videos` (Accept `vnd.vimeo.*+json;version=3.4`); `stats.plays` → views (`null` → `0`) — honest |
| Token exchange | `POST /oauth/access_token` with **Basic** `client_id:client_secret` + JSON grant — matches restatement |
| Fixture sync | Video posts + views / engagement snapshots — richer than live synthetic rates; Settings blurb discloses upload deferral + fixtures |
| `runPublishDraft` | Vimeo in `PUBLISHABLE`; fixtures → local draft publish only; live throws before any Vimeo upload API — CSO-allowed; refuse copy is generic Wave B wording (nit) |
| OAuth | Session + HMAC `createOAuthState` / `verifyOAuthState` + `verified.userId === session.userId` on callback — matches Twitch |
| Tokens | `encryptAesGcm` on write; decrypt only for API; audit metadata has ids only |
| Pagination | Single page `per_page=20` — eng-plan cap; older videos omitted by design |

---

## Findings

| Sev | ID | Finding | Disposition |
|---|---|---|---|
| **Low** | R21-1 | Live `videos_7d` is `videos.length` from the last 20 `/me/videos` (not a true 7-day window). `engagement_rate` is synthetic (`avg/10000`); `followers_delta_7d` is always `0` live. | Same Twitch Wave B pattern; fixtures look rich — Human UAT must not confuse fixture richness with live fidelity. |
| **Low** | R21-2 | Live refuse in `lib/content/publish.ts` uses generic “Live Graph/LinkedIn publish is not implemented…” rather than Vimeo-specific copy. Adapter `publish()` message is clear; draft path is the common UX. | Same Wave B pattern as Slack/Discord; polish later. |
| **Low** | R21-3 | `phase21-vimeo` does not assert `publish()` throws or cross-tenant denial. Tenancy is enforced in adapter/sync/actions (Twitch-shaped); CSO preferred Vimeo-specific cases. | Accept residual; optional follow-up test. |
| **Low** | R21-4 | Sync `lastSyncError` stores raw API error strings (no token scrub). Vimeo errors are typically status codes / short messages; Twitch/Slack same. | Accept; scrub if live errors ever echo secrets. |
| **Low** | R21-5 | Live plays depend on `stats` scope + API `stats.plays` availability; null → `0`. | Honest per eng plan; fixtures cover UAT engagement. |

**No High / Critical** findings. **No application code changed** in this `/review` pass.

---

## CSO checklist — satisfied from code skim

From `docs/gstack-cso-phase21.md` Builder checklist:

| Control | Status | Evidence (skim) |
|---|---|---|
| Adapter under `lib/platforms/vimeo/*` + registry | Satisfied | `adapter/client/config/sync` + `lib/platforms/index.ts` |
| OAuth start: session + `createOAuthState` + rate limit | Satisfied | `app/api/oauth/vimeo/start` — `getSessionUser`, `oauth:vimeo:start:`, adapter `beginOAuth` |
| OAuth callback: session + verify + userId bind | Satisfied | `callback` route + `handleOAuthCallback` |
| Token exchange Basic client auth | Satisfied | `exchangeVimeoCode` / `refreshVimeoToken` — `Authorization: Basic …` |
| Tokens AES-GCM only | Satisfied | upsert encrypt; sync/refresh decrypt |
| Sync tenancy `{ id, userId, platform: "vimeo", status }` | Satisfied | `runVimeoSync` + actions |
| Disconnect scoped; clears tokens/posts/snapshots; audit | Satisfied | `disconnect` + `platform.vimeo.disconnected` |
| `publish: false` + throw; no live upload / `POST /me/videos` create | Satisfied | adapter + only `GET /me/videos` in client |
| L9 redact `VIMEO_CLIENT_ID` + `VIMEO_CLIENT_SECRET` | Satisfied | `lib/ai/redact.ts` |
| Error redirect scrub `token\|secret\|bearer` | Satisfied | start/callback routes |
| Fixtures gate + live needs client id/secret | Satisfied | `getVimeoConfig`; compose `VIMEO_USE_FIXTURES=true` |
| Health phase 21; public liveness no fixture/secret posture | Satisfied | `getPublicLiveness` + `health-public` tests |
| Tests: connect → sync → Overview/Analytics; disconnect clears | Satisfied | `phase21-vimeo.test.ts` (R21-3 residual) |
| Security evidence + residual CSP/Redis | Satisfied | CSO doc + this review |
| `/review` before Human sign | **This doc** | |

---

## Residual for Human UAT

Per `docs/phase-21-exit.md`:

1. `VIMEO_USE_FIXTURES=true` → Settings → Connect Vimeo → Overview shows Vimeo signal + `/analytics/vimeo` loads fixture metrics.  
2. Disconnect clears Vimeo snapshots/signal from Overview / analytics.  
3. Confirm live publish/upload remains refused (adapter / Create path with fixtures off — honest “not wired”; no real Vimeo upload).  
4. Optional live (if credentials available): connect → sync yields plays from `stats.plays` (zeros if null); expect synthetic engagement / zero followers Δ; watch scope `public private stats`.  
5. Reply when ready to **sign** Phase 21 / continue Wave B — review alone does not sign.

**Demo login (local):** `demo@pulseboard.local` / `pulseboard-demo` at http://localhost:3000/login (`npm run db:seed` if needed).

---

## STATUS

DONE — `docs/gstack-review-phase21.md` written; verdict **ship-with-nits**; no application code modified.
