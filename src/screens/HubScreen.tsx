import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BLACK, WHITE, YELLOW } from '../constants/colors';
import {
    View,
    Text,
    Image,
    StyleSheet,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Pressable,
    Dimensions,
    Animated,
    Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path as SvgPath } from 'react-native-svg';

const POTATO_IMAGES = {
    1: require('../../assets/mascot/potato_levels/level_1_potato.png'),
    2: require('../../assets/mascot/potato_levels/level_2_potato.png'),
    3: require('../../assets/mascot/potato_levels/level_3_potato.png'),
    4: require('../../assets/mascot/potato_levels/level_4_potato.png'),
    5: require('../../assets/mascot/potato_levels/level_5_potato.png'),
    6: require('../../assets/mascot/potato_levels/level_6_potato.png'),
    7: require('../../assets/mascot/potato_levels/level_7_potato.png'),
    8: require('../../assets/mascot/potato_levels/level_8_potato.png'),
    9: require('../../assets/mascot/potato_levels/level_9_potato.png'),
} as const;
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { UserProgress, TabScreenNavigationProp } from '../types';
import { loadProgress, awardXP, loadDailyHunt } from '../utils/progressionStorage';
import { useIsFocused } from '@react-navigation/native';
import { useCommitmentMins } from '../context/CommitmentContext';
import { useHeaderHeight } from '../context/HeaderHeightContext';
import { calculateStreak, getJournalEntriesByDate, getTodayDateString } from '../utils/journalStorage';
import { getXPProgress, LEVEL_TIERS, XP_REWARDS } from '../data/progressionConfig';
import { XPToast } from '../components/XPToast';
import { LevelModal } from '../components/LevelModal';
import { StreakModal } from '../components/StreakModal';
import { OnboardingModal } from '../components/OnboardingModal';
import { isOnboardingCompleted, completeOnboarding } from '../utils/storage';
import { trackEvent, setUserProperties } from '../lib/analytics';
import { useDailyQuote } from '../hooks/useDailyQuote';

const { width: SCREEN_W } = Dimensions.get('window');
const BASE_JUMP_H = 80;

// ─────────────────────────────────────────────
// SVG Icons
// ─────────────────────────────────────────────

const ArrowIcon = () => (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
        <SvgPath d="M5 12h14M13 6l6 6-6 6" stroke={BLACK} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

const CheckIcon = () => (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
        <SvgPath d="M5 12l5 5L20 7" stroke={BLACK} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

// ─────────────────────────────────────────────
// Mood-aware all-quests-complete speech
// ─────────────────────────────────────────────

const getCongratsSpeech = (moodScore?: number): string => {
    if (!moodScore) {
        return "ALL DONE FOR TODAY!\nI'M SO PROUD OF YOU.\n\nYOU SHOWED UP — THAT'S\nWHAT MATTERS MOST.";
    }
    // 1–3: rough/sad — gentle & encouraging
    if (moodScore <= 3) {
        return "TODAY WAS HEAVY, AND\nYOU STILL SHOWED UP.\n\nTHAT TAKES REAL STRENGTH.\nREST EASY — I'M HERE.";
    }
    // 4–5: meh/upset — calming
    if (moodScore <= 5) {
        return "BREATHE. YOU GOT THROUGH\nTODAY ONE STEP AT A TIME.\n\nLET TONIGHT BE QUIET.\nTOMORROW IS A NEW PAGE.";
    }
    // 6–7: okay — proud
    if (moodScore <= 7) {
        return "NICE WORK TODAY!\nALL QUESTS COMPLETE.\n\nYOU'RE BUILDING\nSOMETHING REAL.";
    }
    // 8–10: good/great — celebratory
    return "AMAZING DAY!\nYOU CRUSHED EVERY QUEST.\n\nKEEP RIDING THIS WAVE —\nI'M CHEERING FOR YOU!";
};

// ─────────────────────────────────────────────
// Week Strip
// ─────────────────────────────────────────────

const WeekStrip: React.FC = () => {
    const today = new Date();
    const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - 3 + i);
        return {
            dayNum: d.getDate(),
            dayLabel: d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1).toUpperCase(),
            isToday: i === 3,
        };
    });

    return (
        <View style={weekStyles.card}>
            {days.map((d, i) => (
                <View key={i} style={[weekStyles.dayPill, d.isToday && weekStyles.dayPillActive]}>
                    <Text style={[weekStyles.dayNum, d.isToday && weekStyles.dayNumActive]}>
                        {d.dayNum}
                    </Text>
                    <Text style={[weekStyles.dayLabel, d.isToday && weekStyles.dayLabelActive]}>
                        {d.dayLabel}
                    </Text>
                </View>
            ))}
        </View>
    );
};

const weekStyles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: WHITE,
        borderWidth: 2,
        borderColor: BLACK,
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 16,
    },
    dayPill: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 44,
        borderRadius: 18,
    },
    dayPillActive: {
        backgroundColor: YELLOW,
    },
    dayNum: {
        fontFamily: 'Inter-Bold',
        fontSize: 15,
        color: BLACK,
    },
    dayNumActive: {
        color: BLACK,
    },
    dayLabel: {
        fontFamily: 'Inter-Medium',
        fontSize: 10,
        color: '#999999',
        marginTop: 1,
    },
    dayLabelActive: {
        color: BLACK,
    },
});

// ─────────────────────────────────────────────
// Main Card — mascot + actions combined
// ─────────────────────────────────────────────

interface MainCardProps {
    level: number;
    currentTitle: string;
    xpInCurrentLevel: number;
    xpNeededForNext: number;
    onPressLevel: () => void;
    getJumpHeight?: () => number;
    onPeak?: () => void;
    actions: (typeof ALL_ACTIONS)[number][];
    dailyActions: DailyActions;
    brokenTasks: Set<TaskKey>;
    breakAnims: Record<TaskKey, BreakAnim>;
    cardLayouts: React.MutableRefObject<Partial<Record<TaskKey, { y: number; height: number }>>>;
    onNavigate: (nav: string) => void;
    completedCount: number;
    todayMoodScore?: number;
}

const MainCard: React.FC<MainCardProps> = ({
    level, currentTitle, xpInCurrentLevel, xpNeededForNext,
    onPressLevel, getJumpHeight, onPeak,
    actions, dailyActions, brokenTasks, breakAnims,
    cardLayouts, onNavigate, completedCount, todayMoodScore,
}) => {

    const xpPct = xpNeededForNext > 0 ? Math.min(1, xpInCurrentLevel / xpNeededForNext) : 0;

    return (
        <View style={mainCardStyles.card}>
            {/* ── Level info row ── */}
            <TouchableOpacity onPress={onPressLevel} activeOpacity={0.7} style={mainCardStyles.levelRow}>
                <Text style={mainCardStyles.levelTitle}>POTATO</Text>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={mainCardStyles.levelSubtitle}>{currentTitle.toUpperCase().replace(/ /g, '\n')}</Text>
                    <Text style={mainCardStyles.xpLabel}>
                        <Text style={mainCardStyles.xpCurrent}>{xpInCurrentLevel}</Text>
                        <Text style={mainCardStyles.xpMax}>/{xpNeededForNext}</Text>
                    </Text>
                </View>
            </TouchableOpacity>

            {/* ── Mascot ── */}
            <View style={mainCardStyles.mascotArea}>
                <PotatoMascot
                    level={level}
                    getJumpHeight={getJumpHeight}
                    onPeak={onPeak}
                />
            </View>

            {/* ── TODAY'S ACTIONS header (hidden when all done) ── */}
            {completedCount < actions.length && (
                <View style={mainCardStyles.actionsHeader}>
                    <Text style={mainCardStyles.actionsHeaderLabel}>TODAY'S  ACTIONS</Text>
                    <Text style={mainCardStyles.actionsHeaderCount}>
                        <Text style={mainCardStyles.actionsHeaderCountBold}>{completedCount}</Text>
                        <Text style={mainCardStyles.actionsHeaderCountMax}>/{actions.length}</Text>
                    </Text>
                </View>
            )}

            {/* ── All done: potato speech (mood-aware) ── */}
            {completedCount === actions.length && (
                <View style={mainCardStyles.speechBox}>
                    <Text style={mainCardStyles.speechText}>
                        {getCongratsSpeech(todayMoodScore)}
                    </Text>
                </View>
            )}

            {/* ── Action rows ── */}
            {actions.map((action, idx) => {
                if (brokenTasks.has(action.key as TaskKey)) return null;
                const isDone = dailyActions[action.key as keyof DailyActions];
                const anims  = breakAnims[action.key as TaskKey];
                const isLast = idx === actions.length - 1;

                return (
                    <Animated.View
                        key={action.key}
                        onLayout={e => {
                            cardLayouts.current[action.key as TaskKey] = {
                                y:      e.nativeEvent.layout.y,
                                height: e.nativeEvent.layout.height,
                            };
                        }}
                        style={{
                            opacity:   anims.opacity,
                            transform: [
                                { translateX: anims.translateX },
                                { scale: anims.scale },
                            ],
                        }}
                    >
                        <Pressable
                            style={({ pressed }) => [
                                mainCardStyles.actionRow,
                                pressed && !isDone && { backgroundColor: YELLOW },
                            ]}
                            disabled={isDone || !action.nav}
                            onPress={() => {
                                if (action.nav) {
                                    Haptics.selectionAsync();
                                    onNavigate(action.nav);
                                }
                            }}
                        >
                            <View style={[mainCardStyles.actionIcon, isDone && mainCardStyles.actionIconDone]}>
                                {isDone ? <CheckIcon /> : <ArrowIcon />}
                            </View>
                            <Text style={[mainCardStyles.actionLabel, isDone && mainCardStyles.actionLabelDone]}>
                                {action.label}
                            </Text>
                            <View style={[mainCardStyles.xpBadge, isDone && mainCardStyles.xpBadgeDone]}>
                                <Text style={[mainCardStyles.xpBadgeText, isDone && mainCardStyles.xpBadgeTextDone]}>
                                    +{action.xp}
                                </Text>
                            </View>
                        </Pressable>
                        {!isLast && <View style={mainCardStyles.rowDivider} />}
                    </Animated.View>
                );
            })}

            {/* ── Closing divider + bottom padding ── */}
            <View style={mainCardStyles.rowDivider} />
            <View style={{ height: 24 }} />
        </View>
    );
};

const mainCardStyles = StyleSheet.create({
    card: {
        backgroundColor: WHITE,
        borderWidth: 2,
        borderColor: BLACK,
        borderRadius: 20,
        flex: 1,
        overflow: 'hidden',
    },
    levelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingTop: 24,
        paddingBottom: 16,
        paddingHorizontal: 24,
    },
    levelTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 20,
        color: BLACK,
        letterSpacing: 0.5,
    },
    levelSubtitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 20,
        color: '#F0F0F0',
        letterSpacing: 0.3,
        textAlign: 'right',
    },
    xpLabel: { flexShrink: 0, marginTop: 4 },
    xpCurrent: { fontFamily: 'Inter-Bold', fontSize: 16, color: BLACK },
    xpMax:     { fontFamily: 'Inter-Bold', fontSize: 16, color: '#F0F0F0' },
    mascotArea: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingBottom: 16,
        overflow: 'hidden',
    },
    // TODAY'S ACTIONS banner
    actionsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: WHITE,
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 10,
    },
    actionsHeaderLabel: {
        fontFamily: 'Inter-Bold',
        fontSize: 16,
        color: BLACK,
        letterSpacing: 0.8,
    },
    actionsHeaderCount: {},
    actionsHeaderCountBold: { fontFamily: 'Inter-Bold',   fontSize: 14, color: BLACK },
    actionsHeaderCountMax:  { fontFamily: 'Inter-Medium', fontSize: 14, color: '#4B5563' },
    // rows
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 10,
        gap: 12,
    },
    actionIcon: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionIconDone: { backgroundColor: YELLOW },
    actionLabel: {
        fontFamily: 'Inter-Bold',
        fontSize: 16,
        color: BLACK,
        flex: 1,
    },
    actionLabelDone: { color: '#AAAAAA', textDecorationLine: 'line-through' },
    xpBadge: {
        borderWidth: 1.5,
        borderColor: BLACK,
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 3,
    },
    xpBadgeDone: { borderColor: '#CCCCCC' },
    xpBadgeText: { fontFamily: 'Inter-Bold', fontSize: 14, color: BLACK },
    xpBadgeTextDone: { color: '#CCCCCC' },
    rowDivider: {
        height: 1.5,
        backgroundColor: '#CCCCCC',
        marginHorizontal: 24,
    },
    speechBox: {
        paddingHorizontal: 24,
        paddingVertical: 24,
    },
    speechText: {
        fontFamily: 'Gaegu-Bold',
        fontSize: 20,
        color: BLACK,
        lineHeight: 28,
    },
});

// ─────────────────────────────────────────────
// Potato Mascot — fast, interruptible jumps
// ─────────────────────────────────────────────

interface PotatoMascotProps {
    level: number;
    getJumpHeight?: () => number;
    onPeak?: () => void;
}

const PotatoMascot: React.FC<PotatoMascotProps> = ({ level, getJumpHeight, onPeak }) => {
    const jumpAnim    = useRef(new Animated.Value(0)).current;
    const swayAnim    = useRef(new Animated.Value(0)).current;
    const squishX     = useRef(new Animated.Value(1)).current;
    const squishY     = useRef(new Animated.Value(1)).current;
    const getJumpHeightRef = useRef(getJumpHeight);
    const onPeakRef        = useRef(onPeak);
    const phaseAAnim       = useRef<Animated.CompositeAnimation | null>(null);
    const phaseBAAnim      = useRef<Animated.CompositeAnimation | null>(null);

    useEffect(() => { getJumpHeightRef.current = getJumpHeight; }, [getJumpHeight]);
    useEffect(() => { onPeakRef.current = onPeak; }, [onPeak]);

    // Idle sway
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(swayAnim, { toValue:  1.5, duration: 2800, useNativeDriver: true }),
                Animated.timing(swayAnim, { toValue: -1.5, duration: 2800, useNativeDriver: true }),
                Animated.timing(swayAnim, { toValue:  0,   duration: 2000, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [swayAnim]);

    const handleTap = () => {
        phaseAAnim.current?.stop();
        phaseBAAnim.current?.stop();
        phaseAAnim.current = null;
        phaseBAAnim.current = null;
        jumpAnim.setValue(0);
        squishX.setValue(1);
        squishY.setValue(1);

        const targetH = getJumpHeightRef.current?.() ?? BASE_JUMP_H;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const phaseA = Animated.sequence([
            Animated.parallel([
                Animated.timing(squishY, { toValue: 0.72, duration: 55, useNativeDriver: true }),
                Animated.timing(squishX, { toValue: 1.28, duration: 55, useNativeDriver: true }),
            ]),
            Animated.parallel([
                Animated.timing(jumpAnim, { toValue: -targetH, duration: 165, easing: Easing.out(Easing.quad), useNativeDriver: true }),
                Animated.timing(squishY,  { toValue: 1.06, duration: 120, useNativeDriver: true }),
                Animated.timing(squishX,  { toValue: 0.94, duration: 120, useNativeDriver: true }),
            ]),
        ]);
        phaseAAnim.current = phaseA;

        phaseA.start(({ finished }) => {
            phaseAAnim.current = null;
            if (!finished) return;
            onPeakRef.current?.();

            const phaseB = Animated.sequence([
                Animated.spring(jumpAnim, { toValue: 0, tension: 220, friction: 7, useNativeDriver: true }),
                Animated.parallel([
                    Animated.timing(squishY, { toValue: 0.76, duration: 50, useNativeDriver: true }),
                    Animated.timing(squishX, { toValue: 1.24, duration: 50, useNativeDriver: true }),
                ]),
                Animated.parallel([
                    Animated.spring(squishY, { toValue: 1, tension: 220, friction: 8, useNativeDriver: true }),
                    Animated.spring(squishX, { toValue: 1, tension: 220, friction: 8, useNativeDriver: true }),
                ]),
            ]);
            phaseBAAnim.current = phaseB;
            phaseB.start(() => { phaseBAAnim.current = null; });
        });
    };

    const rotate     = swayAnim.interpolate({ inputRange: [-1.5, 1.5], outputRange: ['-3deg', '3deg'] });
    const clampedLv  = Math.min(Math.max(1, level), 9) as keyof typeof POTATO_IMAGES;
    const mascotSize = 80 + (clampedLv - 1) * 10; // 80px at lv1 → 160px at lv9

    return (
        <Animated.View style={{ transform: [{ translateY: jumpAnim }], alignItems: 'center' }}>
            <Animated.View style={{ transform: [{ rotate }, { scaleX: squishX }, { scaleY: squishY }] }}>
                <TouchableWithoutFeedback onPress={handleTap}>
                    <Image
                        source={POTATO_IMAGES[clampedLv]}
                        style={{ width: mascotSize, height: mascotSize }}
                        resizeMode="contain"
                    />
                </TouchableWithoutFeedback>
            </Animated.View>
        </Animated.View>
    );
};

// ─────────────────────────────────────────────
// Todo action definitions
// ─────────────────────────────────────────────

const ALL_ACTIONS = [
    { key: 'openedApp',       label: 'Open the app',             xp: XP_REWARDS.openApp,         nav: undefined  },
    { key: 'readQuote',       label: 'Reflect on today\'s quote', xp: XP_REWARDS.readQuote,      nav: 'Canvas'   },
    { key: 'wroteReflection', label: 'Write in your journal',    xp: XP_REWARDS.writeReflection, nav: 'Journal'  },
    { key: 'completedHunt',   label: 'Complete Positivity Hunt', xp: XP_REWARDS.completeHunt,    nav: 'Journal'  },
] as const;

// Keys active per commitment level (driven by @ulbo_commitment_minutes)
const COMMITMENT_KEYS: Record<number, readonly string[]> = {
    5:  ['readQuote', 'wroteReflection'],
    10: ['readQuote', 'wroteReflection', 'completedHunt'],
    20: ['openedApp', 'readQuote', 'wroteReflection', 'completedHunt'],
};

const getActionsForCommitment = (mins: number) => {
    const keys = COMMITMENT_KEYS[mins] ?? COMMITMENT_KEYS[20];
    return ALL_ACTIONS.filter(a => keys.includes(a.key));
};

// Keep TODO_ACTIONS as alias so breakAnims & types stay valid
const TODO_ACTIONS = ALL_ACTIONS;
type TaskKey = (typeof ALL_ACTIONS)[number]['key'];
type DailyActions = { openedApp: boolean; readQuote: boolean; wroteReflection: boolean; completedHunt: boolean };

interface BreakAnim {
    translateX: Animated.Value;
    opacity:    Animated.Value;
    scale:      Animated.Value;
}

// ─────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────

export const HubScreen: React.FC = () => {
    const navigation    = useNavigation<TabScreenNavigationProp<'Home'>>();
    const isFocused     = useIsFocused();
    const insets        = useSafeAreaInsets();
    const headerHeight  = useHeaderHeight();
    const commitmentMins = useCommitmentMins();
    useDailyQuote();

    const [progress,        setProgress]        = useState<UserProgress | null>(null);
    const [streak,          setStreak]          = useState(0);
    const [todayMoodScore,  setTodayMoodScore]  = useState<number | undefined>(undefined);
    const [dailyActions, setDailyActions] = useState<DailyActions>({
        openedApp: false, readQuote: false, wroteReflection: false,
        completedHunt: false,
    });

    const [todoActions, setTodoActions] = useState(() => getActionsForCommitment(20));
    const [isLevelModalVisible,  setIsLevelModalVisible]  = useState(false);
    const [isStreakModalVisible,  setIsStreakModalVisible] = useState(false);
    const [xpToast, setXpToast] = useState<{
        amount: number; label?: string; leveledUp?: boolean; newLevelTitle?: string;
    } | null>(null);
    const [isOnboardingVisible, setIsOnboardingVisible] = useState(false);

    // ── Task-break state ──────────────────────────────────────────────────

    const breakAnims = useRef<Record<TaskKey, BreakAnim>>(
        Object.fromEntries(
            TODO_ACTIONS.map(a => [a.key, {
                translateX: new Animated.Value(0),
                opacity:    new Animated.Value(1),
                scale:      new Animated.Value(1),
            }])
        ) as Record<TaskKey, BreakAnim>
    ).current;

    const [brokenTasks,     setBrokenTasks]     = useState<Set<TaskKey>>(new Set());
    const breakingInFlight  = useRef<Set<TaskKey>>(new Set());
    const currentJumpTarget = useRef<TaskKey | null>(null);

    const dailyActionsRef = useRef(dailyActions);
    const brokenTasksRef  = useRef(brokenTasks);
    useEffect(() => { dailyActionsRef.current = dailyActions; }, [dailyActions]);
    useEffect(() => { brokenTasksRef.current  = brokenTasks;  }, [brokenTasks]);

    const cardLayouts   = useRef<Partial<Record<TaskKey, { y: number; height: number }>>>({});
    const maxJumpHeight = useRef(BASE_JUMP_H);

    // ── Break animation ───────────────────────────────────────────────────

    const animateBreakTask = useCallback((key: TaskKey) => {
        const anims = breakAnims[key];
        Animated.sequence([
            Animated.sequence([
                Animated.timing(anims.translateX, { toValue:  14, duration: 32, useNativeDriver: true }),
                Animated.timing(anims.translateX, { toValue: -14, duration: 32, useNativeDriver: true }),
                Animated.timing(anims.translateX, { toValue:  10, duration: 26, useNativeDriver: true }),
                Animated.timing(anims.translateX, { toValue:  -8, duration: 22, useNativeDriver: true }),
                Animated.timing(anims.translateX, { toValue:   0, duration: 18, useNativeDriver: true }),
            ]),
            Animated.parallel([
                Animated.timing(anims.translateX, { toValue: SCREEN_W + 60, duration: 210, easing: Easing.in(Easing.quad), useNativeDriver: true }),
                Animated.timing(anims.opacity,    { toValue: 0,             duration: 190, useNativeDriver: true }),
                Animated.timing(anims.scale,      { toValue: 0.75,          duration: 210, useNativeDriver: true }),
            ]),
        ]).start(() => {
            breakingInFlight.current.delete(key);
            setBrokenTasks(prev => new Set([...prev, key]));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        });
    }, [breakAnims]);

    // ── Jump height ───────────────────────────────────────────────────────

    const getJumpHeight = useCallback((): number => {
        const target = [...TODO_ACTIONS].reverse().find(a =>
            dailyActionsRef.current[a.key as keyof DailyActions] &&
            !brokenTasksRef.current.has(a.key as TaskKey) &&
            !breakingInFlight.current.has(a.key as TaskKey)
        );

        currentJumpTarget.current = target ? (target.key as TaskKey) : null;

        if (!target) return maxJumpHeight.current;

        const cardLayout = cardLayouts.current[target.key as TaskKey];
        if (!cardLayout) return maxJumpHeight.current;

        const h = Math.max(80, BASE_JUMP_H);
        maxJumpHeight.current = Math.max(maxJumpHeight.current, h);
        return h;
    }, []);

    // ── Peak callback ─────────────────────────────────────────────────────

    const handlePotatoPeak = useCallback(() => {
        const key = currentJumpTarget.current;
        if (!key) return;
        if (brokenTasksRef.current.has(key) || breakingInFlight.current.has(key)) return;

        breakingInFlight.current.add(key);
        currentJumpTarget.current = null;
        animateBreakTask(key);
    }, [animateBreakTask]);

    // ── Data loading ──────────────────────────────────────────────────────

    const loadData = useCallback(async () => {
        const [p, s, hunt, commitVal, todayEntries] = await Promise.all([
            loadProgress(),
            calculateStreak(),
            loadDailyHunt(),
            AsyncStorage.getItem('@ulbo_commitment_minutes'),
            getJournalEntriesByDate(getTodayDateString()),
        ]);

        // Most recent mood-bearing entry today drives the congrats speech.
        const todayMood = [...todayEntries]
            .reverse()
            .find(e => typeof e.moodScore === 'number')?.moodScore;
        setTodayMoodScore(todayMood);

        setProgress(p);
        setStreak(s);
        setDailyActions({
            openedApp:       p.dailyActions.openApp         || false,
            readQuote:       p.dailyActions.readQuote       || false,
            wroteReflection: p.dailyActions.wroteReflection || false,
            completedHunt:   hunt?.xpAwarded                || false,
        });

        const mins  = commitVal ? parseInt(commitVal, 10) : 20;
        const valid = [5, 10, 20].includes(mins) ? mins : 20;
        setTodoActions(getActionsForCommitment(valid));

        const result = await awardXP('openApp', p);
        if (result.xpGained > 0) {
            setProgress(result.progress);
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
            }
            setUserProperties({ level: result.progress.level, total_xp: result.progress.totalXP, streak: s });
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const checkOnboarding = async () => {
        const completed = await isOnboardingCompleted();
        if (!completed) setIsOnboardingVisible(true);
    };

    const handleOnboardingComplete = async (name: string) => {
        await completeOnboarding(name);
        setIsOnboardingVisible(false);
        trackEvent('onboarding_completed');
        setTimeout(() => navigation.navigate('Paywall'), 500);
    };

    useEffect(() => {
        loadData();
        checkOnboarding();
    }, [loadData]);

    // isFocused → true fires on BOTH tab switches AND returning from any stack screen
    useEffect(() => {
        if (isFocused) loadData();
    }, [isFocused]); // eslint-disable-line react-hooks/exhaustive-deps

    // commitmentMins from context updates immediately when AppHeader's inline pill is pressed,
    // without any navigation (isFocused stays true), so handle it separately here.
    useEffect(() => {
        const valid = [5, 10, 20].includes(commitmentMins) ? commitmentMins : 20;
        setTodoActions(getActionsForCommitment(valid));
    }, [commitmentMins]);

    useEffect(() => {
        const checkFeedbackPrompt = async () => {
            if (!progress || progress.level < 3) return;
            try {
                const lastPrompt = await AsyncStorage.getItem('@ulbo_last_feedback_prompt');
                const now = Date.now();
                const sevenDays = 7 * 24 * 60 * 60 * 1000;
                if (!lastPrompt || (now - parseInt(lastPrompt, 10)) > sevenDays) {
                    await AsyncStorage.setItem('@ulbo_last_feedback_prompt', now.toString());
                }
            } catch (e) {
                console.error('Error checking feedback prompt', e);
            }
        };
        checkFeedbackPrompt();
    }, [progress?.level]);

    const xpProgress  = progress ? getXPProgress(progress.totalXP) : null;
    const currentTier = progress ? LEVEL_TIERS.find(t => t.level === progress.level) : null;
    const completedCount = todoActions.filter(a => dailyActions[a.key as keyof DailyActions]).length;

    if (!progress) return null;

    return (
        <View style={styles.container}>
            <View style={[
                styles.scrollContent,
                {
                    paddingTop: (headerHeight || 0) + 16,
                    paddingBottom: 62 + insets.bottom + 16,
                },
            ]}>
                {/* ── Main Card (mascot + actions combined) ── */}
                {xpProgress && currentTier && (
                    <MainCard
                        level={progress.level}
                        currentTitle={currentTier.title}
                        xpInCurrentLevel={xpProgress.xpInCurrentLevel}
                        xpNeededForNext={xpProgress.xpNeededForNext}
                        onPressLevel={() => setIsLevelModalVisible(true)}
                        getJumpHeight={getJumpHeight}
                        onPeak={handlePotatoPeak}
                        actions={todoActions}
                        dailyActions={dailyActions}
                        brokenTasks={brokenTasks}
                        breakAnims={breakAnims}
                        cardLayouts={cardLayouts}
                        onNavigate={nav => navigation.navigate(nav as any)}
                        completedCount={completedCount}
                        todayMoodScore={todayMoodScore}
                    />
                )}
            </View>

            {/* ── Modals ── */}
            <StreakModal
                visible={isStreakModalVisible}
                onClose={() => setIsStreakModalVisible(false)}
                streak={streak}
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
        </View>
    );
};

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
    container:     { flex: 1, backgroundColor: BLACK },
    scrollContent: { flex: 1, paddingHorizontal: 16 },
});

export default HubScreen;
