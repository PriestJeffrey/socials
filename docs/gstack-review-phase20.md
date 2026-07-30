# Pulseboard — gstack `/review` Phase 20 (Slack)

**Date:** 2026-07-30  
**Branch:** `phase-20`  
**Mode:** Pre-Human-sign code review (add-on; does not replace SDLC / UAT)  
**Compared to:** Discord (`lib/platforms/discord/*`) Wave B pattern + `docs/gstack-cso-phase20.md`  
**Tests skimmed:** `phase20-slack` (5) + `health-public` (2) green; suite target ~135  

---

## Verdict

**ship-with-nits**

Slack mirrors Discord closely on OAuth CSRF bind, AES-GCM at rest, tenancy-scoped sync/disconnect, fixture gate, rate-limited start, honest `publish: false` + throw, and Settings copy that admits history / `chat.postMessage` are deferred. No critical honesty or security bugs found that warrant blocking Human fixture UAT or changing application code in this pass.

Ship to Human UAT on fixtures. Do **not** treat this as phase exit signed.

---

## Honesty skim (Slack vs Discord)

| Surface | Assessment |
|---|---|
| Adapter capabilities | `publish: false` — matches Discord |
| `publish()` | Throws clear Phase-20 deferral (`chat.postMessage` deferred) — matches Discord honesty bar |
| Live sync | `auth.test` path + `users.conversations` → channel-count proxy; **no** `conversations.history` / `chat.postMessage` in codebase — honest |
| Fixture sync | Message/reaction/reply posts + engagement snapshots — richer than live (same Discord guilds-vs-fixture-messages pattern); Settings blurb discloses this |
| `runPublishDraft` | Slack in `PUBLISHABLE`; fixtures → local draft publish only; live throws before any Slack API — CSO-allowed; refuse copy is generic Wave B wording (nit) |
| OAuth | Session + HMAC `createOAuthState` / `verifyOAuthState` + `verified.userId === session.userId` on start/callback — matches Discord |
| Tokens | `encryptAesGcm` on write; decrypt only for API; audit metadata has ids only |

---

## Findings

| Sev | ID | Finding | Disposition |
|---|---|---|---|
| **Med** | R20-1 | Live `users.conversations` requested `private_channel` without `groups:read`. | **Fixed** — types now `public_channel` only (matches `channels:read`). |
| **Low** | R20-2 | Live refuse in `lib/content/publish.ts` uses generic “Live Graph/LinkedIn publish is not implemented…” rather than Slack-specific copy. Adapter `publish()` message is clear; draft path is the common UX. | Same Wave B pattern as Discord; polish later. |
| **Low** | R20-3 | `phase20-slack` does not assert `publish()` throws or cross-tenant denial. Tenancy is enforced in adapter/sync/actions (Discord-shaped); CSO preferred Slack-specific cases. | Accept residual; optional follow-up test. |
| **Low** | R20-4 | L9 `xox[baprs]-` covers common Slack tokens; `xoxe-` (enterprise) not matched. Named `SLACK_*` env patterns are present. | Accept residual unless enterprise tokens appear in AI paths. |
| **Low** | R20-5 | Analytics “focus” highlights replies/reactions; live insights zero those and only populate `channels`. Fixture UAT looks rich; live UAT looks empty on focus metrics — by eng-plan design. | Human UAT must not confuse fixture richness with live fidelity. |
| **Low** | R20-6 | Sync `lastSyncError` stores raw API error strings (no token scrub). Slack errors are typically short codes; Discord same. | Accept; scrub if live errors ever echo secrets. |

**No High / Critical** findings. **No application code changed** in this `/review` pass.

---

## CSO checklist — satisfied from code skim

From `docs/gstack-cso-phase20.md` Builder checklist:

| Control | Status | Evidence (skim) |
|---|---|---|
| Adapter under `lib/platforms/slack/*` + registry | Satisfied | `adapter/client/config/sync` + `lib/platforms/index.ts` |
| OAuth start: session + `createOAuthState` + rate limit | Satisfied | `app/api/oauth/slack/start` — `getSessionUser`, `oauth:slack:start:`, adapter `beginOAuth` |
| OAuth callback: session + verify + userId bind | Satisfied | `callback` route + `handleOAuthCallback` |
| Tokens AES-GCM only | Satisfied | upsert encrypt; sync/refresh decrypt |
| Sync tenancy `{ id, userId, platform: "slack", status }` | Satisfied | `runSlackSync` + actions |
| Disconnect scoped; clears tokens/posts/snapshots; audit | Satisfied | `disconnect` + `platform.slack.disconnected` |
| `publish: false` + throw; no live `chat.postMessage` | Satisfied | adapter + no `chat.postMessage` callers in repo |
| L9 redact `SLACK_*` + `xox*` | Satisfied (nit R20-4) | `lib/ai/redact.ts` |
| Error redirect scrub `token\|secret\|bearer` | Satisfied | start/callback routes |
| Fixtures gate + live needs client id/secret | Satisfied | `getSlackConfig`; compose `SLACK_USE_FIXTURES=true` |
| Health phase 20; public liveness no fixture/secret posture | Satisfied | `getPublicLiveness` + `health-public` tests |
| Tests: connect → sync → Overview/Analytics; disconnect clears | Satisfied | `phase20-slack.test.ts` |
| Security evidence + residual CSP/Redis | Satisfied | CSO doc + this review |
| `/review` before Human sign | **This doc** | |

---

## Residual for Human UAT

Per `docs/phase-20-exit.md` (unchanged intent):

1. `SLACK_USE_FIXTURES=true` → Settings → Connect Slack → Overview shows Slack signal + `/analytics/slack` loads fixture metrics.  
2. Disconnect clears Slack snapshots/signal from Overview / analytics.  
3. Confirm live publish remains refused (adapter / Create path with fixtures off — honest “not wired”; no real `chat.postMessage`).  
4. Optional live (if credentials available): connect → sync yields channel-count metrics only; expect zeros on replies/reactions; watch for R20-1 scope/`private_channel` friction.  
5. Reply when ready to **sign** Phase 20 / continue Wave B — review alone does not sign.

**Demo login (local):** `demo@pulseboard.local` / `pulseboard-demo` at http://localhost:3000/login (`npm run db:seed` if needed).

---

## STATUS

DONE — `docs/gstack-review-phase20.md` written; verdict **ship-with-nits**; no application code modified.
