/**
 * CanvasScreen — renders the "Quote" tab.
 *
 * Shows today's quote and a chat conversation with Ulbo. The earlier version
 * of this screen was a freeform drawing canvas; that flow was removed but
 * the file/route name "Canvas" is kept stable to avoid churning imports.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BLACK, WHITE, YELLOW } from '../constants/colors';
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
    Animated as RNAnimated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { UserProgress } from '../types';
import { loadProgress, awardXP } from '../utils/progressionStorage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { XPToast } from '../components/XPToast';
import { useDailyQuote } from '../hooks/useDailyQuote';
import { chatWithUlbo } from '../utils/journalStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useHeaderHeight } from '../context/HeaderHeightContext';
import { VoiceSheet } from '../components/VoiceSheet';
import { useTranslation } from 'react-i18next';
import i18n from '../lib/i18n';

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
const chatPotatoIcon = require('../../assets/chat_potato.png');
const textPotatoIcon = require('../../assets/mascot/text_mode_potato_icon.png');

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

const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;

// ─── Custom SVG: Send arrow ───
const SendArrowIcon = ({ color = BLACK, size = 20 }: { color?: string; size?: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

type ChatMsg = { id: string; role: 'user' | 'ulbo'; text: string };

export const CanvasScreen: React.FC = () => {
    const headerHeight = useHeaderHeight();
    const insets = useSafeAreaInsets();
    const { quote: todayQuote, quoteText: todayQuoteText } = useDailyQuote();
    const { t } = useTranslation();

    const ULBO_FALLBACKS = [
        t('canvas.fallback_1'),
        t('canvas.fallback_2'),
        t('canvas.fallback_3'),
        t('canvas.fallback_4'),
        t('canvas.fallback_5'),
        t('canvas.fallback_6'),
    ];

    // ── Chat state ──
    const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [ulboThinking, setUlboThinking] = useState(false);
    const [chatInitialized, setChatInitialized] = useState(false);
    const chatScrollRef = useRef<any>(null);

    // ── Voice ──
    const [voiceOpen, setVoiceOpen] = useState(false);

    // ── Progression / XP ──
    const [progress, setProgress] = useState<UserProgress | null>(null);
    const [xpToast, setXpToast] = useState<{ amount: number; label?: string; leveledUp?: boolean; newLevelTitle?: string } | null>(null);
    const [hasAwardedXP, setHasAwardedXP] = useState(false);

    useEffect(() => { loadProgress().then(setProgress); }, []);

    // ── Animated card height when keyboard opens ──
    const cardHeight = SCREEN_H - (headerHeight || 80) - (62 + insets.bottom) - 32; // -32 = 16 top gap + 16 bottom gap
    const cardH = useRef(new RNAnimated.Value(cardHeight)).current;
    const cardHRef = useRef(cardHeight);
    const headerHeightRef = useRef(headerHeight);
    const kbOpen = useRef(false);
    const outerScrollRef = useRef<any>(null);

    useEffect(() => {
        cardHRef.current = cardHeight;
        headerHeightRef.current = headerHeight;
        if (!kbOpen.current) cardH.setValue(cardHeight);
    }, [cardHeight, headerHeight]);

    const handleInputFocus = useCallback(() => {
        outerScrollRef.current?.scrollTo({ y: 0, animated: false });
    }, []);

    useEffect(() => {
        const show = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (e) => {
                kbOpen.current = true;
                outerScrollRef.current?.scrollTo({ y: 0, animated: false });
                const kbH = e.endCoordinates.height;
                const hh = headerHeightRef.current || 80;
                const safetyMargin = Platform.OS === 'android' ? 56 : 8;
                const availH = SCREEN_H - kbH - hh - safetyMargin;
                const target = Math.min(SCREEN_W - 32, availH);
                RNAnimated.timing(cardH, { toValue: target, duration: 300, useNativeDriver: false }).start();
            }
        );
        const hide = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => {
                kbOpen.current = false;
                RNAnimated.timing(cardH, { toValue: cardHRef.current, duration: 300, useNativeDriver: false }).start();
            }
        );
        return () => { show.remove(); hide.remove(); };
    }, []);

    // ── Chat init + language sync: pre-seeded opening exchange ──
    // Runs on first load (init) and whenever language changes (re-translates the first 3 messages
    // in-place, leaving any real conversation messages intact).
    useEffect(() => {
        if (!todayQuoteText) return;
        const authorLine = todayQuote.author ? `\n— ${todayQuote.author}` : '';
        const openingMsgs: ChatMsg[] = [
            { id: 'user-0', role: 'user', text: t('canvas.chat_opening_user') },
            { id: 'ulbo-0', role: 'ulbo', text: `"${todayQuoteText}"${authorLine}` },
            { id: 'ulbo-1', role: 'ulbo', text: t('canvas.chat_opening_ulbo') },
        ];
        if (!chatInitialized) {
            setChatInitialized(true);
            setChatMessages(openingMsgs);
        } else {
            setChatMessages(prev => [
                ...openingMsgs,
                ...prev.filter(m => !['user-0', 'ulbo-0', 'ulbo-1'].includes(m.id)),
            ]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [todayQuoteText, i18n.language]);

    // ── Send user message and fetch Ulbo's reply ──
    const handleSendChat = useCallback(async () => {
        const text = chatInput.trim();
        if (!text || ulboThinking) return;
        setChatInput('');
        const userMsg: ChatMsg = { id: `u-${Date.now()}`, role: 'user', text };
        const updated = [...chatMessages, userMsg];
        setChatMessages(updated);
        setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);

        setUlboThinking(true);
        const name = await AsyncStorage.getItem(STORAGE_KEYS.USER_NAME) || 'Friend';
        try {
            const res = await chatWithUlbo(
                updated.map(m => ({ role: m.role, text: m.text })),
                name,
                { text: todayQuoteText, author: todayQuote.author },
                undefined,
                i18n.language
            );
            const reply = res?.reply || ULBO_FALLBACKS[Math.floor(Math.random() * ULBO_FALLBACKS.length)];
            setChatMessages(prev => [...prev, { id: `ulbo-${Date.now()}`, role: 'ulbo', text: reply }]);
        } catch {
            setChatMessages(prev => [...prev, {
                id:   `ulbo-${Date.now()}`,
                role: 'ulbo',
                text: ULBO_FALLBACKS[Math.floor(Math.random() * ULBO_FALLBACKS.length)],
            }]);
        } finally {
            setUlboThinking(false);
            setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
        }

        // First real reply earns XP once per day
        if (!hasAwardedXP && progress) {
            const result = await awardXP('readQuote', progress);
            setProgress(result.progress);
            if (result.xpGained > 0) {
                setXpToast({
                    amount:   result.xpGained,
                    label:    t('canvas.chat_saved'),
                    leveledUp: result.leveledUp,
                    newLevelTitle: result.leveledUp
                        ? t(`level.tier_${result.progress.level}_title`)
                        : undefined,
                });
            }
            setHasAwardedXP(true);
        }
    }, [chatInput, chatMessages, ulboThinking, hasAwardedXP, progress, todayQuote, todayQuoteText]);

    const handleVoiceTranscription = useCallback((text: string) => {
        setChatInput(prev => prev ? `${prev} ${text}` : text);
        setVoiceOpen(false);
    }, []);

    const level = Math.min(Math.max(progress?.level ?? 1, 1), 9);
    const levelPotato = POTATO_IMAGES[level];

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={0}
            >
                <ScrollView
                    ref={outerScrollRef}
                    contentContainerStyle={[
                        styles.scroll,
                        { paddingTop: (headerHeight || 0) + 16 },
                    ]}
                    scrollEnabled={false}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <RNAnimated.View style={{ height: cardH }}>
                        <Animated.View entering={FadeInDown.duration(400)} style={[styles.reflectCard, { flex: 1 }]}>
                            {/* Header */}
                            <View style={styles.reflectHeader}>
                                <Text style={styles.reflectQuestion}>{t('canvas.header')}</Text>
                            </View>
                            <View style={styles.reflectDivider} />

                            {/* Scrollable chat messages */}
                            <ScrollView
                                ref={chatScrollRef}
                                style={styles.chatArea}
                                contentContainerStyle={styles.chatContent}
                                showsVerticalScrollIndicator
                                scrollIndicatorInsets={{ right: 1 }}
                                keyboardShouldPersistTaps="handled"
                                nestedScrollEnabled
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
                                    placeholder={t('canvas.input_placeholder')}
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
                                    onPress={chatInput.trim() ? handleSendChat : () => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setVoiceOpen(true);
                                    }}
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
                </ScrollView>
            </KeyboardAvoidingView>

            <XPToast
                xpAmount={xpToast?.amount ?? 0}
                label={xpToast?.label}
                leveledUp={xpToast?.leveledUp}
                newLevelTitle={xpToast?.newLevelTitle}
                visible={!!xpToast}
                onDismiss={() => setXpToast(null)}
            />

            <VoiceSheet
                visible={voiceOpen}
                onDismiss={() => setVoiceOpen(false)}
                onTranscriptionComplete={handleVoiceTranscription}
                maxSeconds={120}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: BLACK,
    },
    scroll: {
        flexGrow: 1,
        paddingHorizontal: 16,
    },

    // ── Card (matches the reflect card on Journal) ──
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

    // ── Chat ──
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
    chatSendIcon: {
        width: 40,
        height: 40,
    },
});
