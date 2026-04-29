
// src/memory/MemorySystem.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import { MemoryContext } from './types';
import { analyzeMoodHistory } from './MoodMemory';
import { analyzeJournalHistory } from './JournalMemory';
import { scanRecentImages } from './ImageMemory';
import { STORAGE_KEYS } from '../constants/storageKeys';

const NAMES_KEY = STORAGE_KEYS.MASCOT_NAMES;

// User said "mascots don't have a name, just ulbos".
// capable of supporting future naming.
const DEFAULT_NAMES = {
    heart: "Ulbo",
    sprout: "Ulbo"
};

// Internal — only used by buildMemoryContext below.
const getMascotNames = async (): Promise<{ heart: string; sprout: string }> => {
    try {
        const stored = await AsyncStorage.getItem(NAMES_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error("Failed to load mascot names", e);
    }
    return DEFAULT_NAMES;
};

export const buildMemoryContext = async (): Promise<MemoryContext> => {
    const [names, mood, journal, images] = await Promise.all([
        getMascotNames(),
        analyzeMoodHistory(),
        analyzeJournalHistory(),
        scanRecentImages()
    ]);

    // Simple session counting (mock for now, or read from somewhere else if exists)
    // We could store this in AsyncStorage too
    let totalSessions = 0;
    try {
        const count = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_COUNT);
        totalSessions = count ? parseInt(count, 10) : 0;
    } catch { }

    return {
        mascotNames: names,
        mood,
        journal,
        images,
        daysSinceFirstOpen: 0, // Placeholder
        totalSessions
    };
};

