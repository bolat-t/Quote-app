import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    Keyboard,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import Svg, { Circle, Path, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withSequence,
    withDelay,
    FadeIn,
    FadeInDown,
    SlideInDown,
    SlideInUp,
    ZoomIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { DailyHunt } from '../types';

const { width, height } = Dimensions.get('window');

const YELLOW = '#FFE600';
const BLACK  = '#000000';
const WHITE  = '#FFFFFF';

interface PositivityHuntProps {
    hunt: DailyHunt;
    quote?: { text: string; category: string };
    isUnlocked: boolean;
    currentLevel: number;
    onAddEntry: (text: string) => void;
    onHuntComplete: () => void;
}

// ========== Minimalist Progress Ring ==========
const ProgressRing: React.FC<{ progress: number; total: number; isComplete: boolean }> = ({
    progress, total, isComplete,
}) => {
    const scale = useSharedValue(1);

    useEffect(() => {
        if (isComplete) {
            scale.value = withSequence(
                withSpring(1.15, { damping: 8 }),
                withSpring(1, { damping: 10 })
            );
        } else {
            scale.value = withSpring(1 + progress * 0.03);
        }
    }, [progress, isComplete]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const radius = 90;
    const strokeWidth = 3;
    const circumference = 2 * Math.PI * radius;
    const progressOffset = circumference - (circumference * progress) / total;

    return (
        <Animated.View style={[styles.ringContainer, animatedStyle]}>
            <Svg width={200} height={200} viewBox="0 0 200 200">
                <Defs>
                    <LinearGradient id="progressGrad" x1="0" y1="0" x2="1" y2="1">
                        <Stop offset="0" stopColor={YELLOW} stopOpacity="1" />
                        <Stop offset="1" stopColor={BLACK} stopOpacity="0.5" />
                    </LinearGradient>
                </Defs>

                {/* Background ring */}
                <Circle
                    cx="100" cy="100" r={radius}
                    stroke={BLACK + '12'}
                    strokeWidth={strokeWidth}
                    fill="none"
                />

                {/* Progress arc */}
                <Circle
                    cx="100" cy="100" r={radius}
                    stroke="url(#progressGrad)"
                    strokeWidth={strokeWidth + 1}
                    strokeDasharray={`${circumference}`}
                    strokeDashoffset={isComplete ? 0 : progressOffset}
                    strokeLinecap="round"
                    fill="none"
                    rotation="-90"
                    origin="100, 100"
                />

                {/* Dot markers for each segment */}
                {Array.from({ length: total }, (_, i) => {
                    const angle = ((i / total) * 360 - 90) * (Math.PI / 180);
                    const cx = 100 + radius * Math.cos(angle);
                    const cy = 100 + radius * Math.sin(angle);
                    return (
                        <Circle
                            key={i}
                            cx={cx} cy={cy} r={i < progress ? 4 : 2.5}
                            fill={i < progress ? YELLOW : BLACK + '30'}
                        />
                    );
                })}
            </Svg>

            {/* Center Content */}
            <View style={styles.ringCenter}>
                {isComplete ? (
                    <View style={{ alignItems: 'center' }}>
                        <Svg width={44} height={44} viewBox="0 0 24 24" fill="none">
                            <Path d="M12 2L14.09 8.26L21 9.27L16 14.14L17.18 21.02L12 17.77L6.82 21.02L8 14.14L3 9.27L9.91 8.26L12 2Z" stroke={BLACK} strokeWidth={1.5} fill={YELLOW} strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                    </View>
                ) : (
                    <Animated.View entering={FadeIn} style={{ alignItems: 'center' }}>
                        <Text style={styles.ringCount}>{progress}</Text>
                        <Text style={styles.ringLabel}>of {total}</Text>
                    </Animated.View>
                )}
            </View>
        </Animated.View>
    );
};

// ========== Entry Card ==========
const EntryCard: React.FC<{ text: string; index: number }> = ({ text, index }) => (
    <Animated.View
        entering={FadeIn.delay(index * 80).duration(300)}
        style={styles.entryCard}
    >
        <View style={styles.entryDot} />
        <Text style={styles.entryText}>{text}</Text>
    </Animated.View>
);

// ========== Main Component ==========
export const PositivityHunt: React.FC<PositivityHuntProps> = ({
    hunt,
    quote,
    isUnlocked,
    currentLevel,
    onAddEntry,
    onHuntComplete,
}) => {
    const [inputText, setInputText] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    const entriesCount = hunt.entries.length;
    const isComplete = hunt.completed;
    const progress = Math.min(entriesCount, 3);

    const handleSubmitEntry = useCallback(() => {
        const trimmed = inputText.trim();
        if (!trimmed) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onAddEntry(trimmed);
        setInputText('');
        Keyboard.dismiss();
        setIsFocused(false);

        if (entriesCount === 2) {
            setTimeout(() => onHuntComplete(), 500);
        }
    }, [inputText, entriesCount, onAddEntry, onHuntComplete]);

    // Locked State
    if (!isUnlocked) {
        return (
            <View style={styles.lockedContainer}>
                <Text style={{ fontSize: 20, opacity: 0.5 }}>🔒 Hunt Locked</Text>
                <Text style={{ opacity: 0.7, marginTop: 4, fontFamily: 'GasoekOne', fontSize: 15 }}>Unlocks at Level 3</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                {/* Header */}
                <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
                    <Text style={styles.headerTitle}>
                        {isComplete ? "Hunt Complete" : "Today's Hunt"}
                    </Text>
                    <Text style={styles.headerSub}>Find 3 good things today</Text>
                </Animated.View>

                {/* Progress Ring */}
                <View style={styles.ringWrapper}>
                    <ProgressRing progress={progress} total={3} isComplete={isComplete} />
                    {quote && !isFocused && !isComplete && (
                        <Animated.View entering={FadeIn.delay(200)} style={styles.quoteHint}>
                            <Text style={styles.quoteText}>"{quote.text}"</Text>
                        </Animated.View>
                    )}
                </View>

                {/* Entries */}
                <View style={styles.entriesList}>
                    {hunt.entries.map((entry, index) => (
                        <EntryCard key={index} text={entry.text} index={index} />
                    ))}
                </View>

                {/* Input Sheet */}
                {!isComplete && (
                    <Animated.View entering={FadeIn.duration(300)}>
                        <View style={styles.inputSheet}>
                            <Text style={styles.inputPrompt}>
                                {entriesCount === 0 ? "What's one good thing?" : "Capture another moment..."}
                            </Text>
                            <View style={styles.inputRow}>
                                <TextInput
                                    value={inputText}
                                    onChangeText={setInputText}
                                    placeholder="Type here..."
                                    placeholderTextColor={BLACK + '40'}
                                    style={styles.input}
                                    onFocus={() => setIsFocused(true)}
                                    onBlur={() => setIsFocused(false)}
                                    onSubmitEditing={handleSubmitEntry}
                                    returnKeyType="done"
                                />
                                <TouchableOpacity
                                    style={[styles.submitBtn, !inputText.trim() && styles.submitBtnDisabled]}
                                    onPress={handleSubmitEntry}
                                    disabled={!inputText.trim()}
                                    activeOpacity={0.7}
                                >
                                    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                                        <Path d="M12 19V5M5 12l7-7 7 7" stroke={inputText.trim() ? BLACK : BLACK + '40'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                                    </Svg>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Animated.View>
                )}

                {/* Completion Celebration */}
                {isComplete && (
                    <Animated.View entering={FadeIn.delay(200)} style={styles.celebrateCard}>
                        <Svg width={36} height={36} viewBox="0 0 24 24" fill="none" style={{ marginBottom: 8 }}>
                            <Path d="M12 2L14.09 8.26L21 9.27L16 14.14L17.18 21.02L12 17.77L6.82 21.02L8 14.14L3 9.27L9.91 8.26L12 2Z" stroke={BLACK} strokeWidth={1.5} fill={YELLOW} strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                        <Text style={styles.celebrateTitle}>You found the good things today!</Text>
                        <Text style={styles.celebrateSub}>Come back tomorrow for a new hunt</Text>
                    </Animated.View>
                )}
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        paddingBottom: 20,
        backgroundColor: WHITE,
    },
    header: {
        paddingTop: 56,
        paddingHorizontal: 24,
        alignItems: 'center',
        gap: 4,
    },
    headerTitle: {
        fontFamily: 'GasoekOne',
        fontSize: 28,
        color: BLACK,
    },
    headerSub: {
        fontFamily: 'GasoekOne',
        fontSize: 16,
        color: BLACK + '70',
    },
    ringWrapper: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 280,
    },
    ringContainer: {
        width: 200,
        height: 200,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ringCenter: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ringCount: {
        fontFamily: 'GasoekOne',
        fontSize: 48,
        lineHeight: 52,
        color: BLACK,
    },
    ringLabel: {
        fontFamily: 'GasoekOne',
        fontSize: 16,
        marginTop: -4,
        color: BLACK + '70',
    },
    quoteHint: {
        marginTop: 20,
        paddingHorizontal: 36,
        maxWidth: 300,
    },
    quoteText: {
        fontFamily: 'GasoekOne',
        fontStyle: 'italic',
        textAlign: 'center',
        opacity: 0.5,
        fontSize: 16,
        color: BLACK,
    },
    entriesList: {
        paddingHorizontal: 20,
        paddingBottom: 12,
        gap: 8,
    },
    entryCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: BLACK,
        backgroundColor: WHITE,
    },
    entryDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 14,
        backgroundColor: YELLOW,
    },
    entryText: {
        fontFamily: 'GasoekOne',
        fontSize: 17,
        flex: 1,
        color: BLACK,
    },
    inputSheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 36 : 28,
        backgroundColor: WHITE,
        borderTopWidth: 2.5,
        borderTopColor: BLACK,
    },
    inputPrompt: {
        fontFamily: 'GasoekOne',
        marginBottom: 12,
        fontSize: 18,
        color: BLACK,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        borderWidth: 2,
        borderColor: BLACK,
        backgroundColor: '#F8F8F8',
        paddingRight: 8,
    },
    input: {
        flex: 1,
        height: 52,
        fontSize: 16,
        paddingHorizontal: 14,
        fontFamily: 'GasoekOne',
        color: BLACK,
    },
    submitBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: YELLOW,
        borderWidth: 1.5,
        borderColor: BLACK,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitBtnDisabled: {
        backgroundColor: '#F0F0F0',
        borderColor: BLACK + '30',
    },
    lockedContainer: {
        margin: 16,
        padding: 24,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderStyle: 'dashed',
        borderWidth: 2,
        borderColor: BLACK + '25',
        backgroundColor: WHITE,
    },
    celebrateCard: {
        marginHorizontal: 20,
        marginBottom: 24,
        padding: 24,
        borderRadius: 20,
        alignItems: 'center',
        backgroundColor: YELLOW,
        borderWidth: 2,
        borderColor: BLACK,
    },
    celebrateTitle: {
        fontFamily: 'GasoekOne',
        fontSize: 20,
        color: BLACK,
        textAlign: 'center',
    },
    celebrateSub: {
        fontFamily: 'GasoekOne',
        fontSize: 14,
        color: BLACK + 'AA',
        marginTop: 4,
        textAlign: 'center',
    },
});
