# Pulseboard Threat Model (seed) — Phase 0 → S0

## Meta
- Version / Phase: 0 → S0
- Frameworks: ATT&CK · NIST SSDF · ASVS L2 mindset · SAMM · SLSA-inspired
- Trust boundaries: Users ↔ Next.js ↔ Postgres ↔ CI/CD
- Out of scope Phase 0: Platform OAuth, AI provider

## Assets (Phase 0)
1. User credentials (password hashes — Argon2id)
2. Session identifiers / cookies
3. Encryption keys (`TOKEN_ENCRYPTION_KEY`)
4. User PII (email)
5. Repo secrets / lockfile integrity
6. Authz boundary (userId tenancy)

## Data flows
- Signup → validate → rate limit → hash password → User → Session cookie
- Login → verify → Session → cookie
- me / Overview → require session → scope by userId
- Logout → delete session + clear cookie
- AES helper: encrypt/decrypt round-trip only (no SocialConnection yet)

## ATT&CK seed

| Tactic | Control shipped |
|---|---|
| TA0043 Reconnaissance | Signup rate limit; generic auth errors |
| TA0001 Initial Access | Validation; Argon2id auth; headers |
| TA0002 Execution (partial) | No eval; CSP baseline |
| TA0004 Privilege Escalation | userId-scoped queries; requireUser |
| TA0006 Credential Access | Argon2id; AES-GCM helper; httpOnly cookies; secret scan |
| TA0007 Discovery | Opaque ids; `/me` returns self only |

## Residual risk (Human accept)
| Risk | Severity | Notes |
|---|---|---|
| No MFA | Med | V2 backlog |
| Local HTTP / no edge TLS | Low–Med | Until Phase 8 host |
| In-memory rate limits | Med | Multi-instance weak until Redis |
| Light SCA/SAST | Med | Deepen Phase 6–8 |
| AES helper unused for OAuth yet | N/A | Phase 1 |

## Phase exit
Tactics touched → controls above → residual table → Human sign-off S0.
