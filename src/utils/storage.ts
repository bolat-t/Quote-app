import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { ThemeMode, Drawing } from '../types';

const THEME_KEY = '@ulbo_theme';
const DRAWINGS_KEY = '@ulbo_drawings';

// Theme storage
export const saveTheme = async (theme: ThemeMode): Promise<void> => {
    try {
        await AsyncStorage.setItem(THEME_KEY, theme);
    } catch (error) {
        console.error('Error saving theme:', error);
    }
};

export const getTheme = async (): Promise<ThemeMode | null> => {
    try {
        const value = await AsyncStorage.getItem(THEME_KEY);
        return value as ThemeMode | null;
    } catch (error) {
        console.error('Error getting theme:', error);
        return null;
    }
};

// Alias for ThemeContext compatibility
export const loadTheme = getTheme;

// Drawing Storage
export const saveDrawings = async (drawings: Drawing[]): Promise<void> => {
    try {
        await AsyncStorage.setItem(DRAWINGS_KEY, JSON.stringify(drawings));
    } catch (error) {
        console.error('Error saving drawings:', error);
    }
};

// Alias for backward compatibility (singular form)
export const saveDrawing = saveDrawings;

export const getDrawings = async (): Promise<Drawing[]> => {
    try {
        const value = await AsyncStorage.getItem(DRAWINGS_KEY);
        return value ? JSON.parse(value) : [];
    } catch (error) {
        console.error('Error getting drawings:', error);
        return [];
    }
};

const PAPER_KEY = '@ulbo_active_paper';

export const saveActivePaper = async (paperId: string): Promise<void> => {
    try {
        await AsyncStorage.setItem(PAPER_KEY, paperId);
    } catch (error) {
        console.error('Error saving active paper:', error);
    }
};

export const loadActivePaper = async (): Promise<string> => {
    try {
        const value = await AsyncStorage.getItem(PAPER_KEY);
        return value || 'plain';
    } catch (error) {
        console.error('Error loading active paper:', error);
        return 'plain';
    }
};

// Save drawing as image file — copies a temp file to permanent storage
export const saveDrawingAsImage = async (
    sourceUri: string,
    filename: string
): Promise<string | null> => {
    try {
        const drawingsDir = FileSystem.documentDirectory + 'drawings/';

        // Create directory if it doesn't exist
        const dirInfo = await FileSystem.getInfoAsync(drawingsDir);
        if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(drawingsDir, { intermediates: true });
        }

        const destUri = drawingsDir + `${filename}.png`;

        // Copy temp file to permanent location
        await FileSystem.copyAsync({ from: sourceUri, to: destUri });

        // Verify the file was saved
        const fileInfo = await FileSystem.getInfoAsync(destUri);
        console.log('Image saved to:', destUri, 'exists:', fileInfo.exists, 'size:', (fileInfo as any).size);

        return destUri;
    } catch (error) {
        console.error('Error saving drawing as image:', error);
        return null;
    }
};

// Onboarding Storage
const ONBOARDING_KEY = '@ulbo_onboarding_completed';
const USER_NAME_KEY = '@ulbo_user_name';

export const isOnboardingCompleted = async (): Promise<boolean> => {
    try {
        const value = await AsyncStorage.getItem(ONBOARDING_KEY);
        return value === 'true';
    } catch {
        return false;
    }
};

export const setOnboardingCompleted = async (name: string): Promise<void> => {
    try {
        await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
        await AsyncStorage.setItem(USER_NAME_KEY, name);
    } catch (error) {
        console.error('Error setting onboarding:', error);
    }
};

// Alias for HomeScreen compatibility
export const completeOnboarding = setOnboardingCompleted;

export const getUserName = async (): Promise<string> => {
    try {
        const name = await AsyncStorage.getItem(USER_NAME_KEY);
        return name || 'Friend';
    } catch {
        return 'Friend';
    }
};
