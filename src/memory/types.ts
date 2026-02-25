
// src/memory/types.ts

export type MoodState = 'idle' | 'happy' | 'sad' | 'excited' | 'anxious' | 'tired';

export interface MoodContext {
    dominantMood: MoodState;
    recentMoods: { date: string; score: number; mood: MoodState }[];
    trend: 'improving' | 'declining' | 'stable';
    currentStreak: number;
    longestStreak: number;
    lastLowDay: string | null; // Date string YYYY-MM-DD
    lastHighDay: string | null; // Date string
}

export interface JournalContext {
    recentEntryCount: number;
    daysSinceLastEntry: number;
    dominantThemes: string[];
    averageSentiment: 'positive' | 'neutral' | 'negative';
    hasWrittenThisWeek: boolean;
}

export interface ImageContext {
    hasRecentImages: boolean;
    lastImageDate: string | null;
    recentImageCount: number;
    lastImageMoodTag: MoodState | null;
    lastImageCaption: string | null;
}

export interface MemoryContext {
    mascotNames: { heart: string; sprout: string };
    mood: MoodContext;
    journal: JournalContext;
    images: ImageContext;
    daysSinceFirstOpen: number;
    totalSessions: number;
}
