# Graph Report - .  (2026-07-27)

## Corpus Check
- Corpus is ~7,072 words - fits in a single context window. You may not need a graph.

## Summary
- 57 nodes · 73 edges · 13 communities (6 shown, 7 thin omitted)
- Extraction: 88% EXTRACTED · 12% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Auth Security Baseline
- Locked Planning Corpus
- Adapter Snapshot Core
- Zero-Cost Scale Seams
- Deploy Scale Ladder
- S2 Multi-Platform Wave
- S0 Foundation Bar
- S3 Create Publish
- S4 AI Competitors
- S5 Approvals Deletion
- Frontend Role
- QA Role
- Phase 4 X Manual

## God Nodes (most connected - your core abstractions)
1. `Phase 0` - 8 edges
2. `Pulseboard` - 7 edges
3. `Locked Prompts` - 7 edges
4. `Phase 0 Restatement` - 7 edges
5. `PlatformAdapter` - 6 edges
6. `MITRE ATT&CK` - 6 edges
7. `Scalability Seams Principle` - 6 edges
8. `UI Direction Phase 0` - 5 edges
9. `Overview` - 5 edges
10. `Pulseboard Complete SDLC` - 4 edges

## Surprising Connections (you probably didn't know these)
- `Pulseboard` --semantically_similar_to--> `Pulseboard`  [INFERRED] [semantically similar]
  README.md → docs/Pulseboard-Complete-SDLC.md
- `Pulseboard` --references--> `Scalability Addendum`  [EXTRACTED]
  README.md → docs/scalability-addendum.md
- `Zero-Cost V1 Path` --semantically_similar_to--> `Scalability Seams Principle`  [INFERRED] [semantically similar]
  docs/Pulseboard-Complete-SDLC.md → docs/scalability-addendum.md
- `Pulseboard` --references--> `Agent Roster`  [EXTRACTED]
  README.md → docs/agent-roster.md
- `Pulseboard` --references--> `Locked Prompts`  [EXTRACTED]
  README.md → docs/locked-prompts.md

## Hyperedges (group relationships)
- **Phase 0 Scalability Seams** — docs_scalability_addendum_ratelimiter, docs_scalability_addendum_cachestore, docs_scalability_addendum_jobqueue, docs_scalability_addendum_clock [EXTRACTED 1.00]
- **Phase 0 Multi-Agent Foundation Roles** — docs_agent_roster_architect, docs_agent_roster_ui_ux, docs_agent_roster_frontend, docs_agent_roster_backend, docs_agent_roster_qa, docs_agent_roster_appsec, docs_agent_roster_devops [EXTRACTED 1.00]
- **Adapter Fetch to Overview Read Path** — docs_pulseboard_complete_sdlc_platformadapter, docs_pulseboard_complete_sdlc_metricsnapshot, docs_pulseboard_complete_sdlc_overview, docs_scalability_addendum_jobqueue, docs_scalability_addendum_read_vs_write_path [EXTRACTED 1.00]

## Communities (13 total, 7 thin omitted)

### Community 0 - "Auth Security Baseline"
Cohesion: 0.18
Nodes (14): AppSec Agent, Backend Agent, UI/UX Agent, AES-256-GCM, Argon2id, Email + Password Auth, MITRE ATT&CK, Phase 0 (+6 more)

### Community 1 - "Locked Planning Corpus"
Cohesion: 0.31
Nodes (11): Agent Roster, Locked Prompts, Phase 0 Restatement, Pulseboard Complete SDLC, Pulseboard, Scalability Addendum, RateLimiter, UI Direction Phase 0 (+3 more)

### Community 2 - "Adapter Snapshot Core"
Cohesion: 0.27
Nodes (10): Master AI Builder Rules, MetricSnapshot, Overview, Phase 1, PlatformAdapter, S1 Success Bar, S7 Success Bar, CacheStore (+2 more)

### Community 3 - "Zero-Cost Scale Seams"
Cohesion: 0.50
Nodes (4): Architect Agent, Zero-Cost V1 Path, Clock, Scalability Seams Principle

### Community 4 - "Deploy Scale Ladder"
Cohesion: 0.50
Nodes (4): DevOps Agent, Phase 8, S6 Success Bar, Upgrade Ladder

### Community 5 - "S2 Multi-Platform Wave"
Cohesion: 0.67
Nodes (3): Phase 2, Phase 3, S2 Success Bar

## Knowledge Gaps
- **21 isolated node(s):** `S3 Success Bar`, `S4 Success Bar`, `S5 Success Bar`, `S7 Success Bar`, `Phase 2` (+16 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Phase 0` connect `Auth Security Baseline` to `Locked Planning Corpus`, `Adapter Snapshot Core`, `S0 Foundation Bar`?**
  _High betweenness centrality (0.195) - this node is a cross-community bridge._
- **Why does `PlatformAdapter` connect `Adapter Snapshot Core` to `Auth Security Baseline`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **Why does `MITRE ATT&CK` connect `Auth Security Baseline` to `Locked Planning Corpus`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **What connects `S3 Success Bar`, `S4 Success Bar`, `S5 Success Bar` to the rest of the system?**
  _21 weakly-connected nodes found - possible documentation gaps or missing edges._