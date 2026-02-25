# Vision Board Screen Design

## Key Features
- **Drag & Drop Canvas**: Freeform placement of images and text.
- **Tools**: Add Image, Add Text, Delete.
- **Mood**: Creative, expansive.

## Layout Structure (Material 3)
- **Top App Bar**:
    - Title: "Vision Board" (Center aligned, `HeadlineMedium`)
    - Actions: `IconButton` for "Add Text" and "Add Image".
- **Canvas Area**:
    - Full screen (behind Top Bar transparently or below it).
    - Background: `Surface` (`#FCFAF5`).

## Components
### Vision Items
- **Images**:
    - Rounded corners: 12dp.
    - Border: 3dp White (`#FFFFFF`).
    - Shadow: Elevation 2.
- **Text**:
    - Background: White (`#FFFFFF`) or Paper (`#FCFAF5`).
    - Typography: `BodyLarge` (`Caveat-Medium`).
    - Padding: 16dp.
    - Shadow: Elevation 1.

### fab (Floating Action Button) - *Proposed Change*
- Instead of top bar actions, use a `FAB` or `ExtendedFAB` at bottom right.
- **Primary FAB**: "Add" (Plus icon).
    - On Press: Expands to "Text" and "Image" options (Speed Dial).
- **Justification**: Better one-handed reachability (Mobile-First).

## Interaction
- **Drag**: Smooth, spring-based (Reanimated).
- **Long Press**: Enter "Edit Mode" (Delete/Transform).
- **Delete**: Drag to bottom trash bin area (new UI element) OR Show header delete icon.
