import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList, RootTabParamList } from './src/types';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import {
    TabHomeIcon,
    TabCanvasIcon,
    TabJournalIcon,
    TabHistoryIcon,
    TabVisionIcon,
} from './src/components/TabBarIcons';
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
import { WalkingScreen } from './src/screens/WalkingScreen';
import { useFonts } from 'expo-font';

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const BottomTabs = () => {
    const { theme } = useTheme();
    const { colors } = theme;
    const tabBarStyle = {
        backgroundColor: colors.paper,
        borderTopWidth: 0.5,
        borderTopColor: colors.border + '60',
        paddingTop: 6,
        paddingBottom: 60,
        height: 116,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 0,
    };
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.text + '45',
                tabBarLabelStyle: {
                    fontFamily: 'GasoekOne',
                    fontSize: 13,
                    marginTop: 1,
                },
                tabBarIconStyle: { marginBottom: -2 },
                tabBarItemStyle: { paddingVertical: 4 },
                tabBarShowLabel: true,
                tabBarHideOnKeyboard: true,
                animation: 'none',
            }}
        >
            <Tab.Screen
                name="Canvas"
                component={CanvasScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <TabCanvasIcon color={color} size={size} />,
                }}
            />
            <Tab.Screen
                name="Journal"
                component={HuntScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <TabJournalIcon color={color} size={size} />,
                }}
            />
            <Tab.Screen
                name="Home"
                component={HubScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <TabHomeIcon color={color} size={size} />,
                }}
            />
            <Tab.Screen
                name="History"
                component={JournalScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <TabHistoryIcon color={color} size={size} />,
                }}
            />
            <Tab.Screen
                name="Vision"
                component={VisionBoardScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <TabVisionIcon color={color} size={size} />,
                    tabBarLabel: 'Vision',
                }}
            />
        </Tab.Navigator>
    );
};

export default function App() {
    const [fontsLoaded] = useFonts({
        'GasoekOne': require('./assets/fonts/GasoekOne_400Regular.ttf'),
        'GasoekOne-Regular': require('./assets/fonts/GasoekOne_400Regular.ttf'),
        'Caveat-Bold':         require('@expo-google-fonts/caveat/700Bold/Caveat_700Bold.ttf'),
        'IndieFlower-Regular': require('@expo-google-fonts/indie-flower/400Regular/IndieFlower_400Regular.ttf'),
        'Carlito':             require('@expo-google-fonts/carlito/400Regular/Carlito_400Regular.ttf'),
        'Carlito-Bold':        require('@expo-google-fonts/carlito/700Bold/Carlito_700Bold.ttf'),
        'Carlito-Italic':      require('@expo-google-fonts/carlito/400Regular_Italic/Carlito_400Regular_Italic.ttf'),
    });

    if (!fontsLoaded) {
        return null;
    }

    return (
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
                                        name="Walking"
                                        component={WalkingScreen}
                                        options={{ presentation: 'card' }}
                                    />
                                </Stack.Navigator>
                            </NavigationContainer>
                        </PurchaseProvider>
                    </AnalyticsProvider>
                    <StatusBar style="auto" />
                </AuthProvider>
            </ThemeProvider>
        </SafeAreaProvider>
    );
}
