# Material 3 Design System - Quote App

## 1. Brand Identity & Style
- **Core Concept**: Digital Stoic Journal
- **Mood**: Reflective, Organic, Calm, Focus-oriented
- **Aesthetic**: "Paper & Ink" (Skeuomorphic touches) meeting "Material You" (Modern, Adaptive) - "Refined Sketchy"

## 2. Color System (Material 3)
Derived from Seed Color: `#E07B39` (Amber) and `#5E4B3C` (Sepia Ink)

### Light Theme
| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| **Primary** | Amber 600 | `#E07B39` | High-emphasis buttons, active states, key branding |
| **OnPrimary** | White | `#FFFFFF` | Text on primary buttons |
| **PrimaryContainer** | Amber 100 | `#FFDCC2` | Active segment indicators, light highlights |
| **OnPrimaryContainer**| Amber 900 | `#3E1C00` | Text on container |
| **Secondary** | Sepia 600 | `#5E4B3C` | Less prominent actions, headers |
| **OnSecondary** | White | `#FFFFFF` | Text on secondary |
| **Background** | Warm Beige | `#EBE6D9` | App background (Desk) |
| **Surface** | Paper White | `#FCFAF5` | Cards, Sheets, Dialogs (Paper) |
| **OnSurface** | Sepia 900 | `#3E3228` | Primary text |
| **OnSurfaceVariant** | Sepia 500 | `#7C6A5A` | Secondary text, placeholders |
| **Outline** | Sepia 200 | `#D7CCC0` | Borders, Dividers |
| **Error** | Red 700 | `#BA1A1A` | Error states |

### Dark Theme
| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| **Primary** | Amber 400 | `#FFB784` | High-emphasis buttons (lighter for dark mode) |
| **OnPrimary** | Amber 900 | `#4F2500` | Text on primary |
| **Background** | Dark Oak | `#1E1912` | App background |
| **Surface** | Dark Paper | `#2C241B` | Cards, Sheets |
| **OnSurface** | Parchment | `#E6DCC3` | Primary text |

## 3. Typography (Material Scale)
Mapping custom fonts to Material roles.
- **Font Family A (Headings)**: `Caveat-Bold` / `Caveat-Medium`
- **Font Family B (Body)**: `IndieFlower`, `Roboto` (System fallback)

| Role | Size (sp) | Line Height | Font | Usage |
|------|-----------|-------------|------|-------|
| **Display Large** | 57 | 64 | Caveat-Bold | Large branding, Hero text |
| **Headline Medium** | 28 | 36 | Caveat-Bold | Screen titles |
| **Title Medium** | 18 | 24 | Caveat-Bold | Card titles, subsections |
| **Body Large** | 16 | 24 | IndieFlower | Primary content, journal entries |
| **Body Medium** | 14 | 20 | IndieFlower/Roboto| Secondary text, descriptions |
| **Label Large** | 14 | 20 | Roboto Medium | Buttons, Tabs, Navigation |

## 4. Layout & Spacing
- **Base Grid**: 8dp
- **Screen Padding**: 16dp / 24dp
- **Content Spacing**: 16dp (standard), 24dp (sections)
- **Corner Radius**:
    - Cards: 16dp (Material 3 Standard) or 12dp (Slightly organic)
    - Buttons: 24dp (Pill)
    - Dialogs: 28dp

## 5. Components (Android Native Feel)
- **Top App Bar**:
    - Center aligned title (for crucial screens) or Small aligned (default).
    - Scroll behavior: `pinned` or `enterAlways`.
- **Bottom Navigation**:
    - Height: 80dp
    - Active Indicator: Pill shape (`PrimaryContainer`)
    - Label behavior: `alwaysShow` (or `onlyShowSelected` for focus)
- **Cards**:
    - `OutlinedCard` (Border only) vs `ElevatedCard` (Shadow).
    - Use `Elevation 1` for scrollable content cards.
- **Buttons**:
    - `FilledButton` (Primary actions)
    - `OutlinedButton` (Secondary actions)
    - Min touch target: 48x48dp.
- **Dialogs**:
    - Center aligned, 28dp corner radius.
    - Scrim opacity: 32% (`#000000` alpha 0.32).

## 6. Motion & Interaction
- **Duration**:
    - Short: 200ms (Selection controls)
    - Medium: 400ms (Dialogs, Sheets)
    - Long: 500ms+ (Page transitions)
- **Easing**: `StandardEasing` (Material Emphasized).
- **Feedback**: Ripple effect (`android_ripple`) is MANDATORY on all interactables.
