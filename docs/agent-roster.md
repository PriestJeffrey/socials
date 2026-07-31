# Pulseboard - Agent Roster & Phase Multi-Agent Map (Locked)

## Roles (§2 SDLC)

| Agent name | Who | Duty |
|---|---|---|
| Stakeholder | Human | Budget, stop/go |
| Product Owner | Human | Priority, phase approval, UAT |
| Project Manager | Human (+ AI status) | Phase order, blockers |
| Domain Expert | Human | Honest recommendation check |
| Business Analyst | AI drafts; Human confirms | Acceptance criteria |
| Architect | AI | HLD/LLD, adapters, scalability seams |
| UI/UX | AI | Landing, brand, dashboard feel |
| Frontend | AI | UI build |
| Backend | AI | Auth, DB, APIs, crypto, seams |
| QA | AI automates; Human UAT | Tests |
| AppSec | AI; Human accepts residual risk | Secure SDLC + ATT&CK |
| DevOps | AI; Human owns accounts/DNS | CI/CD, repo, deploy, scale ladder |

## Multi-agent vs solo by phase

| Phase | Parallel agents | Why |
|---|---|---|
| 0 → S0 | Architect · UI/UX · Frontend · Backend · QA · AppSec · DevOps | Foundation cuts every layer |
| 1 → S1 | Backend(Adapters) · Frontend · QA · AppSec | IG OAuth + Overview + security |
| 2 | Backend · Frontend · QA | FB slice; AppSec light |
| 3 → S2 | Backend · Frontend · QA · AppSec | LinkedIn + formulas |
| 4 | Frontend · QA | X honesty - no fake OAuth |
| 5 → S3 | Backend · Frontend · QA · AppSec | Publish authz + audit |
| 6 → S4 | Backend(AI) · Frontend · QA · AppSec | Gemini + L9 redaction |
| 7 → S5 | Backend · Frontend · QA · AppSec | Approvals + hard delete |
| 8 → S6 | DevOps · AppSec · QA · Backend | Prod + CI hardening |
| 9+ → S7 | Backend · Frontend · QA · AppSec | Per-platform playbook |

## Cadence

```
Human: "Run Phase N"
  → AI: restates Build / Security / Tests / Human inputs
  → AI: gstack add-on pass(es) for the phase (see docs/gstack-phase-addon.md)
  → Human: confirms
  → AI: implements + tests + security evidence
  → AI: gstack /review (and /qa if UI) before stop
  → Human: UAT pass/fail
  → Approved: commit phase-N: … + push GitHub
```

**gstack** is a locked **add-on at every phase** - it does not replace SDLC gates or Human sign-off.

## Locked product decisions

- Auth: email + password (Argon2id preferred / bcrypt OK)
- Crypto at rest: AES-256-GCM only (never SHA-as-encryption)
- UI: selective 3D mixture (~80/20); landing hero primary 3D moment
- Git: push after each Human-approved phase
- Meta developer app: deferred to Phase 1
- Scalability: seams in Phase 0; Redis/queue/replicas post-S6 on metrics
- **gstack:** required phase add-on (`.cursor/rules/gstack-phase-addon.mdc`)
