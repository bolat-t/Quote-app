import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet,
    View,
    ScrollView,
    TouchableOpacity,
    Image,
    Dimensions,
    TextInput as RNTextInput,
    Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Text, useTheme as usePaperTheme, ActivityIndicator } from 'react-native-paper';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import Svg, { Path, Circle } from 'react-native-svg';

import { UserProgress, DailyHunt } from '../types';
import { loadProgress, awardXP, loadDailyHunt, addHuntEntry, saveDailyHunt } from '../utils/progressionStorage';
import { getXPProgress, LEVEL_TIERS, XP_REWARDS } from '../data/progressionConfig';
import { XPToast } from '../components/XPToast';
import { QuestCard, QuestStatus, SearchIcon, PenIcon, ThoughtIcon, CheckIcon, SparkleIcon, PlusCircleIcon } from '../components/QuestCard';
import { trackEvent } from '../lib/analytics';
import { useDailyQuote } from '../hooks/useDailyQuote';
import { useTheme } from '../context/ThemeContext';
import { useMascotState } from '../hooks/useMascotState';
import { selectDailyPrompt, getMascotIntro, recordPromptUsage } from '../utils/promptSystem';
import { GratitudePrompt } from '../data/gratitudePrompts';
import { getTodayDateString, saveJournalEntry, generateJournalId } from '../utils/journalStorage';
import { HUNT_PLACEHOLDERS } from '../data/gratitudePrompts';

// Assets
const coachBunny = require('../../assets/mascot/coach_bunny.png');
const { width } = Dimensions.get('window');

// Coach messages — first is task-oriented, rest are encouragements
const COACH_MESSAGES = [
    "fill out all 3 to complete the hunt~",
    "you're doing great, keep it up!",
    "every good thing you notice matters",
    "gratitude is a superpower",
    "I'm proud of you for being here",
    "small moments, big feelings~",
    "take your time, no rush",
    "you're building a beautiful habit",
];

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
// Hunt Screen — Gratitude Journey
// ═══════════════════════════════════════════════

export const HuntScreen: React.FC = () => {
    const { quote: todayQuote } = useDailyQuote();
    const { theme } = useTheme();
    const paperTheme = usePaperTheme();
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

    const handleMascotTap = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCoachMsgIndex(prev => (prev + 1) % COACH_MESSAGES.length);
    }, []);

    // ── XP Toast (subtle, afterthought) ──
    const [xpToast, setXpToast] = useState<{
        amount: number;
        label?: string;
        leveledUp?: boolean;
        newLevelTitle?: string;
    } | null>(null);

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

            const prompt = await selectDailyPrompt(mood, 10);
            setDailyPrompt(prompt);
            setMascotIntro(getMascotIntro(prompt.category));

            // Pick 3 random placeholders
            const shuffled = [...HUNT_PLACEHOLDERS].sort(() => 0.5 - Math.random());
            setHuntPlaceholders(shuffled.slice(0, 3));
        } catch (e) {
            console.error('[HuntScreen] Error:', e);
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
        }
    }, [huntInputs, hunt, huntCount, progress]);

    const handleSavePrompt = useCallback(async () => {
        if (!dailyPrompt || !promptResponse.trim()) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        await saveJournalEntry({
            id: generateJournalId(),
            quoteId: todayQuote.id,
            quoteText: dailyPrompt.text,
            response: promptResponse.trim(),
            createdAt: Date.now(),
            date: getTodayDateString(),
            sentimentTags: ['gratitude', 'prompt_response'],
        });
        await recordPromptUsage(dailyPrompt);
        setIsPromptSaved(true);
        Keyboard.dismiss();

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

    // ═══════════ LOADING ═══════════

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    // ═══════════ RENDER ═══════════

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <ScrollView
                contentContainerStyle={styles.scroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* ─── HERO: Speech Bubble + Mascot ─── */}
                <Animated.View entering={FadeIn.duration(500)} style={styles.heroSection}>
                    <View style={[styles.heroBubble, { backgroundColor: theme.colors.surfaceVariant }]}>
                        <Text style={[styles.heroBubbleText, { color: theme.colors.onSurface }]}>
                            {coachMsgIndex === 0
                                ? (mascotIntro || COACH_MESSAGES[0])
                                : COACH_MESSAGES[coachMsgIndex]}
                        </Text>
                    </View>
                    {/* Tail pointing down */}
                    <View style={styles.bubbleTailWrap}>
                        <View style={[styles.bubbleTail, { backgroundColor: theme.colors.surfaceVariant }]} />
                    </View>
                    <TouchableOpacity onPress={handleMascotTap} activeOpacity={0.8}>
                        <Image source={coachBunny} style={styles.heroImage} resizeMode="contain" />
                    </TouchableOpacity>
                </Animated.View>

                {/* ─── Section Label ─── */}
                <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.sectionLabel}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
                        Today's Gratitude
                    </Text>
                </Animated.View>

                {/* ─── CARD 1: Gratitude Hunt ─── */}
                <QuestCard
                    title="Find 3 Good Things"
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
                                    {/* Number or Check */}
                                    <View style={[
                                        styles.entryNum,
                                        {
                                            backgroundColor: filled
                                                ? theme.colors.primary + '18'
                                                : 'transparent',
                                            borderColor: filled
                                                ? theme.colors.primary + '30'
                                                : current
                                                    ? theme.colors.outline + '30'
                                                    : theme.colors.outline + '15',
                                        }
                                    ]}>
                                        {filled
                                            ? <CheckIcon color={theme.colors.primary} size={14} />
                                            : <Text style={[styles.entryNumText, { color: theme.colors.outline + (locked ? '40' : '80') }]}>{i + 1}</Text>
                                        }
                                    </View>

                                    {/* Content */}
                                    {filled ? (
                                        <Text style={[styles.filledEntry, { color: theme.colors.onSurface }]}>
                                            {huntInputs[i] || hunt?.entries[i]?.text}
                                        </Text>
                                    ) : current ? (
                                        <View style={[styles.entryInputWrap, { borderColor: theme.colors.outline + '20' }]}>
                                            <RNTextInput
                                                style={[styles.entryInput, { color: theme.colors.onSurface }]}
                                                placeholder={huntPlaceholders[i] || "Something good..."}
                                                placeholderTextColor={theme.colors.outline + '60'}
                                                value={huntInputs[i]}
                                                onChangeText={t => updateInput(i, t)}
                                                onSubmitEditing={() => handleAddEntry(i)}
                                                returnKeyType="done"
                                            />
                                            <TouchableOpacity
                                                onPress={() => handleAddEntry(i)}
                                                disabled={!huntInputs[i]?.trim()}
                                                style={[
                                                    styles.sendBtn,
                                                    {
                                                        backgroundColor: huntInputs[i]?.trim()
                                                            ? theme.colors.primary
                                                            : theme.colors.outline + '20',
                                                    }
                                                ]}
                                                activeOpacity={0.7}
                                            >
                                                <SendIcon color={huntInputs[i]?.trim() ? '#FFF' : theme.colors.outline + '60'} size={16} />
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <Text style={[styles.lockedEntry, { color: theme.colors.outline + '40' }]}>
                                            {i === 2 ? "Almost there..." : "Waiting..."}
                                        </Text>
                                    )}
                                </View>
                            );
                        })}

                        {/* Completion message */}
                        {isHuntDone && (
                            <Animated.View entering={FadeIn.delay(200)} style={styles.completionMsg}>
                                <SparkleIcon color={theme.colors.primary} size={18} />
                                <Text style={[styles.completionText, { color: theme.colors.primary }]}>
                                    You found the good things today
                                </Text>
                            </Animated.View>
                        )}
                    </View>
                </QuestCard>

                {/* ─── CARD 2: Daily Reflection ─── */}
                {dailyPrompt && (
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
                                <Text style={[styles.promptText, { color: theme.colors.onSurface, flex: 1 }]}>
                                    {dailyPrompt.text}
                                </Text>
                                <TouchableOpacity
                                    onPress={handleShufflePrompt}
                                    style={[styles.shuffleBtn, { backgroundColor: theme.colors.surfaceVariant }]}
                                    activeOpacity={0.7}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <ShuffleIcon color={theme.colors.primary} size={16} />
                                </TouchableOpacity>
                            </View>

                            {isPromptSaved ? (
                                <Animated.View entering={FadeIn} style={styles.savedState}>
                                    <SparkleIcon color={theme.colors.primary} size={24} />
                                    <Text style={[styles.savedTitle, { color: theme.colors.primary }]}>
                                        Beautifully said.
                                    </Text>
                                    <Text style={[styles.savedSub, { color: theme.colors.outline }]}>
                                        Saved to your journal
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() => { setIsPromptSaved(false); setPromptResponse(''); }}
                                        style={styles.writeAgainBtn}
                                        activeOpacity={0.6}
                                    >
                                        <Text style={[styles.writeAgainText, { color: theme.colors.primary }]}>
                                            Write another
                                        </Text>
                                    </TouchableOpacity>
                                </Animated.View>
                            ) : (
                                <>
                                    <RNTextInput
                                        style={[styles.textArea, {
                                            color: theme.colors.onSurface,
                                            backgroundColor: theme.colors.background,
                                            borderColor: theme.colors.outline + '18',
                                        }]}
                                        placeholder="Start writing..."
                                        placeholderTextColor={theme.colors.outline + '50'}
                                        multiline
                                        value={promptResponse}
                                        onChangeText={setPromptResponse}
                                        textAlignVertical="top"
                                    />
                                    <TouchableOpacity
                                        style={[styles.primaryBtn, {
                                            backgroundColor: theme.colors.primary,
                                            opacity: promptResponse.trim() ? 1 : 0.4,
                                        }]}
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
                )}

                {/* ─── CARD 3: Quote Spark ─── */}
                <QuestCard
                    title="Quote Spark"
                    subtitle="Today's thought"
                    renderIcon={(c, s) => <ThoughtIcon color={c} size={s} />}
                    status={bonusStatus}
                    index={2}
                    defaultExpanded={true}
                >
                    <View style={styles.cardBody}>
                        <View style={[styles.quoteBox, { backgroundColor: theme.colors.surfaceVariant + '50' }]}>
                            <Text style={[styles.quoteText, { color: theme.colors.onSurface }]}>
                                "{todayQuote.text}"
                            </Text>
                            {todayQuote.author && (
                                <Text style={[styles.quoteAuthor, { color: theme.colors.outline }]}>
                                    — {todayQuote.author}
                                </Text>
                            )}
                        </View>

                        {isBonusSaved ? (
                            <Animated.View entering={FadeIn} style={styles.savedState}>
                                <SparkleIcon color={theme.colors.primary} size={24} />
                                <Text style={[styles.savedTitle, { color: theme.colors.primary }]}>
                                    Nice reflection
                                </Text>
                                <Text style={[styles.savedSub, { color: theme.colors.outline }]}>
                                    Saved to your journal
                                </Text>
                            </Animated.View>
                        ) : (
                            <>
                                <RNTextInput
                                    style={[styles.textArea, {
                                        color: theme.colors.onSurface,
                                        backgroundColor: theme.colors.background,
                                        borderColor: theme.colors.outline + '18',
                                        minHeight: 80,
                                    }]}
                                    placeholder="What does this mean to you?"
                                    placeholderTextColor={theme.colors.outline + '50'}
                                    multiline
                                    value={bonusResponse}
                                    onChangeText={setBonusResponse}
                                    textAlignVertical="top"
                                />
                                <TouchableOpacity
                                    style={[styles.primaryBtn, {
                                        backgroundColor: theme.colors.primary,
                                        opacity: bonusResponse.trim() ? 1 : 0.4,
                                    }]}
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

                {/* ─── Bottom Breathing Room ─── */}
                <View style={{ height: 40 }} />

            </ScrollView>

            {/* XP Toast — subtle overlay */}
            <XPToast
                xpAmount={xpToast?.amount ?? 0}
                label={xpToast?.label}
                leveledUp={xpToast?.leveledUp}
                newLevelTitle={xpToast?.newLevelTitle}
                visible={!!xpToast}
                onDismiss={() => setXpToast(null)}
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
    },
    scroll: {
        paddingBottom: 100,
    },
    loadingWrap: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // ── Hero ──
    heroSection: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 8,
    },
    heroImage: {
        width: width * 0.4,
        height: width * 0.4,
        borderRadius: (width * 0.4) / 2,
    },
    heroBubble: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 18,
        maxWidth: width * 0.75,
    },
    bubbleTailWrap: {
        alignItems: 'center',
        marginTop: -1,
        marginBottom: -1,
    },
    bubbleTail: {
        width: 14,
        height: 14,
        transform: [{ rotate: '45deg' }],
        borderRadius: 2,
        marginBottom: -7,
    },
    heroBubbleText: {
        fontFamily: 'Caveat-Medium',
        fontSize: 18,
        lineHeight: 24,
        textAlign: 'center',
    },

    // ── Section ──
    sectionLabel: {
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 14,
    },
    sectionTitle: {
        fontFamily: 'Caveat-Bold',
        fontSize: 28,
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
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    entryNumText: {
        fontFamily: 'Carlito',
        fontSize: 14,
        fontWeight: 'bold',
    },
    filledEntry: {
        flex: 1,
        fontFamily: 'Caveat-Medium',
        fontSize: 17,
        lineHeight: 22,
    },
    entryInputWrap: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 14,
        paddingRight: 6,
    },
    entryInput: {
        flex: 1,
        fontFamily: 'Carlito',
        fontSize: 15,
        paddingHorizontal: 14,
        paddingVertical: 10,
        minHeight: 44, // min touch target
    },
    sendBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },
    lockedEntry: {
        flex: 1,
        fontFamily: 'Carlito',
        fontSize: 14,
        fontStyle: 'italic',
    },
    completionMsg: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingTop: 8,
    },
    completionText: {
        fontFamily: 'Caveat-Medium',
        fontSize: 16,
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
    },
    promptText: {
        fontFamily: 'Caveat-Medium',
        fontSize: 20,
        lineHeight: 28,
    },
    textArea: {
        fontFamily: 'Carlito',
        fontSize: 15,
        lineHeight: 22,
        minHeight: 100,
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
    },
    primaryBtn: {
        paddingVertical: 14,
        borderRadius: 26,
        alignItems: 'center',
    },
    primaryBtnText: {
        color: '#FFFFFF',
        fontFamily: 'Carlito',
        fontSize: 16,
        fontWeight: 'bold',
    },

    // ── Quote ──
    quoteBox: {
        paddingHorizontal: 18,
        paddingVertical: 16,
        borderRadius: 14,
    },
    quoteText: {
        fontFamily: 'Caveat-Medium',
        fontSize: 18,
        lineHeight: 26,
        fontStyle: 'italic',
    },
    quoteAuthor: {
        fontFamily: 'Carlito',
        fontSize: 13,
        marginTop: 8,
        textAlign: 'right',
    },

    // ── Saved State ──
    savedState: {
        alignItems: 'center',
        paddingVertical: 16,
        gap: 4,
    },
    savedTitle: {
        fontFamily: 'Caveat-Bold',
        fontSize: 22,
        marginTop: 4,
    },
    savedSub: {
        fontFamily: 'Carlito',
        fontSize: 13,
    },
    writeAgainBtn: {
        marginTop: 10,
        paddingVertical: 6,
        paddingHorizontal: 16,
    },
    writeAgainText: {
        fontFamily: 'Carlito',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default HuntScreen;
