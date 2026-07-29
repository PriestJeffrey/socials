# Pulseboard — Complete SDLC & Build Spec

**Single source of truth.** All planning, architecture, security, and phase execution live in this file.

| Field | Locked value |
|---|---|
| **Product** | Pulseboard |
| **Status** | Planning approved — do **not** build until Human says **run Phase 0** |
| **SDLC model** | Agile + Incremental |
| **Team** | Human = decisions / UAT · AI = architecture proposals + build + tests |
| **Auth** | Email + **password** (Argon2id/bcrypt). Magic link deferred |
| **Landing one-liner** | Know what’s broken, what’s working, and what to post next. |
| **UI direction** | Premium flat dashboard bones + **selective 3D** (depth, 3D cards, subtle perspective) — mixture, not all-3D |
| **Crypto (secrets at rest)** | **AES-256-GCM** only — never SHA for encryption |
| **Security frameworks** | [MITRE ATT&CK](https://attack.mitre.org/) + NIST SSDF + OWASP ASVS L2 mindset + OWASP SAMM + SLSA-inspired |
| **Constraint** | Zero-cost V1 first; platforms step-by-step; security every phase |
| **Git** | After each **Human-approved** phase: commit + **push to GitHub** (remote source of truth) |
| **Meta developer app** | Deferred — Human sets up at **Phase 1** (not required for Phase 0) |

**Supersedes:** `pulseboard-master-plan.md` and `social-dashboard-prompt.md` (those files now redirect here).

---

## Table of contents

1. [How to use (AI + Human)](#1-how-to-use-ai--human)
2. [Operating model & roles](#2-operating-model--roles)
3. [SDLC map](#3-sdlc-map)
4. [Product vision & success bars](#4-product-vision--success-bars)
5. [Platform roadmap](#5-platform-roadmap)
6. [Requirements (SRS)](#6-requirements-srs)
7. [Tech architecture](#7-tech-architecture)
8. [Data architecture](#8-data-architecture)
9. [Security architecture](#9-security-architecture)
10. [AI system design](#10-ai-system-design)
11. [Zero-cost V1 path & V2 backlog](#11-zero-cost-v1-path--v2-backlog)
12. [Phases (build / security / test / roles)](#12-phases-build--security--test--roles)
13. [Testing strategy](#13-testing-strategy)
14. [Deployment](#14-deployment)
15. [GitHub workflow](#15-github-workflow)
16. [Logs, health & diagnostics](#16-logs-health--diagnostics)
17. [Maintenance & expansion](#17-maintenance--expansion)
18. [Risks, gaps, gates, checklists](#18-risks-gaps-gates-checklists)

---

## 1. How to use (AI + Human)

### AI builder rules

1. Read this whole document once.
2. Work **one phase at a time**.
3. Before coding: restate **Build / Security / Tests / Human inputs**.
4. After coding: run that phase’s tests; present checklist + ATT&CK residual risk.
5. **Stop** at phase boundary. Wait for Human approval.
6. Never mark a phase done without green acceptance criteria.
7. New networks = new **PlatformAdapter** modules — do not rewrite core.

### Cadence

```
Human: "Run Phase N"
  → AI: restates Build / Security / Tests / inputs needed
  → Human: confirms (or adjusts)
  → AI: implements + tests + security evidence
  → AI: stops
  → Human: UAT pass/fail
  → Only then: next phase
```

### Decision rights

| Decision | Owner |
|---|---|
| Priority, cut/keep, “phase passed” | Human |
| Stack details inside approved design, implementation, tests | AI |
| Security strength if cost/time tradeoff | Human (AI recommends) |
| New platform start order | Human (defaults below) |
| Paid API spend | Human only |

---

## 2. Operating model & roles

| SDLC role | Who | Duty |
|---|---|---|
| Stakeholder / Sponsor | Human | Budget, stop/go |
| Product Owner / PM | Human | Priority, phase approval, UAT |
| Business Analyst | AI drafts; Human confirms | Acceptance criteria |
| Project Manager | Human (+ AI status) | Phase order, blockers |
| Architect | AI proposes; Human locks | HLD/LLD, adapters |
| UI/UX | AI implements; Human taste | Landing, brand, dashboard |
| Frontend / Backend / Full-stack | AI | Build |
| QA | AI automates; Human UAT | Tests |
| Security / AppSec | AI implements; Human accepts residual risk | Layered Secure SDLC + ATT&CK |
| DevOps / Release | AI (Human owns accounts/DNS) | CI/CD, deploy |
| Support / Maintenance | Human flags; AI patches | Post-launch |
| Domain expert (social) | Human | “Is this recommendation honest?” |

---

## 3. SDLC map

| Stage | Human | AI | Outputs |
|---|---|---|---|
| Planning & feasibility | Goals, $0 V1, stop/go | Feasibility, risks | This doc |
| Requirements (SRS) | Priority, accept AC | Keep SRS precise | §6 |
| Design | Lock stack & UX | HLD/LLD, threat model, schemas | §§7–10 |
| Development | Phase approvals | Build per §12 | Source code |
| Testing | UAT | Unit/integration/security/system | Reports |
| Deployment | Hosting, go-live | CI/CD, migrate, smoke | Live URL |
| Maintenance | Triage, new platforms | Patches, adapters | Runbooks |

Security and tests run **inside** each increment — not only at the end.

---

## 4. Product vision & success bars

Pulseboard does two jobs:

1. Diagnoses connected social accounts — what’s working, what’s dead weight, what to fix (plain language).
2. Creates and publishes content from the same place, informed by niche patterns.

One tool — not five tabs across Buffer, Hootsuite, and native apps.

**Brand:** Pulseboard  
**Entry:** Landing (public) → Signup/Login → Overview  
**CTAs:** Get started (primary) · Log in (secondary)  
**Logged-in `/`:** → Overview · **Logged-out `/`:** → Landing  
**One-liner:** Know what’s broken, what’s working, and what to post next.

**North star (after core phases):** Within **30 seconds** on Overview — know what’s broken, what’s working, what to post next — and act without leaving Pulseboard.

| Bar | Meaning |
|---|---|
| **S0** | Landing + password auth + tenancy shell |
| **S1** | Instagram live → real Overview signal (win + issue) |
| **S2** | IG + FB + LinkedIn platform-specific analytics |
| **S3** | Create / calendar / publish (X = copy-to-clipboard) |
| **S4** | AI “why” + competitor hook library + drafting |
| **S5** | Approvals, sentiment, real account deletion |
| **S6** | Production + security CI + runbook |
| **S7** | Extensible adapters (Threads, TikTok, …) |

**Hard priority:** S1 (analytics signal) before S3 (create/publish).

---

## 5. Platform roadmap

**Principle:** One platform capability slice per increment.

### Wave A — V1 core (zero-cost bias)

| Order | Platform | Why | V1 mode |
|---|---|---|---|
| 1 | Instagram | Meta Graph, own-account Standard Access | Live analytics + live publish |
| 2 | Facebook | Same Meta stack | Live analytics + live publish |
| 3 | LinkedIn | Different OAuth; self-serve posting | Live where scopes allow |
| 4 | X | No free API | Compose + copy-to-clipboard; analytics manual/light |

### Wave B — Expansion

| Order | Platform | Notes |
|---|---|---|
| 5 | Threads | Meta-adjacent; confirm API at build time |
| 6 | TikTok | Separate API; video-centric metrics |
| 7+ | Future | YouTube, Pinterest, Bluesky, etc. — same adapter contract |

**Nav rule:** Don’t fake live API for unpaid/blocked networks.  
**Architecture rule:** Core talks only to `PlatformAdapter`.

---

## 6. Requirements (SRS)

### Landing & auth

- Marketing-only V1 landing (no Pricing/FAQ pages yet)
- Optional light how-it-works / platforms strip
- Email + password signup/login/logout; sessions; full logout clear
- Multi-user tenancy from day one

### Performance analysis

- Flag underperformers + likely causes (hook, time, format, CTA, caption length)
- Reach decay; shadowban-style mismatch heuristic
- Winners by engagement rate, saves, shares (separate weights)
- Patterns across winners; **plain-language** recommendations

### Metrics

- Reach/impressions, follower **growth rate**, likes/shares/saves/comments separate
- Engagement rate normalized by follower count
- Historical **snapshots** (one pull ≠ trend); cache API pulls

### Platform-specific analytics (not one template × N)

- **Instagram:** saves/shares heavy; reels vs carousel vs static; stories/hashtags if available  
- **LinkedIn:** dwell/comment quality; first-hour velocity; doc/carousel vs text vs video  
- **Facebook:** shares dominant; organic vs paid if present  
- **X:** replies/reposts vs likes; thread vs single; fast decay visuals  

Shared: unified Overview (one issue + one win per platform when data exists).

### Competitive analysis (V1)

- Manual paste of competitor captions → AI hook/structure/CTA → hook library tagged by platform

### Create / publish

- Platform-native draft + preview; schedule/publish (IG/FB/LinkedIn live; X copy)
- Calendar; repurpose; goal tags + manual conversions
- Approvals: draft → review → approved → published

### Differentiator formulas / AI

- Shadowban heuristic, content fatigue (formulas)
- Sentiment, drafting, plain-language “why” (AI / Gemini)

### Explicit V1 outs

True A/B via ads · auto competitor crawl · paid X API · ad-pixel attribution · Meta App Review for other users · LinkedIn Marketing partnership · Pricing/FAQ pages · full export

### UI feel (locked — mixture including 3D)

**Direction:** A **mixture** — solid product UI (readable dashboards, tables, forms) **plus selective 3D** for presence and hierarchy. Not a flat spreadsheet; not a pure WebGL toy either.

| Layer | Role |
|---|---|
| **Bones** | shadcn/ui — nav, forms, tables, settings, data-dense views (mostly 2D, crisp) |
| **Micro-motion** | Magic UI — shimmers, chart reveals, loading, light depth cues |
| **3D / standout** | Aceternity (and similar) — **3D cards**, perspective heroes, spotlight/depth on key surfaces |
| **Optional later** | Lightweight Three.js / React Three Fiber only if a specific moment needs true 3D (e.g. landing hero object) — not required Phase 0 |

**Where 3D belongs**

* Landing hero (Pulseboard brand + one-liner) — primary 3D moment  
* Login / signup — secondary 3D or depth treatment  
* Overview “what’s wrong / what’s right” reveal — light 3D/depth card moment  
* Optional: 1–2 feature callouts on landing  

**Where 3D does *not* belong**

* Dense analytics tables, long forms, calendar grids, settings — keep 2D and fast  
* Don’t 3D-animate every card on every page (reads as gimmicky and hurts performance)

**Rules for AI implementers**

1. Ship **mixture**: ~80% clear 2D product UI + ~20% intentional 3D/depth moments.  
2. Prefer CSS 3D / Aceternity-style components before heavy WebGL.  
3. Respect `prefers-reduced-motion` — 3D falls back to static/flat.  
4. Performance: no continuous heavy 3D on dashboard data views.  
5. Human taste-approves landing + auth 3D in Phase 0 UAT.

---

## 7. Tech architecture

### Stack (V1)

| Layer | Choice |
|---|---|
| App | Next.js (App Router) + React + TypeScript |
| UI | shadcn/ui + Magic UI micro + **selective 3D** (Aceternity 3D cards/depth; optional R3F later) |
| API | Route Handlers / server actions |
| DB | PostgreSQL + Prisma (recommended) |
| Auth | Email + password (Argon2id/bcrypt) + secure sessions |
| Jobs | DB jobs / cron (upgrade later if needed) |
| AI | Provider interface → Gemini → optional Claude |
| Host | Vercel + managed Postgres (recommended) |
| CI | GitHub Actions: lint, test, SAST, SCA, secrets |

### Logical architecture

```
[Browser] —HTTPS→ [Next.js]
  / landing | /login /signup | /overview … /settings
  Auth · Analytics · Composer · AI gateway · PlatformAdapter registry
       → PostgreSQL (AES-GCM tokens)
       → Meta / LinkedIn / … APIs
       → Gemini
```

### Adapter contract

```ts
interface PlatformAdapter {
  id: PlatformId;
  capabilities: {
    oauth: boolean;
    readMetrics: boolean;
    readPosts: boolean;
    publish: boolean;
    schedule: boolean;
    comments: boolean;
  };
  beginOAuth(userId): Promise<Url>;
  handleOAuthCallback(userId, query): Promise<Connection>;
  refreshToken(connectionId): Promise<void>;
  disconnect(connectionId): Promise<void>;
  fetchPosts(connectionId, cursor?): Promise<PostBatch>;
  fetchMetrics(connectionId, range): Promise<MetricBatch>;
  publish(connectionId, payload): Promise<PublishResult>;
}
```

### Routes

| Route | Purpose |
|---|---|
| `/` | Landing / redirect Overview if logged in |
| `/signup`, `/login` | Auth |
| `/overview` | 30-second truth |
| `/analytics/[platform]` | Platform-specific |
| `/create` | Composer |
| `/calendar` | Cadence |
| `/competitors` | Paste + hook library |
| `/approvals` | Workflow |
| `/settings` | Connections, profile, deletion |

**Nav:** Overview | Analytics ▾ | Create | Calendar | Competitors | Approvals | Settings

### Suggested repo layout

```
app/  components/  lib/{auth,db,crypto,platforms,analytics,ai,jobs}
prisma/  tests/  docs/{threat-model.md,runbook.md}
```

---

## 8. Data architecture

| Entity | Purpose |
|---|---|
| User | Email identity + password hash |
| Session | Server session |
| SocialConnection | Platform link + **AES-GCM** tokens + scopes |
| Post | Local + remote ids, status, goal tags |
| MetricSnapshot | Point-in-time metrics for trends |
| CompetitorPaste | Manual ingest |
| HookPattern | Derived library |
| ApprovalEvent | Workflow audit |
| ConversionLog | Manual attribution |
| Job | Sync/publish/refresh |
| AuditLog | Security actions (no secrets) |

**Rules:** Snapshots required · cache API · account deletion = hard cascade · never store only a blended engagement score as source of truth.

**Pipeline:** `Adapter.fetch → normalize → upsert Post → MetricSnapshot → cache invalidate → formulas → Overview`

---

## 9. Security architecture

### Principles

- Secure by design **every phase**
- Least privilege, defense in depth, evidence over intent
- Map controls to **ATT&CK** (“what would an adversary try?”)
- **Never use SHA (or any hash) as encryption**

### Cryptography policy (locked)

| Need | Algorithm | Forbidden |
|---|---|---|
| Encrypt tokens / secrets at rest | **AES-256-GCM** | SHA-*, MD5, Base64-as-security, XOR |
| Password storage | **Argon2id** (preferred) or **bcrypt** | AES so passwords can be decrypted; unsalted SHA |
| Transit | TLS 1.2+ | HTTP in production |
| OAuth state / CSRF / session ids | CSPRNG | Predictable IDs |
| Message integrity (if needed) | HMAC-SHA256 OK for signing | SHA alone to hide secrets |

**AI implementer rules:** AES-GCM for token confidentiality · Argon2id/bcrypt for passwords · Node/Web Crypto only · keys in env · never commit keys · red-flag any “hash tokens with SHA to store securely.”

### Trust boundaries

```
Users ↔ Next.js ↔ PostgreSQL (AES-GCM tokens)
                 ↔ Platform OAuth/APIs
                 ↔ AI provider (no tokens in prompts)
                 ↔ CI/CD
```

### Control layers L1–L11

| Layer | Controls |
|---|---|
| L1 Governance | Phase checklist; Human residual risk; ATT&CK review |
| L2 Identity | Password auth; httpOnly Secure SameSite cookies; logout; expiry |
| L3 Application | Validation; CSRF/OAuth state; authz; publish authz |
| L4 Data | AES-256-GCM tokens; TLS; minimal fields; hard delete |
| L5 Secrets/Crypto | This policy; env/secret manager |
| L6 Supply chain | Lockfile; pins; SCA |
| L7 Pipeline | Lint, tests, SAST, secret scan, SCA |
| L8 Adapters | Scoped OAuth; consent; AES-wrapped tokens; capabilities |
| L9 AI boundary | Redact; no tokens to LLM; rate limit; sanitize output |
| L10 Runtime | Headers; least privilege; logs without secrets; rollback |
| L11 Design | Threat model + ATT&CK map |

### MITRE ATT&CK mapping (Pulseboard-relevant)

Refs: [Enterprise matrix](https://attack.mitre.org/matrices/enterprise/) · [Tactics](https://attack.mitre.org/tactics/enterprise/)

| Tactic | Pulseboard mitigations | Phases |
|---|---|---|
| TA0043 Reconnaissance | Rate limits; minimal error detail | 0, 8 |
| TA0001 Initial Access | Validation; SAST; secure auth; MFA later | 0, 7, 8 |
| TA0002 Execution | No eval on user/AI text; SCA; CSP | 0, 6, 8 |
| TA0003 Persistence | Encrypted tokens; revoke; session invalidation | 1–5, 7 |
| TA0004 Privilege Escalation | Strict userId authz; IDOR tests | 0–5 |
| TA0005 Defense Evasion | Audit publish/auth; untrusted AI output | 5–8 |
| TA0112 Defense Impairment | Protected branches; required CI gates | 8 |
| TA0006 Credential Access | AES-256-GCM; secret scan; no tokens to LLM | 0–1, 6, 8 |
| TA0007 Discovery | Opaque IDs; no user directory; tenancy tests | 0+ |
| TA0008 Lateral Movement | Scoped OAuth; consent; publish authz + audit | 1–5 |
| TA0009 Collection | Minimal collection; encrypted fields; ACL | 1–7 |
| TA0011 C2 | Allowlist outbound; no unsafe user-controlled fetch | 6, 8 |
| TA0010 Exfiltration | AI redaction; no bulk export V1; deletion; TLS | 6–8 |
| TA0040 Impact | Confirm delete; audit; rate limits | 5, 7 |

**Every phase exit:** tactics touched → controls shipped → unmitigated residual risk for Human.

### Threat narrative (short)

| Threat | ATT&CK lens | Mitigation |
|---|---|---|
| Cross-user leak | Privilege Escalation | userId authz + tests |
| Token theft from DB | Credential Access | AES-256-GCM |
| OAuth CSRF | Initial Access | Bound cryptographic state |
| Session hijack | Credential Access | Secure cookies; rotate; expiry |
| Prompt injection | Execution / Evasion | Untrusted model output |
| Dependency / CI abuse | Initial Access / Defense Impairment | SCA + CI least privilege |
| Takeover → mass publish | Impact / Lateral Movement | Audit; disconnect; rate limits |

### Privacy

Consent on connect · AI only on approved paths · no selling platform data · deletion in V1 (S5) · export deferred to V2

---

## 10. AI system design

**Use AI for:** hook/structure/CTA analysis · voice-matched drafting · comment sentiment · plain-language “why”

**Do not use AI for:** metric math · charts · fatigue/shadowban formulas · scheduling plumbing · auth

**Gateway:** `Feature → buildPrompt(redacted) → AiProvider.complete() → validate → store/display`

Gemini free tier first · abstract provider · timeouts/backoff · per-user rate limits · never send OAuth tokens

---

## 11. Zero-cost V1 path & V2 backlog

### V1 workarounds

| Area | V1 approach |
|---|---|
| Instagram + Facebook | Meta own-account Standard Access; App Review later for other users |
| LinkedIn | Self-serve login + member posting scopes (confirm docs at build) |
| X | Draft + copy-to-clipboard; no paid API |
| Competitors | Manual paste → AI analysis |

### V2 backlog

Paid X API · auto competitor pull · Meta App Review + LinkedIn Marketing partnership · ad A/B + pixel attribution · export · Pricing/FAQ · deeper SLSA · MFA · formal observability

---

## 12. Phases (build / security / test / roles)

Legend: **AI builds** · **Human decides/UAT** · hard stop each exit.

---

### Phase 0 — Foundation, landing, auth, security baseline → **S0**

**Build**

- Next.js + Postgres + env + lockfile + `.gitignore`
- Landing `/`: Pulseboard brand + locked one-liner + Get started / Log in — **include selective 3D/depth** on hero (mixture, not all-3D)
- Email + password auth (Argon2id/bcrypt); sessions; tenancy shell — auth screens may use secondary 3D/depth
- Empty Overview + nav stubs; logged-in `/` → Overview
- PlatformAdapter interface stub
- CI skeleton (install, lint, test)
- **Structured logging helper** + **Settings → Health** stub
- Git ready; after Human approval → **commit + push to GitHub**

**Security**

- L2: secure cookies; Argon2id/bcrypt (never SHA-as-password)
- L3: signup rate limit + validation
- L4/L5: AES-256-GCM helper ready; keys from env
- L5–L7: secret scan; lockfile; CI lint/unit/secret scan
- L10: security headers baseline
- L11: threat model + ATT&CK seed (Initial Access, Credential Access, Privilege Escalation)

**Test**

- Unit: Argon2id/bcrypt; AES-GCM round-trip
- Integration: signup → login → me → logout
- Security: no cross-user access; dashboard requires auth
- UAT: landing brand/CTAs/**3D mixture feel**; auth path; mobile/desktop glance; reduced-motion still usable

**Roles:** AI = Architect/FE/BE/QA/AppSec/DevOps · Human = UAT brand + sign S0  

**Exit:** Human signs S0.

---

### Phase 1 — Instagram adapter → **S1**

**Build:** Meta Graph connect · posts/metrics · snapshots · cache · Overview + IG analytics · Settings connect/consent · **Health shows Instagram sync status**

**Security:** AES-256-GCM tokens · OAuth state CSRF · scoped OAuth · ATT&CK Credential Access / Lateral Movement · no token leakage in errors  

**Test:** OAuth state · snapshots · cache · ciphertext in DB · fixture win/issue · Human real IG UAT  

**Roles:** AI adapters/UI/tests · Human Meta credentials + UAT  

**Exit:** S1.

---

### Phase 2 — Facebook adapter → toward **S2**

**Build:** FB connect · FB metric hierarchy · Overview IG+FB · hardened Meta client  

**Security:** separate connections/scopes · authz on every metrics route · SCA · regression  

**Test:** adapter contract · two-user tenancy · Human FB UAT  

**Exit:** IG + FB live.

---

### Phase 3 — LinkedIn + formulas → **S2**

**Build:** LinkedIn OAuth (confirm scopes) · LinkedIn-specific UI language · fatigue + shadowban formulas  

**Security:** token isolation · consent scopes · minimal field allowlist · threat-model delta  

**Test:** formula units · sync · disconnect deletes tokens · Human UAT  

**Exit:** S2 for IG/FB/LinkedIn.

---

### Phase 4 — X manual → four surfaces honest

**Build:** X nav with compose/copy capabilities only · clear “not auto-publish” labeling · stub adapter  

**Security:** no fake OAuth secrets · UI cannot call missing publish APIs  

**Test:** capability flags · clipboard · Human messaging UAT  

**Exit:** Four platforms truthful.

---

### Phase 5 — Create, calendar, publish → **S3**

**Build:** Composer + previews · schedule/publish IG/FB/LinkedIn · X copy · calendar · goal tags · manual conversions · rule-based repurpose  

**Security:** publish authz · audit log · access-controlled drafts · idempotent publish · ATT&CK Impact  

**Test:** publish integration · cannot publish as other user · schedule path · Human live posts  

**Exit:** S3.

---

### Phase 6 — AI + competitors → **S4**

**Build:** Gemini provider · paste → hook library · drafting · plain-language why  

**Security:** L9 redaction · no tokens to LLM · rate limits · prompt-injection threat model · payload fixture tests  

**Test:** provider mock · paste→library · redaction · Human quality UAT  

**Exit:** S4.

---

### Phase 7 — Approvals, sentiment, polish, deletion → **S5**

**Build:** draft→review→approved→published · sentiment where available · UI polish (restrained motion + overview 3D/depth moment) · account deletion

**Security:** authz on approvals · hard-delete cascade · server-side state machine · SAST green  

**Test:** state machine · deletion empties user data · sentiment resilience · Human UX + delete dry-run  

**Exit:** S5.

---

### Phase 8 — Deploy + hardening → **S6**

**Build:** production host · migrations · TLS · CI SAST/SCA/secret scan · monitoring · runbook  

**Security:** full L7 · L10 hardening · CI evidence · optional SBOM  

**Test:** prod smoke (landing→signup→login→overview→connect→create) · security regression · Human signs 30-second north star  

**Exit:** S6 — **V1 core complete.**

---

### Phase 9 — Threads · Phase 10 — TikTok · Phase 11+ — future apps → **S7**

**Pattern:** Human names platform → AI researches cost/API → Human go/no-go → adapter + UI + tests + L8/L11 security pack → UAT → enable in nav.

---

## 13. Testing strategy

| Type | When |
|---|---|
| Unit | Every phase with logic |
| Integration | Auth, DB, adapters, AI |
| Security | Tenancy, AES ciphertext, OAuth state, AI redaction, publish authz |
| System / smoke | Phase 8+ and each Wave B adapter |
| UAT | Human every phase exit |

**Phase DoD:** checklist green + security evidence + ATT&CK residual note + Human sign-off.

---

## 14. Deployment

**Envs:** Local · Preview (optional) · Production  

**Pipeline:** PR → CI (lint, tests, SAST, secret scan, SCA) → merge → deploy + migrate → smoke → monitor  

**Secrets (examples):** `DATABASE_URL` · `SESSION_SECRET` · `TOKEN_ENCRYPTION_KEY` · `GEMINI_API_KEY` · Meta/LinkedIn secrets · `APP_URL`

**Smoke:** Landing + brand · signup/login/logout · Overview authz · connect path · create path · no secrets in client bundle

---

## 15. GitHub workflow

### Should we push every time code is approved?

**Yes — after each Human-approved phase exit, commit and push to GitHub.**

That keeps a remote backup, a clear history of what passed UAT, and a place for CI to run. Do **not** wait until the whole product is finished.

| When | Action |
|---|---|
| During a phase (WIP) | Local commits OK; push optional if you want backup mid-phase |
| **Human says phase passed** | AI (or Human): commit with message `phase-N: …` → **push to `main`** (or merge PR → main → push) |
| Phase failed / revert | Fix on a branch; do not leave broken approved state on main |
| Secrets | Never commit `.env` / keys — only `.env.example` |

**Solo default (you + AI):**

1. Phase 0 creates the repo and connects `origin` on GitHub (Human creates empty repo; AI pushes).  
2. Work on `main` or `phase-N` branches — Human’s choice at Phase 0 start (default: `phase-N` → PR/merge to `main` after approval).  
3. **Approved = on GitHub.** Local-only approved code is not “done.”

**Not required:** Pushing every tiny save while still building a phase — only the **approved** checkpoint must be pushed.

---

## 16. Logs, health & diagnostics

Yes — the plan now **requires** this. You need to see **what’s working vs what broke** without guessing.

### Three layers

| Layer | What you see | When |
|---|---|---|
| **A. In-app Health / Status** | Per platform: connected? last sync OK/fail? token expired? last publish OK/fail? AI provider reachable? | From Phase 1+ (shell in Phase 0) |
| **B. Structured app logs** | Server logs with `phase`, `component`, `level`, `message`, `requestId` — never tokens/passwords | Phase 0 foundation; used every phase |
| **C. Error monitoring (prod)** | Aggregated crashes/exceptions (e.g. Sentry free tier) + alerts | Phase 8 (can wire earlier if Human wants) |

### A. In-app Health panel (Settings → Health, or Overview strip)

For each integration / subsystem, show status:

| Subsystem | Healthy | Degraded / broken |
|---|---|---|
| App auth / session | Login works | Session errors |
| Database | Connected | Connection failed |
| Instagram / Facebook / LinkedIn / X | Last sync timestamp + OK | Error message + “Reconnect” |
| Publish / scheduler | Last job OK | Failed job + reason |
| AI (Gemini) | Last call OK | Quota/error |

This answers: *“which part broke, which part is working”* inside the product.

### B. Structured logging rules

* Log: auth failures (no passwords), OAuth callback failures, sync start/end, publish results, AI failures, unhandled errors  
* Levels: `info` / `warn` / `error`  
* Correlate with `requestId` or `jobId`  
* **Never** log access tokens, refresh tokens, passwords, or full AI prompts that contain secrets  
* Local: pretty console or file; Prod: host log stream + optional Sentry  

### C. Audit vs debug

| Store | Purpose |
|---|---|
| `AuditLog` (DB) | Who published / connected / deleted (security trail) |
| App logs | Why something failed (ops/debug) |
| Health UI | Human-readable “green/red” without reading log files |

### Phase hooks

* **Phase 0:** logging helper + empty Health page stub (“systems will appear as they’re connected”)  
* **Phase 1+:** each adapter updates Health + logs sync success/fail  
* **Phase 5:** publish/job outcomes in Health + logs  
* **Phase 6:** AI status in Health  
* **Phase 8:** Sentry (or equivalent) + runbook “how to read logs”

---

## 17. Maintenance & expansion

### Runbook themes

OAuth expiry → reconnect · Gemini quota → backoff/upgrade · API scope change → adapter patch · failed scheduled publish → retry + UI · incident → revoke sessions / rotate secrets / disconnect

### Cadence

| Activity | Frequency |
|---|---|
| SCA / dependency review | Weekly / on CI fail |
| Threat model + ATT&CK delta | Each adapter/auth change |
| Backup restore drill | Quarterly (post-prod) |
| Recommendation quality UAT | Ongoing (Human) |

### Expansion playbook

1. Human names platform + priority  
2. AI researches API/cost/review  
3. Human go/no-go  
4. Adapter + UI + tests + security  
5. UAT · enable nav · update Overview  

Never fork core analytics for a one-off network.

---

## 18. Risks, gaps, gates, checklists

### Risk register

| Risk | Mitigation |
|---|---|
| LinkedIn scope/docs shift | Confirm at Phase 3; degrade gracefully |
| Meta App Review later | Multi-user app auth early; social multi-tenant later |
| Gemini rate limits | Queue/cache; Human upgrade |
| UI polish scope creep | 3D only on agreed surfaces; data views stay 2D |
| Build all platforms at once | Strict phase order |
| Prompt injection | No autonomous tools from model output |
| Secret leakage in chat/logs | Env only; redaction; Human rotates |

### Planning gaps (still open / deferred)

1. ~~Auth~~ → **password locked**  
2. ~~One-liner~~ → **locked**  
3. ~~UI 3D mixture~~ → **locked**  
4. Exact hosting vendor + domain  
5. Legal: Terms, Privacy, cookies (before public multi-user)  
6. MFA / passkeys (post-S6)  
7. Full error-monitoring product (Sentry) — **Phase 8** (Health UI + structured logs start earlier)  
8. DR RPO/RTO + restore proof  
9. WCAG bar · i18n · signup bot protection detail · AI content policy  
10. SOC2 (not required solo V1) · native mobile (out)  
11. **Meta developer app** — Human at **Phase 1** (confirmed deferred)

### Go / no-go gates

| Gate | Condition |
|---|---|
| Start build | Human: **run Phase 0** |
| Phase advance | Checklist + security + ATT&CK residual + Human UAT |
| Production | Phase 8 smoke + Human go-live |
| Wave B platform | Research memo + Human go/no-go |
| Paid APIs | Explicit Human approval |

### Human checklist

- [x] Approve unified plan  
- [x] Auth = password  
- [x] One-liner locked  
- [x] UI = mixture with **selective 3D**  
- [x] Git: push after each approved phase  
- [x] Health/logs: in-app status + structured logs (Sentry at Phase 8)  
- [x] Meta developer app: deferred to Phase 1  
- [ ] Create GitHub repo when starting Phase 0  
- [ ] Hosting / Postgres when needed  
- [ ] Say **run Phase 0**

### AI checklist (before any code)

- [ ] Read **this** document  
- [ ] Confirm phase number  
- [ ] Restate Build / Security / Tests / Human inputs  
- [ ] Implement only that phase  
- [ ] Stop for approval  

---

**End of complete spec.**  
Next Human action: say **run Phase 0** to start building — or request edits to this document first.
