/**
 * Unsplash API utility
 *
 * Setup (2 minutes):
 *  1. Go to https://unsplash.com/developers
 *  2. Click "New Application" and accept the API guidelines
 *  3. Copy your "Access Key" and replace the placeholder below
 */
export const UNSPLASH_ACCESS_KEY = 'eVDDt_7Dl-JsVUs7u6TS0r8cFI7qa7lb7uTzS-pLtDY';

const BASE = 'https://api.unsplash.com';

const authHeader = (): HeadersInit => ({
    Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
});

export interface UnsplashPhoto {
    id: string;
    alt_description: string | null;
    description: string | null;
    urls: {
        thumb: string;   // ~200px — for tiny previews
        small: string;   // ~400px — for grid tiles
        regular: string; // ~1080px — for the vision board
    };
}

/** Search photos by keyword with pagination. */
export const searchPhotos = async (
    query: string,
    page = 1,
    perPage = 21,
): Promise<UnsplashPhoto[]> => {
    try {
        const res = await fetch(
            `${BASE}/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}&orientation=portrait`,
            { headers: authHeader() },
        );
        if (!res.ok) return [];
        const json = await res.json();
        return (json.results as UnsplashPhoto[]) ?? [];
    } catch {
        return [];
    }
};

/** Fetch photos visually similar to a given photo ID. */
export const getRelatedPhotos = async (photoId: string): Promise<UnsplashPhoto[]> => {
    try {
        const res = await fetch(`${BASE}/photos/${photoId}/related`, { headers: authHeader() });
        if (!res.ok) return [];
        const json = await res.json();
        return (json.results as UnsplashPhoto[]) ?? [];
    } catch {
        return [];
    }
};
