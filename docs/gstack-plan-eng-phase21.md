# gstack `/plan-eng-review` — Phase 21 Vimeo (Architect notes)

**Branch:** `phase-21` (from phase-20 tip `5f67d16`)  
**Scope:** Fixtures-first `vimeo` PlatformAdapter; Overview = MetricSnapshot only; live publish deferred  
**Mirror:** Twitch (phase 18) / Slack (phase 20)  
**Decision:** Proceed as incremental Wave B adapter — no core rewrite.  
**Completeness target:** Same bar as Twitch (fixtures UAT + honest live read + `publish: false`).

## Scope challenge (passed)

Existing seams already solve OAuth state, AES token storage, job sync, Overview snapshot reads, Settings connect/disconnect, `/analytics/[platform]`, Health subsystem rows. Phase 21 **adds** a Vimeo module + registry/job/analytics wiring — does not invent parallel pipelines.

## Architecture / seams

| Seam | Touch |
|---|---|
| Adapter | `lib/platforms/vimeo/{config,client,adapter,sync}.ts` — `id: "vimeo"`, `capabilities.publish: false` |
| Registry | Register in `lib/platforms/index.ts`; appear in `oauthPlatforms()` / `listAdapters()` |
| OAuth routes | `app/api/oauth/vimeo/start` + `callback` (fixture + live) |
| Jobs | `lib/jobs/runner.ts` — `sync` + `platform === "vimeo"` → `runVimeoSync` |
| Analytics | `lib/analytics/platform.ts` (+ pipeline win/issue copy for Vimeo) |
| UI | Settings connect, Create option, Health phase **21**, `/analytics/vimeo` |
| Tests | `tests/integration/phase21-vimeo.test.ts` |

### Live vs fixture data flow

```
Fixture: VIMEO_USE_FIXTURES=true
  OAuth callback → fixture tokens + video posts
  sync → Post upserts + MetricSnapshot (views / engagement-style)

Live: client id/secret configured
  authorize (scope=public private stats)
  → POST /oauth/access_token (Basic client_id:secret + JSON grant)
  → encrypt access_token
  → sync: GET /me + GET /me/videos (Accept vnd.vimeo.*+json)
  → MetricSnapshot from stats.plays (+ video list counts)
```

## Risks

| Risk | Mitigation |
|---|---|
| `stats.plays` null without owner token / `stats` (+ often `private`) | Request V1 scopes `public private stats`; map null → `0` honestly; fixtures cover UAT engagement |
| `stats` scope ≠ all analytics products | V1 uses total plays on video objects only — no advanced analytics product APIs |
| Token / Basic secret leakage | AES-GCM at rest; L9 redact `VIMEO_*`; never log Bearer or Basic credentials |
| Pagination / rate limits on `/me/videos` | Cap pages in sync (mirror Twitch video fetch limits); respect Retry-After |
| Upload/edit temptation | Capability `publish: false`; adapter/create path refuses with clear error |
| Accept version drift | Pin `Accept: application/vnd.vimeo.*+json;version=3.4` on token + read calls |

## Definition of Done

- [ ] Restatement locked (`docs/phase-21-restatement.md`) — **done (Architect)**
- [ ] `vimeo` adapter registered; fixture OAuth connect/sync/disconnect green in `phase21-vimeo`
- [ ] Overview + `/analytics/vimeo` read snapshots only after fixture connect
- [ ] Live path: authorize + token + `GET /me` / `GET /me/videos` when configured (or skipped under fixtures)
- [ ] Live publish/upload refused; Health reports Vimeo + phase 21
- [ ] Security: encrypted tokens, OAuth state, secret redaction
- [ ] Human UAT per `docs/phase-21-exit.md` + `/review` before sign

## Non-goals (this phase)

- Live video upload / edit / delete  
- Advanced Vimeo analytics products beyond `stats.plays` on video list  
- Personal access tokens as the primary connect path (OAuth code flow only for multi-tenant)  
- Core PlatformAdapter interface changes
