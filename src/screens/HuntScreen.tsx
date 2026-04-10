import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    StyleSheet,
    View,
    ScrollView,
    TouchableOpacity,
    Pressable,
    Image,
    Dimensions,
    TextInput as RNTextInput,
    Keyboard,
    Platform,
    KeyboardAvoidingView,
    Modal,
    Animated as RNAnimated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, ActivityIndicator } from 'react-native-paper';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { UserProgress, DailyHunt } from '../types';
import { loadProgress, awardXP, loadDailyHunt, addHuntEntry, saveDailyHunt } from '../utils/progressionStorage';
import { LEVEL_TIERS } from '../data/progressionConfig';
import { XPToast } from '../components/XPToast';
import { QuestCard, QuestStatus, SearchIcon, PenIcon, ThoughtIcon, CheckIcon, SparkleIcon } from '../components/QuestCard';
import { trackEvent } from '../lib/analytics';
import { useDailyQuote } from '../hooks/useDailyQuote';
import { useMascotState } from '../hooks/useMascotState';
import { selectDailyPrompt, getMascotIntro, recordPromptUsage } from '../utils/promptSystem';
import { GratitudePrompt } from '../data/gratitudePrompts';
import { getTodayDateString, saveJournalEntry, generateJournalId, analyzeJournalEntry, chatWithUlbo, updateEntryWithAI } from '../utils/journalStorage';
import { SpiritResponseModal } from '../components/SpiritResponseModal';
import { HUNT_PLACEHOLDERS } from '../data/gratitudePrompts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildMemoryContext } from '../memory/MemorySystem';
import { useHeaderHeight } from '../context/HeaderHeightContext';
import { useIsFocused, useFocusEffect } from '@react-navigation/native';
import { useSetTimerDisplay } from '../context/TimerContext';
import { useSetJournalSteps } from '../context/JournalStepsContext';
import { useTimerSecs } from '../context/TimerSecondsContext';
import { VoiceSheet, MicTriggerButton } from '../components/VoiceSheet';

// ── Animated avatar — pops on tap ─────────────────────────────────────────
const AnimatedAvatar: React.FC<{ source: any; size?: number }> = ({ source, size = 36 }) => {
    const scale = useRef(new RNAnimated.Value(1)).current;
    const pop = () => {
        RNAnimated.sequence([
            RNAnimated.spring(scale, { toValue: 1.4, useNativeDriver: true, friction: 3, tension: 320 }),
            RNAnimated.spring(scale, { toValue: 1,   useNativeDriver: true, friction: 5, tension: 200 }),
        ]).start();
    };
    return (
        <TouchableOpacity onPress={pop} activeOpacity={1}>
            <RNAnimated.View style={{ transform: [{ scale }] }}>
                <Image source={source} style={{ width: size, height: size }} resizeMode="contain" />
            </RNAnimated.View>
        </TouchableOpacity>
    );
};

// ── Typing dots animation ──────────────────────────────────────────────────
const TypingDots: React.FC = () => {
    const dots = [
        useRef(new RNAnimated.Value(0)).current,
        useRef(new RNAnimated.Value(0)).current,
        useRef(new RNAnimated.Value(0)).current,
    ];

    useEffect(() => {
        const anims = dots.map((dot, i) =>
            RNAnimated.loop(
                RNAnimated.sequence([
                    RNAnimated.delay(i * 200),
                    RNAnimated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
                    RNAnimated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
                    RNAnimated.delay((dots.length - i) * 200),
                ])
            )
        );
        anims.forEach(a => a.start());
        return () => anims.forEach(a => a.stop());
    }, []);

    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4 }}>
            {dots.map((dot, i) => (
                <RNAnimated.View
                    key={i}
                    style={{
                        width: 8, height: 8, borderRadius: 4,
                        backgroundColor: '#888888',
                        opacity: dot,
                        transform: [{ scale: dot.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
                    }}
                />
            ))}
        </View>
    );
};

// Assets
const coachBunny = require('../../assets/mascot/coach_bunny.png');
const chatPotatoIcon     = require('../../assets/chat_potato.png');
const chatModePotatoIcon = require('../../assets/mascot/chat_mode_potato_icon.png');
const textPotatoIcon     = require('../../assets/mascot/text_mode_potato_icon.png');
const { width } = Dimensions.get('window');

// Level-based potato images
const POTATO_IMAGES: Record<number, any> = {
    1: require('../../assets/mascot/potato_levels/level_1_potato.png'),
    2: require('../../assets/mascot/potato_levels/level_2_potato.png'),
    3: require('../../assets/mascot/potato_levels/level_3_potato.png'),
    4: require('../../assets/mascot/potato_levels/level_4_potato.png'),
    5: require('../../assets/mascot/potato_levels/level_5_potato.png'),
    6: require('../../assets/mascot/potato_levels/level_6_potato.png'),
    7: require('../../assets/mascot/potato_levels/level_7_potato.png'),
    8: require('../../assets/mascot/potato_levels/level_8_potato.png'),
    9: require('../../assets/mascot/potato_levels/level_9_potato.png'),
};

// Emotion state images
const EMOTION_IMAGES = {
    happy: {
        selected:   require('../../assets/mascot/potato_emotion_states/potato_happy_selected.png'),
        unselected: require('../../assets/mascot/potato_emotion_states/potato_happy_unselected.png'),
    },
    sad: {
        selected:   require('../../assets/mascot/potato_emotion_states/potato_sad_selected.png'),
        unselected: require('../../assets/mascot/potato_emotion_states/potato_sad_unselected.png'),
    },
    upset: {
        selected:   require('../../assets/mascot/potato_emotion_states/potato_upset_selected.png'),
        unselected: require('../../assets/mascot/potato_emotion_states/potato_upset_unselected.png'),
    },
    bored: {
        selected:   require('../../assets/mascot/potato_emotion_states/potato_bored_selected.png'),
        unselected: require('../../assets/mascot/potato_emotion_states/potato_bored_unselected.png'),
    },
} as const;

type Emotion = keyof typeof EMOTION_IMAGES;
const EMOTIONS: Emotion[] = ['happy', 'sad', 'upset', 'bored'];

// Coach messages — first is task-oriented, rest are encouragements
const COACH_MESSAGES = [
    "let's reflect on today~",
    "you're doing great, keep it up!",
    "every good thing you notice matters",
    "gratitude is a superpower",
    "I'm proud of you for being here",
    "small moments, big feelings~",
    "take your time, no rush",
    "you're building a beautiful habit",
];

const STEP_LABELS = ['Emotion', '3 things', 'reflect', 'quote'];
const STEP_TITLES = ['How Do You Feel?', 'Find 3 Good Things', 'Write a Reflection', "Today's Quote"];

const YELLOW = '#FFE600';
const BLACK  = '#000000';
const WHITE  = '#FFFFFF';

// Fallback Ulbo response when AI call fails or returns null
const SPIRIT_FALLBACK = (name: string) => ({
    reply: `You showed up and wrote it down, ${name}. That already counts for a lot.`,
    mood: 7,
    tags: ['showing up', 'reflective'],
    followUp: "What's one thing from today you want to remember tomorrow?",
});


// ─── Custom SVG: Arrow/Send ───
const SendArrowIcon = ({ color = BLACK, size = 20 }: { color?: string; size?: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

type ChatMsg = { id: string; role: 'user' | 'ulbo'; text: string };

const ULBO_FALLBACKS = [
    "That's worth sitting with. Sometimes the heaviest thoughts are the ones closest to something real.",
    "Hmm. What part of that feels like it's trying to teach you something?",
    "There's something deeper underneath that thought... can you feel it? What lives beneath the surface?",
    "You know, Nietzsche said the most spiritual people experience the most painful truths. The fact that you're thinking this deeply already says something about you.",
    "Interesting. Most people run from that kind of honesty. But you're leaning in. That takes a quiet kind of strength.",
    "Sometimes the discomfort IS the transformation happening. What would it mean to sit with this instead of solving it?",
];

const ArrowRightIcon = ({ color, size = 18 }: { color: string; size?: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M5 12h14M13 6l6 6-6 6" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

const SendIcon = ({ color, size = 18 }: { color: string; size?: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M22 2L11 13" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M22 2l-7 20-4-9-9-4 20-7z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

const ShuffleIcon = ({ color, size = 18 }: { color: string; size?: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l14.2-12.6c.8-1.1 2-1.7 3.3-1.7H22" />
        <Path d="M2 6h1.4c1.3 0 2.5.6 3.3 1.7l14.2 12.6c.8 1.1 2 1.7 3.3 1.7H22" />
        <Path d="M16 3h5v5" />
        <Path d="M16 21h5v-5" />
    </Svg>
);


// ═══════════════════════════════════════════════
// Confetti Rain
// ═══════════════════════════════════════════════

const CONFETTI_COLORS = ['#FFFF01', '#FF4757', '#2ED573', '#1E90FF', '#FF6B81', '#FFFFFF'];
const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;

const ConfettiRain: React.FC<{ active: boolean }> = ({ active }) => {
    const pieces = useRef(
        Array.from({ length: 30 }, () => ({
            anim:     new RNAnimated.Value(0),
            x:        Math.random() * SCREEN_W,
            color:    CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
            duration: 1200 + Math.random() * 800,
            delay:    Math.random() * 800,
        }))
    ).current;

    useEffect(() => {
        if (!active) return;
        const anims = pieces.map(p =>
            RNAnimated.loop(
                RNAnimated.timing(p.anim, {
                    toValue: 1,
                    duration: p.duration,
                    delay: p.delay,
                    useNativeDriver: true,
                })
            )
        );
        anims.forEach(a => a.start());
        return () => anims.forEach(a => a.stop());
    }, [active, pieces]);

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {pieces.map((p, i) => {
                const translateY = p.anim.interpolate({
                    inputRange:  [0, 1],
                    outputRange: [-20, SCREEN_H],
                });
                return (
                    <RNAnimated.View
                        key={i}
                        style={{
                            position:        'absolute',
                            left:            p.x,
                            top:             0,
                            width:           8,
                            height:          8,
                            backgroundColor: p.color,
                            transform:       [{ translateY }],
                        }}
                    />
                );
            })}
        </View>
    );
};

// ═══════════════════════════════════════════════
// Alarm Overlay
// ═══════════════════════════════════════════════

interface AlarmOverlayProps {
    visible:      boolean;
    allTasksDone: boolean;
    missionsLeft: number;
    onKeepGoing:  () => void;
    onStop:       () => void;
    onGrowPotato: () => void;
}

const AlarmOverlay: React.FC<AlarmOverlayProps> = ({
    visible, allTasksDone, missionsLeft, onKeepGoing, onStop, onGrowPotato,
}) => {
    const pulseAnim = useRef(new RNAnimated.Value(1)).current;

    // Pulsing alarm for "not done" flow
    useEffect(() => {
        if (!visible || allTasksDone) { pulseAnim.setValue(1); return; }
        const loop = RNAnimated.loop(
            RNAnimated.sequence([
                RNAnimated.timing(pulseAnim, { toValue: 1.08, duration: 300, useNativeDriver: true }),
                RNAnimated.timing(pulseAnim, { toValue: 1,    duration: 300, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [visible, allTasksDone, pulseAnim]);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onStop}>
            <View style={alarmStyles.backdrop}>
                {allTasksDone && <ConfettiRain active={visible && allTasksDone} />}
                <View style={alarmStyles.card}>
                    {allTasksDone ? (
                        <>
                            <Text style={alarmStyles.bigEmoji}>🎉</Text>
                            <Text style={alarmStyles.doneTitle}>All Done!</Text>
                            <Text style={alarmStyles.doneSub}>You crushed all today's missions!</Text>
                            <TouchableOpacity style={alarmStyles.growBtn} onPress={onGrowPotato} activeOpacity={0.8}>
                                <Text style={alarmStyles.growBtnText}>Grow Your Potato 🥔</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={onStop} activeOpacity={0.6}>
                                <Text style={alarmStyles.doneForNow}>Done for Now</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <RNAnimated.Text style={[alarmStyles.alarmEmoji, { transform: [{ scale: pulseAnim }] }]}>
                                ⏰
                            </RNAnimated.Text>
                            <Text style={alarmStyles.timesUpTitle}>Time's Up!</Text>
                            <Text style={alarmStyles.missionsLeftText}>
                                {missionsLeft} mission{missionsLeft !== 1 ? 's' : ''} left
                            </Text>
                            <TouchableOpacity style={alarmStyles.keepGoingBtn} onPress={onKeepGoing} activeOpacity={0.8}>
                                <Text style={alarmStyles.keepGoingText}>Keep Going</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={alarmStyles.stopBtn} onPress={onStop} activeOpacity={0.6}>
                                <Text style={alarmStyles.stopText}>Stop</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const alarmStyles = StyleSheet.create({
    backdrop: {
        flex:            1,
        backgroundColor: 'rgba(0,0,0,0.95)',
        justifyContent:  'center',
        alignItems:      'center',
    },
    card: {
        backgroundColor:  WHITE,
        borderWidth:      2.5,
        borderColor:      BLACK,
        borderRadius:     28,
        padding:          32,
        marginHorizontal: 24,
        alignItems:       'center',
        width:            SCREEN_W - 48,
    },
    // Congrats flow
    bigEmoji: {
        fontSize: 56,
        marginBottom: 8,
    },
    doneTitle: {
        fontFamily: 'Inter-Bold',
        fontSize:   32,
        color:      BLACK,
        marginBottom: 4,
    },
    doneSub: {
        fontFamily:    'Inter-Medium',
        fontSize:      16,
        color:         '#666',
        textAlign:     'center',
        marginVertical: 12,
    },
    growBtn: {
        backgroundColor: YELLOW,
        borderWidth:     2,
        borderColor:     BLACK,
        borderRadius:    20,
        paddingVertical:   16,
        paddingHorizontal: 32,
        marginTop:       8,
    },
    growBtnText: {
        fontFamily: 'Inter-Bold',
        fontSize:   16,
        color:      BLACK,
    },
    doneForNow: {
        fontFamily:   'Inter-Medium',
        fontSize:     15,
        color:        '#999',
        paddingVertical: 16,
    },
    // Alarm / not done flow
    alarmEmoji: {
        fontSize: 56,
        marginBottom: 4,
    },
    timesUpTitle: {
        fontFamily: 'Inter-Bold',
        fontSize:   36,
        color:      BLACK,
        marginTop:  16,
        marginBottom: 4,
    },
    missionsLeftText: {
        fontFamily: 'Inter-Medium',
        fontSize:   16,
        color:      '#666',
    },
    keepGoingBtn: {
        backgroundColor: YELLOW,
        borderWidth:     2,
        borderColor:     BLACK,
        borderRadius:    50,
        paddingVertical: 18,
        width:           200,
        alignItems:      'center',
        marginTop:       24,
    },
    keepGoingText: {
        fontFamily: 'Inter-Bold',
        fontSize:   20,
        color:      BLACK,
    },
    stopBtn: {
        backgroundColor: 'transparent',
        borderWidth:     2,
        borderColor:     '#CCCCCC',
        borderRadius:    50,
        paddingVertical: 14,
        width:           160,
        alignItems:      'center',
        marginTop:       12,
    },
    stopText: {
        fontFamily: 'Inter-Medium',
        fontSize:   16,
        color:      '#999',
    },
});

// ═══════════════════════════════════════════════
// Journal Screen — Daily Reflection & Gratitude
// ═══════════════════════════════════════════════

export const HuntScreen: React.FC = () => {
    const headerHeight = useHeaderHeight();
    const insets = useSafeAreaInsets();
    const setTimerDisplay = useSetTimerDisplay();
    const setJournalSteps = useSetJournalSteps();
    const isFocused = useIsFocused();
    const { quote: todayQuote } = useDailyQuote();
    const { mood } = useMascotState();

    // Refs for auto-focusing inputs
    const emotionInputRef = useRef<any>(null);
    const huntInputRef = useRef<any>(null);
    const chatScrollRef = useRef<any>(null);

    // ── Chat state (step 3) ──
    const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [ulboThinking, setUlboThinking] = useState(false);
    const [chatInitialized, setChatInitialized] = useState(false);

    // ── Data ──
    const [progress, setProgress] = useState<UserProgress | null>(null);
    const [hunt, setHunt] = useState<DailyHunt | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // ── Prompt ──
    const [dailyPrompt, setDailyPrompt] = useState<GratitudePrompt | null>(null);
    const [mascotIntro, setMascotIntro] = useState('');
    const [huntPlaceholders, setHuntPlaceholders] = useState<string[]>(['', '', '']);

    // ── Inputs ──
    const [huntInputs, setHuntInputs] = useState(['', '', '']);
    const [promptResponse, setPromptResponse] = useState('');
    const [bonusResponse, setBonusResponse] = useState('');
    const [isPromptSaved, setIsPromptSaved] = useState(false);
    const [isBonusSaved, setIsBonusSaved] = useState(false);

    // ── Coach messages ──
    const [coachMsgIndex, setCoachMsgIndex] = useState(0);

    // ── Timer done modal ──
    const [showTimerDone, setShowTimerDone] = useState(false);
    const [potatoGrown, setPotatoGrown] = useState(false);

    // ── Focus Timer ──
    // timerSecs comes from shared context — updates instantly when settings change
    const savedTimerSecs = useTimerSecs();
    const [timerMinutes, setTimerMinutes] = useState(savedTimerSecs / 60);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [timerTotalSeconds, setTimerTotalSeconds] = useState(savedTimerSecs);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Sync timer preset whenever the saved duration changes (only when not running)
    useEffect(() => {
        if (isTimerRunning) return;
        setTimerMinutes(savedTimerSecs / 60);
        setTimerTotalSeconds(savedTimerSecs);
    }, [savedTimerSecs]);

    // ── Emotion step ──
    const [selectedEmotion, setSelectedEmotion] = useState<Emotion | null>(null);
    const [emotionNote, setEmotionNote] = useState('');
    const [emotionSaved, setEmotionSaved] = useState(false);
    const emotionScales      = useRef(Object.fromEntries(EMOTIONS.map(e => [e, new RNAnimated.Value(1)])) as Record<Emotion, RNAnimated.Value>).current;
    const emotionTranslateX  = useRef(Object.fromEntries(EMOTIONS.map(e => [e, new RNAnimated.Value(0)])) as Record<Emotion, RNAnimated.Value>).current;
    const emotionTranslateY  = useRef(Object.fromEntries(EMOTIONS.map(e => [e, new RNAnimated.Value(0)])) as Record<Emotion, RNAnimated.Value>).current;
    const emotionAnimRef     = useRef<RNAnimated.CompositeAnimation | null>(null);

    // ── Gratitude mascot interaction ──
    const gratitudeMascotY = useRef(new RNAnimated.Value(0)).current;
    const gratitudeSquishX = useRef(new RNAnimated.Value(1)).current;
    const gratitudeSquishY = useRef(new RNAnimated.Value(1)).current;
    const mascotJumpRef    = useRef<RNAnimated.CompositeAnimation | null>(null);

    // ── Step flow ──
    const [activeStep, setActiveStep] = useState(0);
    const [reflectionPermSaved, setReflectionPermSaved] = useState(false);

    // ── Today's Reflection (journal writing) ──
    const [reflectionText, setReflectionText] = useState('');

    // ── Spirit (AI) Modal ──
    const [spiritVisible, setSpiritVisible] = useState(false);
    const [spiritLoading, setSpiritLoading] = useState(false);
    const [spiritData, setSpiritData] = useState<{ reply: string; mood: number; tags: string[]; followUp?: string } | null>(null);

    // ── Voice sheet ──
    type VoiceTarget = 'hunt' | 'prompt' | 'reflection' | 'bonus';
    const [voiceTarget, setVoiceTarget] = useState<VoiceTarget | null>(null);

    // ── XP Toast ──
    const [xpToast, setXpToast] = useState<{
        amount: number;
        label?: string;
        leveledUp?: boolean;
        newLevelTitle?: string;
    } | null>(null);

    // ── Timer logic ──
    const startTimer = useCallback(() => {
        if (timerTotalSeconds <= 0) return;
        setIsTimerRunning(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, [timerTotalSeconds]);

    const pauseTimer = useCallback(() => {
        setIsTimerRunning(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, []);

    const setTimerPreset = useCallback((minutes: number) => {
        setTimerMinutes(minutes);
        setTimerTotalSeconds(minutes * 60);
        setIsTimerRunning(false);
        Haptics.selectionAsync();
    }, []);

    useEffect(() => {
        if (isTimerRunning && timerTotalSeconds > 0) {
            timerRef.current = setInterval(() => {
                setTimerTotalSeconds(prev => {
                    if (prev <= 1) {
                        setIsTimerRunning(false);
                        setShowTimerDone(true);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 350);
                        setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 700);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isTimerRunning]);

    // Derive display from timerTotalSeconds
    const displayMinutes = Math.floor(timerTotalSeconds / 60);
    const displaySeconds = timerTotalSeconds % 60;
    const timerProgress = timerMinutes > 0 ? 1 - (timerTotalSeconds / (timerMinutes * 60)) : 0;

    // ── Derived (declared early so useFocusEffect can reference isHuntDone) ──
    const huntCount = hunt?.entries?.length || 0;
    const isHuntDone = hunt?.completed || false;

    // Sync journal step dots into AppHeader — only when this tab is focused
    useEffect(() => {
        if (!isFocused) {
            setJournalSteps(null);
            return;
        }
        setJournalSteps({
            labels: STEP_LABELS,
            activeStep,
            onStepPress: (i: number) => setActiveStep(i),
        });
        return () => setJournalSteps(null);
    }, [activeStep, isFocused, setJournalSteps]);

    // Auto-focus relevant input when arriving on this tab
    useFocusEffect(
        useCallback(() => {
            if (activeStep === 0) {
                const timer = setTimeout(() => emotionInputRef.current?.focus(), 400);
                return () => clearTimeout(timer);
            }
            if (activeStep === 1 && !isHuntDone) {
                const timer = setTimeout(() => huntInputRef.current?.focus(), 300);
                return () => clearTimeout(timer);
            }
        }, [activeStep, isHuntDone])
    );

    // Sync timer into AppHeader context (used by other tabs if navigated away)
    useEffect(() => {
        setTimerDisplay({
            text: `${String(displayMinutes).padStart(2, '0')}:${String(displaySeconds).padStart(2, '0')}`,
            progress: timerProgress,
            isRunning: isTimerRunning,
            onPress: isTimerRunning ? pauseTimer : startTimer,
        });
        return () => setTimerDisplay(null);
    }, [displayMinutes, displaySeconds, timerProgress, isTimerRunning, startTimer, pauseTimer, setTimerDisplay]);

    // ── Load ──
    const loadData = useCallback(async () => {
        try {
            const [p, h] = await Promise.all([loadProgress(), loadDailyHunt()]);
            setProgress(p);
            setHunt(h);

            if (h.entries.length > 0) {
                const filled = ['', '', ''];
                h.entries.forEach((e, i) => { if (i < 3) filled[i] = e.text; });
                setHuntInputs(filled);
            }

            if (h.completed) {
                setActiveStep(prev => Math.max(prev, 2));
            }

            const prompt = await selectDailyPrompt(mood, 10);
            setDailyPrompt(prompt);
            setMascotIntro(getMascotIntro(prompt.category));

            // Pick 3 random placeholders
            const shuffled = [...HUNT_PLACEHOLDERS].sort(() => 0.5 - Math.random());
            setHuntPlaceholders(shuffled.slice(0, 3));

        } catch (e) {
            console.error('[JournalScreen] Error:', e);
        } finally {
            setIsLoading(false);
        }
    }, [mood]);

    useEffect(() => { loadData(); }, [loadData]);

    const huntStatus: QuestStatus = isHuntDone ? 'done' : huntCount > 0 ? 'in-progress' : 'todo';
    const promptStatus: QuestStatus = isPromptSaved ? 'done' : 'todo';
    const bonusStatus: QuestStatus = isBonusSaved ? 'done' : 'todo';

    // ── Handlers ──

    // Emotion-specific animations on selection
    useEffect(() => {
        // Stop & reset all
        emotionAnimRef.current?.stop();
        EMOTIONS.forEach(e => {
            emotionScales[e].setValue(1);
            emotionTranslateX[e].setValue(0);
            emotionTranslateY[e].setValue(0);
        });
        if (!selectedEmotion) return;

        // Scale pop for the selected one
        RNAnimated.spring(emotionScales[selectedEmotion], {
            toValue: 1.15, useNativeDriver: true, friction: 4, tension: 220,
        }).start();

        let anim: RNAnimated.CompositeAnimation | null = null;
        const tx = emotionTranslateX[selectedEmotion];
        const ty = emotionTranslateY[selectedEmotion];

        if (selectedEmotion === 'happy') {
            // Cheerful bounce jump
            anim = RNAnimated.loop(RNAnimated.sequence([
                RNAnimated.timing(ty, { toValue: -14, duration: 180, useNativeDriver: true }),
                RNAnimated.timing(ty, { toValue: 0,   duration: 180, useNativeDriver: true }),
                RNAnimated.timing(ty, { toValue: -8,  duration: 130, useNativeDriver: true }),
                RNAnimated.timing(ty, { toValue: 0,   duration: 130, useNativeDriver: true }),
                RNAnimated.delay(1500),
            ]));
        } else if (selectedEmotion === 'upset') {
            // Angry rapid shake
            anim = RNAnimated.loop(RNAnimated.sequence([
                RNAnimated.timing(tx, { toValue: -7,  duration: 45, useNativeDriver: true }),
                RNAnimated.timing(tx, { toValue: 7,   duration: 45, useNativeDriver: true }),
                RNAnimated.timing(tx, { toValue: -7,  duration: 45, useNativeDriver: true }),
                RNAnimated.timing(tx, { toValue: 7,   duration: 45, useNativeDriver: true }),
                RNAnimated.timing(tx, { toValue: -5,  duration: 45, useNativeDriver: true }),
                RNAnimated.timing(tx, { toValue: 0,   duration: 45, useNativeDriver: true }),
                RNAnimated.delay(2100),
            ]));
        } else if (selectedEmotion === 'sad') {
            // Slow heavy droop and sway
            anim = RNAnimated.loop(RNAnimated.sequence([
                RNAnimated.timing(ty, { toValue: 6,  duration: 900, useNativeDriver: true }),
                RNAnimated.timing(ty, { toValue: 0,  duration: 900, useNativeDriver: true }),
                RNAnimated.delay(1800),
            ]));
        }
        // bored: just the scale pop, no motion

        if (anim) {
            emotionAnimRef.current = anim;
            anim.start();
        }
    }, [selectedEmotion]);

    const triggerMascotJump = useCallback(() => {
        mascotJumpRef.current?.stop();
        gratitudeMascotY.setValue(0);
        gratitudeSquishX.setValue(1);
        gratitudeSquishY.setValue(1);

        const phaseA = RNAnimated.sequence([
            RNAnimated.parallel([
                RNAnimated.timing(gratitudeSquishY, { toValue: 0.72, duration: 55, useNativeDriver: true }),
                RNAnimated.timing(gratitudeSquishX, { toValue: 1.28, duration: 55, useNativeDriver: true }),
            ]),
            RNAnimated.parallel([
                RNAnimated.timing(gratitudeMascotY, { toValue: -80, duration: 165, useNativeDriver: true }),
                RNAnimated.timing(gratitudeSquishY, { toValue: 1.06, duration: 120, useNativeDriver: true }),
                RNAnimated.timing(gratitudeSquishX, { toValue: 0.94, duration: 120, useNativeDriver: true }),
            ]),
        ]);
        mascotJumpRef.current = phaseA;

        phaseA.start(({ finished }) => {
            if (!finished) return;
            RNAnimated.sequence([
                RNAnimated.spring(gratitudeMascotY, { toValue: 0, tension: 220, friction: 7, useNativeDriver: true }),
                RNAnimated.parallel([
                    RNAnimated.timing(gratitudeSquishY, { toValue: 0.76, duration: 50, useNativeDriver: true }),
                    RNAnimated.timing(gratitudeSquishX, { toValue: 1.24, duration: 50, useNativeDriver: true }),
                ]),
                RNAnimated.parallel([
                    RNAnimated.spring(gratitudeSquishY, { toValue: 1, tension: 220, friction: 8, useNativeDriver: true }),
                    RNAnimated.spring(gratitudeSquishX, { toValue: 1, tension: 220, friction: 8, useNativeDriver: true }),
                ]),
            ]).start();
        });
    }, [gratitudeMascotY, gratitudeSquishX, gratitudeSquishY]);

    const handleMascotTap = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        triggerMascotJump();
    }, [triggerMascotJump]);

    const handleSaveEmotion = useCallback(async () => {
        if (!selectedEmotion) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (emotionNote.trim()) {
            await saveJournalEntry({
                id: generateJournalId(),
                quoteId: -1,
                quoteText: '',
                response: emotionNote.trim(),
                createdAt: Date.now(),
                date: getTodayDateString(),
                sentimentTags: ['emotion_check', selectedEmotion],
            });
        }
        setEmotionSaved(true);
        setActiveStep(prev => Math.max(prev, 1));
    }, [selectedEmotion, emotionNote]);

    const handleAddEntry = useCallback(async (index: number) => {
        const text = huntInputs[index]?.trim();
        if (!text || !hunt || index < huntCount) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const updated = await addHuntEntry(text, hunt);
        if (!updated) return;

        setHunt(updated);
        trackEvent('hunt_entry_added', { entry_number: updated.entries?.length || 0 });
        triggerMascotJump();

        if (updated.entries?.length >= 3 && !updated.xpAwarded && progress) {
            const done = { ...updated, xpAwarded: true };
            await saveDailyHunt(done);
            setHunt(done);

            const result = await awardXP('completeHunt', progress);
            setProgress(result.progress);
            if (result.xpGained > 0) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setXpToast({
                    amount: result.xpGained,
                    label: 'Hunt complete',
                    leveledUp: result.leveledUp,
                    newLevelTitle: result.leveledUp ? LEVEL_TIERS.find(t => t.level === result.progress.level)?.title : undefined,
                });
            }
            setTimeout(() => setActiveStep(prev => Math.max(prev, 2)), 700);
        }
    }, [huntInputs, hunt, huntCount, progress, triggerMascotJump]);

    const handleSavePrompt = useCallback(async () => {
        if (!dailyPrompt || !promptResponse.trim()) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const text = promptResponse.trim();
        const entryId = generateJournalId();
        await saveJournalEntry({
            id: entryId,
            quoteId: todayQuote.id,
            quoteText: dailyPrompt.text,
            response: text,
            createdAt: Date.now(),
            date: getTodayDateString(),
            sentimentTags: ['gratitude', 'prompt_response'],
        });
        await recordPromptUsage(dailyPrompt);
        setIsPromptSaved(true);
        Keyboard.dismiss();
        setTimeout(() => setActiveStep(prev => Math.max(prev, 2)), 700);

        // Show Ulbo's real-time AI response
        setSpiritVisible(true);
        setSpiritLoading(true);
        setSpiritData(null);
        const name = await AsyncStorage.getItem('@ulbo_user_name') || 'Friend';
        analyzeJournalEntry(text, name)
            .then(async (analysis) => {
                const result = analysis ?? SPIRIT_FALLBACK(name);
                setSpiritData(result);
                if (analysis) await updateEntryWithAI(entryId, analysis);
            })
            .catch(() => setSpiritData(SPIRIT_FALLBACK(name)))
            .finally(() => setSpiritLoading(false));

        if (progress) {
            const result = await awardXP('writeReflection', progress);
            setProgress(result.progress);
            if (result.xpGained > 0) {
                setXpToast({ amount: result.xpGained, label: 'Journal saved', leveledUp: result.leveledUp, newLevelTitle: result.leveledUp ? LEVEL_TIERS.find(t => t.level === result.progress.level)?.title : undefined });
            }
        }
    }, [dailyPrompt, promptResponse, todayQuote, progress]);

    const handleSaveBonus = useCallback(async () => {
        if (!bonusResponse.trim()) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        await saveJournalEntry({
            id: generateJournalId(),
            quoteId: todayQuote.id,
            quoteText: todayQuote.text,
            response: bonusResponse.trim(),
            createdAt: Date.now(),
            date: getTodayDateString(),
            sentimentTags: ['reflection', 'bonus'],
        });
        setIsBonusSaved(true);
        Keyboard.dismiss();

        if (progress) {
            const result = await awardXP('readQuote', progress);
            setProgress(result.progress);
            if (result.xpGained > 0) {
                setXpToast({ amount: result.xpGained, label: 'Saved', leveledUp: result.leveledUp, newLevelTitle: result.leveledUp ? LEVEL_TIERS.find(t => t.level === result.progress.level)?.title : undefined });
            }
        }
    }, [bonusResponse, todayQuote, progress]);

    // ── Save today's reflection ──
    const handleSaveReflection = useCallback(async () => {
        const text = reflectionText.trim();
        if (text.length < 3) return;

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const entryId = generateJournalId();
        await saveJournalEntry({
            id: entryId,
            quoteId: todayQuote.id,
            quoteText: todayQuote.text,
            response: text,
            createdAt: Date.now(),
            date: getTodayDateString(),
            sentimentTags: ['reflection', 'daily'],
        });
        setReflectionText('');
        setReflectionPermSaved(true);
        Keyboard.dismiss();
        setTimeout(() => setActiveStep(prev => Math.max(prev, 3)), 700);

        // Show Ulbo's real-time AI response
        setSpiritVisible(true);
        setSpiritLoading(true);
        setSpiritData(null);
        const name = await AsyncStorage.getItem('@ulbo_user_name') || 'Friend';
        analyzeJournalEntry(text, name)
            .then(async (analysis) => {
                const result = analysis ?? SPIRIT_FALLBACK(name);
                setSpiritData(result);
                if (analysis) await updateEntryWithAI(entryId, analysis);
            })
            .catch(() => setSpiritData(SPIRIT_FALLBACK(name)))
            .finally(() => setSpiritLoading(false));

        if (progress) {
            const result = await awardXP('writeReflection', progress);
            setProgress(result.progress);
            if (result.xpGained > 0) {
                setXpToast({ amount: result.xpGained, label: 'Reflection saved', leveledUp: result.leveledUp, newLevelTitle: result.leveledUp ? LEVEL_TIERS.find(t => t.level === result.progress.level)?.title : undefined });
            }
        }
        trackEvent('reflection_written', { source: 'journal_page', word_count: text.split(/\s+/).filter(Boolean).length });
    }, [reflectionText, todayQuote, progress]);

    // ── Voice transcription callback ──
    const handleVoiceTranscription = useCallback((text: string) => {
        if (!voiceTarget) return;
        if (voiceTarget === 'hunt') {
            const nextEmpty = huntInputs.findIndex(v => !v.trim());
            if (nextEmpty !== -1) updateInput(nextEmpty, text);
        } else if (voiceTarget === 'prompt') {
            setPromptResponse(prev => prev ? `${prev} ${text}` : text);
        } else if (voiceTarget === 'reflection') {
            setReflectionText(prev => prev ? `${prev} ${text}` : text);
        } else if (voiceTarget === 'bonus') {
            setBonusResponse(prev => prev ? `${prev} ${text}` : text);
        }
        setVoiceTarget(null);
    }, [voiceTarget, huntInputs]);

    const handleShufflePrompt = useCallback(async () => {
        if (!dailyPrompt) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // exclude current
        const newPrompt = await selectDailyPrompt(mood, 10, [dailyPrompt.id]);
        setDailyPrompt(newPrompt);
    }, [dailyPrompt, mood]);

    const updateInput = (i: number, text: string) => {
        setHuntInputs(prev => { const n = [...prev]; n[i] = text; return n; });
    };

    const canSaveReflection = reflectionText.trim().length >= 3;
    const reflectionWordCount = reflectionText.trim().split(/\s+/).filter(Boolean).length;

    // ── Animated square card when typing (RNAnimated = JS thread → flex recalculates) ──
    const CARD_W = SCREEN_W - 32;
    const reflectCardHeight = SCREEN_H - (headerHeight || 80) - (62 + insets.bottom) - 8;
    const cardH = useRef(new RNAnimated.Value(reflectCardHeight)).current;
    const cardHStyle = { height: cardH };
    const kbOpen = useRef(false);
    const reflectCardHRef = useRef(reflectCardHeight);
    const headerHeightRef = useRef(headerHeight);
    const outerScrollRef = useRef<any>(null);
    useEffect(() => {
        reflectCardHRef.current = reflectCardHeight;
        headerHeightRef.current = headerHeight;
        if (!kbOpen.current) cardH.setValue(reflectCardHeight);
    }, [reflectCardHeight, headerHeight]);
    // Lock scroll + snap to card top immediately on focus — before Android auto-scrolls
    const handleInputFocus = useCallback(() => {
        outerScrollRef.current?.scrollTo({ y: 0, animated: false });
    }, []);
    useEffect(() => {
        const show = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (e) => {
                kbOpen.current = true;
                outerScrollRef.current?.scrollTo({ y: 0, animated: false });
                // Cap at actual available space so bottom buttons are never clipped
                // Android adds extra margin to account for keyboard toolbar (emoji bar etc.)
                const kbH = e.endCoordinates.height;
                const hh = headerHeightRef.current || 80;
                const safetyMargin = Platform.OS === 'android' ? 56 : 8;
                const availH = SCREEN_H - kbH - hh - safetyMargin;
                const target = Math.min(CARD_W, availH);
                RNAnimated.timing(cardH, { toValue: target, duration: 300, useNativeDriver: false }).start();
            }
        );
        const hide = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => {
                kbOpen.current = false;
                RNAnimated.timing(cardH, { toValue: reflectCardHRef.current, duration: 300, useNativeDriver: false }).start();
            }
        );
        return () => { show.remove(); hide.remove(); };
    }, []);

    // ── Chat (step 3) init — pre-seeded exchange, no AI needed ──
    useEffect(() => {
        if (activeStep !== 3 || chatInitialized || !todayQuote.text) return;
        setChatInitialized(true);
        const authorLine = todayQuote.author ? `\n— ${todayQuote.author}` : '';
        setChatMessages([
            { id: 'user-0', role: 'user', text: 'Hey Ulbo, what wisdom do you have for me today?' },
            { id: 'ulbo-0', role: 'ulbo', text: `"${todayQuote.text}"${authorLine}` },
            { id: 'ulbo-1', role: 'ulbo', text: 'sit with that for a moment. what does it stir up in you?' },
        ]);
    }, [activeStep, chatInitialized, todayQuote.text]);

    // ── Send user message & get Ulbo reply ──
    const handleSendChat = useCallback(async () => {
        const text = chatInput.trim();
        if (!text || ulboThinking) return;
        setChatInput('');
        const userMsg: ChatMsg = { id: `u-${Date.now()}`, role: 'user', text };
        const updatedMessages = [...chatMessages, userMsg];
        setChatMessages(updatedMessages);
        setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);

        setUlboThinking(true);
        const name = await AsyncStorage.getItem('@ulbo_user_name') || 'Friend';
        try {
            // Build memory context for richer responses
            const memory = await buildMemoryContext();
            const memoryPayload = {
                mood_trend: memory.mood.trend,
                dominant_mood: memory.mood.dominantMood,
                streak: memory.mood.currentStreak,
                dominant_themes: memory.journal.dominantThemes,
                sentiment: memory.journal.averageSentiment,
                days_since_last_entry: memory.journal.daysSinceLastEntry,
            };

            // Send full conversation + quote + memory to dedicated chat-ulbo edge function
            const res = await chatWithUlbo(
                updatedMessages.map(m => ({ role: m.role, text: m.text })),
                name,
                { text: todayQuote.text, author: todayQuote.author },
                memoryPayload
            );
            const reply = res?.reply || ULBO_FALLBACKS[Math.floor(Math.random() * ULBO_FALLBACKS.length)];
            setChatMessages(prev => [...prev, { id: `ulbo-${Date.now()}`, role: 'ulbo', text: reply }]);
        } catch {
            setChatMessages(prev => [...prev, {
                id: `ulbo-${Date.now()}`, role: 'ulbo',
                text: ULBO_FALLBACKS[Math.floor(Math.random() * ULBO_FALLBACKS.length)],
            }]);
        } finally {
            setUlboThinking(false);
            setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
        }

        // Award XP on first real reply
        if (!isBonusSaved && progress) {
            const result = await awardXP('readQuote', progress);
            setProgress(result.progress);
            if (result.xpGained > 0) {
                setXpToast({ amount: result.xpGained, label: 'Chat saved', leveledUp: result.leveledUp });
            }
            setIsBonusSaved(true);
        }
    }, [chatInput, chatMessages, ulboThinking, isBonusSaved, progress, todayQuote]);

    // ── Grow Potato handler ──
    const handleGrowPotato = useCallback(async () => {
        if (!progress) return;
        const result = await awardXP('completeHunt', progress);
        setProgress(result.progress);
        if (result.xpGained > 0) {
            setXpToast({
                amount: result.xpGained,
                label: 'Potato grown!',
                leveledUp: result.leveledUp,
                newLevelTitle: result.leveledUp
                    ? LEVEL_TIERS.find(t => t.level === result.progress.level)?.title
                    : undefined,
            });
        }
        setShowTimerDone(false);
        setPotatoGrown(true);
    }, [progress]);

    // ═══════════ LOADING ═══════════

    if (isLoading) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="large" color={YELLOW} />
                </View>
            </View>
        );
    }

    // ═══════════ RENDER ═══════════

    return (
        <View style={styles.container}>

            {/* ─── Alarm Overlay ─── */}
            <AlarmOverlay
                visible={showTimerDone}
                allTasksDone={isHuntDone}
                missionsLeft={isHuntDone ? 0 : 1}
                onKeepGoing={() => { setShowTimerDone(false); setTimerPreset(timerMinutes); }}
                onStop={() => setShowTimerDone(false)}
                onGrowPotato={handleGrowPotato}
            />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={0}
            >
                <ScrollView
                    ref={outerScrollRef}
                    contentContainerStyle={[
                        styles.scroll,
                        { paddingTop: headerHeight || 12 },
                        activeStep === 3 && { paddingBottom: 0 },
                    ]}
                    scrollEnabled={false}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* ─── Step 0: Emotion Check-In ─── */}
                    {activeStep === 0 && (
                        <RNAnimated.View style={cardHStyle}>
                        <Animated.View entering={FadeInDown.duration(400)} style={[styles.reflectCard, { flex: 1 }]}>
                            {/* Top section */}
                            <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 }}>
                                <Text style={styles.emotionTitle}>HOW DO YOU FEEL TODAY?</Text>
                                <View style={styles.emotionRow}>
                                    {EMOTIONS.map(emotion => (
                                        <Pressable
                                            key={emotion}
                                            onPress={() => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                                setSelectedEmotion(emotion);
                                            }}
                                            style={styles.emotionBtn}
                                        >
                                            <RNAnimated.View style={{
                                                transform: [
                                                    { scale: emotionScales[emotion] },
                                                    { translateX: emotionTranslateX[emotion] },
                                                    { translateY: emotionTranslateY[emotion] },
                                                ],
                                            }}>
                                                <Image
                                                    source={
                                                        selectedEmotion === emotion
                                                            ? EMOTION_IMAGES[emotion].selected
                                                            : EMOTION_IMAGES[emotion].unselected
                                                    }
                                                    style={styles.emotionImg}
                                                    resizeMode="contain"
                                                />
                                            </RNAnimated.View>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>
                            <View style={styles.reflectDivider} />
                            <ScrollView
                                style={{ flex: 1, paddingHorizontal: 20, paddingTop: 12 }}
                                showsVerticalScrollIndicator
                                scrollIndicatorInsets={{ right: 1 }}
                                keyboardShouldPersistTaps="handled"
                                nestedScrollEnabled
                            >
                                <RNTextInput
                                    ref={emotionInputRef}
                                    style={styles.emotionInput}
                                    placeholder="What's on your mind?"
                                    placeholderTextColor="#AAAAAA"
                                    multiline
                                    scrollEnabled={false}
                                    value={emotionNote}
                                    onChangeText={setEmotionNote}
                                    textAlignVertical="top"
                                    onFocus={handleInputFocus}
                                />
                            </ScrollView>
                            {selectedEmotion && (
                                <Animated.View entering={FadeIn}>
                                    <View style={styles.reflectDivider} />
                                    <Pressable
                                        style={({ pressed }) => [
                                            styles.reflectSaveBtn,
                                            pressed && { backgroundColor: YELLOW },
                                        ]}
                                        onPress={handleSaveEmotion}
                                    >
                                        <Text style={styles.reflectSaveBtnText}>SAVE TO JOURNAL</Text>
                                    </Pressable>
                                </Animated.View>
                            )}
                        </Animated.View>
                        </RNAnimated.View>
                    )}

                    {/* ─── Step 1: Find 3 Good Things ─── */}
                    {activeStep === 1 && (
                        <RNAnimated.View style={cardHStyle}>
                        <Animated.View entering={FadeInDown.duration(400)} style={[styles.contentCard, { flex: 1, overflow: 'hidden' }]}>
                            {/* Header row: title + counter */}
                            <View style={styles.gratitudeHeader}>
                                <Text style={styles.gratitudeTitle}>TODAY'S GRATITUDE</Text>
                                <Text style={styles.gratitudeCounter}>
                                    <Text style={styles.gratitudeCountNum}>{huntCount}</Text>
                                    <Text style={styles.gratitudeCountTotal}>/3</Text>
                                </Text>
                            </View>
                            <View style={styles.gratitudeDivider} />

                            {/* Entry rows */}
                            {[0, 1, 2].map(i => {
                                const filled = i < huntCount;
                                const current = i === huntCount && !isHuntDone;
                                const locked = i > huntCount;
                                return (
                                    <View key={i}>
                                        <View style={styles.gratitudeRow}>
                                            {/* Arrow icon */}
                                            <ArrowRightIcon
                                                color={locked ? '#CCCCCC' : filled ? BLACK : BLACK}
                                                size={18}
                                            />
                                            {filled ? (
                                                <Text style={styles.gratitudeFilled}>
                                                    {huntInputs[i] || hunt?.entries[i]?.text}
                                                </Text>
                                            ) : current ? (
                                                <>
                                                    <RNTextInput
                                                        ref={i === huntCount ? huntInputRef : undefined}
                                                        style={styles.gratitudeInput}
                                                        placeholder={huntPlaceholders[i] || 'Something good today...'}
                                                        placeholderTextColor="#AAAAAA"
                                                        value={huntInputs[i]}
                                                        onChangeText={t => updateInput(i, t)}
                                                        onSubmitEditing={() => handleAddEntry(i)}
                                                        returnKeyType="done"
                                                    />
                                                    <TouchableOpacity
                                                        onPress={() => handleAddEntry(i)}
                                                        disabled={!huntInputs[i]?.trim()}
                                                        style={[styles.sendBtn, !huntInputs[i]?.trim() && styles.sendBtnDisabled]}
                                                        activeOpacity={0.7}
                                                    >
                                                        <SendIcon color={huntInputs[i]?.trim() ? BLACK : '#AAAAAA'} size={16} />
                                                    </TouchableOpacity>
                                                </>
                                            ) : (
                                                <Text style={styles.gratitudeLocked}>
                                                    {locked ? 'Add one more thing...' : ''}
                                                </Text>
                                            )}
                                        </View>
                                        {i < 2 && <View style={styles.gratitudeDivider} />}
                                    </View>
                                );
                            })}

                            {isHuntDone && (
                                <Animated.View entering={FadeIn.delay(200)} style={styles.completionMsg}>
                                    <SparkleIcon color={BLACK} size={18} />
                                    <Text style={styles.completionText}>You found the good things today</Text>
                                </Animated.View>
                            )}
                            {/* Potato mascot — bottom right, tappable */}
                            {progress && (
                                <TouchableOpacity
                                    style={styles.gratitudeMascotWrap}
                                    onPress={handleMascotTap}
                                    activeOpacity={0.9}
                                >
                                    <RNAnimated.View style={{
                                        transform: [
                                            { translateY: gratitudeMascotY },
                                            { scaleX: gratitudeSquishX },
                                            { scaleY: gratitudeSquishY },
                                        ],
                                    }}>
                                        <Image
                                            source={POTATO_IMAGES[Math.min(Math.max(progress.level, 1), 9)]}
                                            style={styles.gratitudeMascot}
                                            resizeMode="contain"
                                        />
                                    </RNAnimated.View>
                                </TouchableOpacity>
                            )}
                        </Animated.View>
                        </RNAnimated.View>
                    )}


                    {/* ─── Step 2: Reflect ─── */}
                    {activeStep === 2 && (
                        <RNAnimated.View style={cardHStyle}>
                        <Animated.View entering={FadeInDown.duration(400)} style={[styles.reflectCard, { flex: 1 }]}>
                            {reflectionPermSaved ? (
                                /* ── Saved state ── */
                                <Animated.View entering={FadeIn} style={styles.reflectSavedWrap}>
                                    <Image source={chatPotatoIcon} style={{ width: 64, height: 64 }} resizeMode="contain" />
                                    <Text style={styles.reflectSavedTitle}>Beautiful reflection!</Text>
                                    <Text style={styles.reflectSavedSub}>Saved to your history</Text>
                                    <TouchableOpacity onPress={() => setReflectionPermSaved(false)} style={styles.writeAgainBtn} activeOpacity={0.6}>
                                        <Text style={styles.writeAgainText}>Write another</Text>
                                    </TouchableOpacity>
                                </Animated.View>
                            ) : (
                                <>
                                    {/* ── Question header ── */}
                                    <View style={styles.reflectHeader}>
                                        <Text style={styles.reflectQNum}>01</Text>
                                        <Text style={styles.reflectQuestion}>
                                            {dailyPrompt?.text ?? "What's on your mind? What does this quote stir up for you?"}
                                        </Text>
                                    </View>

                                    {/* ── Divider ── */}
                                    <View style={styles.reflectDivider} />

                                    {/* ── Input area ── */}
                                    <View style={styles.reflectInputWrap}>
                                        <RNTextInput
                                            style={styles.reflectInput}
                                            placeholder="What's on your mind? What does this quote stir up for you?"
                                            placeholderTextColor="#AAAAAA"
                                            multiline
                                            scrollEnabled
                                            value={reflectionText}
                                            onChangeText={setReflectionText}
                                            textAlignVertical="top"
                                            onFocus={handleInputFocus}
                                        />
                                        {/* Chat potato — voice button */}
                                        <TouchableOpacity
                                            style={styles.reflectVoiceBtn}
                                            onPress={() => setVoiceTarget('reflection')}
                                            activeOpacity={0.7}
                                        >
                                            <Image source={chatModePotatoIcon} style={styles.reflectVoiceIcon} resizeMode="contain" />
                                        </TouchableOpacity>
                                    </View>

                                    {/* ── Divider + Save button ── */}
                                    <View style={styles.reflectDivider} />
                                    <Pressable
                                        style={({ pressed }) => [
                                            styles.reflectSaveBtn,
                                            !canSaveReflection && { opacity: 0.35 },
                                            pressed && canSaveReflection && { backgroundColor: YELLOW },
                                        ]}
                                        onPress={handleSaveReflection}
                                        disabled={!canSaveReflection}
                                    >
                                        <Text style={styles.reflectSaveBtnText}>SAVE TO JOURNAL</Text>
                                    </Pressable>
                                </>
                            )}
                        </Animated.View>
                        </RNAnimated.View>
                    )}

                    {/* ─── Step 3: Quote Chat ─── */}
                    {activeStep === 3 && ((): React.ReactElement => {
                        const level = Math.min(Math.max(progress?.level ?? 1, 1), 9);
                        const levelPotato = POTATO_IMAGES[level];
                        return (
                            <RNAnimated.View style={cardHStyle}>
                            <Animated.View entering={FadeInDown.duration(400)} style={[styles.reflectCard, { flex: 1 }]}>
                                {/* Header */}
                                <View style={styles.reflectHeader}>
                                    <Text style={styles.reflectQuestion}>reflect with ulbo on today's wisdom</Text>
                                </View>
                                <View style={styles.reflectDivider} />

                                {/* Scrollable chat messages */}
                                <ScrollView
                                    ref={chatScrollRef}
                                    style={styles.chatArea}
                                    contentContainerStyle={styles.chatContent}
                                    showsVerticalScrollIndicator={true}
                                    scrollIndicatorInsets={{ right: 1 }}
                                    keyboardShouldPersistTaps="handled"
                                    nestedScrollEnabled={true}
                                    onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
                                >
                                    {chatMessages.map(msg => (
                                        msg.role === 'user' ? (
                                            <View key={msg.id} style={styles.chatRowRight}>
                                                <AnimatedAvatar source={levelPotato} />
                                                <View style={styles.chatBubbleRight}>
                                                    <Text style={styles.chatBubbleRightText}>{msg.text}</Text>
                                                </View>
                                            </View>
                                        ) : (
                                            <View key={msg.id} style={styles.chatRowLeft}>
                                                <AnimatedAvatar source={chatPotatoIcon} />
                                                <View style={styles.chatBubbleLeft}>
                                                    <Text style={styles.chatBubbleLeftText}>{msg.text}</Text>
                                                </View>
                                            </View>
                                        )
                                    ))}

                                    {/* Typing indicator */}
                                    {ulboThinking && (
                                        <View style={styles.chatRowLeft}>
                                            <AnimatedAvatar source={chatPotatoIcon} />
                                            <View style={styles.chatBubbleLeft}>
                                                <TypingDots />
                                            </View>
                                        </View>
                                    )}
                                </ScrollView>

                                {/* Input bar */}
                                <View style={styles.reflectDivider} />
                                <View style={styles.chatInputRow}>
                                    <RNTextInput
                                        style={styles.chatInput}
                                        placeholder="Message Ulbo..."
                                        placeholderTextColor="#AAAAAA"
                                        multiline
                                        value={chatInput}
                                        onChangeText={setChatInput}
                                        textAlignVertical="top"
                                        returnKeyType="send"
                                        onSubmitEditing={handleSendChat}
                                        blurOnSubmit={false}
                                        onFocus={handleInputFocus}
                                    />
                                    <TouchableOpacity
                                        style={[styles.chatSendBtn, chatInput.trim() && styles.chatSendBtnActive]}
                                        onPress={chatInput.trim() ? handleSendChat : () => setVoiceTarget('bonus')}
                                        activeOpacity={0.7}
                                        disabled={ulboThinking}
                                    >
                                        {chatInput.trim() ? (
                                            <SendArrowIcon color={BLACK} size={20} />
                                        ) : (
                                            <Image source={textPotatoIcon} style={styles.chatSendIcon} resizeMode="contain" />
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </Animated.View>
                            </RNAnimated.View>
                        );
                    })() as React.ReactElement}

                    <View style={{ height: 40 }} />

                </ScrollView>
            </KeyboardAvoidingView>

            {/* XP Toast — subtle overlay */}
            <XPToast
                xpAmount={xpToast?.amount ?? 0}
                label={xpToast?.label}
                leveledUp={xpToast?.leveledUp}
                newLevelTitle={xpToast?.newLevelTitle}
                visible={!!xpToast}
                onDismiss={() => setXpToast(null)}
            />

            {/* Voice recording sheet */}
            <VoiceSheet
                visible={voiceTarget !== null}
                onDismiss={() => setVoiceTarget(null)}
                onTranscriptionComplete={handleVoiceTranscription}
                maxSeconds={120}
            />

            {/* Ulbo's real-time AI response */}
            <SpiritResponseModal
                visible={spiritVisible}
                onClose={() => { setSpiritVisible(false); setSpiritData(null); }}
                loading={spiritLoading}
                data={spiritData}
                level={progress?.level ?? 1}
            />
        </View>
    );
};

// ═══════════════════════════════════════════════
// Styles — Soft UI, Minimalist, Purposeful
// ═══════════════════════════════════════════════

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: BLACK,
    },
    scroll: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 120,
    },
    // ── Emotion Step ──
    emotionTitle: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 25,
        color: BLACK,
        marginBottom: 12,
        letterSpacing: 0.3,
    },
    emotionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    emotionBtn: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 4,
    },
    emotionImg: {
        width: 64,
        height: 64,
    },
    emotionDivider: {
        height: 2,
        backgroundColor: BLACK,
        marginBottom: 16,
    },
    emotionInput: {
        fontFamily: 'Inter-Medium',
        fontSize: 16,
        color: BLACK,
        minHeight: 80,
        paddingTop: 4,
        paddingBottom: 16,
        lineHeight: 24,
        textAlignVertical: 'top',
    },

    contentCard: {
        backgroundColor: WHITE,
        borderWidth: 2,
        borderColor: BLACK,
        borderRadius: 20,
        padding: 20,
        minHeight: 260,
    },
    contentTitle: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 25,
        color: BLACK,
        marginBottom: 20,
    },
    loadingWrap: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // ── Timer + Step Card ──
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 16,
        paddingHorizontal: 8,
        paddingVertical: 4,
        gap: 16,
    },
    stepTrack: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    stepDotWrap: {
        alignItems: 'center',
        gap: 5,
        paddingVertical: 4,
        paddingHorizontal: 6,
    },
    stepDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#DDDDDD',
    },
    stepDotActive: {
        backgroundColor: YELLOW,
        width: 14,
        height: 14,
        borderRadius: 7,
    },
    stepDotDone: {
        backgroundColor: BLACK,
    },
    stepDotLabel: {
        fontFamily: 'Inter-Medium',
        fontSize: 10,
        color: '#666666',
    },
    stepDotLabelActive: {
        color: WHITE,
    },
    heroImage: {
        width: width * 0.35,
        height: width * 0.35,
    },
    // ── Bottom Mascot ──
    bottomMascot: {
        alignItems: 'center',
        paddingTop: 32,
        paddingBottom: 8,
    },
    bottomMascotInner: {
        alignItems: 'center',
    },
    heroBubble: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 16,
        maxWidth: width * 0.42,
        backgroundColor: '#F0F0F0',
    },
    bubbleTailWrap: {
        alignItems: 'center',
        marginTop: -2,
        marginBottom: -1,
    },
    bubbleTail: {
        width: 12,
        height: 12,
        transform: [{ rotate: '45deg' }],
        borderRadius: 2,
        marginBottom: -6,
        backgroundColor: '#F0F0F0',
    },
    heroBubbleText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 16,
        lineHeight: 22,
        textAlign: 'center',
        color: '#000000',
    },

    // ── Section ──
    sectionLabel: {
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 14,
    },
    sectionTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 32,
        color: '#000000',
    },

    // ── Reflection Card ──
    // ── Reflect step (step 2) ──
    reflectCard: {
        backgroundColor: WHITE,
        borderWidth: 2,
        borderColor: BLACK,
        borderRadius: 20,
        overflow: 'hidden',
    },
    reflectHeader: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 16,
        gap: 10,
    },
    reflectQNum: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 16,
        color: BLACK,
    },
    reflectQuestion: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 16,
        lineHeight: 24,
        color: BLACK,
    },
    reflectDivider: {
        height: 1.5,
        backgroundColor: BLACK,
    },
    reflectInputWrap: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 16,
    },
    reflectInput: {
        flex: 1,
        fontFamily: 'Inter-Medium',
        fontSize: 16,
        lineHeight: 26,
        color: BLACK,
        textAlignVertical: 'top',
    },
    reflectVoiceBtn: {
        position: 'absolute',
        bottom: 16,
        right: 16,
        width: 56,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: WHITE,
        borderRadius: 28,
    },
    reflectVoiceIcon: {
        width: 52,
        height: 52,
    },
    reflectSaveBtn: {
        paddingVertical: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    reflectSaveBtnText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 16,
        color: BLACK,
        letterSpacing: 1,
    },
    // ── Chat step (step 3) ──
    chatArea: {
        flex: 1,
    },
    chatContent: {
        paddingHorizontal: 16,
        paddingVertical: 20,
        gap: 24,
    },
    chatRowRight: {
        alignItems: 'flex-end',
        gap: 6,
    },
    chatRowLeft: {
        alignItems: 'flex-start',
        gap: 6,
    },
    chatAvatar: {
        width: 36,
        height: 36,
    },
    chatBubbleRight: {
        backgroundColor: YELLOW,
        borderWidth: 2,
        borderColor: BLACK,
        borderRadius: 20,
        borderBottomRightRadius: 4,
        paddingHorizontal: 16,
        paddingVertical: 12,
        maxWidth: '85%',
    },
    chatBubbleRightText: {
        fontFamily: 'Inter-Medium',
        fontSize: 16,
        lineHeight: 24,
        color: BLACK,
    },
    chatBubbleLeft: {
        backgroundColor: '#F0F0F0',
        borderWidth: 2,
        borderColor: BLACK,
        borderRadius: 20,
        borderBottomLeftRadius: 4,
        paddingHorizontal: 16,
        paddingVertical: 12,
        maxWidth: '85%',
    },
    chatBubbleLeftText: {
        fontFamily: 'Inter-Medium',
        fontSize: 16,
        lineHeight: 24,
        color: BLACK,
    },
    chatInputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 10,
    },
    chatInput: {
        flex: 1,
        fontFamily: 'Inter-Medium',
        fontSize: 16,
        color: BLACK,
        minHeight: 44,
        maxHeight: 120,
        paddingVertical: 8,
    },
    chatSendBtn: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chatSendBtnActive: {
        backgroundColor: YELLOW,
        borderRadius: 22,
        borderWidth: 2,
        borderColor: BLACK,
    },
    chatThinking: {
        fontFamily: 'Inter-Medium',
        fontSize: 15,
        color: '#888888',
        fontStyle: 'italic',
    },
    chatSendIcon: {
        width: 40,
        height: 40,
    },
    chatDoneRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 20,
        paddingVertical: 20,
    },
    chatDoneText: {
        fontFamily: 'Inter-Medium',
        fontSize: 15,
        color: '#4B5563',
    },

    reflectSavedWrap: {
        alignItems: 'center',
        paddingVertical: 48,
        paddingHorizontal: 24,
        gap: 12,
    },
    reflectSavedTitle: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 20,
        color: BLACK,
    },
    reflectSavedSub: {
        fontFamily: 'Inter-Medium',
        fontSize: 15,
        color: '#4B5563',
    },
    reflectionFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
        paddingBottom: 14,
    },
    reflectionWordCount: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 12,
        color: '#4B5563',
    },
    reflectionSaveBtn: {
        backgroundColor: '#FFE600',
        paddingHorizontal: 22,
        paddingVertical: 9,
        borderRadius: 20,
    },
    reflectionSaveBtnText: {
        fontFamily: 'Inter-Bold',
        fontSize: 17,
        color: '#000000',
    },

    // ── Card Body (shared) ──
    cardBody: {
        gap: 12,
    },

    // ── Gratitude (Step 1) ──
    gratitudeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    gratitudeTitle: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 25,
        color: BLACK,
        letterSpacing: 0.3,
    },
    gratitudeCounter: {
        fontSize: 20,
    },
    gratitudeCountNum: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 20,
        color: BLACK,
    },
    gratitudeCountTotal: {
        fontFamily: 'Inter-Medium',
        fontSize: 20,
        color: '#AAAAAA',
    },
    gratitudeDivider: {
        height: 1,
        backgroundColor: '#E5E5E5',
    },
    gratitudeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        minHeight: 52,
    },
    gratitudeFilled: {
        flex: 1,
        fontFamily: 'Inter-Medium',
        fontSize: 16,
        color: BLACK,
        lineHeight: 22,
    },
    gratitudeInput: {
        flex: 1,
        fontFamily: 'Inter-Medium',
        fontSize: 16,
        color: BLACK,
        paddingVertical: 0,
        minHeight: 28,
    },
    gratitudeLocked: {
        flex: 1,
        fontFamily: 'Inter-Medium',
        fontSize: 16,
        color: '#CCCCCC',
    },
    gratitudeMascotWrap: {
        position: 'absolute',
        bottom: 16,
        right: 16,
        alignItems: 'center',
    },
    gratitudeMascot: {
        width: 80,
        height: 80,
    },
    sendBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: YELLOW,
    },
    sendBtnDisabled: {
        backgroundColor: '#F0F0F0',
    },
    completionMsg: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingTop: 16,
        paddingRight: 96,
    },
    completionText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 16,
        color: BLACK,
    },

    // ── Prompt ──
    promptHeaderRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 8,
    },
    shuffleBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
        backgroundColor: '#F0F0F0',
    },
    promptText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 16,
        lineHeight: 24,
        color: '#000000',
    },
    textArea: {
        fontFamily: 'Inter-Medium',
        fontSize: 16,
        lineHeight: 24,
        minHeight: 100,
        padding: 14,
        borderRadius: 14,
        backgroundColor: '#F0F4F8',
        color: '#000000',
    },
    primaryBtn: {
        paddingVertical: 14,
        borderRadius: 26,
        alignItems: 'center',
        backgroundColor: '#FFE600',
    },
    primaryBtnText: {
        color: '#000000',
        fontFamily: 'Inter-Bold',
        fontSize: 18,
    },

    // ── Quote ──
    quoteBox: {
        paddingHorizontal: 18,
        paddingVertical: 16,
        borderRadius: 14,
        backgroundColor: '#F8F8F8',
    },
    quoteText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 19,
        lineHeight: 28,
        color: '#000000',
    },
    quoteAuthor: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 13,
        marginTop: 8,
        textAlign: 'right',
        color: '#666666',
    },

    // ── Today Prompts ──
    todayPromptItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        paddingVertical: 4,
    },
    todayPromptBullet: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#FFE600',
        alignItems: 'center',
        justifyContent: 'center',
    },
    todayPromptBulletText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 12,
        color: '#000000',
    },
    todayPromptText: {
        flex: 1,
        fontFamily: 'Inter-SemiBold',
        fontSize: 18,
        lineHeight: 24,
        color: '#000000',
    },

    // ── Saved State ──
    savedState: {
        alignItems: 'center',
        paddingVertical: 16,
        gap: 4,
    },
    savedTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 26,
        marginTop: 4,
        color: '#000000',
    },
    savedSub: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 14,
        color: '#666666',
    },
    writeAgainBtn: {
        marginTop: 10,
        paddingVertical: 6,
        paddingHorizontal: 16,
    },
    writeAgainText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 14,
        color: '#000000',
    },

    // ── Timer Done Modal ──
    modalBackdrop: {
        flex: 1,
        backgroundColor: '#00000055',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    modalCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 28,
        paddingVertical: 36,
        paddingHorizontal: 28,
        alignItems: 'center',
        width: '100%',
        gap: 8,
    },
    modalEmoji: {
        fontFamily: 'Inter-Bold',
        fontSize: 36,
        color: '#FFE600',
        marginBottom: 4,
    },
    modalTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 36,
        color: '#000000',
    },
    modalSub: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 16,
        color: '#666666',
        textAlign: 'center',
        marginBottom: 8,
    },
    modalBtn: {
        backgroundColor: '#FFE600',
        borderRadius: 26,
        paddingVertical: 14,
        paddingHorizontal: 40,
        marginTop: 8,
        width: '100%',
        alignItems: 'center',
    },
    modalBtnText: {
        fontFamily: 'Inter-Bold',
        fontSize: 20,
        color: '#000000',
    },
    modalDismiss: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 14,
        color: '#999999',
    },
});

export default HuntScreen;
