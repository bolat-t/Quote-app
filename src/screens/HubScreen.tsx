import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path as SvgPath, Circle as SvgCircle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { UserProgress, TabScreenNavigationProp } from '../types';
import { loadProgress, awardXP, loadDailyHunt } from '../utils/progressionStorage';
import { calculateStreak } from '../utils/journalStorage';
import { clearMemory } from '../memory/MemorySystem';
import { getUserName } from '../utils/storage';
import { getXPProgress, LEVEL_TIERS, XP_REWARDS } from '../data/progressionConfig';
import { XPToast } from '../components/XPToast';
import { LevelModal } from '../components/LevelModal';
import { SettingsModal } from '../components/SettingsModal';
import { StreakModal } from '../components/StreakModal';
import { FeedbackModal } from '../components/FeedbackModal';
import { requestNotificationPermissions, scheduleDailyReminder } from '../utils/notifications';
import { OnboardingModal } from '../components/OnboardingModal';
import { isOnboardingCompleted, completeOnboarding } from '../utils/storage';
import { exportJournalData } from '../utils/journalStorage';
import { Share, Alert, Dimensions } from 'react-native';
import { trackEvent, setUserProperties } from '../lib/analytics';
import { usePurchase } from '../context/PurchaseContext';
import { useTheme } from '../context/ThemeContext';
import { useDailyQuote } from '../hooks/useDailyQuote';
import BonsaiTree from '../components/bonsai/BonsaiTree';
import { useBonsaiState } from '../hooks/useBonsaiState';
import { Mascot } from '../components/Mascot';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// ─────────────────────────────────────────────
// Inline SVG icons
// ─────────────────────────────────────────────

const MoreVertIcon = ({ color }: { color: string }) => (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <SvgCircle cx="12" cy="5" r="1.75" fill={color} />
        <SvgCircle cx="12" cy="12" r="1.75" fill={color} />
        <SvgCircle cx="12" cy="19" r="1.75" fill={color} />
    </Svg>
);

const ZapIcon = ({ color }: { color: string }) => (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        <SvgPath
            d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

const CheckIcon = ({ color }: { color: string }) => (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
        <SvgPath d="M5 12l5 5L20 7" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

const SearchCircleIcon = ({ color }: { color: string }) => (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <SvgCircle cx="11" cy="11" r="7" stroke={color} strokeWidth={1.8} />
        <SvgPath d="M16.5 16.5L21 21" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
);

const TargetIcon = ({ color }: { color: string }) => (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <SvgCircle cx="12" cy="12" r="10" stroke={color} strokeWidth={1.5} />
        <SvgCircle cx="12" cy="12" r="6" stroke={color} strokeWidth={1.5} />
        <SvgCircle cx="12" cy="12" r="2" fill={color} />
    </Svg>
);

const ArrowRightIcon = ({ color }: { color: string }) => (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
        <SvgPath d="M5 12h14M13 6l6 6-6 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

const SparkleIcon = ({ color }: { color: string }) => (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
        <SvgPath
            d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

// ─────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────

export const HubScreen: React.FC = () => {
    const navigation = useNavigation<TabScreenNavigationProp<'Home'>>();
    const { quote: todayQuote } = useDailyQuote();
    const { theme, isDark } = useTheme();
    const { colors } = theme;
    const screenWidth = Dimensions.get('window').width;
    const [progress, setProgress] = useState<UserProgress | null>(null);
    const {
        bonsaiState,
        isLoading: bonsaiLoading,
        waterTree: handleWaterTree,
        tendTree: handleTendTree,
        recordAction: recordBonsaiAction,
        syncGrowthStage,
        effectiveLeafCount,
        effectiveBlossomCount,
        animationTrigger,
        clearTrigger,
    } = useBonsaiState();
    const [streak, setStreak] = useState(0);
    const [userName, setUserName] = useState<string | null>(null);
    const [dailyActions, setDailyActions] = useState({
        openedApp: false,
        readQuote: false,
        wroteReflection: false,
        savedCanvas: false,
        completedHunt: false,
    });
    const [isSettingsVisible, setIsSettingsVisible] = useState(false);
    const [isStreakModalVisible, setIsStreakModalVisible] = useState(false);
    const [isLevelModalVisible, setIsLevelModalVisible] = useState(false);
    const [areNotificationsEnabled, setAreNotificationsEnabled] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isFeedbackVisible, setIsFeedbackVisible] = useState(false);
    const [xpToast, setXpToast] = useState<{ amount: number; label?: string; leveledUp?: boolean; newLevelTitle?: string } | null>(null);
    const { isPremium } = usePurchase();
    const [isOnboardingVisible, setIsOnboardingVisible] = useState(false);

    const loadData = useCallback(async () => {
        const p = await loadProgress();
        setProgress(p);

        const s = await calculateStreak();
        setStreak(s);

        const name = await getUserName();
        setUserName(name);

        const hunt = await loadDailyHunt();

        setDailyActions({
            openedApp: p.dailyActions.openApp || false,
            readQuote: p.dailyActions.readQuote || false,
            wroteReflection: p.dailyActions.wroteReflection || false,
            savedCanvas: p.dailyActions.savedCanvas || false,
            completedHunt: hunt?.xpAwarded || false,
        });

        const result = await awardXP('openApp', p);
        if (result.xpGained > 0) {
            setProgress(result.progress);
            await recordBonsaiAction('openApp');
            setXpToast({
                amount: result.xpGained,
                label: 'Daily login',
                leveledUp: result.leveledUp,
                newLevelTitle: result.leveledUp ? LEVEL_TIERS.find(t => t.level === result.progress.level)?.title : undefined,
            });
            if (result.leveledUp) {
                trackEvent('level_up', { new_level: result.progress.level, total_xp: result.progress.totalXP });
                await syncGrowthStage(result.progress.level);
            }
            setUserProperties({ level: result.progress.level, total_xp: result.progress.totalXP, streak });
        }
        // Sync bonsai growth stage on load
        await syncGrowthStage(p.level);
    }, []);

    const checkOnboarding = async () => {
        const completed = await isOnboardingCompleted();
        if (!completed) setIsOnboardingVisible(true);
    };

    const handleOnboardingComplete = async (name: string) => {
        await completeOnboarding(name);
        setIsOnboardingVisible(false);
        if (name) setUserName(name);
        trackEvent('onboarding_completed');
        setTimeout(() => navigation.navigate('Paywall'), 500);
    };

    useEffect(() => {
        loadData();
        checkOnboarding();
    }, [loadData]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => { loadData(); });
        return unsubscribe;
    }, [navigation, loadData]);

    useEffect(() => {
        const checkFeedbackPrompt = async () => {
            if (!progress || progress.level < 3) return;
            try {
                const lastPrompt = await AsyncStorage.getItem('@ulbo_last_feedback_prompt');
                const now = Date.now();
                const sevenDays = 7 * 24 * 60 * 60 * 1000;
                if (!lastPrompt || (now - parseInt(lastPrompt, 10)) > sevenDays) {
                    setTimeout(async () => {
                        setIsFeedbackVisible(true);
                        await AsyncStorage.setItem('@ulbo_last_feedback_prompt', now.toString());
                    }, 2000);
                }
            } catch (e) {
                console.error('Error checking feedback prompt', e);
            }
        };
        checkFeedbackPrompt();
    }, [progress?.level]);

    const xpProgress = progress ? getXPProgress(progress.totalXP) : null;
    const currentTier = progress ? LEVEL_TIERS.find(t => t.level === progress.level) : null;
    const nextTier = progress ? LEVEL_TIERS.find(t => t.level === progress.level + 1) : null;

    const getWeekDays = () => {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const monday = new Date(today);
        monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
        return DAYS.map((label, i) => {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
            const isToday = date.toDateString() === today.toDateString();
            const isPast = date < today && !isToday;
            return { label, isToday, isPast, date };
        });
    };

    const weekDays = getWeekDays();

    const handleNotificationToggle = async () => {
        if (areNotificationsEnabled) {
            setAreNotificationsEnabled(false);
            Alert.alert('Notifications Disabled', 'Daily reminders turned off.');
        } else {
            const granted = await requestNotificationPermissions();
            if (granted) {
                await scheduleDailyReminder();
                Alert.alert('Reminder Set', "You'll be notified daily at 8:00 AM to reflect.");
                setAreNotificationsEnabled(true);
            }
        }
    };

    const completedCount = Object.values(dailyActions).filter(Boolean).length;

    if (!progress) return null;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* ── Header ── */}
                <View style={styles.header}>
                    <View style={styles.headerText}>
                        <Text style={[styles.greeting, { color: colors.onSurface }]}>
                            {userName ? `Hey, ${userName}` : 'Welcome back'}
                        </Text>
                        <Text style={[styles.greetingSub, { color: colors.onSurfaceVariant }]}>
                            Your daily growth journey
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.settingsBtn}
                        onPress={() => setIsSettingsVisible(true)}
                        accessibilityLabel="Open settings"
                        accessibilityRole="button"
                        activeOpacity={0.6}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <MoreVertIcon color={colors.onSurfaceVariant} />
                    </TouchableOpacity>
                </View>

                {/* ── Premium Banner ── */}
                {!isPremium && (
                    <TouchableOpacity
                        style={styles.premiumBanner}
                        onPress={() => navigation.navigate('Paywall')}
                        activeOpacity={0.88}
                    >
                        <LinearGradient
                            colors={['#1A1E3C', '#2D1854']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.premiumGradient}
                        >
                            <View style={styles.premiumContent}>
                                <View style={styles.premiumLeft}>
                                    <SparkleIcon color="#E8D5FF" />
                                    <View>
                                        <Text style={styles.premiumTitle}>Unlock Full Access</Text>
                                        <Text style={styles.premiumSub}>Vision board, unlimited colors & more</Text>
                                    </View>
                                </View>
                                <View style={styles.premiumPill}>
                                    <Text style={styles.premiumPillText}>Upgrade</Text>
                                </View>
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                )}

                {/* ── Bonsai Hero ── */}
                {!bonsaiLoading && (
                    <View style={styles.bonsaiSection}>
                        <BonsaiTree
                            stage={bonsaiState.growthStage}
                            health={bonsaiState.health}
                            effectiveLeafCount={effectiveLeafCount}
                            effectiveBlossomCount={effectiveBlossomCount}
                            isDark={isDark}
                            animationTrigger={animationTrigger}
                            onClearTrigger={clearTrigger}
                            onWater={handleWaterTree}
                            onTend={handleTendTree}
                            width={screenWidth - 32}
                            height={250}
                        />
                        <Text style={[styles.bonsaiLabel, { color: colors.onSurfaceVariant }]}>
                            {bonsaiState.health >= 70 ? 'Your bonsai is thriving' :
                             bonsaiState.health >= 40 ? 'Your bonsai needs attention' :
                             'Your bonsai is wilting...'}
                        </Text>
                        {/* Mascot beside the pot */}
                        <View style={styles.bonsaiMascot}>
                            <Mascot size={50} />
                        </View>
                    </View>
                )}

                {/* ── XP / Level Card ── */}
                <TouchableOpacity
                    onPress={() => setIsLevelModalVisible(true)}
                    activeOpacity={0.8}
                    style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outline + '18' }]}
                >
                    <View style={styles.xpHeader}>
                        <View style={[styles.levelBadge, { backgroundColor: colors.primaryContainer }]}>
                            <Text style={[styles.levelBadgeText, { color: colors.onPrimaryContainer }]}>
                                Lv {progress.level}
                            </Text>
                        </View>
                        <Text style={[styles.levelTitle, { color: colors.onSurface }]}>
                            {currentTier?.title || 'Seedling'}
                        </Text>
                        <Text style={[styles.xpText, { color: colors.onSurfaceVariant }]}>
                            {xpProgress?.xpInCurrentLevel ?? 0} / {xpProgress?.xpNeededForNext ?? 100} XP
                        </Text>
                    </View>
                    <View style={[styles.xpTrack, { backgroundColor: colors.surfaceVariant }]}>
                        <View
                            style={[
                                styles.xpFill,
                                {
                                    backgroundColor: colors.primary,
                                    width: `${(xpProgress?.percentage ?? 0) * 100}%`,
                                },
                            ]}
                        />
                    </View>
                    {nextTier && (
                        <Text style={[styles.xpNext, { color: colors.outline }]}>
                            Next: {nextTier.title} — {nextTier.unlocks}
                        </Text>
                    )}
                </TouchableOpacity>

                {/* ── Streak Card ── */}
                <TouchableOpacity
                    onPress={() => setIsStreakModalVisible(true)}
                    activeOpacity={0.8}
                    style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outline + '18' }]}
                >
                    <View style={styles.streakHeader}>
                        <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
                            {streak > 0 ? `Luck Momentum` : 'Build Luck Momentum'}
                        </Text>
                        <View style={styles.streakBadge}>
                            <ZapIcon color={colors.secondary} />
                            <Text style={[styles.streakCount, { color: colors.secondary }]}>{streak}</Text>
                        </View>
                    </View>
                    <View style={styles.weekRow}>
                        {weekDays.map((day, i) => (
                            <View key={i} style={styles.dayColumn}>
                                <View style={[
                                    styles.dayDot,
                                    { backgroundColor: colors.surfaceVariant },
                                    day.isToday && {
                                        backgroundColor: colors.secondary + '20',
                                        borderWidth: 2,
                                        borderColor: colors.secondary,
                                    },
                                    day.isPast && streak > 0 && {
                                        backgroundColor: colors.primaryContainer,
                                    },
                                ]}>
                                    {day.isPast && streak > 0 && (
                                        <CheckIcon color={colors.primary} />
                                    )}
                                </View>
                                <Text style={[
                                    styles.dayLabel,
                                    { color: colors.outline },
                                    day.isToday && { color: colors.secondary, fontFamily: 'Carlito', fontWeight: '700' as const },
                                ]}>
                                    {day.label}
                                </Text>
                            </View>
                        ))}
                    </View>
                </TouchableOpacity>

                {/* ── Today's Quote Card ── */}
                <TouchableOpacity
                    onPress={() => {
                        Haptics.selectionAsync();
                        trackEvent('quote_viewed', { category: todayQuote.category, quote_id: todayQuote.id });
                        navigation.navigate('Canvas');
                    }}
                    activeOpacity={0.8}
                    style={[
                        styles.card,
                        styles.quoteCard,
                        {
                            backgroundColor: colors.surface,
                            borderColor: colors.outline + '18',
                            borderLeftColor: colors.primary,
                        },
                    ]}
                >
                    <Text style={[styles.quoteLabel, { color: colors.primary }]}>Today's Reflection</Text>
                    <Text style={[styles.quoteText, { color: colors.onSurface }]}>
                        "{todayQuote.text}"
                    </Text>
                    {todayQuote.author && (
                        <Text style={[styles.quoteAuthor, { color: colors.onSurfaceVariant }]}>
                            — {todayQuote.author}
                        </Text>
                    )}
                    <View style={styles.quoteAction}>
                        <Text style={[styles.quoteActionText, { color: colors.secondary }]}>Open Canvas</Text>
                        <ArrowRightIcon color={colors.secondary} />
                    </View>
                </TouchableOpacity>

                {/* ── Daily Actions ── */}
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outline + '18' }]}>
                    <View style={styles.actionsHeader}>
                        <Text style={[styles.cardTitle, { color: colors.onSurface }]}>Today's Actions</Text>
                        <View style={[styles.xpChip, { backgroundColor: colors.primaryContainer }]}>
                            <Text style={[styles.xpChipText, { color: colors.onPrimaryContainer }]}>
                                +{completedCount * 10} XP
                            </Text>
                        </View>
                    </View>
                    {[
                        { key: 'openedApp', label: 'Open the app', xp: XP_REWARDS.openApp, done: dailyActions.openedApp },
                        { key: 'readQuote', label: 'Read a new quote', xp: XP_REWARDS.readQuote, done: dailyActions.readQuote, nav: 'Canvas' },
                        { key: 'wroteReflection', label: 'Write a reflection', xp: XP_REWARDS.writeReflection, done: dailyActions.wroteReflection, nav: 'Canvas' },
                        { key: 'savedCanvas', label: 'Save your canvas', xp: XP_REWARDS.saveCanvas, done: dailyActions.savedCanvas, nav: 'Canvas' },
                        { key: 'completedHunt', label: 'Complete Positivity Hunt', xp: XP_REWARDS.completeHunt, done: dailyActions.completedHunt, nav: 'Hunt' },
                    ].map((action, idx) => (
                        <TouchableOpacity
                            key={action.key}
                            style={[
                                styles.actionRow,
                                idx < 4 && { borderBottomWidth: 1, borderBottomColor: colors.outline + '10' },
                            ]}
                            disabled={action.done || !action.nav}
                            onPress={() => action.nav && navigation.navigate(action.nav as any)}
                            activeOpacity={0.7}
                        >
                            <View style={[
                                styles.actionCheck,
                                { borderColor: colors.outline + '40' },
                                action.done && {
                                    borderColor: colors.primary,
                                    backgroundColor: colors.primaryContainer,
                                },
                            ]}>
                                {action.done && <CheckIcon color={colors.primary} />}
                            </View>
                            <Text style={[
                                styles.actionLabel,
                                { color: colors.onSurface },
                                action.done && { color: colors.outline, textDecorationLine: 'line-through' as const },
                            ]}>
                                {action.label}
                            </Text>
                            <Text style={[
                                styles.actionXP,
                                { color: colors.primary },
                                action.done && { color: colors.outline + '60' },
                            ]}>
                                +{action.xp}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ── Luck Scavenger Hunt Card ── */}
                <TouchableOpacity
                    onPress={() => {
                        Haptics.selectionAsync();
                        navigation.navigate('Hunt');
                    }}
                    activeOpacity={0.8}
                    style={[
                        styles.card,
                        styles.accentCard,
                        {
                            backgroundColor: colors.surface,
                            borderColor: colors.outline + '18',
                            borderLeftColor: colors.primary,
                        },
                    ]}
                >
                    <View style={styles.featureRow}>
                        <View style={[styles.iconWrap, { backgroundColor: colors.primaryContainer }]}>
                            <SearchCircleIcon color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.featureTitle, { color: colors.onSurface }]}>
                                Luck Scavenger Hunt
                            </Text>
                            <Text style={[styles.featureSub, { color: colors.onSurfaceVariant }]}>
                                Find 3 lucky signals today
                            </Text>
                        </View>
                        <View style={[styles.xpChip, { backgroundColor: colors.primaryContainer }]}>
                            <Text style={[styles.xpChipText, { color: colors.onPrimaryContainer }]}>
                                +{XP_REWARDS.completeHunt}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.cardAction}>
                        <Text style={[styles.cardActionText, { color: colors.primary }]}>Start Hunt</Text>
                        <ArrowRightIcon color={colors.primary} />
                    </View>
                </TouchableOpacity>

                {/* ── Vision Board Card ── */}
                <TouchableOpacity
                    onPress={() => {
                        if (isPremium) {
                            navigation.navigate('VisionBoard' as any);
                        } else {
                            navigation.navigate('Paywall');
                        }
                    }}
                    activeOpacity={0.8}
                    style={[
                        styles.card,
                        styles.accentCard,
                        {
                            backgroundColor: colors.surface,
                            borderColor: colors.outline + '18',
                            borderLeftColor: colors.tertiary,
                            opacity: isPremium ? 1 : 0.75,
                        },
                    ]}
                >
                    <View style={styles.featureRow}>
                        <View style={[styles.iconWrap, { backgroundColor: colors.tertiaryContainer }]}>
                            <TargetIcon color={colors.tertiary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.featureTitle, { color: colors.onSurface }]}>Vision Board</Text>
                            <Text style={[styles.featureSub, { color: colors.onSurfaceVariant }]}>
                                Visualize your goals and dreams
                            </Text>
                        </View>
                        {!isPremium && (
                            <View style={[styles.xpChip, { backgroundColor: colors.tertiaryContainer }]}>
                                <Text style={[styles.xpChipText, { color: colors.tertiary }]}>Premium</Text>
                            </View>
                        )}
                    </View>
                    {isPremium && (
                        <View style={styles.cardAction}>
                            <Text style={[styles.cardActionText, { color: colors.tertiary }]}>Open Board</Text>
                            <ArrowRightIcon color={colors.tertiary} />
                        </View>
                    )}
                </TouchableOpacity>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* ── Modals ── */}
            <SettingsModal
                visible={isSettingsVisible}
                onClose={() => setIsSettingsVisible(false)}
                onNotificationToggle={handleNotificationToggle}
                areNotificationsEnabled={areNotificationsEnabled}
                onExportData={async () => {
                    setIsExporting(true);
                    try {
                        const result = await exportJournalData();
                        if (result.success && result.data) {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            await Share.share({ message: result.data, title: result.filename });
                        } else {
                            Alert.alert('Export Failed', 'Could not generate export data.');
                        }
                    } catch (e) {
                        Alert.alert('Error', 'An error occurred during export.');
                    } finally {
                        setIsExporting(false);
                    }
                }}
                isExporting={isExporting}
                onFeedback={() => {
                    setIsSettingsVisible(false);
                    setTimeout(() => setIsFeedbackVisible(true), 400);
                }}
                onShowOnboarding={() => { setIsSettingsVisible(false); setTimeout(() => setIsOnboardingVisible(true), 400); }}
                onClearMemory={async () => {
                    await clearMemory();
                    setIsSettingsVisible(false);
                }}
            />

            <StreakModal
                visible={isStreakModalVisible}
                onClose={() => setIsStreakModalVisible(false)}
                streak={streak}
            />

            <FeedbackModal
                visible={isFeedbackVisible}
                onClose={() => setIsFeedbackVisible(false)}
            />

            {progress && (
                <LevelModal
                    visible={isLevelModalVisible}
                    onClose={() => setIsLevelModalVisible(false)}
                    progress={progress}
                />
            )}

            <XPToast
                xpAmount={xpToast?.amount ?? 0}
                label={xpToast?.label}
                leveledUp={xpToast?.leveledUp}
                newLevelTitle={xpToast?.newLevelTitle}
                visible={!!xpToast}
                onDismiss={() => setXpToast(null)}
            />

            <OnboardingModal visible={isOnboardingVisible} onComplete={handleOnboardingComplete} />
        </SafeAreaView>
    );
};

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
    },

    // ── Header ──
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 20,
    },
    headerText: {
        flex: 1,
    },
    greeting: {
        fontFamily: 'Caveat-Bold',
        fontSize: 32,
        lineHeight: 36,
    },
    greetingSub: {
        fontFamily: 'Carlito',
        fontSize: 14,
        marginTop: 2,
    },
    settingsBtn: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Premium Banner ──
    premiumBanner: {
        marginBottom: 14,
        borderRadius: 18,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
        elevation: 6,
    },
    premiumGradient: {
        paddingHorizontal: 18,
        paddingVertical: 16,
    },
    premiumContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    premiumLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    premiumTitle: {
        fontFamily: 'Caveat-Bold',
        fontSize: 18,
        color: '#FFFFFF',
        marginBottom: 2,
    },
    premiumSub: {
        fontFamily: 'Carlito',
        fontSize: 13,
        color: '#FFFFFF90',
    },
    premiumPill: {
        backgroundColor: '#FFFFFF18',
        borderWidth: 1,
        borderColor: '#FFFFFF30',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
    },
    premiumPillText: {
        fontFamily: 'Carlito',
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.3,
    },

    // ── Bonsai Hero ──
    bonsaiSection: {
        alignItems: 'center',
        marginBottom: 12,
        paddingVertical: 8,
    },
    bonsaiLabel: {
        fontFamily: 'Carlito',
        fontSize: 13,
        marginTop: 4,
    },
    bonsaiMascot: {
        position: 'absolute',
        bottom: 28,
        right: 24,
    },

    // ── Card base ──
    card: {
        borderRadius: 18,
        padding: 18,
        marginBottom: 12,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    accentCard: {
        borderLeftWidth: 3,
    },
    cardTitle: {
        fontFamily: 'Caveat-Bold',
        fontSize: 18,
    },

    // ── XP Card ──
    xpHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    levelBadge: {
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    levelBadgeText: {
        fontFamily: 'Carlito',
        fontSize: 13,
        fontWeight: '700',
    },
    levelTitle: {
        fontFamily: 'Caveat-Bold',
        fontSize: 18,
        flex: 1,
    },
    xpText: {
        fontFamily: 'Carlito',
        fontSize: 13,
    },
    xpTrack: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    xpFill: {
        height: '100%',
        borderRadius: 3,
    },
    xpNext: {
        fontFamily: 'Carlito',
        fontSize: 12,
        marginTop: 8,
    },

    // ── Streak Card ──
    streakHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    streakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    streakCount: {
        fontFamily: 'Caveat-Bold',
        fontSize: 20,
        lineHeight: 20,
        includeFontPadding: false,
    },
    weekRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    dayColumn: {
        alignItems: 'center',
        gap: 5,
    },
    dayDot: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayLabel: {
        fontFamily: 'Carlito',
        fontSize: 12,
    },

    // ── Quote Card ──
    quoteCard: {
        borderLeftWidth: 3,
    },
    quoteLabel: {
        fontFamily: 'Carlito',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    quoteText: {
        fontFamily: 'Caveat',
        fontSize: 21,
        lineHeight: 30,
    },
    quoteAuthor: {
        fontFamily: 'Carlito',
        fontSize: 13,
        marginTop: 6,
    },
    quoteAction: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 14,
        alignSelf: 'flex-end',
    },
    quoteActionText: {
        fontFamily: 'Carlito',
        fontSize: 14,
        fontWeight: '600',
    },

    // ── Daily Actions ──
    actionsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    xpChip: {
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    xpChipText: {
        fontFamily: 'Carlito',
        fontSize: 12,
        fontWeight: '700',
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        gap: 12,
    },
    actionCheck: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionLabel: {
        fontFamily: 'Carlito',
        fontSize: 15,
        flex: 1,
    },
    actionXP: {
        fontFamily: 'Carlito',
        fontSize: 13,
        fontWeight: '600',
    },

    // ── Feature Cards (Hunt / Vision Board) ──
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconWrap: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    featureTitle: {
        fontFamily: 'Caveat-Bold',
        fontSize: 18,
        marginBottom: 2,
    },
    featureSub: {
        fontFamily: 'Carlito',
        fontSize: 13,
    },
    cardAction: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 12,
        alignSelf: 'flex-end',
    },
    cardActionText: {
        fontFamily: 'Carlito',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default HubScreen;
