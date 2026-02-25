# Journal Screen Design

## Key Features
- **Calendar View**: History of entries.
- **Daily Entry**: Quote + Reflection + Image.
- **Weekly Stats**: Progress chart.

## Layout Structure
- **Top App Bar**:
    - Title: "Journal" (`HeadlineMedium`).
    - Subtitle: "Your reflection history".
- **Content**: `LazyColumn` (ScrollView).

## Components
### Progress Chart
- **Style**: Minimalist bar/dot chart.
- **Colors**: `Primary` (`#E07B39`) for active, `Outline` for inactive.

### Calendar Card
- **Wrap**: `ElevatedCard` (Elevation 1).
- **Background**: `Surface`.
- **Selected Date**: `PrimaryContainer` circle.
- **Today**: `Outline` circle or `Primary` text.

### Entry Card
- **Container**: `OutlinedCard` or `ElevatedCard`.
- **Quote Section**:
    - Left Border: 4dp solid `Primary`.
    - Background: `SurfaceVariant` (opacity 0.1).
    - Typography: `TitleMedium` (`Caveat`).
- **Image**:
    - Full width, rounded corners (12dp).
    - Aspect ratio: 1:1 or 4:3.

## Typography
- **Date Header**: `HeadlineSmall` (`Caveat-Bold`).
- **Empty State**: Centered, `BodyLarge`, grayed out (`OnSurfaceVariant`).
