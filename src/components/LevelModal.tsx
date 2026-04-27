import React from 'react';
import { BLACK, WHITE, YELLOW } from '../constants/colors';
import {
    View,
    Text,
    Image,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import Svg, { Path as SvgPath } from 'react-native-svg';
import { UserProgress } from '../types';
import { LEVEL_TIERS, getXPProgress, XP_REWARDS } from '../data/progressionConfig';

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

// ─────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────

const XIcon = ({ color }: { color: string }) => (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <SvgPath d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
);

const CheckIcon = ({ color }: { color: string }) => (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
        <SvgPath d="M5 12l5 5L20 7" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

const LockIcon = ({ color }: { color: string }) => (
    <Svg width={11} height={11} viewBox="0 0 24 24" fill="none">
        <SvgPath d="M5 11V7a7 7 0 0114 0v4" stroke={color} strokeWidth={2} strokeLinecap="round" />
        <SvgPath d="M4 11h16v10a2 2 0 01-2 2H6a2 2 0 01-2-2V11z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// Potato Icon
// ─────────────────────────────────────────────

const PotatoIcon: React.FC<{ level: number; size: number; opacity?: number }> = ({ level, size, opacity = 1 }) => {
    const clamped = Math.min(Math.max(level, 1), 9) as keyof typeof POTATO_IMAGES;
    return (
        <Image
            source={POTATO_IMAGES[clamped]}
            style={{ width: size, height: size, opacity }}
            resizeMode="contain"
        />
    );
};

// ─────────────────────────────────────────────
// Modal
// ─────────────────────────────────────────────

interface LevelModalProps {
    visible: boolean;
    onClose: () => void;
    progress: UserProgress;
}

export const LevelModal: React.FC<LevelModalProps> = ({ visible, onClose, progress }) => {
    const { currentLevel, nextLevel, xpInCurrentLevel, xpNeededForNext, percentage } = getXPProgress(progress.totalXP);

    const todayActions = [
        { label: 'Opened App', done: progress.dailyActions.openApp, xp: XP_REWARDS.openApp },
        { label: 'Read Quote', done: progress.dailyActions.readQuote, xp: XP_REWARDS.readQuote },
        { label: 'Drew Reflection', done: progress.dailyActions.drewReflection, xp: XP_REWARDS.drawReflection },
        { label: 'Wrote Reflection', done: progress.dailyActions.wroteReflection, xp: XP_REWARDS.writeReflection },
        { label: 'Saved Canvas', done: progress.dailyActions.savedCanvas, xp: XP_REWARDS.saveCanvas },
        { label: 'Shared', done: progress.dailyActions.sharedReflection, xp: XP_REWARDS.shareReflection },
        { label: 'Positivity Hunt', done: progress.dailyActions.completedHunt, xp: XP_REWARDS.completeHunt },
    ];

    const todayXP = todayActions.reduce((sum, a) => sum + (a.done ? a.xp : 0), 0);

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
                <View style={styles.sheet}>
                    {/* Handle bar */}
                    <View style={styles.handleRow}>
                        <View style={styles.handle} />
                    </View>

                    {/* Close */}
                    <TouchableOpacity
                        style={styles.closeBtn}
                        onPress={onClose}
                        activeOpacity={0.6}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel="Close level modal"
                        accessibilityRole="button"
                    >
                        <XIcon color={BLACK} />
                    </TouchableOpacity>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                        {/* ── Hero ── */}
                        <View style={styles.hero}>
                            <View style={styles.heroRing}>
                                <PotatoIcon level={currentLevel.level} size={44} />
                            </View>
                            <Text style={styles.heroTitle}>
                                Level {currentLevel.level}
                            </Text>
                            <Text style={styles.heroSubtitle}>
                                {currentLevel.title}
                            </Text>
                            <Text style={styles.heroXP}>
                                {progress.totalXP} Total XP
                            </Text>
                        </View>

                        {/* ── Progress to Next ── */}
                        {nextLevel && (
                            <View style={styles.card}>
                                <View style={styles.cardRow}>
                                    <Text style={styles.cardLabel}>
                                        Next: {nextLevel.title}
                                    </Text>
                                    <Text style={styles.cardValue}>
                                        {xpInCurrentLevel}/{xpNeededForNext} XP
                                    </Text>
                                </View>
                                <View style={styles.progressTrack}>
                                    <View
                                        style={[
                                            styles.progressFill,
                                            { width: `${Math.min(percentage * 100, 100)}%` },
                                        ]}
                                    />
                                </View>
                            </View>
                        )}

                        {/* ── Today's Actions ── */}
                        <View style={styles.card}>
                            <View style={styles.cardRow}>
                                <Text style={styles.cardLabel}>Today's XP</Text>
                                <View style={styles.xpChip}>
                                    <Text style={styles.xpChipText}>+{todayXP}</Text>
                                </View>
                            </View>
                            {todayActions.map((action, i) => (
                                <View
                                    key={i}
                                    style={[
                                        styles.actionRow,
                                        i < todayActions.length - 1 && styles.actionRowBorder,
                                    ]}
                                >
                                    <View style={[
                                        styles.actionCheck,
                                        action.done && styles.actionCheckDone,
                                    ]}>
                                        {action.done && <CheckIcon color={BLACK} />}
                                    </View>
                                    <Text style={[
                                        styles.actionLabel,
                                        action.done && styles.actionLabelDone,
                                    ]}>
                                        {action.label}
                                    </Text>
                                    <Text style={[
                                        styles.actionXP,
                                        action.done && styles.actionXPDone,
                                    ]}>
                                        +{action.xp}
                                    </Text>
                                </View>
                            ))}
                        </View>

                        {/* ── Level Roadmap ── */}
                        <Text style={styles.sectionTitle}>Level Roadmap</Text>

                        {LEVEL_TIERS.map((tier) => {
                            const isUnlocked = progress.totalXP >= tier.xpRequired;
                            const isCurrent = tier.level === currentLevel.level;

                            return (
                                <View
                                    key={tier.level}
                                    style={[styles.tierRow, isCurrent && styles.tierRowCurrent]}
                                >
                                    <View style={[styles.tierBadge, isUnlocked && styles.tierBadgeUnlocked]}>
                                        <PotatoIcon level={tier.level} size={24} opacity={isUnlocked ? 1 : 0.3} />
                                    </View>
                                    <View style={styles.tierInfo}>
                                        <Text style={[styles.tierTitle, !isUnlocked && styles.tierTitleLocked]}>
                                            {tier.level}. {tier.title}
                                        </Text>
                                        <View style={styles.tierUnlockRow}>
                                            {isUnlocked ? (
                                                <CheckIcon color={BLACK} />
                                            ) : (
                                                <LockIcon color="#AAAAAA" />
                                            )}
                                        </View>
                                    </View>
                                    <Text style={[styles.tierXP, !isUnlocked && styles.tierXPLocked]}>
                                        {tier.xpRequired}
                                    </Text>
                                </View>
                            );
                        })}

                        <View style={{ height: 40 }} />
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        maxHeight: '85%',
        backgroundColor: WHITE,
        elevation: 20,
        shadowColor: BLACK,
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
    },
    handleRow: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 4,
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: BLACK + '30',
    },
    closeBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 10,
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F0F0F0',
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },

    // ── Hero ──
    hero: {
        alignItems: 'center',
        paddingTop: 8,
        paddingBottom: 24,
        gap: 4,
    },
    heroRing: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        backgroundColor: YELLOW,
        elevation: 4,
        shadowColor: BLACK,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    heroTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 32,
        color: BLACK,
    },
    heroSubtitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 20,
        marginTop: -2,
        color: BLACK,
    },
    heroXP: {
        fontFamily: 'Inter-Bold',
        fontSize: 13,
        marginTop: 4,
        color: '#777',
    },

    // ── Card ──
    card: {
        borderRadius: 18,
        padding: 16,
        marginBottom: 14,
        backgroundColor: WHITE,
        elevation: 4,
        shadowColor: BLACK,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
    },
    cardRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    cardLabel: {
        fontFamily: 'Inter-Bold',
        fontSize: 18,
        color: BLACK,
    },
    cardValue: {
        fontFamily: 'Inter-Bold',
        fontSize: 13,
        color: '#666',
    },
    xpChip: {
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 3,
        backgroundColor: YELLOW,
    },
    xpChipText: {
        fontFamily: 'Inter-Bold',
        fontSize: 12,
        fontWeight: '700',
        color: BLACK,
    },

    // ── Progress ──
    progressTrack: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
        backgroundColor: '#F0F0F0',
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
        backgroundColor: YELLOW,
    },
    // ── Actions ──
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 9,
        gap: 10,
    },
    actionRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: BLACK + '10',
    },
    actionCheck: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: BLACK + '15',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    actionCheckDone: {
        backgroundColor: YELLOW,
        borderColor: 'transparent',
    },
    actionLabel: {
        flex: 1,
        fontFamily: 'Inter-Bold',
        fontSize: 14,
        color: '#888',
    },
    actionLabelDone: {
        color: BLACK,
    },
    actionXP: {
        fontFamily: 'Inter-Bold',
        fontSize: 13,
        fontWeight: '600',
        color: '#BBBBBB',
    },
    actionXPDone: {
        color: BLACK,
    },

    // ── Roadmap ──
    sectionTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 18,
        marginBottom: 10,
        color: BLACK,
    },
    tierRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 14,
        marginBottom: 4,
        backgroundColor: 'transparent',
    },
    tierRowCurrent: {
        backgroundColor: YELLOW + '40',
    },
    tierBadge: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        backgroundColor: '#F0F0F0',
    },
    tierBadgeUnlocked: {
        backgroundColor: WHITE,
        elevation: 2,
        shadowColor: BLACK,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    tierInfo: {
        flex: 1,
        gap: 2,
    },
    tierTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 14,
        fontWeight: '600',
        color: BLACK,
    },
    tierTitleLocked: {
        color: '#BBBBBB',
    },
    tierUnlockRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    tierXP: {
        fontFamily: 'Inter-Bold',
        fontSize: 12,
        color: '#555',
    },
    tierXPLocked: {
        color: '#CCCCCC',
    },
});
