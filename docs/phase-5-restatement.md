# Pulseboard — Phase 5 Restatement (Locked)

**Status:** Phase 5 **in progress** → toward **S3**.  
**Success bar:** Create drafts, preview, schedule/publish IG/FB/LI (fixtures or live), X copy path, calendar of scheduled items, goal tags, manual conversions, rule-based repurpose.  
**Depends on Human:** Live publish UAT when Meta/LinkedIn unlock; fixtures for local S3.

## Build

- `Draft` model (tenancy, status machine: draft → scheduled/published/failed)
- `/create` composer + platform preview + goal tag + conversion note
- Publish now / schedule → `Job` type `publish` (idempotent key)
- Fixture publish writes a `Post` row when `META_USE_FIXTURES` / platform fixtures
- X: no publish — deep-link to `/x` with draft text
- `/calendar` lists scheduled + published drafts
- Rule-based repurpose: one body → platform-flavored sibling drafts

## Security

- Every draft/publish scoped by `userId`
- Audit: `content.draft_created`, `content.scheduled`, `content.published`
- No publish for other users; X cannot call adapter.publish

## Tests

- Cannot publish another user’s draft
- Fixture publish creates Post + sets draft published
- Schedule sets runAfter job + draft scheduled
- Repurpose creates sibling drafts

## Explicit non-goals

- AI drafting (Phase 6)
- Approvals workflow (Phase 7)
- Real ad A/B
