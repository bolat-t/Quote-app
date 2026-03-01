import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
} from 'react-native';
import Svg, { Path as SvgPath } from 'react-native-svg';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    cancelAnimation,
    FadeIn,
    FadeInDown,
} from 'react-native-reanimated';
import { getWeeklyHistory } from '../utils/journalStorage';

const YELLOW = '#FFE600';
const BLACK = '#000000';
const WHITE = '#FFFFFF';

// ─────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────

const ZapIcon = ({ color, size = 26 }: { color: string; size?: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
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
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
        <SvgPath
            d="M5 12l5 5L20 7"
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

// ─────────────────────────────────────────────
// Streak motivational message
// ─────────────────────────────────────────────

const getStreakMessage = (streak: number) => {
    if (streak === 0) return 'Start today — every great streak begins with one day.';
    if (streak < 3) return 'A great start. Show up again tomorrow.';
    if (streak < 7) return "You're building something real. Keep it going.";
    if (streak < 30) return "Consistency is your superpower. Don't stop now.";
    return "You're in rare territory. This is who you are now.";
};

// ─────────────────────────────────────────────
// Modal
// ─────────────────────────────────────────────

interface StreakModalProps {
    visible: boolean;
    onClose: () => void;
    streak: number;
}

export const StreakModal: React.FC<StreakModalProps> = ({ visible, onClose, streak }) => {
    const [history, setHistory] = useState<{ day: string; date: string; completed: boolean; isToday: boolean }[]>([]);

    const scale = useSharedValue(1);

    useEffect(() => {
        if (visible) {
            loadHistory();
            scale.value = withRepeat(
                withSequence(
                    withTiming(1.05, { duration: 1400 }),
                    withTiming(1, { duration: 1400 })
                ),
                -1,
                true
            );
        } else {
            cancelAnimation(scale);
            scale.value = 1;
        }
    }, [visible]);

    const loadHistory = async () => {
        const data = await getWeeklyHistory();
        setHistory(data);
    };

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const getNextGoal = (current: number) => {
        const milestones = [3, 7, 14, 30, 60, 100, 365];
        return milestones.find(m => m > current) || current + 10;
    };

    const nextGoal = getNextGoal(streak);
    const progress = Math.min(streak / nextGoal, 1);

    return (
        <Modal
            visible={visible}
            animationType="none"
            transparent
            onRequestClose={onClose}
        >
            <Animated.View
                entering={FadeIn.duration(200)}
                style={[styles.scrim, { backgroundColor: 'rgba(0,0,0,0.35)' }]}
            >
                <Animated.View
                    entering={FadeInDown.springify().damping(18).stiffness(200)}
                    style={[styles.card]}
                >
                    {/* ── Hero: icon + number ── */}
                    <View style={styles.hero}>
                        <Animated.View
                            style={[styles.iconRing, pulseStyle]}
                        >
                            <ZapIcon color={BLACK} size={26} />
                        </Animated.View>

                        <Text style={[styles.streakNumber, { color: BLACK }]}>
                            {streak}
                        </Text>
                        <Text style={[styles.streakLabel, { color: BLACK + '80' }]}>
                            {streak === 1 ? 'day streak' : 'day streak'}
                        </Text>
                    </View>

                    {/* ── Divider ── */}
                    <View style={[styles.divider, { backgroundColor: BLACK + '15' }]} />

                    {/* ── Milestone progress ── */}
                    <View style={styles.milestoneSection}>
                        <View style={styles.milestoneRow}>
                            <Text style={[styles.milestoneLabel, { color: BLACK + '70' }]}>
                                Next milestone
                            </Text>
                            <Text style={[styles.milestoneValue, { color: BLACK }]}>
                                {nextGoal} days
                            </Text>
                        </View>
                        <View style={styles.progressTrack}>
                            <View
                                style={[
                                    styles.progressFill,
                                    {
                                        width: `${progress * 100}%`,
                                    },
                                ]}
                            />
                        </View>
                    </View>

                    {/* ── Week grid ── */}
                    <View style={styles.weekRow}>
                        {history.map((day, i) => (
                            <View key={i} style={styles.dayCol}>
                                <View style={[
                                    styles.dayDot,
                                    day.completed && {
                                        backgroundColor: YELLOW,
                                    },
                                    day.isToday && !day.completed && {
                                        backgroundColor: WHITE,
                                        borderWidth: 2,
                                        borderColor: BLACK,
                                    },
                                ]}>
                                    {day.completed && <CheckIcon color={BLACK} />}
                                    {day.isToday && !day.completed && (
                                        <View style={[styles.todayDot, { backgroundColor: BLACK }]} />
                                    )}
                                </View>
                                <Text style={[
                                    styles.dayLabel,
                                    { color: BLACK + '60' },
                                    day.isToday && {
                                        color: BLACK,
                                        fontWeight: '700' as const,
                                    },
                                ]}>
                                    {day.day}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {/* ── Message ── */}
                    <Text style={[styles.message, { color: BLACK + '70' }]}>
                        {getStreakMessage(streak)}
                    </Text>

                    {/* ── Action ── */}
                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={onClose}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.actionBtnText}>
                            Keep it going
                        </Text>
                    </TouchableOpacity>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
};

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
    scrim: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    card: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 24,
        padding: 28,
        backgroundColor: WHITE,
        elevation: 10,
        shadowColor: BLACK,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
    },

    // ── Hero ──
    hero: {
        alignItems: 'center',
        gap: 4,
        marginBottom: 20,
        overflow: 'visible',
    },
    iconRing: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
        backgroundColor: YELLOW + '30',
    },
    streakNumber: {
        fontFamily: 'GasoekOne',
        fontSize: 64,
        lineHeight: 78,
        includeFontPadding: false,
    },
    streakLabel: {
        fontFamily: 'GasoekOne',
        fontSize: 15,
    },

    // ── Divider ──
    divider: {
        height: 1,
        marginBottom: 20,
    },

    // ── Milestone ──
    milestoneSection: {
        gap: 10,
        marginBottom: 24,
    },
    milestoneRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    milestoneLabel: {
        fontFamily: 'GasoekOne',
        fontSize: 13,
    },
    milestoneValue: {
        fontFamily: 'GasoekOne',
        fontSize: 13,
        fontWeight: '700',
    },
    progressTrack: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
        backgroundColor: BLACK + '10',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
        backgroundColor: YELLOW,
    },

    // ── Week grid ──
    weekRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    dayCol: {
        alignItems: 'center',
        gap: 5,
    },
    dayDot: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F0F0F0',
    },
    todayDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    dayLabel: {
        fontFamily: 'GasoekOne',
        fontSize: 11,
    },

    // ── Message ──
    message: {
        fontFamily: 'GasoekOne',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 21,
        marginBottom: 24,
    },

    // ── Action ──
    actionBtn: {
        borderRadius: 16,
        paddingVertical: 14,
        alignItems: 'center',
        backgroundColor: YELLOW,
        elevation: 4,
        shadowColor: BLACK,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    actionBtnText: {
        fontFamily: 'GasoekOne',
        fontSize: 15,
        fontWeight: '600',
        color: BLACK,
    },
});
