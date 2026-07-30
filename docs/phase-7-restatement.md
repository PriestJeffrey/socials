# Pulseboard — Phase 7 Restatement (Locked)

**Status:** Phase 7 **in progress** → toward **S5**.  
**Success bar:** Approvals workflow, sentiment where available, restrained Overview polish, real account deletion.  
**gstack:** Restatement + eng plan locked in-tree; `/review` before Human S5 sign.

## Build

- Server-side draft state machine: `draft → in_review → approved → published` (+ reject → draft)
- `/approvals` queue: submit / approve / reject / publish approved
- Sentiment label on drafts via AI gateway (fixture-resilient)
- Settings: confirm + hard-delete account (cascade)
- Overview: restrained motion + depth on cards
- Health phase 7

## Security

- Authz: every transition scoped by `userId`
- Hard delete cascades user data; audit `account.deleted`
- Confirm phrase required for delete
- No cross-tenant approve/reject

## Tests

- Illegal transitions rejected
- Cannot approve another user’s draft
- Delete empties drafts/hooks/connections for user
- Sentiment returns label without throwing on fixture

## Explicit non-goals

- Multi-approver roles / orgs
- Production deploy (Phase 8)
- Live Graph publish
