# gstack `/plan-eng-review` — Phase 20 Slack (Architect notes)

**Branch:** `phase-20` (from phase-19 tip `f75eaf7`)  
**Scope:** Fixtures-first `slack` PlatformAdapter; Overview = MetricSnapshot only; live publish deferred  
**Mirror:** Discord (phase 19) / Twitch (phase 18)  
**Decision:** Proceed as incremental Wave B adapter — no core rewrite.  
**Completeness target:** Same bar as Discord (fixtures UAT + honest live read + `publish: false`).

## Scope challenge (passed)

Existing seams already solve OAuth state, AES token storage, job sync, Overview snapshot reads, Settings connect/disconnect, `/analytics/[platform]`, Health subsystem rows. Phase 20 **adds** a Slack module + registry/job/analytics wiring — does not invent parallel pipelines.

## Architecture / seams

| Seam | Touch |
|---|---|
| Adapter | `lib/platforms/slack/{config,client,adapter,sync}.ts` — `id: "slack"`, `capabilities.publish: false` |
| Registry | Register in `lib/platforms/index.ts`; appear in `oauthPlatforms()` / `listAdapters()` |
| OAuth routes | `app/api/oauth/slack/start` + `callback` (fixture + live) |
| Jobs | `lib/jobs/runner.ts` — `sync` + `platform === "slack"` → `runSlackSync` |
| Analytics | `lib/analytics/platform.ts` (+ pipeline win/issue copy for Slack) |
| UI | Settings connect, Create option, Health phase **20**, `/analytics/slack` |
| Tests | `tests/integration/phase20-slack.test.ts` |

### Live vs fixture data flow

```
Fixture: SLACK_USE_FIXTURES=true
  OAuth callback → fixture tokens + message/reaction/reply posts
  sync → Post upserts + MetricSnapshot (engagement-style)

Live: client id/secret configured
  authorize (user_scope=users:read,channels:read)
  → oauth.v2.access → encrypt authed_user token
  → sync: auth.test + users.conversations
  → MetricSnapshot from membership count proxy (no channel history)
```

## Risks

| Risk | Mitigation |
|---|---|
| History / conversations.history rate limits + Marketplace scrutiny | **Out of V1** — no history scopes; live metrics = membership proxy only |
| Token leakage | AES-GCM at rest; L9 redact `SLACK_*`; never log `xoxp-` |
| Bot vs user token confusion | Request **user_scope** only for V1; persist `authed_user.access_token`; do not require bot `scope` for read path |
| Honest UX | Fixtures may show richer message metrics than live — UI/copy must not claim live history (same honesty as Discord guilds vs fixture messages) |
| `chat.postMessage` temptation | Capability `publish: false`; adapter/create path refuses with clear error |

## Definition of Done

- [ ] Restatement locked (`docs/phase-20-restatement.md`) — **done (Architect)**
- [ ] `slack` adapter registered; fixture OAuth connect/sync/disconnect green in `phase20-slack`
- [ ] Overview + `/analytics/slack` read snapshots only after fixture connect
- [ ] Live path: authorize + token + `auth.test` / `users.conversations` when configured (or skipped under fixtures)
- [ ] Live publish refused; Health reports Slack + phase 20
- [ ] Security: encrypted tokens, OAuth state, secret redaction
- [ ] Human UAT per `docs/phase-20-exit.md` + `/review` before sign

## Non-goals (this phase)

- Channel/message history sync  
- Live `chat.postMessage` / schedule  
- Slack Marketplace distribution / bot install UX beyond free app OAuth  
- Core PlatformAdapter interface changes
