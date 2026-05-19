import { useState, useCallback, useEffect } from 'react';
import { getJournalEntryByDate, getTodayDateString } from '../utils/journalStorage';

export type MascotMood = 'idle' | 'happy' | 'sad' | 'excited' | 'anxious' | 'tired';

export const useMascotState = () => {
    const [mood, setMood] = useState<MascotMood>('idle');
    const [isLoaded, setIsLoaded] = useState(false);

    const checkMood = useCallback(async () => {
        const now = new Date();
        const hour = now.getHours();

        // Late night: calm idle (3 AM to 5 AM)
        if (hour >= 3 && hour < 5) {
            setMood('idle');
            setIsLoaded(true);
            return;
        }

        // Check Journal Status
        const today = getTodayDateString();
        const entry = await getJournalEntryByDate(today);

        if (entry) {
            setMood('happy');
        } else if (hour >= 20) {
            // Gentle nudge: only sad in the evening if no journal entry
            setMood('sad');
        } else {
            setMood('idle');
        }
        setIsLoaded(true);
    }, []);

    // Check on mount and every minute
    useEffect(() => {
        checkMood();
        const interval = setInterval(checkMood, 60000);
        return () => clearInterval(interval);
    }, [checkMood]);

    return { mood, isLoaded, refreshMascot: checkMood };
};
