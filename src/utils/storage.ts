/**
 * Lightweight AsyncStorage wrappers for theme, onboarding, and user-name —
 * the small persistent settings that don't deserve their own storage module.
 *
 * Larger persisted models (journal entries, vision board, hunt, progression)
 * each have their own dedicated `*Storage.ts` file.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeMode } from '../types';
import { STORAGE_KEYS } from '../constants/storageKeys';

// ─── Theme ───────────────────────────────────────────────────────────────────

export const saveTheme = async (theme: ThemeMode): Promise<void> => {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.THEME, theme);
    } catch (error) {
        console.error('[storage] saveTheme failed:', error);
    }
};

export const loadTheme = async (): Promise<ThemeMode | null> => {
    try {
        const value = await AsyncStorage.getItem(STORAGE_KEYS.THEME);
        return value as ThemeMode | null;
    } catch (error) {
        console.error('[storage] loadTheme failed:', error);
        return null;
    }
};

// ─── Onboarding ──────────────────────────────────────────────────────────────

export const isOnboardingCompleted = async (): Promise<boolean> => {
    try {
        const value = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_DONE);
        return value === 'true';
    } catch {
        return false;
    }
};

/** Marks onboarding done, stores the user-supplied display name, and stamps
 *  the completion time so the first-promise gift window can be evaluated. */
export const completeOnboarding = async (name: string): Promise<void> => {
    try {
        await AsyncStorage.multiSet([
            [STORAGE_KEYS.ONBOARDING_DONE,         'true'],
            [STORAGE_KEYS.USER_NAME,               name],
            [STORAGE_KEYS.ONBOARDING_COMPLETED_AT, new Date().toISOString()],
        ]);
    } catch (error) {
        console.error('[storage] completeOnboarding failed:', error);
    }
};

/** Persist the survey answers — useful for marketing segmentation and for
 *  recreating the personalized plan inside the app later. */
export const saveOnboardingAnswers = async (answers: {
    intents:   string[];
    moodNow:   string | null;
    frequency: string | null;
    area:      string | null;
    stakes:    string | null;
}): Promise<void> => {
    try {
        const pairs: [string, string][] = [
            [STORAGE_KEYS.ONBOARDING_INTENTS, JSON.stringify(answers.intents)],
        ];
        if (answers.moodNow)   pairs.push([STORAGE_KEYS.ONBOARDING_MOOD_NOW, answers.moodNow]);
        if (answers.frequency) pairs.push([STORAGE_KEYS.ONBOARDING_FREQUENCY, answers.frequency]);
        if (answers.area)      pairs.push([STORAGE_KEYS.ONBOARDING_AREA, answers.area]);
        if (answers.stakes)    pairs.push([STORAGE_KEYS.ONBOARDING_STAKES, answers.stakes]);
        await AsyncStorage.multiSet(pairs);
    } catch (error) {
        console.error('[storage] saveOnboardingAnswers failed:', error);
    }
};

/** Returns the deadline (ms epoch) for the first-promise gift, or null
 *  if onboarding hasn't been completed or the window has elapsed. */
export const getGiftDeadline = async (windowHours: number): Promise<number | null> => {
    try {
        const iso = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED_AT);
        if (!iso) return null;
        const completedAt = new Date(iso).getTime();
        const deadline    = completedAt + windowHours * 60 * 60 * 1000;
        return deadline > Date.now() ? deadline : null;
    } catch {
        return null;
    }
};

// ─── User name ───────────────────────────────────────────────────────────────

/** Returns the user's display name, or 'Friend' if none is set yet. */
export const getUserName = async (): Promise<string> => {
    try {
        const name = await AsyncStorage.getItem(STORAGE_KEYS.USER_NAME);
        return name || 'Friend';
    } catch {
        return 'Friend';
    }
};
