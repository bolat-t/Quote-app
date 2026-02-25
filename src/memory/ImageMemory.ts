
// src/memory/ImageMemory.ts

import { getJournalEntries, JournalEntry } from '../utils/journalStorage';
import { ImageContext } from './types';

export const scanRecentImages = async (): Promise<ImageContext> => {
    const entries = await getJournalEntries();

    // Sort descending
    const sortedEntries = entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Find entries with images
    const entriesWithImages = sortedEntries.filter(e =>
        (e.images && e.images.length > 0) || e.imageUri
    );

    const now = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);

    // Recent Image Count
    const recentImageEntries = entriesWithImages.filter(e => new Date(e.date) >= oneWeekAgo);

    let lastImageDate: string | null = null;
    let lastImageMoodTag = null; // We don't have explicit image tags, so use entry mood
    let lastImageCaption = null; // We don't have captions, maybe use response?

    if (entriesWithImages.length > 0) {
        const lastEntry = entriesWithImages[0];
        lastImageDate = lastEntry.date;
        // Map score to mood state if available
        if (lastEntry.moodScore) {
            // Logic repeated from MoodMemory briefly, or just pass generic
            if (lastEntry.moodScore >= 7) lastImageMoodTag = 'happy';
            else if (lastEntry.moodScore <= 4) lastImageMoodTag = 'sad';
            else lastImageMoodTag = 'idle';
        }
        // Use response excerpt as "caption" context if needed
        if (lastEntry.response) {
            lastImageCaption = lastEntry.response.substring(0, 20) + '...';
        }
    }

    return {
        hasRecentImages: recentImageEntries.length > 0,
        lastImageDate,
        recentImageCount: recentImageEntries.length,
        lastImageMoodTag: lastImageMoodTag as any, // Cast to avoid tight coupling or import MoodState here if wanted
        lastImageCaption
    };
};
