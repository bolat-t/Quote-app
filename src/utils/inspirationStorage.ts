import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@ulbo_inspiration_categories';

export type InspirationImage = {
    id:         string;
    uri:        string;
    position_x: number;
    position_y: number;
    scale:      number;
    rotation:   number;
};

export type InspirationCategory = {
    id:           string;
    title:        string;
    images:       InspirationImage[];
    thumbnailUri?: string;  // explicitly chosen cover image; falls back to images[0].uri
    createdAt:    number;
    updatedAt:    number;
};

const genId = () =>
    `insp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const genImgId = () =>
    `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// ── Migration helper ─────────────────────────────────────────
// Older storage shape used `imageUris: string[]`. Promote any
// such categories to the new `images` array (default position/
// scale/rotation), so existing data isn't lost.
const migrate = (raw: any): InspirationCategory => {
    if (Array.isArray(raw?.images)) {
        return {
            id:        raw.id,
            title:     raw.title ?? '',
            images:    raw.images.map((img: any) => ({
                id:         img.id ?? genImgId(),
                uri:        img.uri,
                position_x: typeof img.position_x === 'number' ? img.position_x : 0,
                position_y: typeof img.position_y === 'number' ? img.position_y : 0,
                scale:      typeof img.scale === 'number' ? img.scale : 1,
                rotation:   typeof img.rotation === 'number' ? img.rotation : 0,
            })),
            createdAt: raw.createdAt ?? Date.now(),
            updatedAt: raw.updatedAt ?? Date.now(),
        };
    }
    if (Array.isArray(raw?.imageUris)) {
        return {
            id:        raw.id,
            title:     raw.title ?? '',
            images:    raw.imageUris.map((uri: string, i: number) => ({
                id:         genImgId(),
                uri,
                // Cascade default positions so they're not all stacked
                position_x: 20 + (i % 3) * 90,
                position_y: 20 + Math.floor(i / 3) * 110,
                scale:      1,
                rotation:   0,
            })),
            createdAt: raw.createdAt ?? Date.now(),
            updatedAt: raw.updatedAt ?? Date.now(),
        };
    }
    return {
        id:        raw.id ?? genId(),
        title:     raw.title ?? '',
        images:    [],
        createdAt: raw.createdAt ?? Date.now(),
        updatedAt: raw.updatedAt ?? Date.now(),
    };
};

export const getInspirationCategories = async (): Promise<InspirationCategory[]> => {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.map(migrate);
    } catch {
        return [];
    }
};

export const saveInspirationCategories = async (cats: InspirationCategory[]): Promise<void> => {
    try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cats));
    } catch (e) {
        console.warn('saveInspirationCategories failed', e);
    }
};

export const createInspirationCategory = async (): Promise<InspirationCategory> => {
    const existing = await getInspirationCategories();
    const now = Date.now();
    const cat: InspirationCategory = {
        id:        genId(),
        title:     '',
        images:    [],
        createdAt: now,
        updatedAt: now,
    };
    await saveInspirationCategories([...existing, cat]);
    return cat;
};

export const updateInspirationCategory = async (
    id: string,
    patch: Partial<Pick<InspirationCategory, 'title' | 'images' | 'thumbnailUri'>>,
): Promise<void> => {
    const existing = await getInspirationCategories();
    const next = existing.map(c =>
        c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c
    );
    await saveInspirationCategories(next);
};

export const deleteInspirationCategory = async (id: string): Promise<void> => {
    const existing = await getInspirationCategories();
    await saveInspirationCategories(existing.filter(c => c.id !== id));
};

// Convenience for adding new images with sensible default positions
export const makeInspirationImage = (
    uri: string,
    indexInBatch: number = 0,
    existingCount: number = 0,
): InspirationImage => {
    const i = existingCount + indexInBatch;
    return {
        id:         genImgId(),
        uri,
        position_x: 20 + (i % 3) * 90,
        position_y: 20 + Math.floor(i / 3) * 110,
        scale:      1,
        rotation:   0,
    };
};
