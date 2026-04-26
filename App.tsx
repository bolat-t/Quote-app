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
import { HubScreen } from './src/screens/HubScreen';
import { CanvasScreen } from './src/screens/CanvasScreen';
import { HuntScreen } from './src/screens/HuntScreen';
import { JournalScreen } from './src/screens/JournalScreen';
import { VisionBoardScreen } from './src/screens/VisionBoardScreen';
import { PaywallScreen } from './src/screens/PaywallScreen';
import { AnalyticsScreen } from './src/screens/AnalyticsScreen';
import { FocusTimerPickerScreen } from './src/screens/FocusTimerPickerScreen';
import { ReminderSettingsScreen } from './src/screens/ReminderSettingsScreen';
import { AppHeader } from './src/components/AppHeader';
import { getUserName } from './src/utils/storage';
import { HeaderHeightProvider, useSetHeaderHeight } from './src/context/HeaderHeightContext';
import { TimerProvider } from './src/context/TimerContext';
import { JournalStepsProvider } from './src/context/JournalStepsContext';
import { CommitmentProvider } from './src/context/CommitmentContext';
import { TimerSecondsProvider } from './src/context/TimerSecondsContext';
import { HistoryCalendarProvider } from './src/context/HistoryCalendarContext';
import { useFonts } from 'expo-font';

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

// Note on naming: route names are kept stable (Canvas/Journal/History) so existing
// navigation calls keep working. ROUTE_TITLES drives the visible header text and
// `tabBarLabel` overrides drive the visible tab-bar text.
const ROUTE_TITLES: Record<string, { title: string; subtitle?: string }> = {
    Canvas:  { title: 'Quote' },          // daily quote + Ulbo chat
    Journal: { title: 'Journal' },        // emotion / 3 things / reflect
    History: { title: 'History' },        // timeline of past entries
    Vision:  { title: 'Vision Board' },
    Home:    { title: 'Welcome' },
};

const BottomTabsInner = () => {
    const insets = useSafeAreaInsets();
    const [userName, setUserName] = useState<string | null>(null);
    const setHeaderHeight = useSetHeaderHeight();

    const tabIndex = useNavigationState(state => {
        const tabsRoute = state?.routes?.find((r: any) => r.name === 'Tabs');
        return tabsRoute?.state?.index ?? 4;
    });
    const routeNames = ['Canvas', 'Journal', 'History', 'Vision', 'Home'];
    const currentRoute = routeNames[tabIndex] ?? 'Home';
    const headerInfo = { ...ROUTE_TITLES[currentRoute] };
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
                tabBarStyle: {
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
            <Tab.Screen name="Canvas"  component={CanvasScreen}      options={{ tabBarLabel: 'Quote' }} />
            <Tab.Screen name="Journal" component={HuntScreen}        options={{ tabBarLabel: 'Journal' }} />
            <Tab.Screen name="History" component={JournalScreen}     options={{ tabBarLabel: 'History' }} />
            <Tab.Screen name="Vision"  component={VisionBoardScreen} options={{ tabBarLabel: 'Vision' }} />
            <Tab.Screen name="Home"    component={HubScreen}         options={{ tabBarLabel: 'Home' }} />
        </Tab.Navigator>
        </View>
    );
};

const BottomTabs = () => (
    <HeaderHeightProvider>
        <TimerProvider>
            <JournalStepsProvider>
                <CommitmentProvider>
                    <TimerSecondsProvider>
                        <HistoryCalendarProvider>
                            <BottomTabsInner />
                        </HistoryCalendarProvider>
                    </TimerSecondsProvider>
                </CommitmentProvider>
            </JournalStepsProvider>
        </TimerProvider>
    </HeaderHeightProvider>
);

export default function App() {
    const [fontsLoaded] = useFonts({
        'GasoekOne':                   require('./assets/fonts/GasoekOne_400Regular.ttf'),
        'GasoekOne-Regular':           require('./assets/fonts/GasoekOne_400Regular.ttf'),
        'Caveat-Bold':                 require('@expo-google-fonts/caveat/700Bold/Caveat_700Bold.ttf'),
        'IndieFlower-Regular':         require('@expo-google-fonts/indie-flower/400Regular/IndieFlower_400Regular.ttf'),
        'Carlito':                     require('@expo-google-fonts/carlito/400Regular/Carlito_400Regular.ttf'),
        'Carlito-Bold':                require('@expo-google-fonts/carlito/700Bold/Carlito_700Bold.ttf'),
        'Carlito-Italic':              require('@expo-google-fonts/carlito/400Regular_Italic/Carlito_400Regular_Italic.ttf'),
        'MontserratAlternates-ExtraBoldItalic': require('@expo-google-fonts/montserrat-alternates/800ExtraBold_Italic/MontserratAlternates_800ExtraBold_Italic.ttf'),
        'MontserratAlternates-Bold':   require('@expo-google-fonts/montserrat-alternates/700Bold/MontserratAlternates_700Bold.ttf'),
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
                            <NavigationContainer>
                                <Stack.Navigator screenOptions={{ headerShown: false }}>
                                    <Stack.Screen name="Tabs" component={BottomTabs} />
                                    <Stack.Screen
                                        name="Paywall"
                                        component={PaywallScreen}
                                        options={{ presentation: 'modal' }}
                                    />
                                    <Stack.Screen
                                        name="Analytics"
                                        component={AnalyticsScreen}
                                        options={{ presentation: 'modal' }}
                                    />
                                    <Stack.Screen
                                        name="VisionBoard"
                                        component={VisionBoardScreen}
                                        options={{ presentation: 'card' }}
                                    />
                                    <Stack.Screen
                                        name="FocusTimerPicker"
                                        component={FocusTimerPickerScreen}
                                        options={{ presentation: 'card' }}
                                    />
                                    <Stack.Screen
                                        name="ReminderSettings"
                                        component={ReminderSettingsScreen}
                                        options={{ presentation: 'card' }}
                                    />
                                </Stack.Navigator>
                            </NavigationContainer>
                        </PurchaseProvider>
                    </AnalyticsProvider>
                    <StatusBar style="light" />
                </AuthProvider>
            </ThemeProvider>
        </SafeAreaProvider>
        </ErrorBoundary>
    );
}
