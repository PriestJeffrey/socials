# Pulseboard — Phase 5 exit (draft toward S3)

**Status:** Implementation complete — awaiting Human UAT.  
**Date:** 2026-07-30

## Delivered

- `Draft` model + migration
- `/create` composer (goal tag, conversion, save/publish/schedule)
- Fixture publish → `Post` + audit
- Schedule via job `runAfter`; calendar drains due jobs
- Rule-based repurpose + X copy handoff
- Tests: tenancy, publish, schedule defer, repurpose

## Human UAT

1. Connect IG (fixtures) → Create → Publish now → Calendar shows published
2. Schedule future → stays scheduled until due
3. Repurpose to X → open `/x` with text
4. Reply **S3 signed** or continue to Phase 6
