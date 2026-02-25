import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProgress, DailyActions, XPAction, DailyHunt, PositivityHuntEntry } from '../types';
import { XP_REWARDS, getLevelForXP } from '../data/progressionConfig';

const PROGRESS_KEY = '@ulbo_user_progress';
const HUNT_KEY_PREFIX = '@ulbo_hunt_';

// ---------- Date helpers ----------

const getTodayString = (): string => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

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
    dailyActions: createFreshDailyActions(getTodayString()),
    lastUpdated: new Date().toISOString(),
});

// ---------- Load / Save ----------

export const loadProgress = async (): Promise<UserProgress> => {
    try {
        const raw = await AsyncStorage.getItem(PROGRESS_KEY);
        if (!raw) return createDefaultProgress();

        const progress: UserProgress = JSON.parse(raw);

        // If it's a new day, reset daily actions but keep XP
        const today = getTodayString();
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
    const today = getTodayString();

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
    const day = date || getTodayString();
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
