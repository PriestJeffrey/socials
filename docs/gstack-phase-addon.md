# gstack — Phase add-on (locked)

**Decision:** Apply gstack at **every** Pulseboard phase as an **add-on**.  
**Does not replace:** SDLC phase gates, Human UAT, S0–S7 bars, or security exit sign-off.

## Per-phase minimum

Before Human signs a phase, run at least one relevant gstack skill and record it in the phase exit notes:

| Phase concern | gstack skill(s) |
|---|---|
| Shape / ambiguity | `/office-hours`, `/spec` |
| Architecture / eng plan | `/plan-eng-review` |
| Design / UI plan | `/plan-design-review`, `/design-consultation` |
| Code / PR | `/review` |
| Security | `/cso` (or security-review subagent) |
| Runtime bugs | `/investigate` |
| Browser behavior | `/qa`, `/qa-only` |
| Ship | `/ship` only after Human phase approval |

## Cadence (updated)

```
Human: "Run Phase N"
  → AI: SDLC restatement (Build / Security / Tests / Human inputs)
  → AI: gstack add-on pass(es) for this phase
  → Human: confirms
  → AI: implements + tests + security evidence
  → AI: gstack /review (and /qa if UI) before stop
  → Human: UAT pass/fail + sign
  → Approved: commit phase-N: … + push GitHub
```

Cursor rule: `.cursor/rules/gstack-phase-addon.mdc` (`alwaysApply: true`).
