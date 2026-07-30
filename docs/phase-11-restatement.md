# Pulseboard — Phase 11 Restatement (Locked)

**Status:** Phase 11 **in progress** → deepens **S2** analytics surface (toward S7 polish).  
**Focus:** Replace `/analytics` stub with platform-specific analytics (snapshot-only).  
**gstack:** Restatement → build → `/review` before Human sign.

## Build

- `/analytics` hub: connected status + links per platform
- `/analytics/[platform]` for Instagram, Facebook, LinkedIn, Threads, TikTok
- `/analytics/x` honest light page (no API metrics)
- Reader: `MetricSnapshot` + `Post` from DB only (never Graph on request path)
- Platform-native metric emphasis (not one template × N)
- LinkedIn fatigue / shadowban heuristics when metric keys present
- Health phase **11**

## Security

- Session-gated routes (middleware + layout)
- All queries scoped by `userId`
- No tokens / fixture posture leak beyond authenticated Health

## Tests

- Unit: platform reader formatting, X manual mode, invalid platform
- Integration: fixture sync → analytics metrics; cross-user isolation

## Human inputs

- Fixture UAT across connected platforms
- Sign or defer Phase 11 exit (does not auto-sign S2)
