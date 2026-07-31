# Pulseboard - agent notes

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

**gstack is a mandatory add-on at every phase** (see `docs/gstack-phase-addon.md` and `.cursor/rules/gstack-phase-addon.mdc`). It does not replace SDLC phase gates.

Key routing rules:
- Product ideas/brainstorming → `/office-hours`
- Strategy/scope → `/plan-ceo-review`
- Architecture → `/plan-eng-review`
- Design system/plan review → `/design-consultation` or `/plan-design-review`
- Full review pipeline → `/autoplan`
- Bugs/errors → `/investigate`
- QA/testing site behavior → `/qa` or `/qa-only`
- Code review/diff check → `/review`
- Visual polish → `/design-review`
- Ship/deploy/PR → `/ship` or `/land-and-deploy` (only after Human phase approval)
- Save progress → `/context-save`
- Resume context → `/context-restore`
- Author a backlog-ready spec/issue → `/spec`

Phase start always: SDLC restatement **plus** at least one relevant gstack pass before Human sign-off.
