# Phase 0 Security Exit — draft for Human

## Tactics touched
TA0043 · TA0001 · TA0004 · TA0006 · TA0007 · (partial) TA0002

## Controls shipped
- L2: Argon2id, httpOnly Secure SameSite cookies, session expiry, logout (+ `auth.logout` audit)
- L3: validation, signup/login rate limit (+ audit), Overview auth gate via validated session in `app/(app)/layout.tsx`
- L4/L5: AES-256-GCM helper; env keys; `.env` gitignored; `SESSION_SECRET` for OAuth state HMAC
- L5–L7: lockfile + CI lint/unit/secret-scan
- L10: security headers baseline; structured log redaction
- L11: `docs/threat-model.md` seed

## Evidence
- Unit: `tests/unit/{password,aes,logger,seams}.test.ts`
- Integration/security: `tests/integration/auth-tenancy.test.ts` (password, session hash, tenancy-scoped Overview read, audit, DbJobQueue dedupe, OAuth state, IG stub, rate limit)
- CI: `.github/workflows/ci.yml`
- gstack add-on (locked): `docs/gstack-phase-addon.md` — Phase 0 used `/plan-design-review` for landing; run `/review` before S0 sign

## Residual risk
| Risk | Accept? |
|---|---|
| No MFA | [ ] |
| Local TLS deferred | [ ] |
| In-memory rate limit | [ ] |
| Light SCA/SAST | [ ] |

## Human decision
- [ ] Accept residual risk and sign **S0**
- [ ] Block — fixes: _______________

Signed: __________ Date: __________
