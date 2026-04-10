/**
 * Design-system color tokens for the entire app.
 *
 * Rule: every screen and component must import from here — never redefine
 * YELLOW / BLACK / WHITE / GRAY locally.
 *
 * Usage:
 *   import { YELLOW, BLACK, WHITE, GRAY } from '../constants/colors';
 */

/** Primary accent — buttons, active states, highlights, XP bar fill */
export const YELLOW = '#FFE600';

/** Primary foreground — borders, text, icons, strokes */
export const BLACK  = '#000000';

/** Primary background — card surfaces, backgrounds */
export const WHITE  = '#FFFFFF';

/** Neutral background — inputs, muted surfaces, empty states */
export const GRAY   = '#F2F2F2';

/** Destructive action color — delete, error states */
export const RED    = '#D32F2F';
