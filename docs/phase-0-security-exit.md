# Phase 0 Security Exit — signed

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
- Integration/security: `tests/integration/auth-tenancy.test.ts`
- CI: `.github/workflows/ci.yml`
- gstack: `/plan-design-review` (landing) + `/review` (pre-S0); redirect-loop + race fixes landed

## Residual risk
| Risk | Accept? |
|---|---|
| No MFA | [x] |
| Local TLS deferred | [x] |
| In-memory rate limit | [x] |
| Light SCA/SAST | [x] |

## Human decision
- [x] Accept residual risk and sign **S0**
- [ ] Block — fixes: _______________

Signed: **PriestJeffrey** Date: **2026-07-29**  
Authority: Human message “S0 signed — run Phase 1”
