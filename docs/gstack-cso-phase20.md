# Pulseboard — gstack `/cso` Phase 20 (Slack)

**Date:** 2026-07-30  
**Branch:** `phase-20`  
**Mode:** Phase add-on (docs-only threat + control pack for Builder)  
**Pattern source:** Discord (`lib/platforms/discord/*`) + harden tip (`docs/gstack-harden-phase18.md`)  
**Does not replace:** SDLC phase gates, Human UAT, or L8/L11 security evidence at exit

**Verdict (pre-build):** Fixtures-first **go**. Live chat/post publish **no-go** for Phase 20.

---

## Architecture mental model (Slack slice)

Same trust boundary as Wave B adapters (Discord / Twitch):

1. Browser → authenticated OAuth start/callback (session required).
2. Server exchanges code → Slack tokens → **AES-GCM at rest** only.
3. Sync / disconnect / metrics always scoped by `userId` + `connectionId` + `platform: "slack"`.
4. AI paths never see raw OAuth tokens or `SLACK_*` secrets (L9 redact).
5. Adapter `publish` capability off; live message post must throw honestly.

---

## Threats → expected controls

| Threat | Severity if missed | Control Builder must ship | Mirror |
|---|---|---|---|
| **OAuth CSRF** (attacker binds victim's Slack workspace to attacker's Pulseboard account, or forges callback) | HIGH | Signed HMAC state via `createOAuthState` / `verifyOAuthState`; callback requires session user; `verified.userId === session.userId`; TTL 10m; timing-safe compare | Discord `adapter.handleOAuthCallback` |
| **Token leakage in logs / redirects / errors** | HIGH | Never log `access_token` / `refresh_token` / `xox*` / Bearer; redact error messages before Settings redirect (`token\|secret\|bearer` → `[redacted]`); no tokens in query strings | Discord OAuth start/callback routes |
| **Tenancy bypass** (user A sync/disconnect/read user B connection) | CRITICAL | Every `findFirst` / mutation includes `userId` + `connectionId` + `platform: "slack"`; disconnect clears tokens + posts + snapshots for **that** connection only; jobs enqueue with owning `userId` | Discord adapter + `sync.ts` |
| **AI redaction gap for `SLACK_*` secrets** | HIGH | Extend `lib/ai/redact.ts` named-env pattern to include Slack secrets (at minimum `SLACK_CLIENT_SECRET`, `SLACK_CLIENT_ID`, `SLACK_SIGNING_SECRET` if used); prefer also matching Slack token prefixes `xoxb-` / `xoxp-` / `xapp-` / `xoxe-` | Existing `DISCORD_CLIENT_*` in `SECRET_PATTERNS` |
| **Publish authz — accidental live post** | HIGH | `capabilities.publish: false`; `publish()` **must refuse** (throw clear Phase-20 message); fixtures may support local draft/Post UX only — never call Slack `chat.postMessage` (or equivalent) on live path | Discord / Twitch `publish()` throws |

### Additional controls (same bar as Discord)

| Control | Expectation |
|---|---|
| Token at rest | `encryptAesGcm` / `decryptAesGcm` only; never plaintext columns |
| Config gate | `SLACK_CLIENT_ID` + `SLACK_CLIENT_SECRET` **or** `SLACK_USE_FIXTURES=true`; refuse start when neither |
| OAuth rate limit | Per-user start limiter (same shape as Discord `oauth:discord:start:`) |
| Session bind | Start + callback both require `getSessionUser()`; no anonymous OAuth |
| Secrets strength | OAuth state uses `requireStrongSecret("SESSION_SECRET", …)` via `oauth-state.ts` — do not bypass with a Slack-local weak secret |
| Audit | `platform.slack.connected` / `platform.slack.disconnected` (no token material in metadata) |
| Health | Public liveness must not expose fixture posture / secret presence details beyond existing Health patterns |
| Scopes | Least privilege for V1 read/sync (document chosen scopes); no chat:write / post scopes unless Human explicitly expands later |

---

## Hooks Slack must use (skim notes)

### `lib/security/secrets.ts`

- Rejects missing / short (&lt;16) / known placeholders for strong secrets.
- **Slack hook:** Do not invent a separate weak default for Slack OAuth HMAC. Keep using shared `SESSION_SECRET` through `oauth-state.ts`. Compose / `.env.example` must not ship placeholder `SESSION_SECRET` / `CRON_SECRET` (already harden-fixed). If Slack adds `SLACK_SIGNING_SECRET` for Events later, gate it with `requireStrongSecret` before verify — **out of Phase 20 scope unless Events land**.

### `lib/ai/redact.ts`

- L9 strip before any LLM call (`gateway` already calls `redactSecrets`).
- **Gap today:** named pattern lists `DISCORD_CLIENT_*` but **not** `SLACK_*`. Builder **must** add Slack env names before any Slack-adjacent AI path can see connection metadata / error strings / pasted content that might embed secrets.
- Bearer / `access_token=` patterns help, but Slack bot user tokens (`xoxb-…`) often appear without `Bearer` — add prefix patterns.

### `lib/platforms/oauth-state.ts`

- Payload: `userId.timestamp.nonce.sig`; HMAC-SHA256; 10-minute TTL; timing-safe equal.
- **Slack hook:** `beginOAuth(userId)` → `createOAuthState(userId)`; callback → `verifyOAuthState(state)` then **also** compare to session `userId`. Do not roll a Slack-specific state cookie. Do not put workspace id alone in unsigned state.

---

## Residual risks (accepted this phase — same as phase-18 harden)

| Residual | Notes |
|---|---|
| CSP `unsafe-inline` / `unsafe-eval` | App-wide; not Slack-specific; defer |
| Shared Redis rate-limit | In-memory / local limiter OK for V1; Redis shared store deferred |
| TLS / host hardening | Deploy concern; not adapter gate |
| Real Sentry SDK | Structured logs / Health first; full product deferred |
| Prod cron schedule | Unrelated to Slack OAuth slice |
| Slack token rotation / revocation UX | Reconnect-on-expiry; document if refresh absent |
| Events API / slash commands (if deferred) | No inbound webhook signature surface until Events ship — good for Phase 20 risk reduction |

---

## STRIDE (Slack adapter — condensed)

| | Risk | Control |
|---|---|---|
| **S**poofing | Forged OAuth callback | Signed state + session user bind |
| **T**ampering | Stolen connection id in sync job | `userId` ownership on every query |
| **R**epudiation | Silent connect/disconnect | Audit actions without secrets |
| **I**nfo disclosure | Tokens in AI / logs / health | AES-GCM + L9 redact + error scrubbing |
| **D**oS | OAuth start spam | Per-user rate limit (DoS itself not a CSO finding; control still required) |
| **E**levation | Live publish / cross-tenant | `publish` refuse + tenancy checks |

---

## ATT&CK delta (adapter)

- **T1528-ish (stolen application access token):** Mitigate with AES-GCM at rest, server-only env for client secret, no browser exposure of tokens, reconnect when expired/revoked.
- **T1078 (valid accounts via OAuth CSRF):** Mitigate with HMAC state bound to session user.

---

## Builder checklist (must satisfy before Human sign)

Copy into phase exit / security evidence. All boxes required unless Human explicitly waives in writing.

- [ ] Slack adapter lives under `lib/platforms/slack/*` and registers on the shared `PlatformAdapter` contract (no core analytics fork).
- [ ] OAuth start requires session; uses `createOAuthState(userId)`; rate-limited per user.
- [ ] OAuth callback requires session; `verifyOAuthState` + `verified.userId === session.userId`; rejects missing/invalid state/code.
- [ ] Access (and refresh if present) tokens stored only via `encryptAesGcm`; decrypt only server-side for Slack API calls.
- [ ] Sync loads connection with `{ id, userId, platform: "slack", status: "connected" }` — no id-only lookups.
- [ ] Disconnect scoped to owning `userId`; clears `accessTokenEnc` / `refreshTokenEnc`; deletes that connection's posts + metric snapshots; audit without tokens.
- [ ] `capabilities.publish === false` and `publish()` throws a clear refuse (no live `chat.postMessage` / equivalent).
- [ ] `lib/ai/redact.ts` covers `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, and any other `SLACK_*` secrets introduced; Slack `xox*` token prefixes redacted.
- [ ] Error redirects / logs scrub `token|secret|bearer` (and never echo raw Slack tokens).
- [ ] Config: `SLACK_USE_FIXTURES=true` path for CI/UAT; live path needs real client id/secret — no weak compose defaults for shared secrets.
- [ ] Health / Settings / Overview / Analytics treat Slack as phase **20** without leaking secrets or fixture posture on public liveness.
- [ ] Tests: fixture connect → sync → Overview/Analytics; disconnect clears; live publish refused; tenancy (user A cannot operate on user B's connection) covered or inherited by shared pattern with Slack-specific cases.
- [ ] Security evidence doc (or exit notes) maps threats → file controls; residual list includes CSP + Redis rate-limit deferrals unchanged from harden.
- [ ] gstack `/review` (or equivalent) after implementation **before** asking Human to sign.

---

## Out of scope for this `/cso` pass

- Application code changes (Builder owns implementation).
- Full-repo daily `/cso` phases 2–11 (this is a **phase add-on** scoped to Slack).
- Enabling live Slack publish or Events API webhooks.

---

## Disclaimer

This is an AI-assisted phase security add-on, not a substitute for a professional penetration test. Use it to set the Builder bar and Human sign gate for Phase 20 Slack — not as the only line of defense for production.

**STATUS:** DONE — `docs/gstack-cso-phase20.md` written; no application code modified.
