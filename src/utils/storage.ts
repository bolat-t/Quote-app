/**
 * Lightweight AsyncStorage wrappers for theme, onboarding, and user-name —
 * the small persistent settings that don't deserve their own storage module.
 *
 * Larger persisted models (journal entries, vision board, hunt, progression)
 * each have their own dedicated `*Storage.ts` file.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeMode } from '../types';

// ─── Storage keys ────────────────────────────────────────────────────────────
// Do NOT change these strings — that would orphan data on existing installs.
const THEME_KEY      = '@ulbo_theme';
const ONBOARDING_KEY = '@ulbo_onboarding_completed';
const USER_NAME_KEY  = '@ulbo_user_name';

// ─── Theme ───────────────────────────────────────────────────────────────────

export const saveTheme = async (theme: ThemeMode): Promise<void> => {
    try {
        await AsyncStorage.setItem(THEME_KEY, theme);
    } catch (error) {
        console.error('[storage] saveTheme failed:', error);
    }
};

export const loadTheme = async (): Promise<ThemeMode | null> => {
    try {
        const value = await AsyncStorage.getItem(THEME_KEY);
        return value as ThemeMode | null;
    } catch (error) {
        console.error('[storage] loadTheme failed:', error);
        return null;
    }
};

// ─── Onboarding ──────────────────────────────────────────────────────────────

export const isOnboardingCompleted = async (): Promise<boolean> => {
    try {
        const value = await AsyncStorage.getItem(ONBOARDING_KEY);
        return value === 'true';
    } catch {
        return false;
    }
};

/** Marks onboarding done and stores the user-supplied display name. */
export const completeOnboarding = async (name: string): Promise<void> => {
    try {
        await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
        await AsyncStorage.setItem(USER_NAME_KEY, name);
    } catch (error) {
        console.error('[storage] completeOnboarding failed:', error);
    }
};

// ─── User name ───────────────────────────────────────────────────────────────

/** Returns the user's display name, or 'Friend' if none is set yet. */
export const getUserName = async (): Promise<string> => {
    try {
        const name = await AsyncStorage.getItem(USER_NAME_KEY);
        return name || 'Friend';
    } catch {
        return 'Friend';
    }
};
