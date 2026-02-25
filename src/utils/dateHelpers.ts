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
 * Get timestamp for a unique ID
 */
export const getTimestamp = (): number => {
    return Date.now();
};

/**
 * Generate a unique ID
 */
export const generateId = (): string => {
    return `${getTimestamp()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Generate a UUID v4
 */
export const generateUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};
