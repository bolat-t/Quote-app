# Brand Guidelines — Ulbo App
> Derived from the Vision Board screen as the design reference standard.
> Last updated: February 2026

---

## 1. Brand Identity

| Attribute | Value |
|-----------|-------|
| **Core concept** | Personal growth companion — calming, expansive, aspirational |
| **Aesthetic** | Clean modern + handcrafted warmth. Digital meets journal. |
| **Tone** | Encouraging, gentle, spacious. Never clinical or harsh. |
| **Emotional target** | "A calm creative workspace that feels like *mine*." |

---

## 2. Color System

Colors are consumed via `theme.colors.*` from `ThemeContext`. **Never hardcode hex values** except for fixed-purpose colors (see §2.3).

### 2.1 Light Theme

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#4ECCA3` | CTAs, active icons, key brand accents |
| `onPrimary` | `#FFFFFF` | Text/icons on primary color |
| `primaryContainer` | `#D1FAE5` | Chip backgrounds, tag fills, active highlights |
| `onPrimaryContainer` | `#064E3B` | Text on container |
| `secondary` | `#3D5A80` | Secondary actions, less prominent UI |
| `onSecondary` | `#FFFFFF` | Text on secondary |
| `secondaryContainer` | `#DBEAFE` | Secondary chip backgrounds |
| `tertiary` | `#7C3AED` | Accent for special states (level-ups, rewards) |
| `tertiaryContainer` | `#EDE9FE` | Tertiary chip backgrounds |
| `background` | `#F8FAFC` | App background (screen base) |
| `onBackground` | `#1A1D23` | Primary text on background |
| `surface` | `#FFFFFF` | Cards, sheets, dialogs |
| `onSurface` | `#1A1D23` | Primary text on surface |
| `surfaceVariant` | `#F1F5F9` | Search bars, inactive chips, secondary cards |
| `onSurfaceVariant` | `#475569` | Secondary text, placeholders |
| `outline` | `#94A3B8` | Borders, dividers, placeholder icons |
| `error` | `#EF4444` | Destructive actions, error states |

### 2.2 Dark Theme

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#6EE7B7` | CTAs, active icons |
| `onPrimary` | `#064E3B` | Text on primary |
| `primaryContainer` | `#065F46` | Container fills |
| `secondary` | `#93C5FD` | Secondary actions |
| `tertiary` | `#A78BFA` | Special states |
| `background` | `#0F172A` | App background |
| `surface` | `#1E293B` | Cards, sheets |
| `onSurface` | `#E2E8F0` | Primary text |
| `surfaceVariant` | `#334155` | Inactive elements |
| `onSurfaceVariant` | `#CBD5E1` | Secondary text |
| `outline` | `#64748B` | Borders |
| `error` | `#FCA5A5` | Error states |

### 2.3 Fixed Colors (never theme-switched)

| Purpose | Value | Notes |
|---------|-------|-------|
| Scrim / Modal overlay | `rgba(0,0,0,0.35)` | Dialog backdrop |
| Image overlay (labels on photos) | `rgba(0,0,0,0.38)` | Category card labels |
| Delete zone active | `#FF3B30` | iOS system red — universal danger signal |
| White text on imagery | `#FFFFFF` | Overlaid on dark photos only |

### 2.4 Alpha Suffix Conventions

When applying theme colors with transparency, append hex alpha to the color string:

| Suffix | Opacity | Usage |
|--------|---------|-------|
| `+06` | ~2% | Decorative orbs, very subtle tints |
| `+10` | ~6% | Empty state bg hints |
| `+12` | ~7% | Subtle borders on items |
| `+15` | ~8% | Chip borders |
| `+18` | ~9% | Input/pill borders |
| `+20` | ~12% | Standard border opacity |
| `+30` | ~19% | Handle bars, subtle accents |
| `+50` | 31% | Placeholder text |
| `+60` | ~38% | Search placeholder |
| `+80` | 50% | Muted body text |
| `+AA` | 67% | Empty state titles (de-emphasized) |
| `+CC` | 80% | Semi-transparent surfaces |
| `+EC` | ~93% | Text card backgrounds (nearly opaque) |
| `+F0` | ~94% | Bottom bars (backdrop blur alternative) |

---

## 3. Typography

Two font families. **Caveat** for display/expressive text. **Carlito** for readable body/UI text.

### 3.1 Font Families

| Family | Weights | Role |
|--------|---------|------|
| `Caveat-Bold` | Bold | Headings, screen titles, card labels, dialog titles |
| `Caveat-Medium` | Medium | Board text items, secondary display |
| `Carlito` | 400 / 500 (via `fontWeight`) | Body, descriptions, labels, buttons, inputs |

### 3.2 Type Scale

| Role | Font | Size | Line Height | Letter Spacing | Usage |
|------|------|------|-------------|----------------|-------|
| Display Large | Caveat-Bold | 57 | 64 | 0 | Hero / splash text |
| Display Medium | Caveat-Bold | 45 | 52 | 0 | Large feature headers |
| Display Small | Caveat-Bold | 36 | 44 | 0 | Section hero text |
| Headline Large | Caveat-Bold | 32 | 40 | 0 | — |
| **Headline Medium** | Caveat-Bold | 28 | 36 | 0 | Screen titles in sheets |
| Headline Small | Caveat-Bold | 24 | 32 | 0 | Section heads, empty state titles |
| Title Large | Caveat-Bold | 22 | 28 | 0 | Dialog titles, sheet drilldown |
| **Screen Title** | Caveat-Bold | 26 | 30 | 0 | Top-level screen header (e.g. "My Vision Board") |
| **Board Text** | Caveat-Medium | 17 | 24 | 0 | Affirmation/text items on canvas |
| Category Label | Caveat-Bold | 20 | — | 0 | Image category cards overlay |
| Body Large | Carlito | 16 | 24 | 0.5 | Primary reading content |
| Body Medium | Carlito | 14 | 20 | 0.25 | Secondary descriptions, dialog body |
| Body Small | Carlito | 12 | 16 | 0.4 | Hints, fine print |
| **Label / Button** | Carlito | 15 | — | — | Action pills, primary buttons (`fontWeight: '600'`) |
| Label Medium | Carlito | 14 | 20 | 0.1 | Chips, tags, secondary buttons |
| Label Small | Carlito | 13 | — | — | Template chips, sheet subtitles |
| Caption | Carlito | 11–13 | — | — | Sub-labels under screen titles, hints |

### 3.3 Typography Rules

- **Headings** (Caveat) are expressive and set the emotional tone — keep them short
- **Body** (Carlito) is for clarity — prioritize readability over style
- Never mix Caveat and Carlito in a single text element
- `fontWeight: '600'` is applied inline on Carlito for emphasis (not a separate font file)
- Line heights follow the scale above; do not omit them on display sizes

---

## 4. Spacing & Layout

### 4.1 Base Grid

**8dp grid.** All spacing values should be multiples of 4 (minimum) or 8 (preferred).

| Name | Value | Usage |
|------|-------|-------|
| xs | 4dp | Icon gaps, tight internal padding |
| sm | 8dp | Chip/tag gaps, card grid gaps |
| md | 12dp | Default item gap in rows |
| base | 16dp | Screen padding, standard section gap |
| lg | 20dp | Sheet padding, list padding |
| xl | 24dp | Sheet header padding, section separation |
| 2xl | 28dp | Dialog padding |
| 3xl | 32dp | Large section gaps |

### 4.2 Screen Padding

- Horizontal: `16dp` (standard), `20–24dp` inside sheets
- Vertical (header): `12dp` top/bottom, `16dp` horizontal
- Bottom safe area: `36dp` iOS / `20dp` Android

### 4.3 Touch Targets

Minimum `44×44dp` for all interactive elements. Use `hitSlop` to extend smaller icons:
```ts
hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
```

---

## 5. Border Radius

| Component | Radius | Notes |
|-----------|--------|-------|
| Bottom sheets | `28dp` (top corners only) | Modal feel |
| Dialogs | `24dp` | Centered modal |
| Cards | `14–18dp` | Content cards vary; prefer 16dp |
| Canvas items (images) | `16–18dp` | Rounded photo tiles |
| Pill buttons / action bars | `20–24dp` | Full pill for primary CTAs |
| Chips / tags | `16–20dp` | Filter chips, template chips |
| Delete zone | `22dp` | Destructive contextual element |
| Search inputs | `18–22dp` | Full-width search bars |
| Send/icon buttons | `18dp` (circular) | 36×36 icon-only buttons |
| Image grid tiles (browser) | `8dp` | Dense photo grid |
| Layout preset cards | `16dp` | Medium card |

---

## 6. Elevation & Shadows

Use `shadowColor: '#000'` with low opacity throughout. Elevation is layered:

| Level | Usage | Shadow Style |
|-------|-------|-------------|
| **Elevation 0** | Board canvas background | No shadow |
| **Elevation 1** | Text items on canvas | `offset (0,4)`, `radius 16`, `opacity 0.04`, `elevation: 2` |
| **Elevation 2** | Action pills, dividers | `offset (0,2)`, `radius 8`, `opacity 0.06`, `elevation: 3` |
| **Elevation 3** | Draggable image items | `offset (0,6)/(0,8)`, `radius 20`, `opacity 0.12`, `elevation: 4–6` |
| **Elevation 4** | Delete zone, FAB area | `offset (0,4)`, `radius 12`, `opacity 0.10`, `elevation: 8` |
| **Elevation 5** | Bottom sheets | `offset (0,-4)`, `radius 20`, `opacity 0.08`, `elevation: 12` |
| **Elevation 6** | Dialogs, highest z | `offset (0,8)`, `radius 24`, `opacity 0.12`, `elevation: 12` |

**Rule:** Shadows should feel soft and airy. Avoid hard drop-shadows. Default opacity range: `0.04–0.12`.

---

## 7. Icons

### 7.1 Icon System

All icons are **custom inline SVG** (via `react-native-svg`). No icon library dependency.

### 7.2 Icon Specs

| Property | Value |
|----------|-------|
| Default size | 22dp |
| Small (chips, labels) | 14–18dp |
| Large (empty states, dialogs) | 24–56dp |
| Stroke width | `1.8` standard / `2.0` emphasis / `1.2` decorative |
| strokeLinecap | `round` |
| strokeLinejoin | `round` |
| Fill | `none` (line icons only — no solid fills) |

### 7.3 Icon Color

- Interactive icons: `theme.colors.onSurface`
- Accent/CTA icons: `theme.colors.primary`
- Muted icons: `theme.colors.outline`
- Icons inside colored backgrounds: `#FFFFFF` or `theme.colors.onPrimary`
- Destructive: `theme.colors.error` or `#FF3B30`

---

## 8. Components

### 8.1 Screen Header

```
[BackBtn 44×44] [Title (center, flex:1)] [ActionBtn 44×44]
paddingH: 16, paddingV: 12
```
- Title: `Caveat-Bold`, `fontSize: 26`, `color: theme.colors.onSurface`
- Sub-label: `Carlito`, `fontSize: 13`, `color: theme.colors.outline`
- Buttons: 44×44dp touch target, centered icon

### 8.2 Bottom Sheet

```
borderTopLeftRadius: 28, borderTopRightRadius: 28
shadow: elevation 12, upward shadow
```
- Handle bar: `width: 36, height: 4, borderRadius: 2, color: outline+30`
- Header padding: `paddingH: 24, paddingV: 12`
- Title: `Caveat-Bold`, `fontSize: 24`
- Subtitle: `Carlito`, `fontSize: 13`, `color: outline`
- Close button: 36×36, top-right, `XIcon`, `outline` color

### 8.3 Action Pills (Bottom Bar)

```
borderRadius: 24 (pill)
border: 1dp, outline+12
background: surface
shadow: elevation 2
paddingH: 16, paddingV: 12
```
- Text: `Carlito`, `fontSize: 15`, `fontWeight: '600'`
- Icon-only variant: `width: 48, height: 48`

### 8.4 Chips & Tags

```
borderRadius: 16–20 (pill)
border: 1dp, primary+15
background: primaryContainer+30
paddingH: 14, paddingV: 10
```
- Text: `Carlito`, `fontSize: 13`
- Leading icon: 14dp, `primary` color

### 8.5 Dialog / Confirmation Modal

```
width: 78% screen width
borderRadius: 24
padding: 28
shadow: elevation 12
background: surface
scrim: rgba(0,0,0,0.35)
```
- Icon: 28dp, error or contextual color
- Title: `Caveat-Bold`, `fontSize: 22`, `marginTop: 4`
- Body: `Carlito`, `fontSize: 14`, `textAlign: center`, `lineHeight: 20`
- Buttons: full-width row, `borderRadius: 16`, `paddingV: 14`
- Cancel: `surfaceVariant` background
- Destructive: `error` background, white text

### 8.6 Empty States

Structure:
1. Decorative background orbs (blurred circles, `primary+06`, `primaryContainer+10`)
2. Illustration icon (large, 56–64dp, `primary+30` — muted primary)
3. Title: `Caveat-Bold`, `fontSize: 24`, `onSurface+AA`
4. Subtitle: `Carlito`, `fontSize: 14`, `outline+80`, centered, `lineHeight: 20`
5. Quick-action buttons (side by side)

### 8.7 Search Bar

```
borderRadius: 22
border: 1dp, outline+20
background: surfaceVariant
paddingH: 14, paddingV: 10
```
- Leading icon: `SearchIcon`, 16dp, `outline`
- Input: `Carlito`, `fontSize: 15`, `color: onSurface`
- Placeholder: `outline+60`
- Clear button: `XIcon`, 14dp, `outline`

### 8.8 Image Cards (Canvas / Gallery)

```
borderRadius: 16–18dp
border: 1.5dp, white or outline+12
shadow: elevation 3–6
overflow: hidden
```
- Size: 150×150dp standard canvas item
- On error: surfaceVariant overlay, outline icon + `Carlito` caption

### 8.9 Category Cards (Image Browser)

```
borderRadius: 14
overflow: hidden
aspect ratio: ~1:1.2 (catCardW × catCardH)
```
- Full-bleed image
- Gradient overlay: `rgba(0,0,0,0.38)` at bottom
- Label: `Caveat-Bold`, `fontSize: 20`, `#FFFFFF`

---

## 9. Motion & Animation

### 9.1 Duration Reference

| Duration | Usage |
|----------|-------|
| `180ms` | Scale transforms, toggle feedback |
| `200ms` | Sheet exit, fade exit, delete zone slide out |
| `300ms` | Bottom bar fade in |
| `350ms` | Sheet enter slide |
| `600ms` | Page / empty state fade in |

### 9.2 Animation Presets (react-native-reanimated)

| Preset | Usage |
|--------|-------|
| `FadeIn.duration(600)` | Empty states, page-level content |
| `FadeInDown.delay(N).springify().damping(14)` | Staggered content reveal |
| `FadeInDown.duration(300)` | Bottom bars |
| `SlideInDown.duration(350)` | Sheet open |
| `SlideOutDown.duration(200)` | Sheet close |
| `withTiming(value, { duration: 180 })` | Scale, color interpolations |
| `withSpring(value)` | Drag-release snap |

### 9.3 Haptics

| Event | Haptic |
|-------|--------|
| Template chip tap | `impactAsync(Light)` |
| Item deleted | `notificationAsync(Success)` |
| Layout applied | (none — visual feedback sufficient) |

### 9.4 Drag Interactions

- Drag: Gesture-driven, smooth tracking via `useSharedValue`
- On drag start: raise z-index, slight scale up
- On release: spring-snap to final position
- Delete zone: enters/exits with scale `withTiming(1.1)` and color shift to `#FF3B30`

---

## 10. Patterns & Rules

### 10.1 Layering (z-index)

| Layer | z-index | Elements |
|-------|---------|----------|
| Background | 0 | Board canvas, background orbs |
| Content | 1–50 | Cards, items |
| Header | 10 | Screen header (SafeAreaView) |
| Floating UI | 100 | Delete zone |
| Sheets | via Portal | Bottom sheets (Portal renders above all) |
| Dialogs | 200 | Confirmation dialogs |

### 10.2 Scrim

- Color: `rgba(0,0,0,0.35)` — consistent across all dialogs
- Applied via `StyleSheet.absoluteFillObject`

### 10.3 Consistency Checklist

When building a new screen, verify:
- [ ] Uses `theme.colors.*` tokens (not hardcoded hex)
- [ ] Screen title uses `Caveat-Bold` at 24–28dp
- [ ] Body/UI text uses `Carlito`
- [ ] All touch targets are ≥ 44×44dp
- [ ] Border radius matches component type (see §5)
- [ ] Shadow opacity ≤ 0.12 (no harsh shadows)
- [ ] Empty state follows the 5-element structure (§8.6)
- [ ] Destructive actions use `theme.colors.error` (never a custom red)
- [ ] Sheet corners are 28dp (top only)
- [ ] Bottom safe area respected (`paddingBottom: 36 iOS / 20 Android`)

### 10.4 Do / Don't

| Do | Don't |
|----|-------|
| Use primary color for a single focal CTA per screen | Use primary on more than 2 elements per view |
| Keep shadows soft (opacity < 0.12) | Add harsh drop shadows or multiple shadow layers |
| Use `Caveat` to set emotional tone | Use `Caveat` for long body text (readability suffers) |
| Use alpha suffixes for subtle tints | Create entirely new off-brand colors |
| Follow 8dp grid | Use arbitrary values like 7dp, 11dp, 15dp |
| Use `outline` for non-critical borders | Use `onSurface` for borders (too dark) |

---

## 11. File Structure Reference

```
src/
  context/ThemeContext.tsx   ← Color tokens and font config (source of truth)
  screens/VisionBoardScreen  ← Visual design reference
design-system/
  BRAND_GUIDELINES.md        ← This file
  MASTER.md                  ← Material 3 design system overview
  pages/
    vision-board.md          ← Vision board component notes
    journal.md               ← Journal screen notes
    streak-modal.md
    positivity-hunt.md
```

---

*Ulbo Brand Guidelines v1.0 — Source: VisionBoardScreen.tsx + ThemeContext.tsx*
