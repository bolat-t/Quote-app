/**
 * Get today's date as a YYYY-MM-DD string (local time).
 *
 * Single source of truth — import this instead of redefining
 * getTodayString() or similar in individual files.
 */
export const getTodayDateString = (): string => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

/**
 * Get the day of the year (1-366)
 */
export const getDayOfYear = (date: Date = new Date()): number => {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
};

/**
 * Format date as "M.DD" (e.g., "8.31")
 */
export const formatDateShort = (date: Date = new Date()): string => {
    const month = date.getMonth() + 1;
    const day = date.getDate().toString().padStart(2, '0');
    return `${month}.${day}`;
};

/**
 * Generate a UUID v4 — used for journal-entry IDs that sync to Supabase.
 */
export const generateUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};
