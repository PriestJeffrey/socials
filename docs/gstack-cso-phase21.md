# Pulseboard — gstack `/cso` Phase 21 (Vimeo)

**Date:** 2026-07-30  
**Branch:** `phase-21`  
**Mode:** Phase add-on (docs-only threat + control pack for Builder)  
**Pattern source:** Twitch (`lib/platforms/twitch/*`) + Slack (`docs/gstack-cso-phase20.md`) + harden tip (`docs/gstack-harden-phase18.md`)  
**Does not replace:** SDLC phase gates, Human UAT, or L8/L11 security evidence at exit

**Verdict (pre-build):** Fixtures-first **go**. Live video upload / create **no-go** for Phase 21.

---

## Architecture mental model (Vimeo slice)

Same trust boundary as Wave B adapters (Twitch / Slack / Discord):

1. Browser → authenticated OAuth start/callback (session required).
2. Server exchanges code → Vimeo tokens → **AES-GCM at rest** only.
3. Sync / disconnect / metrics always scoped by `userId` + `connectionId` + `platform: "vimeo"`.
4. AI paths never see raw OAuth tokens or `VIMEO_*` secrets (L9 redact).
5. Adapter `publish` capability off; live upload / video create must throw honestly.

---

## Threats → expected controls

| Threat | Severity if missed | Control Builder must ship | Mirror |
|---|---|---|---|
| **OAuth CSRF** (attacker binds victim's Vimeo account to attacker's Pulseboard account, or forges callback) | HIGH | Signed HMAC state via `createOAuthState` / `verifyOAuthState`; callback requires session user; `verified.userId === session.userId`; TTL 10m; timing-safe compare | Twitch / Slack `adapter.handleOAuthCallback` |
| **Token leakage in logs / redirects / errors** | HIGH | Never log `access_token` / `refresh_token` / Bearer / Vimeo access tokens; redact error messages before Settings redirect (`token\|secret\|bearer` → `[redacted]`); no tokens in query strings | Twitch / Slack OAuth start/callback routes |
| **Tenancy bypass** (user A sync/disconnect/read user B connection) | CRITICAL | Every `findFirst` / mutation includes `userId` + `connectionId` + `platform: "vimeo"`; disconnect clears tokens + posts + snapshots for **that** connection only; jobs enqueue with owning `userId` | Twitch adapter + `sync.ts` |
| **AI redaction gap for `VIMEO_*` secrets** | HIGH | Extend `lib/ai/redact.ts` named-env pattern to include **`VIMEO_CLIENT_ID`** and **`VIMEO_CLIENT_SECRET`** (and any other `VIMEO_*` secrets introduced); Bearer / `access_token=` patterns already help for opaque tokens | Existing `TWITCH_CLIENT_*` / `SLACK_CLIENT_*` in `SECRET_PATTERNS` |
| **Publish authz — accidental live upload** | HIGH | `capabilities.publish: false`; `publish()` **must refuse** (throw clear Phase-21 message); fixtures may support local draft/Post UX only — never call Vimeo upload / `POST /me/videos` (or equivalent) on live path | Twitch / Slack `publish()` throws |

### Additional controls (same bar as Twitch / Slack)

| Control | Expectation |
|---|---|
| Token at rest | `encryptAesGcm` / `decryptAesGcm` only; never plaintext columns |
| Config gate | `VIMEO_CLIENT_ID` + `VIMEO_CLIENT_SECRET` **or** `VIMEO_USE_FIXTURES=true`; refuse start when neither |
| OAuth rate limit | Per-user start limiter (same shape as Twitch `oauth:twitch:start:` / Discord) |
| Session bind | Start + callback both require `getSessionUser()`; no anonymous OAuth |
| Secrets strength | OAuth state uses `requireStrongSecret("SESSION_SECRET", …)` via `oauth-state.ts` — do not bypass with a Vimeo-local weak secret |
| Audit | `platform.vimeo.connected` / `platform.vimeo.disconnected` (no token material in metadata) |
| Health | Public liveness must not expose fixture posture / secret presence details beyond existing Health patterns |
| Scopes | Least privilege for V1 read/sync (document chosen scopes); no upload / edit / delete video scopes unless Human explicitly expands later |

---

## Hooks Vimeo must use (skim notes)

### `lib/security/secrets.ts`

- Rejects missing / short (&lt;16) / known placeholders for strong secrets.
- **Vimeo hook:** Do not invent a separate weak default for Vimeo OAuth HMAC. Keep using shared `SESSION_SECRET` through `oauth-state.ts`. Compose / `.env.example` must not ship placeholder `SESSION_SECRET` / `CRON_SECRET` (already harden-fixed).

### `lib/ai/redact.ts`

- L9 strip before any LLM call (`gateway` already calls `redactSecrets`).
- **Gap today:** named pattern lists Twitch / Discord / Slack client secrets but **not** `VIMEO_*`. Builder **must** add `VIMEO_CLIENT_ID` and `VIMEO_CLIENT_SECRET` before any Vimeo-adjacent AI path can see connection metadata / error strings / pasted content that might embed secrets.
- Bearer / `access_token=` patterns help for opaque Vimeo tokens; named env coverage is still mandatory.

### `lib/platforms/oauth-state.ts`

- Payload: `userId.timestamp.nonce.sig`; HMAC-SHA256; 10-minute TTL; timing-safe equal.
- **Vimeo hook:** `beginOAuth(userId)` → `createOAuthState(userId)`; callback → `verifyOAuthState(state)` then **also** compare to session `userId`. Do not roll a Vimeo-specific state cookie. Do not put Vimeo user id alone in unsigned state.

---

## Residual risks (accepted this phase — same as phase-18 harden)

| Residual | Notes |
|---|---|
| CSP `unsafe-inline` / `unsafe-eval` | App-wide; not Vimeo-specific; defer |
| Shared Redis rate-limit | In-memory / local limiter OK for V1; Redis shared store deferred |
| TLS / host hardening | Deploy concern; not adapter gate |
| Real Sentry SDK | Structured logs / Health first; full product deferred |
| Prod cron schedule | Unrelated to Vimeo OAuth slice |
| Vimeo token rotation / revocation UX | Reconnect-on-expiry; document if refresh absent |
| Webhooks / upload complete callbacks (if deferred) | No inbound webhook signature surface until Events/webhooks ship — good for Phase 21 risk reduction |

---

## STRIDE (Vimeo adapter — condensed)

| | Risk | Control |
|---|---|---|
| **S**poofing | Forged OAuth callback | Signed state + session user bind |
| **T**ampering | Stolen connection id in sync job | `userId` ownership on every query |
| **R**epudiation | Silent connect/disconnect | Audit actions without secrets |
| **I**nfo disclosure | Tokens in AI / logs / health | AES-GCM + L9 redact + error scrubbing |
| **D**oS | OAuth start spam | Per-user rate limit (DoS itself not a CSO finding; control still required) |
| **E**levation | Live upload / cross-tenant | `publish` refuse + tenancy checks |

---

## ATT&CK delta (adapter)

- **T1528-ish (stolen application access token):** Mitigate with AES-GCM at rest, server-only env for client secret, no browser exposure of tokens, reconnect when expired/revoked.
- **T1078 (valid accounts via OAuth CSRF):** Mitigate with HMAC state bound to session user.

---

## Builder checklist (must satisfy before Human sign)

Copy into phase exit / security evidence. All boxes required unless Human explicitly waives in writing.

- [ ] Vimeo adapter lives under `lib/platforms/vimeo/*` and registers on the shared `PlatformAdapter` contract (no core analytics fork).
- [ ] OAuth start requires session; uses `createOAuthState(userId)`; rate-limited per user.
- [ ] OAuth callback requires session; `verifyOAuthState` + `verified.userId === session.userId`; rejects missing/invalid state/code.
- [ ] Access (and refresh if present) tokens stored only via `encryptAesGcm`; decrypt only server-side for Vimeo API calls.
- [ ] Sync loads connection with `{ id, userId, platform: "vimeo", status: "connected" }` — no id-only lookups.
- [ ] Disconnect scoped to owning `userId`; clears `accessTokenEnc` / `refreshTokenEnc`; deletes that connection's posts + metric snapshots; audit without tokens.
- [ ] `capabilities.publish === false` and `publish()` throws a clear refuse (no live Vimeo upload / `POST /me/videos` / equivalent).
- [ ] `lib/ai/redact.ts` covers **`VIMEO_CLIENT_ID`**, **`VIMEO_CLIENT_SECRET`**, and any other `VIMEO_*` secrets introduced.
- [ ] Error redirects / logs scrub `token|secret|bearer` (and never echo raw Vimeo tokens).
- [ ] Config: `VIMEO_USE_FIXTURES=true` path for CI/UAT; live path needs real client id/secret — no weak compose defaults for shared secrets.
- [ ] Health / Settings / Overview / Analytics treat Vimeo as phase **21** without leaking secrets or fixture posture on public liveness.
- [ ] Tests: fixture connect → sync → Overview/Analytics; disconnect clears; live upload/publish refused; tenancy (user A cannot operate on user B's connection) covered or inherited by shared pattern with Vimeo-specific cases.
- [ ] Security evidence doc (or exit notes) maps threats → file controls; residual list includes CSP + Redis rate-limit deferrals unchanged from harden.
- [ ] gstack `/review` (or equivalent) after implementation **before** asking Human to sign.

---

## Out of scope for this `/cso` pass

- Application code changes (Builder owns implementation).
- Full-repo daily `/cso` phases 2–11 (this is a **phase add-on** scoped to Vimeo).
- Enabling live Vimeo upload, video create/edit/delete, or inbound webhooks.

---

## Disclaimer

This is an AI-assisted phase security add-on, not a substitute for a professional penetration test. Use it to set the Builder bar and Human sign gate for Phase 21 Vimeo — not as the only line of defense for production.

**STATUS:** DONE — `docs/gstack-cso-phase21.md` written; no application code modified.
