import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer, useNavigationState } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList, RootTabParamList } from './src/types';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { ThemeProvider } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import { AnalyticsProvider } from './src/context/AnalyticsProvider';
import { PurchaseProvider } from './src/context/PurchaseContext';
import { HubScreen } from './src/screens/HomeScreen';
import { CanvasScreen } from './src/screens/WisdomScreen';
import { HuntScreen } from './src/screens/JournalScreen';
import { JournalScreen } from './src/screens/HistoryScreen';
import { VisionBoardScreen } from './src/screens/VisionBoardScreen';
import { PaywallScreen } from './src/screens/PaywallScreen';
import { ReminderSettingsScreen } from './src/screens/ReminderSettingsScreen';
import { AppHeader } from './src/components/AppHeader';
import { getUserName } from './src/utils/storage';
import { HeaderHeightProvider, useSetHeaderHeight } from './src/context/HeaderHeightContext';
import { HistoryCalendarProvider } from './src/context/HistoryCalendarContext';
import { OnboardingProvider, useOnboarding } from './src/context/OnboardingContext';
import { useFonts } from 'expo-font';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from './src/lib/i18n';
import { STORAGE_KEYS } from './src/constants/storageKeys';

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const BottomTabsInner = () => {
    const insets = useSafeAreaInsets();
    const [userName, setUserName] = useState<string | null>(null);
    const setHeaderHeight = useSetHeaderHeight();
    const { isActive: isOnboarding } = useOnboarding();
    const { t } = useTranslation();

    const routeTitles: Record<string, { title: string; subtitle?: string }> = {
        Canvas:  { title: t('routes.wisdom') },
        Journal: { title: t('routes.journal') },
        History: { title: t('routes.history') },
        Vision:  { title: t('routes.vision_board') },
        Home:    { title: t('routes.welcome') },
    };

    const tabIndex = useNavigationState(state => {
        const tabsRoute = state?.routes?.find((r: any) => r.name === 'Tabs');
        return tabsRoute?.state?.index ?? 4;
    });
    const routeNames = ['Canvas', 'Journal', 'History', 'Vision', 'Home'];
    const currentRoute = routeNames[tabIndex] ?? 'Home';
    const headerInfo = { ...routeTitles[currentRoute] };
    if (currentRoute === 'Home') headerInfo.subtitle = userName ?? '';

    useEffect(() => { getUserName().then(setUserName); }, []);

    return (
        // Black background prevents SafeAreaProvider white from bleeding through
        <View style={{ flex: 1, backgroundColor: '#000000' }}>
            {/* Floating header — mirrors the floating footer pattern */}
            <View
                style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0,
                    zIndex: 100,
                    paddingTop: insets.top,
                    paddingBottom: 16,
                }}
                onLayout={e => setHeaderHeight(e.nativeEvent.layout.height)}
            >
                <AppHeader title={headerInfo.title} subtitle={headerInfo.subtitle} currentRoute={currentRoute} />
            </View>
        <Tab.Navigator
            initialRouteName="Home"
            screenOptions={{
                headerShown: false,
                tabBarHideOnKeyboard: true,
                animation: 'none',
                // Hide the bottom TabBar completely while onboarding is active
                // (no escape hatches, no visual clutter under the slide card).
                tabBarStyle: isOnboarding
                    ? { display: 'none' }
                    : {
                        position: 'absolute',
                        backgroundColor: 'transparent',
                        borderTopWidth: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        height: 62 + insets.bottom,
                        paddingHorizontal: 16,
                        paddingBottom: insets.bottom,
                        paddingTop: 14,
                        elevation: 0,
                        shadowOpacity: 0,
                    },
                tabBarBackground: () => (
                    <View style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: 0,
                        bottom: 0,
                        backgroundColor: '#212121',
                        borderTopLeftRadius: 24,
                        borderTopRightRadius: 24,
                    }} />
                ),
                tabBarActiveTintColor: '#FFFFFF',
                tabBarInactiveTintColor: '#666666',
                tabBarIcon: () => null,
                tabBarIconStyle: { display: 'none' },
                tabBarLabelStyle: {
                    fontFamily: 'Inter-Medium',
                    fontSize: 14,
                    letterSpacing: 0.2,
                    marginTop: 0,
                    marginBottom: 0,
                },
                tabBarItemStyle: {
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingTop: 0,
                    paddingBottom: 0,
                },
            }}
        >
            <Tab.Screen name="Canvas"  component={CanvasScreen}      options={{ tabBarLabel: t('tabs.wisdom') }} />
            <Tab.Screen name="Journal" component={HuntScreen}        options={{ tabBarLabel: t('tabs.journal') }} />
            <Tab.Screen name="History" component={JournalScreen}     options={{ tabBarLabel: t('tabs.history') }} />
            <Tab.Screen name="Vision"  component={VisionBoardScreen} options={{ tabBarLabel: t('tabs.vision') }} />
            <Tab.Screen name="Home"    component={HubScreen}         options={{ tabBarLabel: t('tabs.home') }} />
        </Tab.Navigator>
        </View>
    );
};

const BottomTabs = () => (
    <HeaderHeightProvider>
        <HistoryCalendarProvider>
            <BottomTabsInner />
        </HistoryCalendarProvider>
    </HeaderHeightProvider>
);

export default function App() {
    // Restore language preference saved by the in-app toggle (dev section).
    // Runs once on mount — i18n is already initialized with device locale, so
    // this just overrides it when the user has explicitly picked a language.
    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE).then(lang => {
            if (lang === 'en' || lang === 'ko') {
                i18n.changeLanguage(lang);
            }
        });
    }, []);

    const [fontsLoaded] = useFonts({
        'GasoekOne':                   require('./assets/fonts/GasoekOne_400Regular.ttf'),
        'GasoekOne-Regular':           require('./assets/fonts/GasoekOne_400Regular.ttf'),
        'Caveat-Bold':                 require('@expo-google-fonts/caveat/700Bold/Caveat_700Bold.ttf'),
        'IndieFlower-Regular':         require('@expo-google-fonts/indie-flower/400Regular/IndieFlower_400Regular.ttf'),
        'Carlito':                     require('@expo-google-fonts/carlito/400Regular/Carlito_400Regular.ttf'),
        'Carlito-Bold':                require('@expo-google-fonts/carlito/700Bold/Carlito_700Bold.ttf'),
        'Carlito-Italic':              require('@expo-google-fonts/carlito/400Regular_Italic/Carlito_400Regular_Italic.ttf'),
        'OpenSans-SemiBold':           require('@expo-google-fonts/open-sans/600SemiBold/OpenSans_600SemiBold.ttf'),
        'Inter-Bold':                  require('@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf'),
        'Inter-Medium':                require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'),
        'Inter-SemiBold':              require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
        'Gaegu-Bold':                  require('@expo-google-fonts/gaegu/700Bold/Gaegu_700Bold.ttf'),
    });

    if (!fontsLoaded) {
        return null;
    }

    return (
        <ErrorBoundary>
        <SafeAreaProvider>
            <ThemeProvider>
                <AuthProvider>
                    <AnalyticsProvider>
                        <PurchaseProvider>
                            <OnboardingProvider>
                            <NavigationContainer>
                                <Stack.Navigator screenOptions={{ headerShown: false }}>
                                    <Stack.Screen name="Tabs" component={BottomTabs} />
                                    <Stack.Screen
                                        name="Paywall"
                                        component={PaywallScreen}
                                        options={{ presentation: 'modal' }}
                                    />
                                    <Stack.Screen
                                        name="VisionBoard"
                                        component={VisionBoardScreen}
                                        options={{ presentation: 'card' }}
                                    />
                                    <Stack.Screen
                                        name="ReminderSettings"
                                        component={ReminderSettingsScreen}
                                        options={{ presentation: 'modal' }}
                                    />
                                </Stack.Navigator>
                            </NavigationContainer>
                            </OnboardingProvider>
                        </PurchaseProvider>
                    </AnalyticsProvider>
                    <StatusBar style="light" />
                </AuthProvider>
            </ThemeProvider>
        </SafeAreaProvider>
        </ErrorBoundary>
    );
}
