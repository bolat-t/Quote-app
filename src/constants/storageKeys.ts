/**
 * All AsyncStorage keys used across the app in one place.
 *
 * Rule: never write key strings inline — always import from here.
 * This prevents typos and makes it trivial to audit what we persist.
 *
 * IMPORTANT: Do NOT change existing key values — that would orphan
 * data already stored on users' devices.
 *
 * Usage:
 *   import { STORAGE_KEYS } from '../constants/storageKeys';
 *   await AsyncStorage.getItem(STORAGE_KEYS.JOURNAL);
 */
export const STORAGE_KEYS = {
    // User
    USER_NAME:           '@ulbo_user_name',
    ONBOARDING_DONE:     '@ulbo_onboarding_completed',
    THEME:               '@ulbo_theme',

    // Content
    JOURNAL:             'ulbo_journal_entries',    // note: no @ — keep as-is
    DRAWINGS:            '@ulbo_drawings',
    ACTIVE_PAPER:        '@ulbo_active_paper',

    // Progression
    USER_PROGRESS:       '@ulbo_user_progress',
    HUNT_PREFIX:         '@ulbo_hunt_',             // append date: HUNT_PREFIX + 'YYYY-MM-DD'
    DAILY_VISION_PREFIX: '@ulbo_daily_vision_',     // append date

    // Misc
    LAST_PROMPT_DATE:    '@ulbo_last_prompt_date',
    PROMPT_HISTORY:      '@ulbo_prompt_history',
    MEMORY_CONTEXT:      '@ulbo_memory_context',
    SESSION_COUNT:       'ulbo_session_count',
    DAILY_SUMMARY_PREFIX:'@ulbo_daily_summary_',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
