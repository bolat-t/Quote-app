import AsyncStorage from '@react-native-async-storage/async-storage';
import { BonsaiState } from '../types';

const BONSAI_KEY = '@ulbo_bonsai_state';

const getTodayString = (): string => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const createDefaultBonsaiState = (): BonsaiState => ({
    health: 100,
    growthStage: 1,
    lastTendedDate: getTodayString(),
    lastActiveDate: getTodayString(),
    totalWaterings: 0,
    wateredToday: false,
});

/** Calculate days between two YYYY-MM-DD strings */
const daysBetween = (dateA: string, dateB: string): number => {
    const a = new Date(dateA + 'T00:00:00');
    const b = new Date(dateB + 'T00:00:00');
    return Math.floor(Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
};

export const loadBonsaiState = async (): Promise<BonsaiState> => {
    try {
        const raw = await AsyncStorage.getItem(BONSAI_KEY);
        if (!raw) return createDefaultBonsaiState();

        const state: BonsaiState = JSON.parse(raw);
        const today = getTodayString();

        // Reset wateredToday if it's a new day
        if (state.lastTendedDate !== today) {
            state.wateredToday = false;
        }

        return state;
    } catch (error) {
        console.error('[Bonsai] Error loading state:', error);
        return createDefaultBonsaiState();
    }
};

export const saveBonsaiState = async (state: BonsaiState): Promise<void> => {
    try {
        await AsyncStorage.setItem(BONSAI_KEY, JSON.stringify(state));
    } catch (error) {
        console.error('[Bonsai] Error saving state:', error);
    }
};

/** Apply decay based on inactive days. Called on app open. */
export const applyDecay = (state: BonsaiState): BonsaiState => {
    const today = getTodayString();
    const inactiveDays = daysBetween(state.lastActiveDate, today);

    if (inactiveDays <= 0) return state;

    const updated = { ...state };
    let totalDecay = 0;

    for (let i = 1; i <= inactiveDays; i++) {
        totalDecay += i > 3 ? 15 : 10;
    }

    updated.health = Math.max(15, updated.health - totalDecay);
    return updated;
};

/** Boost health for a daily action. */
export const boostHealth = (state: BonsaiState, action: string): BonsaiState => {
    const today = getTodayString();
    const updated = { ...state, lastActiveDate: today };

    const boostMap: Record<string, number> = {
        writeReflection: 10,
        drawReflection: 10,
        completeHunt: 8,
        saveCanvas: 5,
        readQuote: 5,
        openApp: 3,
        shareReflection: 5,
    };

    updated.health = Math.min(100, updated.health + (boostMap[action] || 5));
    return updated;
};

/** Water the tree (once per day for health boost). */
export const waterTree = (state: BonsaiState): BonsaiState => {
    const today = getTodayString();
    const updated = { ...state, lastTendedDate: today };

    if (!state.wateredToday) {
        updated.wateredToday = true;
        updated.totalWaterings += 1;
        updated.health = Math.min(100, updated.health + 3);
    }

    return updated;
};
