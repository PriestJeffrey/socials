# Pulseboard — Phase 5 exit (draft toward S3)

**Status:** Implementation complete on `v1-core` — awaiting Human UAT / **S3** sign. See [docs/v1-core-ship.md](v1-core-ship.md).  
**Date:** 2026-07-30  
**Remediation (2026-07-30):** gstack retro fixes — live publish refused (no fake Graph), atomic draft claim, calendar job scope + `/api/cron`, adapter `userId`, middleware `/x`, LI fixtures independent of Meta.

## Delivered

- `Draft` model + migration
- `/create` composer (goal tag, conversion, save/publish/schedule)
- Fixture-only publish → `Post` + audit (live Graph publish throws until wired)
- Schedule via job `runAfter`; calendar drains **this user's** due jobs; global drain via `/api/cron` + `CRON_SECRET`
- Rule-based repurpose + X copy handoff
- Tests: tenancy, publish, schedule defer, live-publish refusal, repurpose

## Human UAT

1. Connect IG (fixtures) → Create → Publish now → Calendar shows published
2. Schedule future → stays scheduled until due (or cron)
3. With `META_USE_FIXTURES=false`, publish must fail with clear message (no fake live)
4. Repurpose to X → open `/x` with text
5. Reply **S3 signed** or continue to Phase 6
