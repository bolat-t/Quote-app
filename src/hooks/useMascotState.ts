import { useState, useCallback, useEffect } from 'react';
import { getJournalEntryByDate, getTodayDateString } from '../utils/journalStorage';
import { MemoryContext } from '../memory/types';
import { buildMemoryContext } from '../memory/MemorySystem';

export type MascotMood = 'idle' | 'happy' | 'sad' | 'excited' | 'anxious' | 'tired';

export const useMascotState = () => {
    const [mood, setMood] = useState<MascotMood>('idle');
    const [isLoaded, setIsLoaded] = useState(false);
    const [memoryContext, setMemoryContext] = useState<MemoryContext | null>(null);

    const checkMood = useCallback(async () => {
        const now = new Date();
        const hour = now.getHours();

        // 1. Late night: calm idle (3 AM to 5 AM)
        if (hour >= 3 && hour < 5) {
            setMood('idle');
            // Load memory anyway
            const memory = await buildMemoryContext();
            setMemoryContext(memory);
            setIsLoaded(true);
            return;
        }

        // 2. Check Journal Status
        const today = getTodayDateString();
        const entry = await getJournalEntryByDate(today);

        // 3. Load Memory Context
        const memory = await buildMemoryContext();
        setMemoryContext(memory);

        if (entry) {
            setMood('happy');
        } else if (hour >= 20) {
            // Gentle nudge: only sad in the evening if no journal entry
            setMood('sad');
        } else {
            // Daytime with no entry yet — reflect dominant mood from memory if available
            const dominantMood = memory.mood.dominantMood as MascotMood | undefined;
            const validMoods: MascotMood[] = ['happy', 'sad', 'excited', 'anxious', 'tired', 'idle'];
            setMood(dominantMood && validMoods.includes(dominantMood) ? dominantMood : 'idle');
        }
        setIsLoaded(true);
    }, []);

    // Check on mount and every minute
    useEffect(() => {
        checkMood();
        const interval = setInterval(checkMood, 60000);
        return () => clearInterval(interval);
    }, [checkMood]);

    return { mood, isLoaded, memoryContext, refreshMascot: checkMood };
};
