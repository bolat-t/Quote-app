import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { decode } from 'base64-arraybuffer';
// Fix deprecated API usage by importing from legacy
import * as FileSystem from 'expo-file-system/legacy';
import { generateUUID } from './dateHelpers';

const JOURNAL_KEY = 'ulbo_journal_entries';
const BUCKET_NAME = 'journal-images';

export interface JournalEntry {
    id: string; // Now a UUID
    quoteId: number;
    quoteText: string;
    response: string;
    createdAt: number;
    date: string;
    images?: string[];
    imageUri?: string; // Legacy support
    synced?: boolean; // New flag
    moodScore?: number; // AI Generated
    sentimentTags?: string[]; // AI Generated
    spiritReply?: string; // AI Generated
    followUpQuestion?: string; // AI Generated
}

/**
 * Call Supabase Edge Function to analyze journal text
 */
export const analyzeJournalEntry = async (text: string, userName: string): Promise<{ reply: string; mood: number; tags: string[]; followUp?: string } | null> => {
    try {
        const { data, error } = await supabase.functions.invoke('analyze-journal', {
            body: { journal_text: text, user_name: userName }
        });

        if (error) {
            console.error('Edge Function Invocation Error:', error);
            return null;
        }

        const result = typeof data === 'string' ? JSON.parse(data) : data;

        // Handle Logic-200 Style Errors
        if (result.success === false) {
            console.error('Edge Function Logic Error:', result.error);
            return null;
        }

        return {
            reply: result.reply,
            mood: result.mood,
            tags: result.tags,
            followUp: result.followUp // Map new field
        };
    } catch (error) {
        console.error('Failed to analyze journal:', error);
        return null;
    }
}

/**
 * Save a journal entry to local storage and try to sync
 */
export const saveJournalEntry = async (entry: JournalEntry): Promise<void> => {
    try {
        // AI ANALYSIS TRIGGER
        // If this is a new entry (or updated text) and doesn't have a reply yet, try to analyze it.
        // We do this BEFORE saving to local storage so the UI updates immediately if possible,
        // or we can do it in background and update later.
        // Let's do it in background to keep UI snappy, then update storage.

        const existingEntries = await getJournalEntries();
        // Remove existing version if updating
        const filteredEntries = existingEntries.filter(e => e.id !== entry.id);

        let entryToSave = { ...entry };

        // Initial save (fast)
        await AsyncStorage.setItem(JOURNAL_KEY, JSON.stringify([entryToSave, ...filteredEntries]));

        // Background: Analyze if text exists and no reply
        if (entry.response && !entry.spiritReply && entry.response.length > 5) {
            console.log("Triggering AI Analysis for entry:", entry.id);
            // Get user name for personalization
            // We can't import getUserName/storage.ts due to potential circular dependency if not careful.
            // But let's assume "Friend" if not available or pass it in. 
            // Ideally we refactor getUserName to a shared config.
            // For now, let's just use "Friend" or fetch from AsyncStorage directly if needed, 
            // or better, rely on the storage.ts which IMPORTS types from here. 
            // Actually `journalStorage` does NOT import `storage.ts`. Good.
            const name = await AsyncStorage.getItem('@ulbo_user_name') || 'Friend';

            analyzeJournalEntry(entry.response, name).then(async (analysis) => {
                if (analysis) {
                    console.log('AI Analysis success:', analysis);
                    await updateEntryWithAI(entry.id, analysis);
                } else {
                    console.warn('AI Analysis returned null result');
                }
            }).catch(e => console.error("AI Analysis process failed:", e));
        } else {
            console.log("Skipping AI analysis. Criteria: len>5, no-reply. Entry:", { len: entry.response?.length, hasReply: !!entry.spiritReply });
        }

        // Attempt background sync if user is logged in
        syncEntryToSupabase(entryToSave).catch(err => console.log('Background sync failed:', err));
    } catch (error: any) {
        console.error('Error saving journal entry:', error);
        throw error;
    }
};

/**
 * Update an existing entry with AI analysis results
 */
export const updateEntryWithAI = async (id: string, analysis: { reply: string; mood: number; tags: string[]; followUp?: string }): Promise<void> => {
    try {
        const entries = await getJournalEntries();
        const index = entries.findIndex(e => e.id === id);
        if (index !== -1) {
            const updatedEntry = {
                ...entries[index],
                spiritReply: analysis.reply,
                moodScore: analysis.mood,
                sentimentTags: analysis.tags,
                followUpQuestion: analysis.followUp
            };
            entries[index] = updatedEntry;
            await AsyncStorage.setItem(JOURNAL_KEY, JSON.stringify(entries));

            // Sync updated entry
            syncEntryToSupabase(updatedEntry).catch(e => console.error('Sync AI update failed', e));
        }
    } catch (error) {
        console.error('Failed to update entry with AI:', error);
    }
};

/**
 * Get all journal entries from local storage
 */
export const getJournalEntries = async (): Promise<JournalEntry[]> => {
    try {
        const data = await AsyncStorage.getItem(JOURNAL_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error getting journal entries:', error);
        return [];
    }
};

/**
 * Get all unique dates that have journal entries
 */
export const getAllJournalDates = async (): Promise<string[]> => {
    const entries = await getJournalEntries();
    const dates = new Set(entries.map(e => e.date));
    return Array.from(dates);
};

/**
 * Sync a single entry to Supabase
 */
const syncEntryToSupabase = async (entry: JournalEntry) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Validate UUID format before syncing
    let entryToSync = { ...entry };
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(entry.id)) {
        console.log(`Migrating entry ${entry.id} to UUID before sync`);
        // If it's not a UUID, we can't sync it as-is to Supabase.
        // We need to generate a valid UUID, update it locally, and THEN sync.
        // However, changing ID here might be risky if we don't update local storage.
        // For individual sync, we'll generate a UUID just for the cloud if we can match it back?
        // No, we must update local storage to keep them in sync.
        // But this function is called "background sync".
        // Let's defer migration to full sync or explicit migration step.
        // For now, if invalid, just return to avoid error, or try to migrate on the fly.

        // Strategy: Generate new UUID.
        const newId = generateUUID();
        entryToSync.id = newId;

        // Update local storage effectively "moving" the entry
        try {
            const allEntries = await getJournalEntries();
            const updatedEntries = allEntries.map(e => {
                if (e.id === entry.id) return { ...e, id: newId };
                return e;
            });
            await AsyncStorage.setItem(JOURNAL_KEY, JSON.stringify(updatedEntries));
            console.log(`Migrated local entry ${entry.id} -> ${newId}`);
        } catch (e) {
            console.error("Failed to migrate ID locally", e);
            return; // Abort sync
        }
    }

    // upload image if needed
    let imagePath = null;
    const imageUri = entryToSync.images?.[0] || entryToSync.imageUri;

    if (imageUri && !imageUri.startsWith('http')) {
        imagePath = await uploadJournalImage(imageUri, user.id);
    } else if (imageUri && imageUri.startsWith('http')) {
        // Already remote
        imagePath = imageUri;
    }

    const { error } = await supabase
        .from('journal_entries')
        .upsert({
            id: entryToSync.id,
            user_id: user.id,
            quote_id: entryToSync.quoteId,
            quote_text: entryToSync.quoteText,
            response: entryToSync.response,
            image_path: imagePath,
            date: entryToSync.date,
            created_at: new Date(entryToSync.createdAt).toISOString(),
            // AI Fields
            mood_score: entryToSync.moodScore,
            sentiment_tags: entryToSync.sentimentTags,
            spirit_reply: entryToSync.spiritReply
        });

    if (error) console.error('Supabase upsert error:', error);
};

/**
 * Upload image to Supabase Storage
 */
const uploadJournalImage = async (uri: string, userId: string): Promise<string | null> => {
    try {
        const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${userId}/${Date.now()}.${ext}`;

        // Reverting to Base64 for reliability
        const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: 'base64',
        });

        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(fileName, decode(base64), {
                contentType: `image/${ext}`,
                upsert: true
            });

        if (error) throw error;

        // Return public URL or path
        const { data: { publicUrl } } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
        return publicUrl;
    } catch (error) {
        console.error('Image upload failed:', error);
        return null;
    }
};

/**
 * Full Sync: Download from Cloud -> Merge Local
 */
export const syncJournalWithSupabase = async (): Promise<void> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Fetch cloud entries
        const { data: cloudEntries, error } = await supabase
            .from('journal_entries')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // 2. Get local entries
        const localEntries = await getJournalEntries();

        // MIGRATION: Check for non-UUID local IDs before merging
        let migrationOccurred = false;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

        const migratedLocalEntries = localEntries.map(entry => {
            if (!uuidRegex.test(entry.id)) {
                const newId = generateUUID();
                console.log(`[Sync] Migrating ID ${entry.id} -> ${newId}`);
                migrationOccurred = true;
                return { ...entry, id: newId };
            }
            return entry;
        });

        if (migrationOccurred) {
            await AsyncStorage.setItem(JOURNAL_KEY, JSON.stringify(migratedLocalEntries));
        }

        const localMap = new Map(migratedLocalEntries.map(e => [e.id, e]));

        // 3. Merge Cloud -> Local
        const mergedEntries: JournalEntry[] = [...migratedLocalEntries];
        let hasChanges = migrationOccurred;

        if (cloudEntries) {
            for (const cloudEntry of cloudEntries) {
                const local = localMap.get(cloudEntry.id);
                // If missing locally, add it.
                if (!local) {
                    const newEntry: JournalEntry = {
                        id: cloudEntry.id,
                        quoteId: cloudEntry.quote_id,
                        quoteText: cloudEntry.quote_text,
                        response: cloudEntry.response,
                        date: cloudEntry.date,
                        createdAt: new Date(cloudEntry.created_at).getTime(),
                        images: cloudEntry.image_path ? [cloudEntry.image_path] : [],
                        imageUri: cloudEntry.image_path, // Legacy
                        // Map new AI fields
                        moodScore: cloudEntry.mood_score,
                        sentimentTags: cloudEntry.sentiment_tags,
                        spiritReply: cloudEntry.spirit_reply
                    };
                    mergedEntries.push(newEntry);
                    hasChanges = true;
                } else {
                    // Start of Update Logic for existing entries (e.g. if AI processed it on another device)
                    // If cloud has AI data and local doesn't, update local.
                    if (cloudEntry.spirit_reply && !local.spiritReply) {
                        const updatedEntry = {
                            ...local,
                            spiritReply: cloudEntry.spirit_reply,
                            moodScore: cloudEntry.mood_score,
                            sentimentTags: cloudEntry.sentiment_tags
                        };
                        // Find and replace in mergedEntries
                        const idx = mergedEntries.findIndex(e => e.id === local.id);
                        if (idx !== -1) {
                            mergedEntries[idx] = updatedEntry;
                            hasChanges = true;
                        }
                    }
                }
            }
        }

        if (hasChanges) {
            // Sort by date desc
            mergedEntries.sort((a, b) => b.createdAt - a.createdAt);
            await AsyncStorage.setItem(JOURNAL_KEY, JSON.stringify(mergedEntries));
        }

        // 4. Push Local -> Cloud (Missing ones)
        // Use migrated entries
        const cloudIds = new Set((cloudEntries || []).map(e => e.id));
        for (const local of mergedEntries) {
            if (!cloudIds.has(local.id)) {
                await syncEntryToSupabase(local);
            }
        }

    } catch (error) {
        console.error('Full sync failed:', error);
    }
};

/**
 * Add an image to a journal entry (creating it if needed)
 */
export const addJournalImage = async (
    date: string,
    imageUri: string,
    quoteData?: { id: number; text: string },
    responseText?: string // Added optional text
): Promise<JournalEntry | void> => {
    try {
        const entries = await getJournalEntries();
        const existingIndex = entries.findIndex(e => e.date === date);
        let updatedEntry: JournalEntry;

        if (existingIndex >= 0) {
            // Update existing entry
            const entry = entries[existingIndex];
            const currentImages = entry.images || (entry.imageUri ? [entry.imageUri] : []);
            const updatedImages = [...currentImages, imageUri];

            updatedEntry = {
                ...entry,
                images: updatedImages,
                imageUri: updatedImages[0]
            };
            entries[existingIndex] = updatedEntry;
        } else {
            // Create new entry
            if (!quoteData) {
                console.warn('Cannot create new journal entry without quote data');
                return;
            }

            updatedEntry = {
                id: generateJournalId(),
                quoteId: quoteData.id,
                quoteText: quoteData.text,
                response: responseText || '', // Use provided text or empty
                createdAt: Date.now(),
                date: date,
                images: [imageUri],
                imageUri: imageUri
            };
            entries.unshift(updatedEntry);
        }

        await AsyncStorage.setItem(JOURNAL_KEY, JSON.stringify(entries));

        // Sync
        syncEntryToSupabase(updatedEntry).catch(e => console.error('Sync image failed', e));

        return updatedEntry; // Return the entry so we can use it for AI
    } catch (error) {
        console.error('Error adding journal image:', error);
        throw error;
    }
};

/**
 * Update a journal entry with a saved image URI (Deprecated, use addJournalImage)
 */
export const updateJournalEntryImage = async (date: string, imageUri: string): Promise<JournalEntry | void> => {
    return addJournalImage(date, imageUri);
};

/**
 * Get a journal entry for a specific date
 */
export const getJournalEntryByDate = async (date: string): Promise<JournalEntry | null> => {
    try {
        const entries = await getJournalEntries();
        return entries.find(entry => entry.date === date) || null;
    } catch (error) {
        console.error('Error getting journal entry by date:', error);
        return null;
    }
};

/**
 * Get ALL journal entries for a specific date, sorted oldest-first
 */
export const getJournalEntriesByDate = async (date: string): Promise<JournalEntry[]> => {
    try {
        const entries = await getJournalEntries();
        return entries
            .filter(e => e.date === date)
            .sort((a, b) => a.createdAt - b.createdAt);
    } catch (error) {
        console.error('Error getting journal entries by date:', error);
        return [];
    }
};

const DAILY_SUMMARY_PREFIX = '@ulbo_daily_summary_';

export const getDailySummary = async (date: string): Promise<string | null> => {
    try {
        return await AsyncStorage.getItem(DAILY_SUMMARY_PREFIX + date);
    } catch {
        return null;
    }
};

export const saveDailySummary = async (date: string, summary: string): Promise<void> => {
    try {
        await AsyncStorage.setItem(DAILY_SUMMARY_PREFIX + date, summary);
    } catch (e) {
        console.error('Error saving daily summary:', e);
    }
};

/**
 * Delete a journal entry by ID
 */
export const deleteJournalEntry = async (id: string): Promise<void> => {
    try {
        const entries = await getJournalEntries();
        const filteredEntries = entries.filter(entry => entry.id !== id);
        await AsyncStorage.setItem(JOURNAL_KEY, JSON.stringify(filteredEntries));

        // Also delete from Supabase if logged in?
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            supabase.from('journal_entries').delete().eq('id', id).then();
        }
    } catch (error) {
        console.error('Error deleting journal entry:', error);
        throw error;
    }
};

/**
 * Generate a unique ID for journal entries
 */
export const generateJournalId = (): string => {
    return generateUUID();
};

/**
 * Get today's date in YYYY-MM-DD format
 */
export const getTodayDateString = (): string => {
    const today = new Date();
    return today.toISOString().split('T')[0];
};

/**
 * Calculate current streak based on journal entries
 */
export const calculateStreak = async (): Promise<number> => {
    const entries = await getJournalEntries();
    if (entries.length === 0) return 0;

    const dates = [...new Set(entries.map(e => e.date))].sort().reverse();
    if (dates.length === 0) return 0;

    const today = getTodayDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (dates[0] !== today && dates[0] !== yesterdayStr) {
        return 0;
    }

    let streak = 0;
    let currentDateToCheck = new Date();

    if (dates[0] !== today) {
        currentDateToCheck.setDate(currentDateToCheck.getDate() - 1);
    }

    while (true) {
        const dateStr = currentDateToCheck.toISOString().split('T')[0];
        if (dates.includes(dateStr)) {
            streak++;
            currentDateToCheck.setDate(currentDateToCheck.getDate() - 1);
        } else {
            break;
        }
    }

    return streak;
};

/**
 * Get the last 7 days history for the streak view
 */
export const getWeeklyHistory = async (): Promise<{ day: string; date: string; completed: boolean; isToday: boolean }[]> => {
    const entries = await getJournalEntries();
    const entryDates = new Set(entries.map(e => e.date));
    const today = getTodayDateString();

    // Generate last 7 days (or current week? Reference image shows Mo-Su, usually implied current week or rolling 7 days)
    // Let's do rolling 7 days ending today for better context, or fixed Mo-Su. 
    // Image shows "Mo Tu We Th Fr Sa Su" with "Tu" checked and selected.
    // Let's do a fixed week (Monday start) containing today.

    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(now.setDate(diff));

    const weekData = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const dayName = d.toLocaleDateString('en-US', { weekday: 'narrow' }).toUpperCase().substring(0, 2); // MO, TU...

        weekData.push({
            day: dayName, // MO, TU, etc.
            date: dateStr,
            completed: entryDates.has(dateStr),
            isToday: dateStr === today
        });
    }
    return weekData;
};

/**
 * Export all journal data as JSON string
 */
export const exportJournalData = async (): Promise<{
    success: boolean;
    data?: string;
    filename?: string;
    entryCount?: number;
    error?: string;
}> => {
    try {
        const entries = await getJournalEntries();

        if (entries.length === 0) {
            return {
                success: false,
                error: 'No journal entries to export'
            };
        }

        const exportData = {
            exportedAt: new Date().toISOString(),
            appVersion: '1.0.1',
            entryCount: entries.length,
            entries: entries.map(entry => ({
                id: entry.id,
                date: entry.date,
                quoteId: entry.quoteId,
                quoteText: entry.quoteText,
                response: entry.response,
                createdAt: entry.createdAt,
                imageCount: entry.images?.length || (entry.imageUri ? 1 : 0)
            }))
        };

        const jsonString = JSON.stringify(exportData, null, 2);
        const filename = `ulbo-journal-export-${getTodayDateString()}.json`;

        return {
            success: true,
            data: jsonString,
            filename,
            entryCount: entries.length
        };
    } catch (error) {
        console.error('Error exporting journal data:', error);
        return {
            success: false,
            error: 'Failed to export journal data'
        };
    }
};
