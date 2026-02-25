
// src/memory/JournalMemory.ts

import { getJournalEntries, JournalEntry } from '../utils/journalStorage';
import { JournalContext } from './types';

export const analyzeJournalHistory = async (): Promise<JournalContext> => {
    const entries = await getJournalEntries();

    // Sort descending
    const sortedEntries = entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const now = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);

    // Recent Entry Count (last 7 days)
    const recentEntries = sortedEntries.filter(e => new Date(e.date) >= oneWeekAgo);
    const recentEntryCount = recentEntries.length;

    // Days Since Last Entry
    let daysSinceLastEntry = 0;
    if (sortedEntries.length > 0) {
        const lastDate = new Date(sortedEntries[0].date);
        const timeDiff = now.getTime() - lastDate.getTime();
        daysSinceLastEntry = Math.floor(timeDiff / (1000 * 3600 * 24));
    }

    // Dominant Themes (from sentimentTags)
    // We'll count the tags and return top 3
    const tagCounts: Record<string, number> = {};
    recentEntries.forEach(entry => {
        if (entry.sentimentTags && entry.sentimentTags.length > 0) {
            entry.sentimentTags.forEach(tag => {
                const normalizedTag = tag.toLowerCase().trim();
                tagCounts[normalizedTag] = (tagCounts[normalizedTag] || 0) + 1;
            });
        }
    });

    const dominantThemes = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1]) // Sort by count desc
        .slice(0, 3) // Top 3
        .map(([tag]) => tag);

    // Average Sentiment
    // Calculate based on moodScore if available
    let totalScore = 0;
    let scoreCount = 0;

    recentEntries.forEach(e => {
        if (e.moodScore) {
            totalScore += e.moodScore;
            scoreCount++;
        }
    });

    let averageSentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    if (scoreCount > 0) {
        const avg = totalScore / scoreCount;
        if (avg >= 7) averageSentiment = 'positive';
        else if (avg <= 4) averageSentiment = 'negative';
    }

    return {
        recentEntryCount,
        daysSinceLastEntry,
        dominantThemes,
        averageSentiment,
        hasWrittenThisWeek: recentEntryCount > 0
    };
};
