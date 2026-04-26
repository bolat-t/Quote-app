import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProgress, DailyActions, XPAction, DailyHunt, PositivityHuntEntry } from '../types';
import { XP_REWARDS, getLevelForXP } from '../data/progressionConfig';
import { getTodayDateString } from './dateHelpers';
import { supabase } from '../lib/supabase';

const PROGRESS_KEY = '@ulbo_user_progress';
const HUNT_KEY_PREFIX = '@ulbo_hunt_';

const createFreshDailyActions = (date: string): DailyActions => ({
    date,
    openApp: false,
    readQuote: false,
    drewReflection: false,
    wroteReflection: false,
    savedCanvas: false,
    sharedReflection: false,
    completedHunt: false,
    streak7Claimed: false,
    streak30Claimed: false,
});

const createDefaultProgress = (): UserProgress => ({
    totalXP: 0,
    level: 1,
    dailyActions: createFreshDailyActions(getTodayDateString()),
    lastUpdated: new Date().toISOString(),
});

// ---------- Supabase Sync Helpers ----------

/** Fire-and-forget: push XP + level to cloud. Fails silently if offline or unauthenticated. */
const syncProgressionToSupabase = async (progress: UserProgress): Promise<void> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase
            .from('user_progression')
            .upsert({
                user_id: user.id,
                total_xp: progress.totalXP,
                level: progress.level,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });
    } catch {
        // Silently ignore — local progress is the source of truth
    }
};

/**
 * Pull progression from Supabase. Used on fresh install / new device to restore
 * a user's XP and level without requiring them to re-earn it.
 */
const syncProgressionFromSupabase = async (): Promise<UserProgress | null> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('user_progression')
            .select('total_xp, level')
            .eq('user_id', user.id)
            .single();

        if (error || !data) return null;

        return {
            totalXP: data.total_xp,
            level: data.level,
            dailyActions: createFreshDailyActions(getTodayDateString()),
            lastUpdated: new Date().toISOString(),
        };
    } catch {
        return null;
    }
};

/** Explicit sync export — call after sign-in to restore cross-device progression. */
export const syncProgressionWithSupabase = async (): Promise<void> => {
    try {
        const raw = await AsyncStorage.getItem(PROGRESS_KEY);
        const localProgress: UserProgress | null = raw ? JSON.parse(raw) : null;
        const cloudProgress = await syncProgressionFromSupabase();

        if (!cloudProgress) return;

        // Cloud wins only if it has MORE XP (prevents downgrade on new device)
        if (!localProgress || cloudProgress.totalXP > localProgress.totalXP) {
            const today = getTodayDateString();
            cloudProgress.dailyActions = localProgress?.dailyActions.date === today
                ? localProgress.dailyActions
                : createFreshDailyActions(today);
            await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(cloudProgress));
        }
    } catch (error) {
        console.error('[Progression] syncProgressionWithSupabase error:', error);
    }
};

// ---------- Load / Save ----------

export const loadProgress = async (): Promise<UserProgress> => {
    try {
        const raw = await AsyncStorage.getItem(PROGRESS_KEY);

        // Fresh install: try to restore from cloud before starting at 0
        if (!raw) {
            const cloudProgress = await syncProgressionFromSupabase();
            if (cloudProgress) return cloudProgress;
            return createDefaultProgress();
        }

        const progress: UserProgress = JSON.parse(raw);

        // If it's a new day, reset daily actions but keep XP
        const today = getTodayDateString();
        if (progress.dailyActions.date !== today) {
            progress.dailyActions = createFreshDailyActions(today);
        }

        return progress;
    } catch (error) {
        console.error('[Progression] Error loading progress:', error);
        return createDefaultProgress();
    }
};

export const saveProgress = async (progress: UserProgress): Promise<void> => {
    try {
        progress.lastUpdated = new Date().toISOString();
        await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
        // Background cloud sync — non-blocking
        syncProgressionToSupabase(progress).catch(() => {});
    } catch (error) {
        console.error('[Progression] Error saving progress:', error);
    }
};

// ---------- Award XP ----------

/**
 * Awards XP for an action if it hasn't already been awarded today (for daily-limited actions).
 * Returns { updatedProgress, xpGained, leveledUp, newLevel }
 */
export const awardXP = async (
    action: XPAction,
    currentProgress?: UserProgress
): Promise<{
    progress: UserProgress;
    xpGained: number;
    leveledUp: boolean;
    previousLevel: number;
}> => {
    const progress = currentProgress ? { ...currentProgress } : await loadProgress();
    const today = getTodayDateString();

    // Ensure daily actions are fresh
    if (progress.dailyActions.date !== today) {
        progress.dailyActions = createFreshDailyActions(today);
    }

    // Check if this daily-limited action was already done
    const dailyLimitedMap: Partial<Record<XPAction, keyof DailyActions>> = {
        openApp: 'openApp',
        readQuote: 'readQuote',
        drawReflection: 'drewReflection',
        writeReflection: 'wroteReflection',
        saveCanvas: 'savedCanvas',
        shareReflection: 'sharedReflection',
        completeHunt: 'completedHunt',
        streak7Day: 'streak7Claimed',
        streak30Day: 'streak30Claimed',
    };

    const dailyKey = dailyLimitedMap[action];
    if (dailyKey && progress.dailyActions[dailyKey]) {
        // Already awarded today
        return { progress, xpGained: 0, leveledUp: false, previousLevel: progress.level };
    }

    // Award XP
    const xpGained = XP_REWARDS[action];
    const previousLevel = progress.level;
    progress.totalXP += xpGained;
    progress.level = getLevelForXP(progress.totalXP).level;

    // Mark daily action as done
    if (dailyKey) {
        (progress.dailyActions as any)[dailyKey] = true;
    }

    // Persist
    await saveProgress(progress);

    return {
        progress,
        xpGained,
        leveledUp: progress.level > previousLevel,
        previousLevel,
    };
};

// ---------- Positivity Hunt ----------

export const loadDailyHunt = async (date?: string): Promise<DailyHunt> => {
    const day = date || getTodayDateString();
    try {
        const raw = await AsyncStorage.getItem(HUNT_KEY_PREFIX + day);
        if (raw) {
            const parsed = JSON.parse(raw);
            // Ensure structure is valid
            if (!parsed.entries) parsed.entries = [];
            return parsed;
        }
    } catch (error) {
        console.error('[Progression] Error loading hunt:', error);
    }
    return { date: day, entries: [], completed: false, xpAwarded: false };
};

// Bulk-load every daily hunt the user has saved, keyed by date (YYYY-MM-DD).
// Used by the History screen so we don't fire one AsyncStorage call per day card.
export const loadAllDailyHunts = async (): Promise<Record<string, DailyHunt>> => {
    try {
        const allKeys = await AsyncStorage.getAllKeys();
        const huntKeys = allKeys.filter(k => k.startsWith(HUNT_KEY_PREFIX));
        if (huntKeys.length === 0) return {};
        const pairs = await AsyncStorage.multiGet(huntKeys);
        const result: Record<string, DailyHunt> = {};
        for (const [key, raw] of pairs) {
            if (!raw) continue;
            try {
                const parsed = JSON.parse(raw);
                if (!parsed.entries) parsed.entries = [];
                const date = key.slice(HUNT_KEY_PREFIX.length);
                result[date] = parsed;
            } catch {
                // skip corrupted
            }
        }
        return result;
    } catch (error) {
        console.error('[Progression] Error bulk-loading hunts:', error);
        return {};
    }
};

export const saveDailyHunt = async (hunt: DailyHunt): Promise<void> => {
    try {
        await AsyncStorage.setItem(HUNT_KEY_PREFIX + hunt.date, JSON.stringify(hunt));
    } catch (error) {
        console.error('[Progression] Error saving hunt:', error);
    }
};

export const addHuntEntry = async (
    text: string,
    currentHunt?: DailyHunt
): Promise<DailyHunt> => {
    const hunt = currentHunt ? { ...currentHunt, entries: [...currentHunt.entries] } : await loadDailyHunt();

    if (hunt.entries.length >= 3) return hunt; // Already full

    const entry: PositivityHuntEntry = {
        text,
        completedAt: new Date().toISOString(),
    };

    hunt.entries.push(entry);

    // Mark complete if we hit 3
    if (hunt.entries.length >= 3) {
        hunt.completed = true;
    }

    await saveDailyHunt(hunt);
    return hunt;
};
