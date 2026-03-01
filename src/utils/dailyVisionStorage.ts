import AsyncStorage from '@react-native-async-storage/async-storage';
import { VisionItem } from './visionBoardStorage';
import { supabase } from '../lib/supabase';

const DAILY_VISION_PREFIX = '@ulbo_daily_vision_';

export interface DailyVisionBoard {
    date: string; // YYYY-MM-DD
    themeId: string;
    items: VisionItem[];
    completed: boolean;
}

export const getDailyVisionBoard = async (dateStr: string): Promise<DailyVisionBoard | null> => {
    try {
        const raw = await AsyncStorage.getItem(DAILY_VISION_PREFIX + dateStr);
        if (raw) {
            return JSON.parse(raw);
        }
        return null;
    } catch (e) {
        console.error('Error fetching daily vision board:', e);
        return null;
    }
};

export const saveDailyVisionBoard = async (board: DailyVisionBoard): Promise<void> => {
    try {
        await AsyncStorage.setItem(DAILY_VISION_PREFIX + board.date, JSON.stringify(board));
    } catch (e) {
        console.error('Error saving daily vision board:', e);
    }
};

export const hasCompletedDailyVision = async (dateStr: string): Promise<boolean> => {
    try {
        const board = await getDailyVisionBoard(dateStr);
        return !!board?.completed;
    } catch {
        return false;
    }
};

// Also save an image locally similar to how visionBoardStorage does it, but don't force a Supabase insert
// into the master board. 
export const uploadDailyVisionImage = async (localUri: string): Promise<string> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const response = await fetch(localUri);
        const blob = await response.blob();
        const arrayBuffer = await new Response(blob).arrayBuffer();

        const fileName = `${user.id}/daily-vision-${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage
            .from('journal-images')
            .upload(`daily-vision/${fileName}`, arrayBuffer, {
                contentType: 'image/png',
                upsert: false
            });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('journal-images')
            .getPublicUrl(`daily-vision/${fileName}`);

        return publicUrl;
    } catch (error) {
        console.error('Error uploading daily vision image:', error);
        // Fallback to returning local URI if upload fails (best effort)
        return localUri;
    }
};
