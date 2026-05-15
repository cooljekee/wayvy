# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Team — always active

Three specialist skills are always on in this project. **Before starting any task, read the relevant skill file.** If a task spans multiple domains, read all relevant files.

| Domain | Skill file | Trigger |
|---|---|---|
| UI / design / components / tokens / copy | [`.claude/skills/wayvy-ux-ui-designer.md`](.claude/skills/wayvy-ux-ui-designer.md) | Any screen, component, design token, visual, or copy question |
| iOS / Swift / SwiftUI / Xcode / CoreLocation / Yandex MapKit | [`.claude/skills/wayvy-swift-developer.md`](.claude/skills/wayvy-swift-developer.md) | Any `.swift` file, iOS architecture, MapKit integration, GPS, auth, photo upload |
| Backend / Go / PostgreSQL / PostGIS / Redis / Docker / Nginx | [`.claude/skills/wayvy-go-developer.md`](.claude/skills/wayvy-go-developer.md) | Any `.go` file, SQL migration, Docker Compose, API design, geo query |

**Cross-domain rule:** when writing iOS code, also apply the designer skill audit rules. When writing backend endpoints, also check the iOS skill to match the request/response shape the client expects.

**Self-review:** after completing any task, run the checklist from the relevant skill before reporting done.

---

## What this repo is

**Wayvy** — iOS social network for urban walks. Users record GPS routes, drop waypoints (photos + voice + square video), create local events, discover friends' activity on a map. Russian-speaking cities. Pre-MVP.

Tech stack: Swift 6 + SwiftUI · Yandex MapKit · Go microservices · PostgreSQL + PostGIS · Redis · Cloudflare R2 · Docker Compose.

No Swift or Go code exists yet — the repo is currently design system + planning documents.

---

## Key files

| What | Where |
|---|---|
| **Designer skill** — tokens, components, patterns, copy rules | `.claude/skills/wayvy-ux-ui-designer.md` |
| **Swift skill** — iOS architecture, MapKit, CoreLocation, tokens→Swift | `.claude/skills/wayvy-swift-developer.md` |
| **Go skill** — microservices, PostGIS, Redis, Docker, API contracts | `.claude/skills/wayvy-go-developer.md` |
| CSS design tokens (colors, type, spacing, motion, shadows) | `design-system/colors_and_type.css` |
| Interactive iOS prototype (open in browser) | `design-system/ui_kits/ios/index.html` |
| Component library (React/JSX, web stand-in for SwiftUI) | `design-system/ui_kits/ios/` |
| Component preview cards (HTML) | `design-system/preview/` |
| Product architecture + data model spec | `docs/superpowers/specs/2026-05-15-wayvy-design.md` |
| Design references (Strava, Komoot, AllTrails, Google Maps…) | `docs/superpowers/specs/design-references.md` |

---

## Design system quick-reference

**Three accents only — never invent a fourth:**
- `#FF5A4E` Coral — own routes, recording, primary CTA
- `#14B8C7` Teal — followed users' routes
- `#F4B740` Amber — events only

**Grid:** 8pt strict. Off-grid `4` and `12` allowed only for hairlines and dense rows.

**Radii allowed:** `4 / 8 / 12 / 14 / 16 / 18 / 20 / 28 / 999`

**Fonts (web):** Bricolage Grotesque (display) · Manrope (body) · JetBrains Mono (code)
**Fonts (iOS production):** SF Pro Display · SF Pro Text

**Dark mode is first-class.** Default to dark on every new screen.

**Copy:** Russian · informal `ты` · sentence-case · brutally short.

---

## Architecture (from spec)

```
iOS App (Swift/SwiftUI)
    ↕ HTTPS/REST
API Gateway (Nginx — JWT auth, rate limiting)
    ↓
user-service │ route-service │ event-service │ media-service
    ↓
PostgreSQL + PostGIS │ Redis │ Cloudflare R2
```

Four microservices:
- **user-service** — auth/JWT, profiles, follow graph
- **route-service** — GPS tracks (PostGIS LineString), waypoints, geo queries
- **event-service** — events with geo filter, time filter
- **media-service** — photo upload → compress → R2, presigned URLs

Four tabs: **Карта** (own map) · **Карта·все** (friends discovery) · **События** · **Профиль**

Central **Record FAB** always visible except during active recording (replaced by RecordingHUD).

**GPS recording:** CoreLocation buffers points in memory every 5 s. On Stop → assembles full array → single POST to route-service as LineString.

**Waypoint duality:** a waypoint can be route-linked (`route_id` set) or standalone (`route_id = null`). These surface differently on the map and open different sheets on tap — this is a first-class distinction, not an edge case.

---

## Audit rules (run on every file you open)

Flag and fix anything that violates:
- Color not in `colors_and_type.css` → reject
- Padding `5 / 7 / 9 / 11 / 13` → reject (8pt grid)
- Radius outside allowed set → reject
- Font other than Bricolage / Manrope / JetBrains Mono (web) or SF Pro (iOS) → reject
- English copy in UI chrome → reject
- Emoji in buttons / nav / system messages → reject
- Left-border-accent stripe on cards → reject
- Gradient on primary surfaces (except coral profile cover and amber EventCard ribbon) → reject
- Fourth accent color → reject
- Circular video tile → reject (videos are square 1:1, radius 12)
- `private` visibility on events → reject (events are public or followers only)
