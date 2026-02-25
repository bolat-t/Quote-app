# Streak Modal (Luck Momentum) Design

## Concept
- **Metaphor**: "Luck Momentum" (Building a fire or kinetic energy).
- **Goal**: Encourage daily consistency without "gamification" fatigue.
- **Reference**: Duolingo (fun) meets Stoicism (purpose).

## Layout Structure (Dialog / Full Screen Overlay)
- **Container**:
    - Light: `Surface` (`#FCFAF5`) with a subtle gradient or pattern overlay.
    - Dark: `Surface` (`#2C241B`).
    - Shape: Large rounded corners (28dp).
- **Header**:
    - Icon/Illustration: Large animated flame or "Spark".
    - Title: "Luck Momentum" (`HeadlineMedium` - Caveat).
    - Subtitle: "Day [X] of Consistency".

## Components
### Progress Visualization
- **Week Row**:
    - 7 Circles representing the current week.
    - **Active**: `Primary` filled circle with checkmark.
    - **Today (Incomplete)**: `Outline` circle with pulsing effect.
    - **Future**: Faded/Opacity 0.3.
- **Milestone Tracker**:
    - Simple text: "Next Milestone: [Y] Days".

### Actions
- **Primary**: "Keep it Going" (Pill Button, `Primary` color).
- **Secondary**: "Share Quote" (Icon Button).
- **Dismiss**: "Close" (Text Button).

## Animation
- **Entrance**: Scale up + Fade in (Spring).
- **Flame**: Lottie animation or simple SVG scaling loop.
