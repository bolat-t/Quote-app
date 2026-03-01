import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    Share,
    Alert,
    Animated,
    PanResponder,
    StyleSheet as RNStyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path as SvgPath, Circle as SvgCircle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
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
import { trackEvent, setUserProperties } from '../lib/analytics';
import { usePurchase } from '../context/PurchaseContext';
import { useDailyQuote } from '../hooks/useDailyQuote';
import { PotatoPlant } from '../components/PotatoPlant';
import { useBonsaiState } from '../hooks/useBonsaiState';
import { WateringCanOverlay } from '../components/WateringCanOverlay';

const YELLOW = '#FFE600';
const BLACK = '#000000';
const WHITE = '#FFFFFF';

// ─────────────────────────────────────────────
// Inline SVG Icons
// ─────────────────────────────────────────────

const HamburgerIcon = () => (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
        <SvgPath d="M3 6h18M3 12h18M3 18h18" stroke={BLACK} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
);

const WaterDropIcon = () => (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <SvgPath
            d="M12 3C12 3 5 11 5 16a7 7 0 0014 0C19 11 12 3 12 3z"
            stroke={BLACK}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

const WalkIcon = () => (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <SvgCircle cx="13" cy="3.5" r="2" fill={BLACK} />
        <SvgPath
            d="M11 7l-3 4 2 1M11 7l2 4 3-1M10 11l-1 5h3l1-4M13 11l1 5h2"
            stroke={BLACK}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

const SparkleIcon = () => (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <SvgPath
            d="M12 4l1.6 4.8a1 1 0 00.6.6L19 11l-4.8 1.6a1 1 0 00-.6.6L12 19l-1.6-4.8a1 1 0 00-.6-.6L5 12l4.8-1.6a1 1 0 00.6-.6L12 4z"
            stroke={BLACK}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

const CheckIcon = () => (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
        <SvgPath d="M5 12l5 5L20 7" stroke={BLACK} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

// ─────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────

export const HubScreen: React.FC = () => {
    const navigation = useNavigation<TabScreenNavigationProp<'Home'>>();
    useDailyQuote();
    const screenWidth = Dimensions.get('window').width;

    const [progress, setProgress] = useState<UserProgress | null>(null);
    const {
        bonsaiState,
        isLoading: bonsaiLoading,
        waterTree: handleWaterTree,
        tendTree: handleTendTree,
        recordAction: recordBonsaiAction,
        syncGrowthStage,
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
    const [isLevelModalVisible, setIsLevelModalVisible] = useState(false);
    const [isStreakModalVisible, setIsStreakModalVisible] = useState(false);
    const [areNotificationsEnabled, setAreNotificationsEnabled] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isFeedbackVisible, setIsFeedbackVisible] = useState(false);
    const [xpToast, setXpToast] = useState<{
        amount: number; label?: string; leveledUp?: boolean; newLevelTitle?: string;
    } | null>(null);
    usePurchase();
    const [isOnboardingVisible, setIsOnboardingVisible] = useState(false);

    // ── Watering-can interaction ──────────────────────────────────────────
    const [showWateringCan, setShowWateringCan] = useState(false);
    const [isPouring, setIsPouring] = useState(false);
    const canX = useRef(new Animated.Value(0)).current;
    const canY = useRef(new Animated.Value(0)).current;

    const isWateringRef = useRef(false);
    const isOverPotatoRef = useRef(false);
    const potatoRegion = useRef({ x: 0, y: 0, width: 0, height: 0 });
    const potatoWrapRef = useRef<View>(null);
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    // Keep handleWaterTree current in closures
    const handleWaterRef = useRef(handleWaterTree);
    handleWaterRef.current = handleWaterTree;

    const waterPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,

            onPanResponderGrant: (evt) => {
                // Snapshot the potato's on-screen rect
                potatoWrapRef.current?.measureInWindow((x, y, w, h) => {
                    potatoRegion.current = { x, y, width: w, height: h };
                });

                const { pageX, pageY } = evt.nativeEvent;
                // Position can so the handle is under the finger
                canX.setValue(pageX - 85);
                canY.setValue(pageY - 27);

                // Activate watering mode after 350 ms hold
                longPressTimer.current = setTimeout(() => {
                    isWateringRef.current = true;
                    setShowWateringCan(true);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }, 350);
            },

            onPanResponderMove: (evt) => {
                if (!isWateringRef.current) return;

                const { pageX, pageY } = evt.nativeEvent;
                canX.setValue(pageX - 85);
                canY.setValue(pageY - 27);

                const r = potatoRegion.current;
                const over = (
                    pageX > r.x && pageX < r.x + r.width &&
                    pageY > r.y && pageY < r.y + r.height
                );
                if (over !== isOverPotatoRef.current) {
                    isOverPotatoRef.current = over;
                    setIsPouring(over);
                    if (over) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
            },

            onPanResponderRelease: () => {
                clearTimeout(longPressTimer.current);
                if (isWateringRef.current && isOverPotatoRef.current) {
                    handleWaterRef.current();
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
                isWateringRef.current = false;
                isOverPotatoRef.current = false;
                setShowWateringCan(false);
                setIsPouring(false);
            },

            onPanResponderTerminate: () => {
                clearTimeout(longPressTimer.current);
                isWateringRef.current = false;
                isOverPotatoRef.current = false;
                setShowWateringCan(false);
                setIsPouring(false);
            },
        })
    ).current;

    // ── Data loading ──────────────────────────────────────────────────────

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
                newLevelTitle: result.leveledUp
                    ? LEVEL_TIERS.find(t => t.level === result.progress.level)?.title
                    : undefined,
            });
            if (result.leveledUp) {
                trackEvent('level_up', { new_level: result.progress.level, total_xp: result.progress.totalXP });
                await syncGrowthStage(result.progress.level);
            }
            setUserProperties({ level: result.progress.level, total_xp: result.progress.totalXP, streak });
        }
        await syncGrowthStage(p.level);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
        const unsubscribe = navigation.addListener('focus', () => loadData());
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
    const completedCount = Object.values(dailyActions).filter(Boolean).length;

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

    if (!progress) return null;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* ── Header ── */}
                <View style={styles.header}>
                    <Text style={styles.greeting}>
                        {userName ? `Hey ${userName}!` : 'Hey there!'}
                    </Text>
                    <TouchableOpacity
                        style={styles.hamburgerBtn}
                        onPress={() => setIsSettingsVisible(true)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <HamburgerIcon />
                    </TouchableOpacity>
                </View>

                {/* ── Level Card ── */}
                <TouchableOpacity
                    onPress={() => setIsLevelModalVisible(true)}
                    activeOpacity={0.85}
                    style={styles.levelCard}
                >
                    <View style={styles.levelRow}>
                        <View style={styles.levelBadge}>
                            <Text style={styles.levelBadgeText}>LV.{progress.level}</Text>
                        </View>
                        <Text style={styles.levelTitle}>{currentTier?.title ?? 'Raw Spud'}</Text>
                    </View>
                    <View style={styles.xpRow}>
                        <View style={styles.xpTrack}>
                            <View
                                style={[
                                    styles.xpFill,
                                    { width: `${(xpProgress?.percentage ?? 0) * 100}%` },
                                ]}
                            />
                        </View>
                        <Text style={styles.xpDot}>•</Text>
                    </View>
                    {nextTier && (
                        <Text style={styles.xpNext}>
                            {xpProgress?.xpInCurrentLevel ?? 0} / {xpProgress?.xpNeededForNext ?? 100} XP → {nextTier.title}
                        </Text>
                    )}
                </TouchableOpacity>

                {/* ── Potato + Action Circles ── */}
                {!bonsaiLoading && (
                    <View style={styles.potatoSection}>
                        {/* Potato — ref lets us measure its screen position for hover detection */}
                        <View ref={potatoWrapRef} style={styles.potatoWrap}>
                            <PotatoPlant
                                health={bonsaiState.health}
                                animationTrigger={animationTrigger}
                                onClearTrigger={clearTrigger}
                                onWater={handleWaterTree}
                                onTend={handleTendTree}
                                width={screenWidth - 112}
                                height={220}
                            />
                        </View>

                        {/* Action circles */}
                        <View style={styles.actionCircles}>
                            {/* ── Water button — PanResponder for drag-to-water ── */}
                            <View
                                {...waterPanResponder.panHandlers}
                                style={[
                                    styles.circleBtn,
                                    showWateringCan && styles.circleBtnActive,
                                ]}
                            >
                                <WaterDropIcon />
                            </View>

                            {/* Walk */}
                            <TouchableOpacity
                                style={styles.circleBtn}
                                onPress={() => navigation.navigate('Walking')}
                                activeOpacity={0.7}
                            >
                                <WalkIcon />
                            </TouchableOpacity>

                            {/* Tend */}
                            <TouchableOpacity
                                style={styles.circleBtn}
                                onPress={handleTendTree}
                                activeOpacity={0.7}
                            >
                                <SparkleIcon />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* ── Todo List ── */}
                <View style={styles.todoCard}>
                    <View style={styles.todoHeader}>
                        <Text style={styles.cardTitle}>Todo list</Text>
                        {completedCount > 0 && (
                            <View style={styles.xpChip}>
                                <Text style={styles.xpChipText}>+{completedCount * 10} XP</Text>
                            </View>
                        )}
                    </View>
                    {[
                        { key: 'openedApp', label: 'Open the app', xp: XP_REWARDS.openApp, done: dailyActions.openedApp, nav: undefined },
                        { key: 'readQuote', label: 'Read a new quote', xp: XP_REWARDS.readQuote, done: dailyActions.readQuote, nav: 'Canvas' },
                        { key: 'wroteReflection', label: 'Write a reflection', xp: XP_REWARDS.writeReflection, done: dailyActions.wroteReflection, nav: 'Canvas' },
                        { key: 'savedCanvas', label: 'Save your canvas', xp: XP_REWARDS.saveCanvas, done: dailyActions.savedCanvas, nav: 'Canvas' },
                        { key: 'completedHunt', label: 'Complete Positivity Hunt', xp: XP_REWARDS.completeHunt, done: dailyActions.completedHunt, nav: 'Journal' },
                    ].map((action, idx) => (
                        <TouchableOpacity
                            key={action.key}
                            style={[styles.todoRow, idx < 4 && styles.todoRowBorder]}
                            disabled={action.done || !action.nav}
                            onPress={() => action.nav && navigation.navigate(action.nav as any)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.todoBullet, action.done && styles.todoBulletDone]}>
                                {action.done && <CheckIcon />}
                            </View>
                            <Text style={[styles.todoLabel, action.done && styles.todoLabelDone]}>
                                {action.label}
                            </Text>
                            <Text style={[styles.todoXP, action.done && styles.todoXPDone]}>
                                +{action.xp}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

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
                    } catch {
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
                onShowOnboarding={() => {
                    setIsSettingsVisible(false);
                    setTimeout(() => setIsOnboardingVisible(true), 400);
                }}
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

            {/* ── Watering-can overlay (above everything, non-touch-intercepting) ── */}
            {showWateringCan && (
                <View
                    style={RNStyleSheet.absoluteFillObject}
                    pointerEvents="none"
                >
                    <WateringCanOverlay canX={canX} canY={canY} isPouring={isPouring} />
                </View>
            )}
        </SafeAreaView>
    );
};

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: WHITE,
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
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 14,
        paddingBottom: 18,
        position: 'relative',
    },
    greeting: {
        fontFamily: 'GasoekOne', // → 'Gaseok' once Gaseok.ttf is in assets/fonts/
        fontSize: 44,
        color: BLACK,
        textAlign: 'center',
        flex: 1,
    },
    hamburgerBtn: {
        position: 'absolute',
        right: 0,
        top: 10,
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Level Card ──
    levelCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        backgroundColor: WHITE,
        elevation: 8,
        shadowColor: BLACK,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
    },
    levelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
    },
    levelBadge: {
        backgroundColor: YELLOW,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 3,
        elevation: 2,
        shadowColor: BLACK,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    levelBadgeText: {
        fontFamily: 'GasoekOne',
        fontSize: 16,
        color: BLACK,
    },
    levelTitle: {
        fontFamily: 'Caveat-Bold',
        fontSize: 24,
        color: BLACK,
        flex: 1,
    },
    xpRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    xpTrack: {
        flex: 1,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#F0F0F0',
        overflow: 'hidden',
    },
    xpFill: {
        height: '100%',
        borderRadius: 4,
        backgroundColor: YELLOW,
    },
    xpDot: {
        fontSize: 14,
        color: '#AAAAAA',
        lineHeight: 14,
    },
    xpNext: {
        fontFamily: 'Carlito',
        fontSize: 13,
        color: '#888',
        marginTop: 6,
    },

    // ── Potato Section ──
    potatoSection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    potatoWrap: {
        flex: 1,
    },
    actionCircles: {
        justifyContent: 'center',
        gap: 14,
        paddingLeft: 8,
    },
    circleBtn: {
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: WHITE,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: BLACK,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
    },
    circleBtnActive: {
        backgroundColor: '#E8F4FF',  // light blue tint while watering can is out
    },

    // ── Todo Card ──
    todoCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        backgroundColor: WHITE,
        elevation: 8,
        shadowColor: BLACK,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
    },
    todoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    cardTitle: {
        fontFamily: 'Caveat-Bold',
        fontSize: 24,
        color: BLACK,
    },
    xpChip: {
        backgroundColor: YELLOW,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 3,
        elevation: 2,
        shadowColor: BLACK,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    xpChipText: {
        fontFamily: 'Carlito-Bold',
        fontSize: 13,
        color: BLACK,
    },
    todoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        gap: 12,
    },
    todoRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#00000012',
    },
    todoBullet: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: YELLOW + '40',
        alignItems: 'center',
        justifyContent: 'center',
    },
    todoBulletDone: {
        backgroundColor: YELLOW,
    },
    todoLabel: {
        fontFamily: 'Carlito',
        fontSize: 16,
        color: BLACK,
        flex: 1,
    },
    todoLabelDone: {
        textDecorationLine: 'line-through',
        color: '#999',
    },
    todoXP: {
        fontFamily: 'Carlito-Bold',
        fontSize: 13,
        color: '#666',
    },
    todoXPDone: {
        color: '#BBBBBB',
    },
});

export default HubScreen;
