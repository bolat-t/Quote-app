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

/** Marks onboarding done and stores the user-supplied display name. */
export const completeOnboarding = async (name: string): Promise<void> => {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_DONE, 'true');
        await AsyncStorage.setItem(STORAGE_KEYS.USER_NAME, name);
    } catch (error) {
        console.error('[storage] completeOnboarding failed:', error);
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
