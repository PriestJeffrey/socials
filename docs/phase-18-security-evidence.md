# Pulseboard — Phase 18 security evidence (Twitch)

**Verdict:** Fixtures-first **go**. Live broadcast/publish **no-go**.

## Threats → controls

| Threat | Control | Where |
|---|---|---|
| OAuth CSRF | Signed OAuth state bound to userId | `oauth-state`, start/callback |
| Token theft at rest | AES-256-GCM | `adapter` encrypt/decrypt |
| Cross-tenant sync/disconnect | `userId` + connection ownership checks | adapter, sync, actions |
| Anonymous health leak | Public liveness only (no fixture posture) | `getPublicLiveness` |
| Accidental live publish | `publish: false` + throw | adapter.publish |

## Residual

- Helix rate limits (retry later)
- Client-Id is public; Client-Secret must never reach browser (server-only env)
- Refresh rotation depends on Twitch refresh_token presence

## ATT&CK

Stolen OAuth (T1528-ish): mitigate with encrypted at-rest tokens, no client exposure, reconnect-on-expiry.
