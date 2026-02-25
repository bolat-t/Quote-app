
// src/memory/MoodMemory.ts

import { getJournalEntries, JournalEntry } from '../utils/journalStorage';
import { MoodContext, MoodState } from './types';

// Helper to convert numeric score (1-10) to MoodState
const scoreToMood = (score: number): MoodState => {
    if (score >= 8) return 'excited';
    if (score >= 6) return 'happy';
    if (score >= 4) return 'idle';
    if (score >= 3) return 'tired'; // Interpretation
    return 'sad';
};

export const analyzeMoodHistory = async (): Promise<MoodContext> => {
    const entries = await getJournalEntries();

    // 1. Process recent entries (last 14 days)
    const now = new Date();
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(now.getDate() - 14);

    const recentEntries = entries
        .filter(e => new Date(e.date) >= twoWeeksAgo)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Newest first

    // 2. Generate recent moods list
    const recentMoods = recentEntries
        .filter(e => e.moodScore !== undefined)
        .map(e => ({
            date: e.date,
            score: e.moodScore || 5, // Default neutral
            mood: scoreToMood(e.moodScore || 5)
        }));

    // 3. Determine Dominant Mood (simple mode of recent moods)
    const moodCounts: Record<string, number> = {};
    recentMoods.forEach(m => {
        moodCounts[m.mood] = (moodCounts[m.mood] || 0) + 1;
    });

    let dominantMood: MoodState = 'idle';
    let maxCount = 0;

    Object.entries(moodCounts).forEach(([mood, count]) => {
        if (count > maxCount) {
            maxCount = count;
            dominantMood = mood as MoodState;
        }
    });

    // 4. Analyze Trend (Last 3 entries vs prev 3)
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (recentMoods.length >= 2) {
        // Take average of first half vs second half of the recent list
        // Note: recentMoods is Descending (newest first)
        const recentAvg = recentMoods.slice(0, Math.min(3, recentMoods.length))
            .reduce((acc, curr) => acc + curr.score, 0) / Math.min(3, recentMoods.length);

        // If we have history further back
        if (recentMoods.length > 3) {
            const olderBatch = recentMoods.slice(3, Math.min(6, recentMoods.length));
            const olderAvg = olderBatch.reduce((acc, curr) => acc + curr.score, 0) / olderBatch.length;

            if (recentAvg > olderAvg + 1) trend = 'improving';
            else if (recentAvg < olderAvg - 1) trend = 'declining';
        }
    }

    // 5. Streaks (already calculated in journalStorage, but efficient to recalc or call util)
    // We'll calculate a "Mood Streak" (consecutive days with entries) which mirrors the app streak
    // For now, let's look for "High Streak" (consecutive days >= 6 score)
    let currentHighStreak = 0;
    for (const m of recentMoods) {
        if (m.score >= 6) currentHighStreak++;
        else break;
    }

    // 6. High/Low days
    const lastLowDay = recentMoods.find(m => m.score <= 3)?.date || null;
    const lastHighDay = recentMoods.find(m => m.score >= 8)?.date || null;

    // 7. Get General App Streak (using existing logic)
    // We need to import calculateStreak from journalStorage, but it might be async/expensive?
    // Let's do a quick calc on all entries since we have them.
    // (Or import the util if we trust it doesn't cause circular deps. journalStorage doesn't import this, so safe.)
    // Actually, `calculateStreak` in `journalStorage` does another `getJournalEntries` call. 
    // Optimization: implement simple streak logic here on `entries` to avoid double-read.

    let currentStreak = 0;
    const todayStr = new Date().toISOString().split('T')[0];
    const uniqueDates = new Set(entries.map(e => e.date));

    // Simple streak calc matching standard logic
    let checkDate = new Date();
    // Check today
    if (uniqueDates.has(todayStr)) {
        currentStreak++;
    } else {
        // If not today, did we do yesterday?
        const yest = new Date();
        yest.setDate(yest.getDate() - 1);
        if (!uniqueDates.has(yest.toISOString().split('T')[0])) {
            // Streak broken
            currentStreak = 0;
        }
    }

    // Check backwards from yesterday
    checkDate.setDate(checkDate.getDate() - 1);
    while (uniqueDates.has(checkDate.toISOString().split('T')[0])) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
    }


    return {
        dominantMood,
        recentMoods,
        trend,
        currentStreak,
        longestStreak: 0, // Placeholder, expensive to calc history, maybe skip for now
        lastLowDay,
        lastHighDay
    };
};
