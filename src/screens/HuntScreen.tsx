import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    StyleSheet,
    View,
    ScrollView,
    TouchableOpacity,
    Image,
    Dimensions,
    TextInput as RNTextInput,
    Keyboard,
    Platform,
    KeyboardAvoidingView,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Text, ActivityIndicator } from 'react-native-paper';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import Svg, { Path, Circle } from 'react-native-svg';

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
import { getTodayDateString, saveJournalEntry, generateJournalId, analyzeJournalEntry, updateEntryWithAI } from '../utils/journalStorage';
import { SpiritResponseModal } from '../components/SpiritResponseModal';
import { HUNT_PLACEHOLDERS } from '../data/gratitudePrompts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VoiceSheet, MicTriggerButton } from '../components/VoiceSheet';

// Assets
const coachBunny = require('../../assets/mascot/coach_bunny.png');
const { width } = Dimensions.get('window');

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

const STEP_LABELS = ['3 things', 'prompt', 'reflect', 'quote'];

// Fallback Ulbo response when AI call fails or returns null
const SPIRIT_FALLBACK = (name: string) => ({
    reply: `You showed up and wrote it down, ${name}. That already counts for a lot.`,
    mood: 7,
    tags: ['#ShowingUp', '#Reflective'],
    followUp: "What's one thing from today you want to remember tomorrow?",
});


// ─── Custom SVG: Arrow/Send ───
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
// Journal Screen — Daily Reflection & Gratitude
// ═══════════════════════════════════════════════

export const HuntScreen: React.FC = () => {
    const { quote: todayQuote } = useDailyQuote();
    const { mood } = useMascotState();

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

    // ── Focus Timer ──
    const [timerMinutes, setTimerMinutes] = useState(10);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [timerTotalSeconds, setTimerTotalSeconds] = useState(10 * 60);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Load saved timer preference from Settings
    useEffect(() => {
        AsyncStorage.getItem('@ulbo_timer_minutes').then(val => {
            const mins = val ? Number(val) : 10;
            setTimerMinutes(mins);
            setTimerTotalSeconds(mins * 60);
        });
    }, []);

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

    const handleMascotTap = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCoachMsgIndex(prev => (prev + 1) % COACH_MESSAGES.length);
    }, []);

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
                setActiveStep(prev => Math.max(prev, 1));
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

    // ── Derived ──
    const huntCount = hunt?.entries?.length || 0;
    const isHuntDone = hunt?.completed || false;

    const huntStatus: QuestStatus = isHuntDone ? 'done' : huntCount > 0 ? 'in-progress' : 'todo';
    const promptStatus: QuestStatus = isPromptSaved ? 'done' : 'todo';
    const bonusStatus: QuestStatus = isBonusSaved ? 'done' : 'todo';

    // ── Handlers ──

    const handleAddEntry = useCallback(async (index: number) => {
        const text = huntInputs[index]?.trim();
        if (!text || !hunt || index < huntCount) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const updated = await addHuntEntry(text, hunt);
        if (!updated) return;

        setHunt(updated);
        trackEvent('hunt_entry_added', { entry_number: updated.entries?.length || 0 });

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
            setTimeout(() => setActiveStep(prev => Math.max(prev, 1)), 700);
        }
    }, [huntInputs, hunt, huntCount, progress]);

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

    // ═══════════ LOADING ═══════════

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="large" color="#FFE600" />
                </View>
            </SafeAreaView>
        );
    }

    // ═══════════ RENDER ═══════════

    return (
        <SafeAreaView style={styles.container} edges={['top']}>

            {/* ─── Timer Done Modal ─── */}
            <Modal
                visible={showTimerDone}
                transparent
                animationType="fade"
                onRequestClose={() => setShowTimerDone(false)}
            >
                <View style={styles.modalBackdrop}>
                    <Animated.View entering={FadeIn.duration(300)} style={styles.modalCard}>
                        <Text style={styles.modalEmoji}>✦</Text>
                        <Text style={styles.modalTitle}>Time's up!</Text>
                        <Text style={styles.modalSub}>Great focus session. How do you feel?</Text>
                        <TouchableOpacity
                            style={styles.modalBtn}
                            onPress={() => {
                                setShowTimerDone(false);
                                setTimerPreset(timerMinutes);
                            }}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.modalBtnText}>Keep going</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setShowTimerDone(false)}
                            activeOpacity={0.6}
                            style={{ paddingVertical: 12 }}
                        >
                            <Text style={styles.modalDismiss}>Done for now</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </Modal>

            {/* ─── Compact Top Bar: Timer + Step Progress ─── */}
            <Animated.View entering={FadeIn.duration(500)} style={styles.topBar}>
                <TouchableOpacity
                    style={styles.timerCompact}
                    onPress={isTimerRunning ? pauseTimer : startTimer}
                    activeOpacity={0.7}
                >
                    <Svg width={72} height={72} viewBox="0 0 72 72" style={StyleSheet.absoluteFill}>
                        <Circle cx="36" cy="36" r="30" stroke="#00000010" strokeWidth={4} fill="none" />
                        <Circle
                            cx="36" cy="36" r="30"
                            stroke="#FFE600"
                            strokeWidth={4}
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 30}`}
                            strokeDashoffset={`${2 * Math.PI * 30 * (1 - timerProgress)}`}
                            strokeLinecap="round"
                            transform="rotate(-90 36 36)"
                        />
                    </Svg>
                    <Text style={styles.timerCompactText}>
                        {String(displayMinutes).padStart(2, '0')}:{String(displaySeconds).padStart(2, '0')}
                    </Text>
                </TouchableOpacity>

                <View style={styles.stepTrack}>
                    {STEP_LABELS.map((label, i) => (
                        <TouchableOpacity
                            key={i}
                            onPress={() => setActiveStep(i)}
                            activeOpacity={0.7}
                            style={styles.stepDotWrap}
                        >
                            <View style={[
                                styles.stepDot,
                                i === activeStep && styles.stepDotActive,
                                i < activeStep && styles.stepDotDone,
                            ]} />
                            <Text style={[
                                styles.stepDotLabel,
                                i === activeStep && styles.stepDotLabelActive,
                            ]}>{label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </Animated.View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
            >
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* ─── Step 0: Find 3 Good Things ─── */}
                    {activeStep === 0 && (
                        <Animated.View entering={FadeInDown.duration(400)}>
                            <View style={styles.sectionLabel}>
                                <Text style={styles.sectionTitle}>Find 3 Good Things</Text>
                            </View>
                            <QuestCard
                                title="Today's Gratitude"
                                subtitle="Notice the small moments"
                                renderIcon={(c, s) => <SearchIcon color={c} size={s} />}
                                status={huntStatus}
                                index={0}
                                defaultExpanded={true}
                            >
                                <View style={styles.cardBody}>
                                    {[0, 1, 2].map(i => {
                                        const filled = i < huntCount;
                                        const current = i === huntCount;
                                        const locked = i > huntCount;
                                        return (
                                            <View key={i} style={styles.entryRow}>
                                                <View style={[
                                                    styles.entryNum,
                                                    filled && styles.entryNumFilled,
                                                    locked && styles.entryNumLocked,
                                                ]}>
                                                    {filled
                                                        ? <CheckIcon color="#000000" size={14} />
                                                        : <Text style={[styles.entryNumText, locked && styles.entryNumTextLocked]}>{i + 1}</Text>
                                                    }
                                                </View>
                                                {filled ? (
                                                    <Text style={styles.filledEntry}>
                                                        {huntInputs[i] || hunt?.entries[i]?.text}
                                                    </Text>
                                                ) : current ? (
                                                    <View style={styles.entryInputWrap}>
                                                        <RNTextInput
                                                            style={styles.entryInput}
                                                            placeholder={huntPlaceholders[i] || "Something good..."}
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
                                                            <SendIcon color={huntInputs[i]?.trim() ? '#000000' : '#AAAAAA'} size={16} />
                                                        </TouchableOpacity>
                                                    </View>
                                                ) : (
                                                    <Text style={styles.lockedEntry}>
                                                        {i === 2 ? "Almost there..." : "Waiting..."}
                                                    </Text>
                                                )}
                                            </View>
                                        );
                                    })}
                                    {isHuntDone && (
                                        <Animated.View entering={FadeIn.delay(200)} style={styles.completionMsg}>
                                            <SparkleIcon color="#000000" size={18} />
                                            <Text style={styles.completionText}>You found the good things today</Text>
                                        </Animated.View>
                                    )}
                                    {!isHuntDone && (
                                        <MicTriggerButton
                                            label="Speak a good thing"
                                            onPress={() => setVoiceTarget('hunt')}
                                        />
                                    )}
                                </View>
                            </QuestCard>
                        </Animated.View>
                    )}

                    {/* ─── Step 1: Prompt About Today ─── */}
                    {activeStep === 1 && dailyPrompt && (
                        <Animated.View entering={FadeInDown.duration(400)}>
                            <View style={styles.sectionLabel}>
                                <Text style={styles.sectionTitle}>Prompt About Today</Text>
                            </View>
                            <QuestCard
                                title="Reflect"
                                subtitle={dailyPrompt.category}
                                renderIcon={(c, s) => <PenIcon color={c} size={s} />}
                                status={promptStatus}
                                index={1}
                                defaultExpanded={true}
                            >
                                <View style={styles.cardBody}>
                                    <View style={styles.promptHeaderRow}>
                                        <Text style={[styles.promptText, { flex: 1 }]}>{dailyPrompt.text}</Text>
                                        <TouchableOpacity
                                            onPress={handleShufflePrompt}
                                            style={styles.shuffleBtn}
                                            activeOpacity={0.7}
                                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                        >
                                            <ShuffleIcon color="#000000" size={16} />
                                        </TouchableOpacity>
                                    </View>
                                    {isPromptSaved ? (
                                        <Animated.View entering={FadeIn} style={styles.savedState}>
                                            <SparkleIcon color="#000000" size={24} />
                                            <Text style={styles.savedTitle}>Beautifully said.</Text>
                                            <Text style={styles.savedSub}>Saved to your history</Text>
                                            <TouchableOpacity
                                                onPress={() => { setIsPromptSaved(false); setPromptResponse(''); }}
                                                style={styles.writeAgainBtn}
                                                activeOpacity={0.6}
                                            >
                                                <Text style={styles.writeAgainText}>Write another</Text>
                                            </TouchableOpacity>
                                        </Animated.View>
                                    ) : (
                                        <>
                                            <RNTextInput
                                                style={styles.textArea}
                                                placeholder="Start writing..."
                                                placeholderTextColor="#AAAAAA"
                                                multiline
                                                value={promptResponse}
                                                onChangeText={setPromptResponse}
                                                textAlignVertical="top"
                                            />
                                            <MicTriggerButton
                                                label="Dictate"
                                                onPress={() => setVoiceTarget('prompt')}
                                            />
                                            <TouchableOpacity
                                                style={[styles.primaryBtn, { opacity: promptResponse.trim() ? 1 : 0.4 }]}
                                                onPress={handleSavePrompt}
                                                disabled={!promptResponse.trim()}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={styles.primaryBtnText}>Save to Journal</Text>
                                            </TouchableOpacity>
                                        </>
                                    )}
                                </View>
                            </QuestCard>
                        </Animated.View>
                    )}

                    {/* ─── Step 2: Write a Reflection ─── */}
                    {activeStep === 2 && (
                        <Animated.View entering={FadeInDown.duration(400)}>
                            <View style={styles.sectionLabel}>
                                <Text style={styles.sectionTitle}>Write a Reflection</Text>
                            </View>
                            <View style={styles.reflectionCard}>
                                <View style={styles.reflectionQuoteBox}>
                                    <View style={styles.reflectionQuoteAccent} />
                                    <View style={styles.reflectionQuoteContent}>
                                        <Text style={styles.reflectionQuoteLabel}>today's quote</Text>
                                        <Text style={styles.reflectionQuoteText}>"{todayQuote.text}"</Text>
                                        {todayQuote.author && (
                                            <Text style={styles.reflectionQuoteAuthor}>— {todayQuote.author}</Text>
                                        )}
                                    </View>
                                </View>
                                {reflectionPermSaved ? (
                                    <Animated.View entering={FadeIn} style={[styles.savedState, { paddingHorizontal: 18 }]}>
                                        <SparkleIcon color="#000000" size={24} />
                                        <Text style={styles.savedTitle}>Beautiful reflection!</Text>
                                        <Text style={styles.savedSub}>Saved to your history</Text>
                                        <TouchableOpacity
                                            onPress={() => setReflectionPermSaved(false)}
                                            style={styles.writeAgainBtn}
                                            activeOpacity={0.6}
                                        >
                                            <Text style={styles.writeAgainText}>Write another</Text>
                                        </TouchableOpacity>
                                    </Animated.View>
                                ) : (
                                    <>
                                        <RNTextInput
                                            style={styles.reflectionInput}
                                            placeholder="What's on your mind? What does this quote stir up for you?"
                                            placeholderTextColor="#AAAAAA"
                                            multiline
                                            value={reflectionText}
                                            onChangeText={setReflectionText}
                                            textAlignVertical="top"
                                        />
                                        <View style={{ paddingHorizontal: 18, paddingBottom: 4 }}>
                                            <MicTriggerButton
                                                label="Speak your reflection"
                                                onPress={() => setVoiceTarget('reflection')}
                                            />
                                        </View>
                                        {canSaveReflection && (
                                            <Animated.View entering={FadeIn} style={styles.reflectionFooter}>
                                                <Text style={styles.reflectionWordCount}>
                                                    {reflectionWordCount} {reflectionWordCount === 1 ? 'word' : 'words'}
                                                </Text>
                                                <TouchableOpacity
                                                    style={styles.reflectionSaveBtn}
                                                    onPress={handleSaveReflection}
                                                    activeOpacity={0.7}
                                                >
                                                    <Text style={styles.reflectionSaveBtnText}>Save</Text>
                                                </TouchableOpacity>
                                            </Animated.View>
                                        )}
                                    </>
                                )}
                            </View>
                        </Animated.View>
                    )}

                    {/* ─── Step 3: Today's Quote ─── */}
                    {activeStep === 3 && (
                        <Animated.View entering={FadeInDown.duration(400)}>
                            <View style={styles.sectionLabel}>
                                <Text style={styles.sectionTitle}>Today's Quote</Text>
                            </View>
                            <QuestCard
                                title="Bonus Reflection"
                                subtitle="Let it sink in"
                                renderIcon={(c, s) => <ThoughtIcon color={c} size={s} />}
                                status={bonusStatus}
                                index={3}
                                defaultExpanded={true}
                            >
                                <View style={styles.cardBody}>
                                    <View style={styles.quoteBox}>
                                        <Text style={styles.quoteText}>"{todayQuote.text}"</Text>
                                        {todayQuote.author && (
                                            <Text style={styles.quoteAuthor}>— {todayQuote.author}</Text>
                                        )}
                                    </View>
                                    {isBonusSaved ? (
                                        <Animated.View entering={FadeIn} style={styles.savedState}>
                                            <SparkleIcon color="#000000" size={24} />
                                            <Text style={styles.savedTitle}>Nice reflection</Text>
                                            <Text style={styles.savedSub}>Saved to your history</Text>
                                        </Animated.View>
                                    ) : (
                                        <>
                                            <RNTextInput
                                                style={[styles.textArea, { minHeight: 80 }]}
                                                placeholder="What does this mean to you?"
                                                placeholderTextColor="#AAAAAA"
                                                multiline
                                                value={bonusResponse}
                                                onChangeText={setBonusResponse}
                                                textAlignVertical="top"
                                            />
                                            <MicTriggerButton
                                                label="Dictate"
                                                onPress={() => setVoiceTarget('bonus')}
                                            />
                                            <TouchableOpacity
                                                style={[styles.primaryBtn, { opacity: bonusResponse.trim() ? 1 : 0.4 }]}
                                                onPress={handleSaveBonus}
                                                disabled={!bonusResponse.trim()}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={styles.primaryBtnText}>Save Reflection</Text>
                                            </TouchableOpacity>
                                        </>
                                    )}
                                </View>
                            </QuestCard>

                            {/* ─── Coach Bunny — congratulations ─── */}
                            <View style={styles.bottomMascot}>
                                <TouchableOpacity onPress={handleMascotTap} activeOpacity={0.8} style={styles.bottomMascotInner}>
                                    <View style={styles.heroBubble}>
                                        <Text style={styles.heroBubbleText}>
                                            {coachMsgIndex === 0
                                                ? (mascotIntro || COACH_MESSAGES[0])
                                                : COACH_MESSAGES[coachMsgIndex]}
                                        </Text>
                                    </View>
                                    <View style={styles.bubbleTailWrap}>
                                        <View style={styles.bubbleTail} />
                                    </View>
                                    <Image source={coachBunny} style={styles.heroImage} resizeMode="contain" />
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
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
            />
        </SafeAreaView>
    );
};

// ═══════════════════════════════════════════════
// Styles — Soft UI, Minimalist, Purposeful
// ═══════════════════════════════════════════════

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scroll: {
        paddingBottom: 100,
    },
    loadingWrap: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // ── Compact Top Bar ──
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 10,
        gap: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#00000010',
    },
    timerCompact: {
        width: 72,
        height: 72,
        alignItems: 'center',
        justifyContent: 'center',
    },
    timerCompactText: {
        fontFamily: 'GasoekOne',
        fontSize: 14,
        color: '#000000',
        letterSpacing: 0.5,
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
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#E0E0E0',
    },
    stepDotActive: {
        backgroundColor: '#FFE600',
        width: 14,
        height: 14,
        borderRadius: 7,
    },
    stepDotDone: {
        backgroundColor: '#000000',
    },
    stepDotLabel: {
        fontFamily: 'Carlito-Bold',
        fontSize: 10,
        color: '#BBBBBB',
    },
    stepDotLabelActive: {
        color: '#000000',
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
        fontFamily: 'IndieFlower-Regular',
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
        fontFamily: 'Caveat-Bold',
        fontSize: 32,
        color: '#000000',
    },

    // ── Reflection Card ──
    reflectionCard: {
        marginHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: '#000000',
        overflow: 'hidden',
    },
    reflectionQuoteBox: {
        flexDirection: 'row',
        backgroundColor: '#FFE600',
        paddingVertical: 14,
    },
    reflectionQuoteAccent: {
        width: 4,
        backgroundColor: '#000000',
        borderRadius: 2,
        marginLeft: 16,
        marginRight: 12,
        flexShrink: 0,
    },
    reflectionQuoteContent: {
        flex: 1,
        paddingRight: 16,
        gap: 3,
    },
    reflectionQuoteLabel: {
        fontFamily: 'Carlito-Bold',
        fontSize: 11,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        color: '#00000099',
    },
    reflectionQuoteText: {
        fontFamily: 'Carlito-Italic',
        fontSize: 19,
        lineHeight: 27,
        color: '#000000',
    },
    reflectionQuoteAuthor: {
        fontFamily: 'Carlito',
        fontSize: 12,
        fontStyle: 'italic',
        color: '#00000070',
    },
    reflectionInput: {
        fontFamily: 'Carlito',
        fontSize: 17,
        lineHeight: 26,
        minHeight: 130,
        paddingHorizontal: 18,
        paddingVertical: 16,
        color: '#000000',
    },
    reflectionFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
        paddingBottom: 14,
    },
    reflectionWordCount: {
        fontFamily: 'Carlito',
        fontSize: 12,
        color: '#AAAAAA',
    },
    reflectionSaveBtn: {
        backgroundColor: '#FFE600',
        paddingHorizontal: 22,
        paddingVertical: 9,
        borderRadius: 20,
    },
    reflectionSaveBtnText: {
        fontFamily: 'GasoekOne',
        fontSize: 17,
        color: '#000000',
    },

    // ── Card Body (shared) ──
    cardBody: {
        gap: 12,
    },

    // ── Hunt entries ──
    entryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    entryNum: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#00000008',
    },
    entryNumFilled: {
        backgroundColor: '#FFE600',
    },
    entryNumLocked: {
        backgroundColor: '#F0F0F0',
    },
    entryNumText: {
        fontFamily: 'Carlito-Bold',
        fontSize: 14,
        color: '#000000',
    },
    entryNumTextLocked: {
        color: '#CCCCCC',
    },
    filledEntry: {
        flex: 1,
        fontFamily: 'Carlito',
        fontSize: 17,
        lineHeight: 24,
        color: '#000000',
    },
    entryInputWrap: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        paddingRight: 6,
        backgroundColor: '#F0F4F8',
    },
    entryInput: {
        flex: 1,
        fontFamily: 'Carlito',
        fontSize: 16,
        paddingHorizontal: 14,
        paddingVertical: 10,
        minHeight: 44,
        color: '#000000',
    },
    sendBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFE600',
    },
    sendBtnDisabled: {
        backgroundColor: '#F0F0F0',
    },
    lockedEntry: {
        flex: 1,
        fontFamily: 'Carlito-Italic',
        fontSize: 14,
        color: '#CCCCCC',
    },
    completionMsg: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingTop: 8,
    },
    completionText: {
        fontFamily: 'IndieFlower-Regular',
        fontSize: 17,
        color: '#000000',
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
        fontFamily: 'IndieFlower-Regular',
        fontSize: 22,
        lineHeight: 30,
        color: '#000000',
    },
    textArea: {
        fontFamily: 'Carlito',
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
        fontFamily: 'GasoekOne',
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
        fontFamily: 'Carlito-Italic',
        fontSize: 19,
        lineHeight: 28,
        color: '#000000',
    },
    quoteAuthor: {
        fontFamily: 'Carlito',
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
        fontFamily: 'Carlito-Bold',
        fontSize: 12,
        color: '#000000',
    },
    todayPromptText: {
        flex: 1,
        fontFamily: 'IndieFlower-Regular',
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
        fontFamily: 'Caveat-Bold',
        fontSize: 26,
        marginTop: 4,
        color: '#000000',
    },
    savedSub: {
        fontFamily: 'Carlito',
        fontSize: 14,
        color: '#666666',
    },
    writeAgainBtn: {
        marginTop: 10,
        paddingVertical: 6,
        paddingHorizontal: 16,
    },
    writeAgainText: {
        fontFamily: 'Carlito-Bold',
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
        fontFamily: 'GasoekOne',
        fontSize: 36,
        color: '#FFE600',
        marginBottom: 4,
    },
    modalTitle: {
        fontFamily: 'GasoekOne',
        fontSize: 36,
        color: '#000000',
    },
    modalSub: {
        fontFamily: 'Carlito',
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
        fontFamily: 'GasoekOne',
        fontSize: 20,
        color: '#000000',
    },
    modalDismiss: {
        fontFamily: 'Carlito',
        fontSize: 14,
        color: '#999999',
    },
});

export default HuntScreen;
