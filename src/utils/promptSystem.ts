
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PROMPTS, GratitudePrompt, PromptCategory } from '../data/gratitudePrompts';
import { MascotMood } from '../hooks/useMascotState';

const PROMPT_HISTORY_KEY = 'ulbo_prompt_history';
const LAST_PROMPT_DATE_KEY = 'ulbo_last_prompt_date';

interface PromptHistory {
    lastCategory: PromptCategory | null;
    lastBodyPromptDate: string | null; // ISO Date string
    lastContrastPromptDate: string | null;
    usedPromptIds: string[];
    // To enable "max twice per month" check for Contrast, we might need an array of dates.
    // Simplifying: just track last date and ensure X time passed.
}

const DEFAULT_HISTORY: PromptHistory = {
    lastCategory: null,
    lastBodyPromptDate: null,
    lastContrastPromptDate: null,
    usedPromptIds: [],
};

const getHistory = async (): Promise<PromptHistory> => {
    try {
        const stored = await AsyncStorage.getItem(PROMPT_HISTORY_KEY);
        return stored ? JSON.parse(stored) : DEFAULT_HISTORY;
    } catch {
        return DEFAULT_HISTORY;
    }
};

const saveHistory = async (history: PromptHistory) => {
    try {
        await AsyncStorage.setItem(PROMPT_HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
        console.error("Failed to save prompt history", e);
    }
};

const getDaysSince = (dateStr: string | null): number => {
    if (!dateStr) return 999;
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * @param journalEntryCount Total journal entries (for unlocking advanced prompts).
 * @param excludeIds IDs to exclude from selection (for shuffle functionality).
 */
export const selectDailyPrompt = async (mood: MascotMood, journalEntryCount: number, excludeIds: string[] = []): Promise<GratitudePrompt> => {
    const history = await getHistory();
    const today = new Date().toISOString().split('T')[0];

    // Check if we already selected one for today? 
    // Usually we want to persist the same prompt for the day unless user asks for another.
    // For now, let's assume this is called when we need a NEW prompt.

    // 1. FILTERING
    let candidates = PROMPTS.filter(p => {
        // Mood Check
        if (p.excludedMoods?.includes(mood)) return false;
        if (p.allowedMoods && !p.allowedMoods.includes(mood)) return false;

        // Requirement Check
        if (p.minJournalEntries && journalEntryCount < p.minJournalEntries) return false;

        // Exclude specific IDs
        if (excludeIds.includes(p.id)) return false;

        return true;
    });

    // 2. PACING RULES
    // Rule: Never repeat a category on consecutive days
    if (history.lastCategory) {
        candidates = candidates.filter(p => p.category !== history.lastCategory);
    }

    // Rule: Body prompts max once per week
    if (getDaysSince(history.lastBodyPromptDate) < 7) {
        candidates = candidates.filter(p => p.category !== 'Body');
    }

    // Rule: Contrast prompts max twice per month (approx once every 14 days)
    if (getDaysSince(history.lastContrastPromptDate) < 14) {
        candidates = candidates.filter(p => p.category !== 'Contrast & Noticing');
    }

    // 3. MOOD PREFERENCES (Soft prioritization)
    // If multiple candidates remain, prioritize based on mood recommendations if possible.
    // Happy: Growth, People, Micro Moments
    // Sad: Micro Moments, Body, People
    // Anxious: Body, Place, Micro Moments
    // Tired: Body, Place, Micro Moments
    // Excited: Growth, Unexpected, People

    let preferredCategories: PromptCategory[] = [];
    if (mood === 'happy') preferredCategories = ['Growth & Becoming', 'People', 'Micro Moments'];
    if (mood === 'sad') preferredCategories = ['Micro Moments', 'Body', 'People'];
    if (mood === 'anxious') preferredCategories = ['Body', 'Place & Environment', 'Micro Moments'];
    if (mood === 'tired') preferredCategories = ['Body', 'Place & Environment', 'Micro Moments'];
    if (mood === 'excited') preferredCategories = ['Growth & Becoming', 'Unexpected & Reframed', 'People'];

    const preferredCandidates = candidates.filter(p => preferredCategories.includes(p.category));

    // Use preferred if available, otherwise fallback to any valid candidate
    const finalPool = preferredCandidates.length > 0 ? preferredCandidates : candidates;

    // 4. RANDOM SELECTION (Weighted by not used recently?)
    // Filter out recently used IDs if possible, or just random
    const unusedPool = finalPool.filter(p => !history.usedPromptIds.includes(p.id));
    const poolToUse = unusedPool.length > 0 ? unusedPool : finalPool; // Reset pool if exhausted

    if (poolToUse.length === 0) {
        // Fallback to absolute basic if constraints killed everything (unlikely)
        return PROMPTS[0];
    }

    const selected = poolToUse[Math.floor(Math.random() * poolToUse.length)];
    return selected;
};

export const recordPromptUsage = async (prompt: GratitudePrompt) => {
    const history = await getHistory();
    const now = new Date().toISOString();

    history.lastCategory = prompt.category;
    history.usedPromptIds.push(prompt.id);

    if (prompt.category === 'Body') history.lastBodyPromptDate = now;
    if (prompt.category === 'Contrast & Noticing') history.lastContrastPromptDate = now;

    // Keep used list manageable? Maybe last 50?
    if (history.usedPromptIds.length > 50) history.usedPromptIds.shift();

    await saveHistory(history);
};

export const getMascotIntro = (category: PromptCategory): string => {
    const intros = [
        "sprout has a question for u today~",
        "heart wants u to think about this one:",
        "ok this one's a soft one:",
        "hey, gently asking:",
        "just between us:",
        "something to sit with:",
    ];
    return intros[Math.floor(Math.random() * intros.length)];
};
