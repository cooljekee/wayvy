# Wayvy — Design System

> **Wayvy** is a social network for urban walks and travel. iOS-first. Users record GPS routes, drop waypoints with photos, create local events, and discover their friends' activity on a map. Used outdoors, in motion, in any weather.

> **✨ `SKILL.md` is the canonical product + design source of truth.** This README is overview-only. For data model, tokens, components, patterns, copy rules, and the do/don't list, always read `SKILL.md` first.

This design system is the source of truth for everything that ships under the Wayvy name — colors, typography, motion, components, copy. It is built directly from the project's design spec (Russian: `docs/wayvy-design-spec.md`) and the curated references guide (`docs/design-references.md`).

---

## Source materials

| What | Where |
|---|---|
| Product spec (architecture, data model, navigation) | [`docs/wayvy-design-spec.md`](docs/wayvy-design-spec.md) |
| Design references guide (8 referenced apps + 2026 trends) | [`docs/design-references.md`](docs/design-references.md) |
| Source repo | <https://github.com/cooljekee/wayvy> |

Both source docs were imported from the Wayvy GitHub repo's `docs/` folder; the repo is pre-MVP and contains no Swift code yet, so this design system is built from **the spec and reference docs only**, not from screenshots or an existing app. Explore the repository for the latest planning material.

> If anyone reading this gains access to an actual Swift/SwiftUI codebase later, treat _that_ as the source of truth — these tokens were forward-designed from the spec.

---

## Quick index

```
.
├── README.md                  ← you are here
├── SKILL.md                   ← cross-compatible Claude Skill entrypoint
├── colors_and_type.css        ← all CSS variables (colors, type, spacing, motion)
├── assets/                    ← logos, app icon, source SVG marks
├── docs/                      ← imported spec + reference docs
├── preview/                   ← Design-System tab cards (each one ~700×N)
└── ui_kits/
    └── ios/                   ← interactive iOS prototype
        ├── index.html         ← run this to see the kit
        ├── App.jsx
        ├── Screens.jsx        ← Map / Recording / Events / Profile
        ├── Map.jsx            ← Yandex-style map background, pins, polylines
        ├── Chrome.jsx         ← search pill, control stack, tab bar, FAB
        ├── Cards.jsx          ← RouteCard, EventCard, FollowRow, VisibilityBadge
        ├── RecordingHUD.jsx   ← floating active-recording bar
        ├── WaypointSheet.jsx  ← bottom sheet for adding points
        └── ios-frame.jsx      ← iPhone device shell
```

---

## Content Fundamentals

**Language.** Russian-first (`ru-RU`). The product is built for Russian-speaking cities; English copy is secondary and only appears in developer-facing surfaces. All UI strings should be authored in Russian, then localised.

**Tone.** Urban, alive, unfussy. Closer to a friend's text message than a corporate notice. Treat the user as a peer who's already out walking the city — don't explain what a city _is_.

**Person.** Use the **informal "ты"** form throughout. The product is personal. Avoid "Вы" outside of formal/legal screens.

**Casing.** Sentence case for everything except acronyms — _never_ Title Case headers in Russian (it reads English-translated). Buttons are sentence-case verbs: `Записать`, `Сохранить`, `Иду`. Section eyebrows use ALL CAPS with letter-spacing `0.06em` — short labels only (≤16 chars).

**Length.** Brutally short. Buttons 1–2 words. Card titles ≤4 words. Body copy never exceeds 2 lines on a card. The exception is event/route descriptions, which can be free-form (user content).

**Pronouns & ownership.** Address the user with "ты": _"Твои маршруты"_, _"Твои подписки"_. Refer to others by name or handle, not "user" / "пользователь".

**Numbers.** Russian decimal comma (`3,4 км`, not `3.4 km`). Use the local short-form unit suffix lowercase, no period (`км`, `мин`, `м`, `ч`). Tabular numerals are mandatory for any HUD readout.

**Time.** 24-hour. Dates in Russian short form: "15 мая", "вс 18:00". Relative time for recent items: "2 часа назад", "вчера".

**Emoji.** Sparingly, **only in user-generated content** (event titles, descriptions, comments) — never in chrome, buttons, navigation, or system messages. Wayvy chrome relies on iconography, not emoji.

**Sample copy:**

| Surface | Copy |
|---|---|
| Map FAB | `Записать` |
| Recording HUD label | `ЗАПИСЬ` |
| Stop confirmation toast | `Маршрут сохранён · 3,4 км` |
| Empty events state | `Ничего на этой неделе. Создай первое.` |
| Follow back nudge | `Подписаться в ответ` |
| Visibility chip | `Публичный` / `Подписчики` / `Приватный` |
| Waypoint sheet title | `Новая точка` |
| Waypoint address line | `Покровка, 27 · Москва` |

---

## Visual Foundations

**Mood.** Urban-lively. Strava-bold readout numbers, Komoot-muted chrome. The map is the product; everything else floats above it without competing.

**Color.**

- **Primary accent: Coral `#FF5A4E`** — used for the user's own routes, the recording state, the primary CTA. Energetic, readable in motion, distinguishable on both light and dark map tiles.
- **Secondary accent: Teal `#14B8C7`** — exclusively for followed users' routes. The two polyline colors are deliberately harmonious (both saturated, similar value) so a mixed map reads as one design.
- **Tertiary: Amber `#F4B740`** — reserved for the amber EventCard ribbon and event icon strokes. **Event-pins on the map use a dark date chip** (`#0E1116` bg, coral day) matching the EventCard.
- **Neutrals: warm ink scale `#0E1116 → #FFFFFF`** — slightly cool-blue, never pure black. Urban, not corporate.
- **Dark mode is first-class.** Off-black floor `#0B0D11`. Used at night, in city streets.

Full scales: see `colors_and_type.css` and the preview cards.

**Typography.**

- **Display**: Bricolage Grotesque (web substitute for SF Pro Display). Use for screen titles, hero numbers (distance/time), card headings.
- **Body / UI**: Manrope (web substitute for SF Pro Text). Use for everything else.
- **Mono**: JetBrains Mono. Use only for code, debug overlays, or token tables.
- **HUD numbers** use `font-variant-numeric: tabular-nums` always — non-tabular widths jitter while a value ticks.
- Letter-spacing: `-0.02em` on display, default on body. Never expand.

**Spacing.** Strict **8pt grid** (AllTrails-style). Off-grid units `4` and `12` exist only for hairline alignment and dense list rows. No half-pixels, no magic numbers.

**Radii.** Generous and consistent: `4 / 8 / 12 / 16 / 20 / 28 / 999`. Sheets and large cards use `28`. Pills and FABs use `999`. Buttons default to `14`.

**Shadows.** Soft, layered, never dramatic — map UI _floats_, it doesn't ground. Four tiers:

| Token | When |
|---|---|
| `shadow-1` | Hairline lift — row hover, subtle tile |
| `shadow-2` | Cards, sheets in their natural state |
| `shadow-3` | Popovers, menus, focused overlays |
| `shadow-pin` | Map pins — always on, always elevated |

In dark mode, shadows deepen but stay short; we never use diffuse glow.

**Backgrounds.** No gradient backgrounds for primary surfaces — they read as marketing and compete with the map. The only exceptions are:

- The coral profile cover (`linear-gradient(150deg, #FF8876 → #C2331F)`) — used once per profile, never elsewhere.
- The amber EventCard date chip (`linear-gradient(160deg, #FFE7BA, #F4B740)`) — small, decorative.

No textures, no patterns, no hand-drawn illustrations. The map _is_ the texture.

**Glass / blur / transparency.** Used **only** on overlays that float above the map — the search pill, control stack, tab bar, recording HUD. `backdrop-filter: blur(20px) saturate(140%)` with a low-opacity surface fill. Never apply blur to primary content surfaces.

**Borders.** Hairline only. Light mode `rgba(14,17,22,0.08)`; dark mode `rgba(255,255,255,0.08)`. No accent-colored borders, no chunky 2px frames, no left-border accent stripes. Cards are differentiated by surface tone + shadow, not by border weight.

**Animation.**

| Easing | When |
|---|---|
| `cubic-bezier(.16, 1, .3, 1)` (ease-out) | Page transitions, sheets, default |
| `cubic-bezier(.65, 0, .35, 1)` (ease-in-out) | Property morphs, theme swap |
| `cubic-bezier(.34, 1.56, .64, 1)` (spring) | Button press, pin tap — light overshoot |

Durations: `fast 140ms` / `base 220ms` / `slow 360ms` / `sheet 420ms`. Bottom sheets always use the sheet duration with ease-out. No bounces over 1.6 magnitude. No infinite "pulsing" elements beyond the recording dot and the user's own location pin.

**Hover / press states.**

- Hover (web previews): surface lightens to `surface-2` for cards, ghost buttons darken `4%`.
- Press: `transform: scale(.97)` with the spring easing — quick, snappy, native-feeling.
- Tap targets are minimum 44pt, every time. The recording add-point button is 50pt.

**Cards.** White (or `#16191F` dark) surface, hairline border, `shadow-2` elevation, `radius-lg` (16px) or `radius-xl` (20px). _No left-color-accent stripe._ Internal padding 14–16px. The RouteCard is the canonical example: polyline preview on the left at 128px square, content stacked right, metrics anchored bottom.

**Map polylines.**

- **Own routes**: coral `#FF5A4E`, stroke width 4–5pt, soft 28%-opacity glow underneath.
- **Followed users' routes**: teal `#14B8C7`, stroke 3–3.5pt, same glow treatment.
- Routes never use dashed or stippled lines except for unsaved tail segments (rare).

**Imagery.** Photos are user-uploaded; we have no stock imagery. Treat photos with a 12px radius mask, no border, no shadow. The app should never compress a user photo below 1080px on the longest edge.

**Layout rules — fixed elements (iOS app):**

- Status bar safe area: top 60px
- Tab bar: bottom-anchored, 12px lateral inset, glass surface, _always visible_ except during the recording flow (where the RecordingHUD replaces it).
- Floating record FAB: centered, 90px above the tab bar.
- Map controls (locate / layers): always **right** edge, never left. Top offset varies by context.
- Bottom sheets: 3 states (collapsed / half / expanded), drag grip always visible, top corners `28px`.

---

## Iconography

Wayvy targets **SF Symbols** in production (`iOS 17+`). SF Symbols are not redistributable, so web preview uses a stroke-weight-matched **Lucide** subset as a substitute — same 2.2pt stroke, 24pt grid, rounded line caps.

> **⚠️ Substitution flag.** Every icon in `preview/` and `ui_kits/` is a Lucide-style inline SVG. In the iOS app these MUST be replaced with the corresponding SF Symbol. Mapping is documented in `preview/brand-iconography.html`.

**Style rules:**

- Stroke 2.2pt, rounded line caps, rounded joins.
- 24pt nominal size, scaled with Dynamic Type.
- Filled variants only for: tab bar active state, recording dot, map-pin internal glyph.
- Never combine outline + filled in the same row.
- Never use multi-color icons — accent color is applied by `currentColor`.

**Common icons (Lucide name → SF Symbol target):**

| Concept | Lucide stand-in | SF Symbol target |
|---|---|---|
| Map | `map` | `map.fill` (active), `map` (inactive) |
| Pin / waypoint | `map-pin` | `mappin.and.ellipse` |
| Record | filled circle in ring | `record.circle.fill` |
| Calendar / event | `calendar` | `calendar` |
| Profile | `user-round` | `person.crop.circle` |
| Locate | `crosshair` | `location.fill` |
| Layers | stacked diamond | `square.3.layers.3d` |
| Camera | `camera` | `camera.fill` |
| Lock (private) | `lock` | `lock.fill` |
| Globe (public) | `globe` | `globe` |
| Friends (followers) | `users` | `person.2.fill` |
| Like | `heart` | `heart` / `heart.fill` |
| Share | `share-2` | `square.and.arrow.up` |
| Add | `plus` | `plus` |
| Time | `clock` | `clock` |

**Emoji.** Never in chrome — not in buttons, not in navigation, not in system messages, not in WaypointSheet. Emoji is **user-generated-content territory only** (event titles users write, comments, descriptions).

**Logos.** See `assets/wayvy-mark.svg` (coral wave-W monogram), `assets/wayvy-mark-white.svg` (white knockout), `assets/wayvy-app-icon.svg` (1024 iOS app icon, coral rounded square with white wave-W monogram).

---

## UI kits

| Kit | Path | What it shows |
|---|---|---|
| **iOS app** | `ui_kits/ios/index.html` | Four core screens (Map · Recording · Events · Profile) wired into a click-through prototype. Tap a tab; tap "Записать" to begin recording; tap "+ Точка" to open the WaypointSheet; tap "Стоп" to save. Light/dark theme toggle in the controls strip above the device. |

There is no Android kit (Wayvy is iOS-only at MVP per `docs/wayvy-design-spec.md`). No marketing site is in scope yet — when one is, it will live under `ui_kits/web/`.

---

## Substitutions, flags, and TODO

These are the conscious shortcuts in this design system. Resolve each before shipping to the App Store:

1. **Fonts.** Web preview uses **Bricolage Grotesque** (display) + **Manrope** (body) as Google-Fonts stand-ins. iOS production must use **SF Pro Display** + **SF Pro Text**. The metrics aren't identical — re-verify line-heights in Xcode before final QA. _Request: confirm preferred substitutes or provide custom font files._
2. **Icons.** All glyphs are Lucide inline SVGs as a stand-in for **SF Symbols**. Replace 1:1 using the mapping table above.
3. **Map tiles.** The map background in all kit screens is a hand-faked SVG (roads / park / water shapes + faux labels). In production this is **Yandex MapKit Mobile SDK** rendering — verify color contrast against actual Yandex day/night tile palettes before locking the polyline colors.
4. **Voice + video-circle**: tile UI is mocked. Production wires to `AVFoundation`; max 15 sec for video circle (Telegram-style).
5. **Photography.** No sample photos shipped. All "photo" thumbnails in the kit are coral/teal gradients standing in for real user uploads.
6. **Real GPS data.** Polylines in the kit are hand-drawn Bezier curves, not real CoreLocation tracks — they're illustrative.

---

## Working from this design system

For HTML mocks, slides, and prototypes:

1. Import `colors_and_type.css` at the top of any page.
2. Use the `wv-*` typography classes (`wv-h1`, `wv-body`, `wv-metric`, `wv-eyebrow`…).
3. Use semantic color vars (`var(--accent)`, `var(--surface)`, `var(--fg-2)`) — they auto-flip between light and dark.
4. Pull components from `ui_kits/ios/` rather than rebuilding — every card / pin / button there is canonical.
5. For production iOS code, treat this system as a Swift design-tokens reference. The tokens map 1:1 onto a `Color` extension and a `Font` extension; assume the iOS team will generate those from `colors_and_type.css`.

See `SKILL.md` for the Claude Skill entrypoint.
