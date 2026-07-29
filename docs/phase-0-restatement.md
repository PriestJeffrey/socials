# Pulseboard — Phase 0 Restatement (Locked)

**Status:** Phase 0 **foundation complete for S0 sign-off** (Human UAT + security exit pending).  
**Success bar:** S0 — Landing + password auth + tenancy shell.  
**Product one-liner:** Know what's broken, what's working, and what to post next.
**Password KDF:** Argon2id (locked).
**Branch default:** A) `phase-0` → PR → `main`.

**Ready for Phase 1 after S0:** Prisma foresight (`SocialConnection`, `Post`, `MetricSnapshot`, `Job`), IG adapter stub, OAuth state helper, `DbJobQueue`/`JobRunner`.

---

## Build

- Next.js App Router + TypeScript + Postgres/Prisma + lockfile + `.gitignore`
- Landing `/`: Pulseboard brand + locked one-liner + Get started / Log in + selective 3D hero (signal-stack)
- Auth `/signup` `/login`: Argon2id (preferred), DB sessions, httpOnly Secure SameSite cookies
- Empty `/overview` + nav stubs; logged-in `/` → Overview; logged-out `/` → Landing
- Settings → Health stub; structured logger; AES-256-GCM helper; `PlatformAdapter` interface + empty registry only
- CI: install, lint, unit (+ Postgres service), secret-scan
- UI: chalk/ink/pulse-teal; Fraunces + Plus Jakarta Sans; ~80% flat product UI + ~20% selective 3D
- **Scalability seams (locked):** `RateLimiter`, `CacheStore`, `JobQueue`/`JobRunner`, `Clock` interfaces with memory/DB defaults; Prisma singleton; Overview reads snapshots only

## Security

- L2 cookies + Argon2id · L3 validation + signup rate limit · L4/L5 AES helper + env keys
- L5–L7 lockfile + secret scan + CI · L10 headers · L11 threat-model seed
- ATT&CK: TA0043, TA0001, TA0004, TA0006, TA0007 (+ partial TA0002)
- Residual: no MFA, local TLS, light SCA/SAST, in-memory rate limits, OAuth not yet

## Tests

- Unit: Argon2id, AES round-trip/tamper, logger redaction
- Integration: signup → login → me → logout
- Security: auth gate, IDOR/tenancy, cookie flags, rate limit, no secrets in client
- UAT: brand/CTAs/3D mix, auth path, mobile + reduced-motion
- Tooling: Vitest + Playwright + Postgres test DB

## Human inputs

1. Say **run Phase 0** to start coding
2. Create empty GitHub repo; hand remote URL
3. Branch: **A)** `phase-0` → PR → `main` (recommended) or **B)** `main` only
4. ~~Confirm Argon2id~~ → **confirmed**
5. Local Postgres available (Docker OK); hosting can wait
6. Branch default: **A)** `phase-0` → PR → `main` (assumed unless you say otherwise)

## Exit

Human signs S0 after checklist + security evidence + ATT&CK residual + UAT. Then `phase-0: …` commit + push to GitHub.
