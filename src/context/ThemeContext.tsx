import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import {
    MD3LightTheme,
    MD3DarkTheme,
    PaperProvider,
    adaptNavigationTheme,
    configureFonts,
    MD3Theme,
} from 'react-native-paper';
import {
    DarkTheme as NavigationDarkTheme,
    DefaultTheme as NavigationDefaultTheme,
    ThemeProvider as NavigationThemeProvider,
    Theme as NavigationTheme,
} from '@react-navigation/native';
import { saveTheme, loadTheme } from '../utils/storage';
import { ThemeMode } from '../types';

// Custom Fonts
const fontConfig = {
    displayLarge: { fontFamily: 'Caveat-Bold', fontSize: 57, lineHeight: 64, letterSpacing: 0, fontWeight: '400' as const },
    displayMedium: { fontFamily: 'Caveat-Bold', fontSize: 45, lineHeight: 52, letterSpacing: 0, fontWeight: '400' as const },
    displaySmall: { fontFamily: 'Caveat-Bold', fontSize: 36, lineHeight: 44, letterSpacing: 0, fontWeight: '400' as const },
    headlineLarge: { fontFamily: 'Caveat-Bold', fontSize: 32, lineHeight: 40, letterSpacing: 0, fontWeight: '400' as const },
    headlineMedium: { fontFamily: 'Caveat-Bold', fontSize: 28, lineHeight: 36, letterSpacing: 0, fontWeight: '400' as const },
    headlineSmall: { fontFamily: 'Caveat-Bold', fontSize: 24, lineHeight: 32, letterSpacing: 0, fontWeight: '400' as const },
    titleLarge: { fontFamily: 'Caveat-Bold', fontSize: 22, lineHeight: 28, letterSpacing: 0, fontWeight: '400' as const },
    titleMedium: { fontFamily: 'Caveat-Bold', fontSize: 16, lineHeight: 24, letterSpacing: 0.15, fontWeight: '500' as const },
    titleSmall: { fontFamily: 'Caveat-Bold', fontSize: 14, lineHeight: 20, letterSpacing: 0.1, fontWeight: '500' as const },
    bodyLarge: { fontFamily: 'Carlito', fontSize: 16, lineHeight: 24, letterSpacing: 0.5, fontWeight: '400' as const },
    bodyMedium: { fontFamily: 'Carlito', fontSize: 14, lineHeight: 20, letterSpacing: 0.25, fontWeight: '400' as const },
    bodySmall: { fontFamily: 'Carlito', fontSize: 12, lineHeight: 16, letterSpacing: 0.4, fontWeight: '400' as const },
    labelLarge: { fontFamily: 'Carlito', fontSize: 14, lineHeight: 20, letterSpacing: 0.1, fontWeight: '500' as const },
    labelMedium: { fontFamily: 'Carlito', fontSize: 12, lineHeight: 16, letterSpacing: 0.5, fontWeight: '500' as const },
    labelSmall: { fontFamily: 'Carlito', fontSize: 11, lineHeight: 16, letterSpacing: 0.5, fontWeight: '500' as const },
};

// Material 3 Colors
const safeMD3LightColors = MD3LightTheme?.colors || {};
if (!MD3LightTheme) console.error("CRITICAL: MD3LightTheme is undefined! Check react-native-paper version.");

const customLightColors = {
    ...safeMD3LightColors,
    primary: '#4ECCA3',
    onPrimary: '#FFFFFF',
    primaryContainer: '#D1FAE5',
    onPrimaryContainer: '#064E3B',
    secondary: '#3D5A80',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#DBEAFE',
    onSecondaryContainer: '#1E3A5F',
    tertiary: '#7C3AED',
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#EDE9FE',
    onTertiaryContainer: '#3B0764',
    background: '#F8FAFC',
    onBackground: '#1A1D23',
    surface: '#FFFFFF',
    onSurface: '#1A1D23',
    surfaceVariant: '#F1F5F9',
    onSurfaceVariant: '#475569',
    outline: '#94A3B8',
    error: '#EF4444',
};

const safeMD3DarkColors = MD3DarkTheme?.colors || {};
if (!MD3DarkTheme) console.error("CRITICAL: MD3DarkTheme is undefined!");

const customDarkColors = {
    ...safeMD3DarkColors,
    primary: '#6EE7B7',
    onPrimary: '#064E3B',
    primaryContainer: '#065F46',
    onPrimaryContainer: '#D1FAE5',
    secondary: '#93C5FD',
    onSecondary: '#1E3A5F',
    secondaryContainer: '#1E3A5F',
    onSecondaryContainer: '#DBEAFE',
    tertiary: '#A78BFA',
    onTertiary: '#3B0764',
    tertiaryContainer: '#4C1D95',
    onTertiaryContainer: '#EDE9FE',
    background: '#0F172A',
    onBackground: '#E2E8F0',
    surface: '#1E293B',
    onSurface: '#E2E8F0',
    surfaceVariant: '#334155',
    onSurfaceVariant: '#CBD5E1',
    outline: '#64748B',
    error: '#FCA5A5',
};

// Legacy Support (Augmenting MD3 Colors)
const extendWithLegacy = (colors: typeof customLightColors) => ({
    ...colors,
    paper: colors.surface,
    text: colors.onSurface,
    accent: colors.secondary,
    border: colors.outline,
    toolbar: 'transparent',
    toolbarText: colors.onSurface,
});

const PaperLightTheme = {
    ...MD3LightTheme,
    colors: extendWithLegacy(customLightColors),
    fonts: configureFonts({ config: fontConfig }),
};

const PaperDarkTheme = {
    ...MD3DarkTheme,
    colors: extendWithLegacy(customDarkColors),
    fonts: configureFonts({ config: fontConfig }),
};

// Adapt Navigation Theme
const { LightTheme: NavLightTheme, DarkTheme: NavDarkTheme } = adaptNavigationTheme({
    reactNavigationLight: NavigationDefaultTheme,
    reactNavigationDark: NavigationDarkTheme,
    materialLight: PaperLightTheme,
    materialDark: PaperDarkTheme,
});

// Update TypeDefinition to include legacy colors
type ExtendedTheme = MD3Theme & {
    colors: MD3Theme['colors'] & {
        paper: string;
        text: string;
        accent: string;
        border: string;
        toolbar: string;
        toolbarText: string;
    }
};

interface ThemeContextValue {
    theme: ExtendedTheme;
    toggleTheme: () => void;
    setThemeMode: (mode: ThemeMode) => void;
    isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const systemScheme = useColorScheme();
    const [mode, setMode] = useState<ThemeMode>('light');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const initTheme = async () => {
            const savedTheme = await loadTheme();
            if (savedTheme) {
                setMode(savedTheme);
            }
            setIsLoading(false);
        };
        initTheme();
    }, []);

    const isDark = mode === 'dark';
    const paperTheme = (isDark ? PaperDarkTheme : PaperLightTheme) as ExtendedTheme;
    const navTheme = isDark ? NavDarkTheme : NavLightTheme;

    const toggleTheme = async () => {
        const newMode = isDark ? 'light' : 'dark';
        setMode(newMode);
        await saveTheme(newMode);
    };

    const setThemeMode = async (newMode: ThemeMode) => {
        setMode(newMode);
        await saveTheme(newMode);
    };

    if (isLoading) return null;

    return (
        <ThemeContext.Provider value={{ theme: paperTheme, toggleTheme, setThemeMode, isDark }}>
            <PaperProvider theme={paperTheme}>
                <NavigationThemeProvider value={navTheme}>
                    {children}
                </NavigationThemeProvider>
            </PaperProvider>
        </ThemeContext.Provider>
    );
};
export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
