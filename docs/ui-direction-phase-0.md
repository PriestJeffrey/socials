# Pulseboard â€” UI / Visual Direction (Phase 0 Locked)

## Mood

Calm operations room for social content â€” â€œsignal board.â€ Not SaaS purple, not cream-terracotta editorial, not broadsheet. Premium flat dashboard bones + one theatrical 3D moment on marketing/auth.

## Palette (CSS variables)

| Token | Value | Role |
|---|---|---|
| `--pb-ink` | `#0B1F2A` | Primary text, brand |
| `--pb-slate` | `#3D5563` | Body / support |
| `--pb-chalk` | `#F3F6F4` | Page ground |
| `--pb-fog` | `#E4EBE7` | Subtle panels |
| `--pb-pulse` | `#0D9F8A` | Primary CTA |
| `--pb-pulse-deep` | `#087A6A` | Hover |
| `--pb-warn` | `#C45C26` | Broken / attention |
| `--pb-ok` | `#2F7D4A` | Working |
| `--pb-card` | `#FFFFFF` | Flat surfaces |
| `--pb-line` | `#C9D5CF` | Dividers |

Atmosphere: chalkâ†’fog diagonal wash + low-contrast dot grid. Light-first (no dark-default). Landing: **full-bleed** atmosphere/vignette/quiet stage; content stays in ~`max-w-6xl` (poster energy without edge-to-edge type).

## Typography

- Display / brand: **Fraunces** (600â€“700)
- UI / body: **Plus Jakarta Sans** (400â€“600)
- Avoid: Inter, Roboto, Arial, system stacks

## Landing first viewport

Brand (hero-level, loudest) â†’ locked one-liner â†’ one support sentence â†’ CTA pair (**Create your board** / Log in) â†’ dominant 3D signal-stack visual. No badges, stats, or overlays on hero. No Phase-1 / Instagram disclaimer in hero.

### Landing 3D (B+C remix â€” locked 2026-07-29)

- **Hierarchy:** Brand wins; stage plane is low-contrast atmosphere only; punch lives in the stack.
- **Stack:** Steeper CSS perspective, specular / thick slabs, Broken / Working / Next post (Aceternity-style CSS 3D, no WebGL).
- **Stage:** Quiet angled glass plane + soft ground under stack (from variant B); never louder than brand.
- **Logo dock (footer):** Pill dock with monochrome SVG glyphs â€” Instagram, Facebook, X, Threads, TikTok. Hover/focus â†’ `--pb-pulse`; visible focus ring; â‰¥44px targets; `aria-label` + `title`; no permanent text labels under icons. Links stay `live: false` (non-navigating) until real handles are set — no 404s at UAT.

### Mobile landing (`<lg`)
Stack below CTAs (not hidden); compact height (~220–280px); slightly calmer stage (lower opacity/scale) for a shorter first screen. Logo dock wraps in the pill.

## Auth

Secondary depth only; forms stay flat. Mobile may drop 3D behind form.

## Overview

Flat shadcn shell only in Phase 0 â€” no 3D. Nav: Overview | Analytics â–¾ | Create | Calendar | Competitors | Approvals | Settings.

Post-auth empty Overview must feel warm and honest (not a dead â€œNo itemsâ€) and point toward connecting a platform when Phase 1 lands â€” separate from landing composition.

## Motion

1. Landing 3D idle float/tilt (default / motion-OK)
2. CTA hover / hero copy enter — staggered fade-up ~400ms (brand → tagline → support → CTAs); punchier stack float; no scroll parallax
3. Auth soft settle

`prefers-reduced-motion`: keep 3D pose + stage + specular; **no** idle float/tilt (`animation: none`). Not fully flat unless we later revisit.

## Stack mix

shadcn bones Â· Magic UI micro Â· Aceternity-style CSS 3D (no WebGL in Phase 0).

## Design system home

Phase 0 source of truth: this file. Full `DESIGN.md` deferred to `/design-consultation` (do not dual-write).



