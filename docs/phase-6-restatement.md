# Pulseboard — Phase 6 Restatement (Locked)

**Status:** Phase 6 **in progress** → toward **S4**.  
**Success bar:** AI “why” + competitor hook library + drafting (fixture and/or live Gemini).  
**Depends on Human:** Optional `GEMINI_API_KEY` for live; fixtures for local UAT; quality UAT of hooks/drafts/why.  
**gstack:** `/plan-eng-review` plan locked before build; `/review` before Human sign.

## Build

- `AiProvider` gateway + fixture + Gemini providers
- Competitors: paste caption → analyze → `HookLibraryItem`
- Create: AI draft assist (fills body; no auto-publish)
- Overview: plain-language `why` on cards (cached; metrics-only prompts)
- Health phase 6 + AI subsystem

## Security (L9)

- Redact tokens/secrets before LLM
- Never send OAuth/session material
- Per-user AI rate limits
- Paste treated as untrusted (`UNTRUSTED_USER_CONTENT`)
- Sanitize model output; audit without full secret prompts

## Tests

- Redaction unit
- Fixture provider / gateway rate limit
- Paste → library tenancy
- Draft assist returns body
- Overview why attach path

## Explicit non-goals

- Sentiment / approvals (Phase 7)
- AI for metric math / fatigue formulas
- Auto competitor crawl
- Live Meta/LinkedIn Graph publish
