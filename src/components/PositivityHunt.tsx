import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Keyboard,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Text, Surface, TextInput, IconButton, useTheme, ActivityIndicator } from 'react-native-paper';
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
    const theme = useTheme();
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
    const primaryColor = theme.colors.primary;

    return (
        <Animated.View style={[styles.ringContainer, animatedStyle]}>
            <Svg width={200} height={200} viewBox="0 0 200 200">
                <Defs>
                    <LinearGradient id="progressGrad" x1="0" y1="0" x2="1" y2="1">
                        <Stop offset="0" stopColor={primaryColor} stopOpacity="0.9" />
                        <Stop offset="1" stopColor={primaryColor} stopOpacity="0.5" />
                    </LinearGradient>
                </Defs>

                {/* Background ring */}
                <Circle
                    cx="100" cy="100" r={radius}
                    stroke={theme.colors.outline + '12'}
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
                            fill={i < progress ? primaryColor : theme.colors.outline + '30'}
                        />
                    );
                })}
            </Svg>

            {/* Center Content */}
            <View style={styles.ringCenter}>
                {isComplete ? (
                    <View style={{ alignItems: 'center' }}>
                        <Svg width={44} height={44} viewBox="0 0 24 24" fill="none">
                            <Path d="M12 2L14.09 8.26L21 9.27L16 14.14L17.18 21.02L12 17.77L6.82 21.02L8 14.14L3 9.27L9.91 8.26L12 2Z" stroke={primaryColor} strokeWidth={1.5} fill={primaryColor + '25'} strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                    </View>
                ) : (
                    <Animated.View entering={FadeIn} style={{ alignItems: 'center' }}>
                        <Text style={[styles.ringCount, { color: theme.colors.onBackground }]}>
                            {progress}
                        </Text>
                        <Text style={[styles.ringLabel, { color: theme.colors.outline }]}>
                            of {total}
                        </Text>
                    </Animated.View>
                )}
            </View>
        </Animated.View>
    );
};

// ========== Entry Card ==========
const EntryCard: React.FC<{ text: string; index: number }> = ({ text, index }) => {
    const theme = useTheme();
    return (
        <Animated.View
            entering={FadeIn.delay(index * 80).duration(300)}
            style={[
                styles.entryCard,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary + '10' },
            ]}
        >
            <View style={[styles.entryDot, { backgroundColor: theme.colors.primary + '60' }]} />
            <Text variant="bodyLarge" style={[styles.entryText, { color: theme.colors.onSurface }]}>
                {text}
            </Text>
        </Animated.View>
    );
};

// ========== Main Component ==========
export const PositivityHunt: React.FC<PositivityHuntProps> = ({
    hunt,
    quote,
    isUnlocked,
    currentLevel,
    onAddEntry,
    onHuntComplete,
}) => {
    const theme = useTheme();
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
            <Surface style={[styles.lockedContainer, { backgroundColor: theme.colors.surfaceVariant }]} elevation={0}>
                <Text variant="headlineSmall" style={{ opacity: 0.5 }}>🔒 Hunt Locked</Text>
                <Text variant="bodyMedium" style={{ opacity: 0.7 }}>Unlocks at Level 3</Text>
            </Surface>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                {/* Header */}
                <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
                    <Text variant="headlineMedium" style={[styles.headerTitle, { color: theme.colors.onBackground }]}>
                        {isComplete ? "Hunt Complete" : "Today's Hunt"}
                    </Text>
                    <Text variant="labelLarge" style={{ color: theme.colors.outline, opacity: 0.7, fontFamily: 'Caveat-Medium', fontSize: 16 }}>
                        Find 3 good things today
                    </Text>
                </Animated.View>

                {/* Progress Ring */}
                <View style={styles.ringWrapper}>
                    <ProgressRing progress={progress} total={3} isComplete={isComplete} />
                    {quote && !isFocused && !isComplete && (
                        <Animated.View entering={FadeIn.delay(200)} style={styles.quoteHint}>
                            <Text variant="bodyMedium" style={[styles.quoteText, { color: theme.colors.onBackground }]}>
                                "{quote.text}"
                            </Text>
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
                        <Surface style={[styles.inputSheet, { backgroundColor: theme.colors.surface }]} elevation={2}>
                            <Text variant="titleMedium" style={[styles.inputPrompt, { color: theme.colors.onSurface }]}>
                                {entriesCount === 0 ? "What's one good thing?" : "Capture another moment..."}
                            </Text>
                            <View style={[styles.inputRow, { backgroundColor: theme.colors.background + '80' }]}>
                                <TextInput
                                    value={inputText}
                                    onChangeText={setInputText}
                                    placeholder="Type here..."
                                    placeholderTextColor={theme.colors.outline + '60'}
                                    style={[styles.input, { color: theme.colors.onSurface }]}
                                    underlineColor="transparent"
                                    activeUnderlineColor="transparent"
                                    textColor={theme.colors.onSurface}
                                    onFocus={() => setIsFocused(true)}
                                    onBlur={() => setIsFocused(false)}
                                    onSubmitEditing={handleSubmitEntry}
                                    returnKeyType="done"
                                />
                                <IconButton
                                    icon="arrow-up"
                                    mode="contained"
                                    containerColor={theme.colors.primary}
                                    iconColor="#FFFFFF"
                                    size={22}
                                    disabled={!inputText.trim()}
                                    onPress={handleSubmitEntry}
                                    style={{ margin: 0 }}
                                />
                            </View>
                        </Surface>
                    </Animated.View>
                )}

                {/* Completion Celebration */}
                {isComplete && (
                    <Animated.View entering={FadeIn.delay(200)} style={[styles.celebrateCard, { backgroundColor: theme.colors.primaryContainer }]}>
                        <Svg width={36} height={36} viewBox="0 0 24 24" fill="none" style={{ marginBottom: 8 }}>
                            <Path d="M12 2L14.09 8.26L21 9.27L16 14.14L17.18 21.02L12 17.77L6.82 21.02L8 14.14L3 9.27L9.91 8.26L12 2Z" stroke={theme.colors.primary} strokeWidth={1.5} fill={theme.colors.primary + '20'} strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                        <Text variant="titleMedium" style={{ fontFamily: 'Caveat-Bold', color: theme.colors.onPrimaryContainer, textAlign: 'center' }}>
                            You found the good things today!
                        </Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer, opacity: 0.7, marginTop: 4, textAlign: 'center' }}>
                            Come back tomorrow for a new hunt
                        </Text>
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
    },
    header: {
        paddingTop: 56,
        paddingHorizontal: 24,
        alignItems: 'center',
        gap: 4,
    },
    headerTitle: {
        fontFamily: 'Caveat-Bold',
        fontSize: 28,
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
        fontFamily: 'Caveat-Bold',
        fontSize: 48,
        lineHeight: 52,
    },
    ringLabel: {
        fontFamily: 'Caveat-Medium',
        fontSize: 16,
        marginTop: -4,
    },
    quoteHint: {
        marginTop: 20,
        paddingHorizontal: 36,
        maxWidth: 300,
    },
    quoteText: {
        fontFamily: 'Caveat-Medium',
        fontStyle: 'italic',
        textAlign: 'center',
        opacity: 0.5,
        fontSize: 16,
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
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
        elevation: 1,
    },
    entryDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 14,
    },
    entryText: {
        fontFamily: 'Caveat-Medium',
        fontSize: 17,
        flex: 1,
    },
    inputSheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 36 : 28,
    },
    inputPrompt: {
        fontFamily: 'Caveat-Bold',
        marginBottom: 12,
        fontSize: 18,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        paddingRight: 8,
    },
    input: {
        flex: 1,
        backgroundColor: 'transparent',
        height: 52,
        fontSize: 16,
    },
    lockedContainer: {
        margin: 16,
        padding: 24,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    celebrateCard: {
        marginHorizontal: 20,
        marginBottom: 24,
        padding: 24,
        borderRadius: 20,
        alignItems: 'center',
    },
});
