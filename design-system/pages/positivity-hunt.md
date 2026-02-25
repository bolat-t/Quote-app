# Positivity Hunt Screen Design

## Key Features
- **Goal**: Find 3 positive things ("signals") daily.
- **Vibe**: Sherlock Holmes meets gratitude journal. Clean, minimalist, focus-oriented.
- **Reference**: Minimalist card with a central visual, bottom sheet/card for interaction.

## Layout Structure (Material 3 - Minimalist)
- **Background**:
    - Light: `#EBE6D9` (Desk/Bone).
    - Image/Illustration: A central, subtle line-art or abstract shape representing "Focus" or "Lens".
- **Header**:
    - Large, Serif typography: "daily design challenge" style (e.g., "Today's Hunt").
    - Minimalist status: "0/3 Found".
- **Center Canvas**:
    - Large abstract "Lens" or "Frame" placeholder.
    - When an entry is added, it "fills" part of the frame or adds a geometric shape.
- **Bottom Interaction Sheet/Card** (The "Toolbelt"):
    - **Container**: Dark Rounded Card (`Surface` in dark mode, or High Contrast Black `#1A1A1A`).
    - **Title**: "write your story" / "capture the moment".
    - **Input**: Clean, underline or minimal transparent box.
    - **Actions**: Simple icons (Camera, Text, Gallery).
    - **FAB**: "Start Entry" or "Found It" (Pill shape, White on Black).

## Components
### The "Hunt" Card
- **Shape**: Large rounded rectangle (24dp radius).
- **Content**:
    - **Empty**: Line art illustration.
    - **Filled**: 1, 2, or 3 abstract shapes or photos appearing.
- **Animation**: Gentle fade/scale when adding items.

### Input Area (Bottom Sheet)
- **Appearance**: Floating card at bottom (margin 16dp).
- **Background**: `#1E1912` (Dark Oak / Nearly Black).
- **Text Color**: `#E6DCC3` (Parchment White).
- **Typography**:
    - Title: `HeadlineSmall` (Sans-serif or refined Serif).
    - Body: `BodyMedium` (Sans-serif).

## Typography
- **Headings**: `Playfair Display` or `Bodoni` (if available) or `Caveat-Bold` (Keep brand but clean it up). Let's stick to **Caveat-Bold** for brand consistency but use it strictly for headers, and a clean Sans (`Roboto` / `Inter`) for UI elements to achieve "minimalism".

## Interaction
- **Focus Mode**: When typing, everything else dims.
- **Completion**: The "Lens" becomes a complete image or gold ring.
