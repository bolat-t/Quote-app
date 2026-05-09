import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { STORAGE_KEYS } from '../constants/storageKeys';

export interface VisionItem {
    id: string;
    type: 'image' | 'text';
    content: string; // image URL or text string
    position_x: number;
    position_y: number;
    rotation: number;
    scale: number;
    // Text styling (requires columns in vision_board_items — see migration below)
    // ALTER TABLE vision_board_items
    //   ADD COLUMN IF NOT EXISTS text_color  TEXT DEFAULT NULL,
    //   ADD COLUMN IF NOT EXISTS font_family TEXT DEFAULT NULL,
    //   ADD COLUMN IF NOT EXISTS bg_style    TEXT DEFAULT NULL;
    text_color?: string;
    font_family?: string;
    bg_style?: string;
}

export const fetchVisionItems = async (): Promise<VisionItem[]> => {
    try {
        const { data, error } = await supabase
            .from('vision_board_items')
            .select('*');

        if (error) throw error;
        return data as VisionItem[];
    } catch (error) {
        console.error('Error fetching vision board:', error);
        return [];
    }
};

export const addVisionItem = async (
    type: 'image' | 'text',
    content: string,
    initialPos?: { x: number; y: number; rotation: number; scale: number }
): Promise<VisionItem | null> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        let finalContent = content;

        // Upload image if type is image and it's a local URI
        if (type === 'image' && !content.startsWith('http')) {
            // Use fetch to read local file as blob (replaces deprecated readAsStringAsync)
            const response = await fetch(content);
            const blob = await response.blob();
            const arrayBuffer = await new Response(blob).arrayBuffer();

            const fileName = `${user.id}/vision-${Date.now()}.png`;
            const { error: uploadError } = await supabase.storage
                .from('journal-images')
                .upload(`vision/${fileName}`, arrayBuffer, {
                    contentType: 'image/png',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('journal-images')
                .getPublicUrl(`vision/${fileName}`);

            finalContent = publicUrl;
        }

        const newItem = {
            user_id: user.id,
            type,
            content: finalContent,
            position_x: initialPos?.x ?? Math.random() * 150,
            position_y: initialPos?.y ?? Math.random() * 300,
            rotation: initialPos?.rotation ?? (Math.random() - 0.5) * 20,
            scale: initialPos?.scale ?? 1,
            created_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
            .from('vision_board_items')
            .insert(newItem)
            .select()
            .single();

        if (error) throw error;

        // Log for journal feed
        const preview = type === 'text' ? content : finalContent;
        logVisionActivity(type, preview).catch(() => {});

        return data as VisionItem;

    } catch (error) {
        console.error('Error adding vision item:', error);
        return null;
    }
};

export const updateVisionItemPosition = async (
    id: string,
    x: number,
    y: number,
    scale: number,
    rotation: number
): Promise<void> => {
    try {
        const { error } = await supabase
            .from('vision_board_items')
            .update({ position_x: x, position_y: y, scale, rotation })
            .eq('id', id);

        if (error) throw error;
    } catch (error) {
        console.error('Error updating vision item:', error);
    }
}

export const updateVisionItemStyle = async (
    id: string,
    style: { text_color?: string; font_family?: string; bg_style?: string }
): Promise<void> => {
    try {
        const { error } = await supabase
            .from('vision_board_items')
            .update(style)
            .eq('id', id);
        if (error) throw error;
    } catch (error) {
        console.error('Error updating vision item style:', error);
    }
};

// ---------- Vision Activity Log (for journal feed) ----------

export interface VisionActivity {
    type: 'image' | 'text' | 'snapshot';
    content: string;   // URI for image/snapshot, text for text
    addedAt: string;
}

const VISION_LOG_PREFIX = STORAGE_KEYS.VISION_LOG_PREFIX;

const getTodayStr = (): string => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Internal-only — invoked by addVisionItem above. Not exported because the
// History screen uses the bulk loader (loadAllVisionActivities) instead.
const logVisionActivity = async (type: 'image' | 'text', content: string): Promise<void> => {
    try {
        const key = VISION_LOG_PREFIX + getTodayStr();
        const raw = await AsyncStorage.getItem(key);
        const log: VisionActivity[] = raw ? JSON.parse(raw) : [];
        log.push({ type, content, addedAt: new Date().toISOString() });
        await AsyncStorage.setItem(key, JSON.stringify(log));
    } catch (e) {
        console.error('Error logging vision activity:', e);
    }
};

// Exported — called by VisionBoardScreen when the user saves/shares the board.
export const logVisionSnapshot = async (localUri: string): Promise<void> => {
    try {
        const key = VISION_LOG_PREFIX + getTodayStr();
        const raw = await AsyncStorage.getItem(key);
        const log: VisionActivity[] = raw ? JSON.parse(raw) : [];
        log.push({ type: 'snapshot', content: localUri, addedAt: new Date().toISOString() });
        await AsyncStorage.setItem(key, JSON.stringify(log));
    } catch (e) {
        console.error('Error logging vision snapshot:', e);
    }
};

// Bulk-load every day's vision activity, keyed by date.
// Used by the History screen so we don't fire one AsyncStorage call per day card.
export const loadAllVisionActivities = async (): Promise<Record<string, VisionActivity[]>> => {
    try {
        const allKeys = await AsyncStorage.getAllKeys();
        const visionKeys = allKeys.filter(k => k.startsWith(VISION_LOG_PREFIX));
        if (visionKeys.length === 0) return {};
        const pairs = await AsyncStorage.multiGet(visionKeys);
        const result: Record<string, VisionActivity[]> = {};
        for (const [key, raw] of pairs) {
            if (!raw) continue;
            try {
                const date = key.slice(VISION_LOG_PREFIX.length);
                result[date] = JSON.parse(raw);
            } catch {
                // skip corrupted
            }
        }
        return result;
    } catch (e) {
        console.error('Error bulk-loading vision activities:', e);
        return {};
    }
};

export const deleteVisionItem = async (id: string): Promise<void> => {
    try {
        const { error } = await supabase
            .from('vision_board_items')
            .delete()
            .eq('id', id);
        if (error) throw error;
    } catch (error) {
        console.error('Error deleting vision item:', error);
    }
};
