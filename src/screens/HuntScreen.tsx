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
import { SparkleIcon } from '../components/QuestCard';
import { trackEvent } from '../lib/analytics';
import { useDailyQuote } from '../hooks/useDailyQuote';
import { useMascotState } from '../hooks/useMascotState';
import { selectDailyPrompt, getMascotIntro, recordPromptUsage } from '../utils/promptSystem';
import { GratitudePrompt } from '../data/gratitudePrompts';
import { getTodayDateString, saveJournalEntry, generateJournalId, analyzeJournalEntry, updateEntryWithAI } from '../utils/journalStorage';
import { SpiritResponseModal } from '../components/SpiritResponseModal';
import { HUNT_PLACEHOLDERS } from '../data/gratitudePrompts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useHeaderHeight } from '../context/HeaderHeightContext';
import { useFocusEffect } from '@react-navigation/native';
import { useSetTimerDisplay } from '../context/TimerContext';
import { useSetJournalSteps } from '../context/JournalStepsContext';
import { useTimerSecs } from '../context/TimerSecondsContext';
import { VoiceSheet } from '../components/VoiceSheet';

// Assets
const chatPotatoIcon     = require('../../assets/chat_potato.png');
const chatModePotatoIcon = require('../../assets/mascot/chat_mode_potato_icon.png');
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

const STEP_LABELS = ['Emotion', '3things', 'Reflect'];

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



const ArrowRightIcon = ({ color, size = 18 }: { color: string; size?: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M5 12h14M13 6l6 6-6 6" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

// ═══════════════════════════════════════════════
// Confetti Rain
// ═══════════════════════════════════════════════

const CONFETTI_COLORS = ['#FFFF01', '#FF4757', '#2ED573', '#1E90FF', '#FF6B81', '#FFFFFF'];
const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;

// Tab bar slider geometry:
//   scroll paddingHorizontal 16px × 2 = 32px
//   tab bar inner padding 4px × 2     =  8px
//   content area width = SCREEN_W - 40
//   each of 3 equal tabs = (SCREEN_W - 40) / 3
const TAB_SLIDER_W = (SCREEN_W - 40) / 3;

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
    const { quote: todayQuote } = useDailyQuote();
    const { mood } = useMascotState();

    // Refs for auto-focusing inputs
    const emotionInputRef = useRef<any>(null);
    const huntInputRef = useRef<any>(null);

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
    const [isPromptSaved, setIsPromptSaved] = useState(false);

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

    // ── Tab slide animation ──
    const slideAnim = useRef(new RNAnimated.Value(0)).current;

    useEffect(() => {
        RNAnimated.spring(slideAnim, {
            toValue: activeStep * TAB_SLIDER_W,
            useNativeDriver: true,
            tension: 300,
            friction: 26,
        }).start();
    }, [activeStep, slideAnim]);

    // ── Today's Reflection (journal writing) ──
    const [reflectionText, setReflectionText] = useState('');

    // ── Spirit (AI) Modal ──
    const [spiritVisible, setSpiritVisible] = useState(false);
    const [spiritLoading, setSpiritLoading] = useState(false);
    const [spiritData, setSpiritData] = useState<{ reply: string; mood: number; tags: string[]; followUp?: string } | null>(null);

    // ── Voice sheet ──
    type VoiceTarget = 'hunt' | 'prompt' | 'reflection' | 'emotion';
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

    // Clean up journal steps on unmount
    useEffect(() => {
        return () => setJournalSteps(null);
    }, [setJournalSteps]);

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
        } else if (voiceTarget === 'emotion') {
            setEmotionNote(prev => prev ? `${prev} ${text}` : text);
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
    const reflectCardHeight = SCREEN_H - (headerHeight || 80) - (62 + insets.bottom) - 16;
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
                // Extra margin reserves visible black padding between card and keyboard
                // Android: kb height usually excludes the IME toolbar (suggestions/clipboard
                // bar above the keys), so we reserve extra space for it.
                const kbH = e.endCoordinates.height;
                const hh = headerHeightRef.current || 80;
                const safetyMargin = Platform.OS === 'android' ? 140 : 32;
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
                        { paddingTop: (headerHeight || 0) + 16, paddingBottom: 62 + insets.bottom + 16 },
                    ]}
                    scrollEnabled={false}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* ─── Tab Bar ─── */}
                    <View style={styles.tabBar}>
                        {/* Sliding yellow indicator — sits behind the text labels */}
                        <RNAnimated.View
                            style={[
                                styles.tabSlider,
                                { width: TAB_SLIDER_W, transform: [{ translateX: slideAnim }] },
                            ]}
                        />
                        {STEP_LABELS.map((label, i) => (
                            <TouchableOpacity
                                key={i}
                                style={styles.tabPill}
                                onPress={() => setActiveStep(i)}
                                activeOpacity={0.75}
                            >
                                <Text style={[styles.tabPillText, i === activeStep && styles.tabPillTextActive]}>
                                    {label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

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
                                    <View style={styles.emotionSaveRow}>
                                        <Pressable
                                            style={({ pressed }) => [
                                                styles.emotionSaveBtn,
                                                pressed && { backgroundColor: YELLOW },
                                            ]}
                                            onPress={handleSaveEmotion}
                                        >
                                            <Text style={styles.emotionSaveBtnText}>SAVE TO REFLECT</Text>
                                        </Pressable>
                                        <TouchableOpacity
                                            style={styles.emotionVoiceBtn}
                                            onPress={() => setVoiceTarget('emotion')}
                                            activeOpacity={0.7}
                                        >
                                            <Image source={chatModePotatoIcon} style={styles.emotionVoiceIcon} resizeMode="contain" />
                                        </TouchableOpacity>
                                    </View>
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
                                            {/* Numbered bullet */}
                                            <View style={[
                                                styles.gratitudeBullet,
                                                filled && styles.gratitudeBulletFilled,
                                                locked && styles.gratitudeBulletLocked,
                                            ]}>
                                                <Text style={[
                                                    styles.gratitudeBulletText,
                                                    locked && styles.gratitudeBulletTextLocked,
                                                ]}>{i + 1}</Text>
                                            </View>
                                            {filled ? (
                                                <Text style={styles.gratitudeFilled}>
                                                    {huntInputs[i] || hunt?.entries[i]?.text}
                                                </Text>
                                            ) : current ? (
                                                <RNTextInput
                                                    ref={i === huntCount ? huntInputRef : undefined}
                                                    style={styles.gratitudeInput}
                                                    placeholder={huntPlaceholders[i] || 'Something good today...'}
                                                    placeholderTextColor="#AAAAAA"
                                                    value={huntInputs[i]}
                                                    onChangeText={t => updateInput(i, t)}
                                                    onSubmitEditing={() => handleAddEntry(i)}
                                                    returnKeyType="done"
                                                    blurOnSubmit={false}
                                                />
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
                                    </View>

                                    {/* ── Save + Voice row ── */}
                                    <View style={styles.reflectSaveRow}>
                                        <Pressable
                                            style={({ pressed }) => [
                                                styles.emotionSaveBtn,
                                                !canSaveReflection && { opacity: 0.35 },
                                                pressed && canSaveReflection && { backgroundColor: YELLOW },
                                            ]}
                                            onPress={handleSaveReflection}
                                            disabled={!canSaveReflection}
                                        >
                                            <Text style={styles.emotionSaveBtnText}>SAVE TO JOURNAL</Text>
                                        </Pressable>
                                        <TouchableOpacity
                                            style={styles.emotionVoiceBtn}
                                            onPress={() => setVoiceTarget('reflection')}
                                            activeOpacity={0.7}
                                        >
                                            <Image source={chatModePotatoIcon} style={styles.emotionVoiceIcon} resizeMode="contain" />
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )}
                        </Animated.View>
                        </RNAnimated.View>
                    )}

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
    },
    // ── Tab Bar ──
    tabBar: {
        flexDirection: 'row',
        backgroundColor: WHITE,
        borderRadius: 50,
        marginBottom: 16,
        padding: 4,
    },
    tabSlider: {
        position: 'absolute',
        top: 4,
        bottom: 4,
        left: 4,
        backgroundColor: YELLOW,
        borderRadius: 50,
    },
    tabPill: {
        flex: 1,
        paddingVertical: 13,
        alignItems: 'center',
        zIndex: 1,              // text above the yellow slider
    },
    tabPillText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 13,
        color: BLACK,
        opacity: 0.45,
    },
    tabPillTextActive: {
        opacity: 1,
    },

    // ── Emotion Step ──
    emotionTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 16,
        color: BLACK,
        marginBottom: 10,
        letterSpacing: 0.2,
    },
    emotionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    emotionBtn: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 2,
        paddingHorizontal: 2,
    },
    emotionImg: {
        width: 50,
        height: 50,
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
    emotionSaveRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 10,
    },
    emotionSaveBtn: {
        flex: 1,
        height: 46,
        borderRadius: 23,
        backgroundColor: '#EEEEEE',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emotionSaveBtnText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 16,
        color: BLACK,
        letterSpacing: 1,
    },
    emotionVoiceBtn: {
        width: 46,
        height: 46,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emotionVoiceIcon: {
        width: 46,
        height: 46,
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
        paddingTop: 16,
        paddingBottom: 12,
        gap: 6,
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
        paddingTop: 8,
        paddingBottom: 0,
    },
    reflectInput: {
        flex: 1,
        fontFamily: 'Inter-Medium',
        fontSize: 16,
        lineHeight: 26,
        color: BLACK,
        textAlignVertical: 'top',
        // Strip iOS default internal TextInput padding so the bottom gap is consistent
        paddingTop: 0,
        paddingBottom: 0,
    },
    reflectSaveRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 8,
        gap: 10,
    },
    reflectSavedWrap: {
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
        gap: 8,
    },
    reflectSavedTitle: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 16,
        color: BLACK,
    },
    reflectSavedSub: {
        fontFamily: 'Inter-Medium',
        fontSize: 16,
        color: '#4B5563',
    },
    reflectionFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
        paddingBottom: 8,
    },
    reflectionWordCount: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 12,
        color: '#4B5563',
    },
    reflectionSaveBtn: {
        backgroundColor: '#FFE600',
        paddingHorizontal: 22,
        paddingVertical: 0,
        borderRadius: 20,
    },
    reflectionSaveBtnText: {
        fontFamily: 'Inter-Bold',
        fontSize: 16,
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
        marginBottom: 12,
    },
    gratitudeTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 16,
        color: BLACK,
        letterSpacing: 0.2,
    },
    gratitudeCounter: {
        fontSize: 16,
    },
    gratitudeCountNum: {
        fontFamily: 'Inter-Bold',
        fontSize: 16,
        color: BLACK,
    },
    gratitudeCountTotal: {
        fontFamily: 'Inter-Bold',
        fontSize: 16,
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
    gratitudeBullet: {
        width: 26, height: 26, borderRadius: 13,
        backgroundColor: '#F0F0F0',
        borderWidth: 1.5, borderColor: BLACK,
        alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
    },
    gratitudeBulletFilled: {
        backgroundColor: YELLOW,
    },
    gratitudeBulletLocked: {
        borderColor: '#DDDDDD',
    },
    gratitudeBulletText: {
        fontFamily: 'Inter-Bold',
        fontSize: 12,
        color: BLACK,
    },
    gratitudeBulletTextLocked: {
        color: '#CCCCCC',
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
