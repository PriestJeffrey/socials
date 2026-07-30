# Pulseboard — Phase 8 Restatement (Locked)

**Status:** Phase 8 **in progress** → toward **S6** (V1 core complete).  
**Success bar:** Production-ready packaging, full L7 CI (lint/tests/SAST/SCA/secrets), L10 headers, runbook, smoke path.  
**Human:** Hosting account/DNS, production secrets, go-live smoke sign-off.

## Build

- Expand CI: SCA (`npm audit`) + lightweight SAST (ESLint security rules / `npm run sast`)
- Docker image + compose `app` service (migrations on boot)
- Next `standalone` output + hardened headers (HSTS in production)
- Production runbook (deploy, rollback, logs, cron, incidents)
- Optional Sentry DSN env (no hard crash if unset)
- Health phase 8 + deploy/runtime row
- Local smoke script: landing → login → overview

## Security

- L7: lint, unit/integration, secret-scan, SCA, SAST
- L10: security headers, `poweredByHeader: false`, least-privilege CI permissions
- Never commit `.env`; document rotation in runbook

## Tests

- Headers unit/config assertion
- Smoke script exits 0 against local server (manual/CI optional)
- Existing suite remains green

## Explicit non-goals

- Paid X / Threads / TikTok (Phase 9+)
- Meta App Review for other users
- Formal SBOM upload (optional note only)
