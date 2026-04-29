/**
 * Single source of truth for every AsyncStorage key in the app.
 *
 * Rule: never write a `@ulbo_…` string inline — always import from here.
 * This makes it trivial to audit what we persist and prevents typos that
 * would cause silent data loss.
 *
 * IMPORTANT: Do NOT change existing key values — that would orphan data
 * already stored on users' devices.
 *
 * Usage:
 *   import { STORAGE_KEYS } from '../constants/storageKeys';
 *   await AsyncStorage.getItem(STORAGE_KEYS.JOURNAL);
 *   await AsyncStorage.setItem(STORAGE_KEYS.HUNT_PREFIX + date, JSON.stringify(hunt));
 */
export const STORAGE_KEYS = {
    // ── User identity ──
    USER_NAME:                  '@ulbo_user_name',
    ONBOARDING_DONE:            '@ulbo_onboarding_completed',
    THEME:                      '@ulbo_theme',

    // ── Daily content ──
    JOURNAL:                    'ulbo_journal_entries',           // legacy: no '@' prefix — keep as-is
    INSPIRATION_CATEGORIES:     '@ulbo_inspiration_categories',
    VISION_LOG_PREFIX:          '@ulbo_vision_log_',              // append YYYY-MM-DD

    // ── Progression & quests ──
    USER_PROGRESS:              '@ulbo_user_progress',
    HUNT_PREFIX:                '@ulbo_hunt_',                    // append YYYY-MM-DD
    SESSION_COUNT:              'ulbo_session_count',             // legacy: no '@' prefix

    // ── Settings & preferences ──
    REMINDER_SETTINGS:          '@ulbo_reminder_settings',
    IS_PREMIUM:                 '@ulbo_is_premium',
    LAST_FEEDBACK_PROMPT:       '@ulbo_last_feedback_prompt',

    // ── Prompt rotation ──
    PROMPT_HISTORY:             'ulbo_prompt_history',            // legacy: no '@' prefix
    LAST_PROMPT_DATE:           'ulbo_last_prompt_date',          // legacy: no '@' prefix

    // ── Memory / Ulbo personality ──
    MASCOT_NAMES:               'ulbo_mascot_names',              // legacy: no '@' prefix
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
