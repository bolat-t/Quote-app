/**
 * dailyCounter.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * A reusable per-day counter persisted in AsyncStorage. Auto-resets when the
 * local calendar date changes.
 *
 * Used for free-tier daily caps (e.g. "2 chat messages/day"). Each gate gets
 * its own storage key — pass the key from STORAGE_KEYS to scope the counter.
 *
 *   import { STORAGE_KEYS } from '../constants/storageKeys';
 *   const used = await getDailyCount(STORAGE_KEYS.CHAT_DAILY_COUNT);
 *   if (used >= 2 && !isPremium) return openPaywall();
 *   await incrementDailyCount(STORAGE_KEYS.CHAT_DAILY_COUNT);
 *
 * Date format is local YYYY-MM-DD (matches journal entries elsewhere in app).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

interface DailyCounter {
    date:  string;   // YYYY-MM-DD
    count: number;
}

const todayKey = (): string => {
    const d = new Date();
    return d.toISOString().split('T')[0];
};

/** Read the counter for `key` for today. Returns 0 on prior-day or missing. */
export const getDailyCount = async (key: string): Promise<number> => {
    try {
        const raw = await AsyncStorage.getItem(key);
        if (!raw) return 0;
        const parsed = JSON.parse(raw) as DailyCounter;
        if (parsed.date !== todayKey()) return 0;
        return parsed.count;
    } catch {
        return 0;
    }
};

/** Increment the counter for `key`. Resets to 1 if last-stored date isn't today. */
export const incrementDailyCount = async (key: string): Promise<number> => {
    const today = todayKey();
    try {
        const raw = await AsyncStorage.getItem(key);
        let next: DailyCounter;
        if (!raw) {
            next = { date: today, count: 1 };
        } else {
            const parsed = JSON.parse(raw) as DailyCounter;
            next = parsed.date === today
                ? { date: today, count: parsed.count + 1 }
                : { date: today, count: 1 };
        }
        await AsyncStorage.setItem(key, JSON.stringify(next));
        return next.count;
    } catch {
        // Best-effort — failing the count shouldn't block user action.
        return 1;
    }
};

/** Reset the counter to zero. Useful for testing / manual override. */
export const resetDailyCount = async (key: string): Promise<void> => {
    try {
        await AsyncStorage.removeItem(key);
    } catch {
        /* no-op */
    }
};
