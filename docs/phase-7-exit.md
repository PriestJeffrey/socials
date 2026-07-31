# Pulseboard — Phase 7 exit (draft toward S5)

**Status:** Implementation complete on `v1-core` — awaiting Human UAT / **S5** sign. See [docs/v1-core-ship.md](v1-core-ship.md).  
**Date:** 2026-07-30  
**gstack:** Restatement locked; `/review` notes below.

## Delivered

- Draft FSM: draft → in_review → approved → published (+ reject)
- `/approvals` queue + sentiment button
- Create/Calendar publish auto-approves for solo path
- Settings hard-delete with `DELETE MY ACCOUNT` confirm
- Overview depth/motion polish (`pb-depth-card`)
- Health phase **7**
- Tests: FSM unit, tenancy approve, sentiment, cascade delete

## GSTACK REVIEW (pre-sign)

- Authz on all transitions via `userId`
- Cascade delete on User relations
- Sentiment fails soft to `unknown`
- Residual: S2–S4 still unsigned; live Graph publish deferred; Phase 8 deploy not started

## Human UAT

1. Create draft → Approvals → Submit → Approve → Publish approved  
2. Run sentiment on a draft  
3. Overview cards show subtle depth/motion  
4. Settings delete dry-run: type wrong phrase → error; do **not** delete demo unless intentional  
5. Reply **S5 signed** or list fixes
