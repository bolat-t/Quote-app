import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import Svg, { Path as SvgPath } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { UserProgress } from '../types';
import { LEVEL_TIERS, getXPProgress, XP_REWARDS } from '../data/progressionConfig';
import { LevelIcon } from './LevelIcon';

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
// Modal
// ─────────────────────────────────────────────

interface LevelModalProps {
    visible: boolean;
    onClose: () => void;
    progress: UserProgress;
}

export const LevelModal: React.FC<LevelModalProps> = ({ visible, onClose, progress }) => {
    const { theme } = useTheme();
    const { colors } = theme;
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
            <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.35)' }]}>
                <View style={[styles.sheet, { backgroundColor: colors.background }]}>
                    {/* Handle bar */}
                    <View style={styles.handleRow}>
                        <View style={[styles.handle, { backgroundColor: colors.outline + '30' }]} />
                    </View>

                    {/* Close */}
                    <TouchableOpacity
                        style={[styles.closeBtn, { backgroundColor: colors.surfaceVariant }]}
                        onPress={onClose}
                        activeOpacity={0.6}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <XIcon color={colors.onSurfaceVariant} />
                    </TouchableOpacity>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                        {/* ── Hero ── */}
                        <View style={styles.hero}>
                            <View style={[styles.heroRing, { backgroundColor: colors.primaryContainer }]}>
                                <LevelIcon level={currentLevel.level} color={colors.primary} size={32} />
                            </View>
                            <Text style={[styles.heroTitle, { color: colors.onSurface }]}>
                                Level {currentLevel.level}
                            </Text>
                            <Text style={[styles.heroSubtitle, { color: colors.primary }]}>
                                {currentLevel.title}
                            </Text>
                            <Text style={[styles.heroXP, { color: colors.onSurfaceVariant }]}>
                                {progress.totalXP} Total XP
                            </Text>
                        </View>

                        {/* ── Progress to Next ── */}
                        {nextLevel && (
                            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outline + '18' }]}>
                                <View style={styles.cardRow}>
                                    <Text style={[styles.cardLabel, { color: colors.onSurface }]}>
                                        Next: {nextLevel.title}
                                    </Text>
                                    <Text style={[styles.cardValue, { color: colors.onSurfaceVariant }]}>
                                        {xpInCurrentLevel}/{xpNeededForNext} XP
                                    </Text>
                                </View>
                                <View style={[styles.progressTrack, { backgroundColor: colors.surfaceVariant }]}>
                                    <View
                                        style={[
                                            styles.progressFill,
                                            {
                                                backgroundColor: colors.primary,
                                                width: `${Math.min(percentage * 100, 100)}%`,
                                            },
                                        ]}
                                    />
                                </View>
                                <Text style={[styles.unlockHint, { color: colors.primary }]}>
                                    Unlocks: {nextLevel.unlocks}
                                </Text>
                            </View>
                        )}

                        {/* ── Today's Actions ── */}
                        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outline + '18' }]}>
                            <View style={styles.cardRow}>
                                <Text style={[styles.cardLabel, { color: colors.onSurface }]}>
                                    Today's XP
                                </Text>
                                <View style={[styles.xpChip, { backgroundColor: colors.primaryContainer }]}>
                                    <Text style={[styles.xpChipText, { color: colors.onPrimaryContainer }]}>
                                        +{todayXP}
                                    </Text>
                                </View>
                            </View>
                            {todayActions.map((action, i) => (
                                <View
                                    key={i}
                                    style={[
                                        styles.actionRow,
                                        i < todayActions.length - 1 && {
                                            borderBottomWidth: 1,
                                            borderBottomColor: colors.outline + '10',
                                        },
                                    ]}
                                >
                                    <View style={[
                                        styles.actionCheck,
                                        { borderColor: colors.outline + '40' },
                                        action.done && {
                                            backgroundColor: colors.primaryContainer,
                                            borderColor: colors.primary,
                                        },
                                    ]}>
                                        {action.done && <CheckIcon color={colors.primary} />}
                                    </View>
                                    <Text style={[
                                        styles.actionLabel,
                                        { color: colors.onSurfaceVariant },
                                        action.done && { color: colors.onSurface },
                                    ]}>
                                        {action.label}
                                    </Text>
                                    <Text style={[
                                        styles.actionXP,
                                        { color: colors.outline + '60' },
                                        action.done && { color: colors.primary },
                                    ]}>
                                        +{action.xp}
                                    </Text>
                                </View>
                            ))}
                        </View>

                        {/* ── Level Roadmap ── */}
                        <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
                            Level Roadmap
                        </Text>

                        {LEVEL_TIERS.map((tier) => {
                            const isUnlocked = progress.totalXP >= tier.xpRequired;
                            const isCurrent = tier.level === currentLevel.level;

                            return (
                                <View
                                    key={tier.level}
                                    style={[
                                        styles.tierRow,
                                        { borderColor: 'transparent' },
                                        isCurrent && {
                                            backgroundColor: colors.primaryContainer + '40',
                                            borderColor: colors.primary + '30',
                                        },
                                    ]}
                                >
                                    <View style={[
                                        styles.tierBadge,
                                        { backgroundColor: colors.surfaceVariant },
                                        isUnlocked && { backgroundColor: colors.primaryContainer },
                                    ]}>
                                        <LevelIcon
                                            level={tier.level}
                                            color={isUnlocked ? colors.primary : colors.outline}
                                            size={18}
                                        />
                                    </View>
                                    <View style={styles.tierInfo}>
                                        <Text style={[
                                            styles.tierTitle,
                                            { color: colors.onSurface },
                                            !isUnlocked && { color: colors.outline },
                                        ]}>
                                            {tier.level}. {tier.title}
                                        </Text>
                                        <View style={styles.tierUnlockRow}>
                                            {isUnlocked ? (
                                                <CheckIcon color={colors.primary} />
                                            ) : (
                                                <LockIcon color={colors.outline} />
                                            )}
                                            <Text style={[
                                                styles.tierUnlock,
                                                { color: colors.onSurfaceVariant },
                                                !isUnlocked && { color: colors.outline },
                                            ]}>
                                                {tier.unlocks}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={[
                                        styles.tierXP,
                                        { color: colors.onSurfaceVariant },
                                        !isUnlocked && { color: colors.outline },
                                    ]}>
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
    },
    heroTitle: {
        fontFamily: 'Caveat-Bold',
        fontSize: 32,
    },
    heroSubtitle: {
        fontFamily: 'Caveat-Bold',
        fontSize: 20,
        marginTop: -2,
    },
    heroXP: {
        fontFamily: 'Carlito',
        fontSize: 13,
        marginTop: 4,
    },

    // ── Card ──
    card: {
        borderRadius: 18,
        padding: 16,
        marginBottom: 14,
        borderWidth: 1,
    },
    cardRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    cardLabel: {
        fontFamily: 'Caveat-Bold',
        fontSize: 18,
    },
    cardValue: {
        fontFamily: 'Carlito',
        fontSize: 13,
    },
    xpChip: {
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 3,
    },
    xpChipText: {
        fontFamily: 'Carlito',
        fontSize: 12,
        fontWeight: '700',
    },

    // ── Progress ──
    progressTrack: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    unlockHint: {
        fontFamily: 'Carlito',
        fontSize: 12,
        marginTop: 8,
    },

    // ── Actions ──
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 9,
        gap: 10,
    },
    actionCheck: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionLabel: {
        flex: 1,
        fontFamily: 'Carlito',
        fontSize: 14,
    },
    actionXP: {
        fontFamily: 'Carlito',
        fontSize: 13,
        fontWeight: '600',
    },

    // ── Roadmap ──
    sectionTitle: {
        fontFamily: 'Caveat-Bold',
        fontSize: 18,
        marginBottom: 10,
    },
    tierRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 14,
        marginBottom: 4,
        borderWidth: 1,
    },
    tierBadge: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    tierInfo: {
        flex: 1,
        gap: 2,
    },
    tierTitle: {
        fontFamily: 'Carlito',
        fontSize: 14,
        fontWeight: '600',
    },
    tierUnlockRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    tierUnlock: {
        fontFamily: 'Carlito',
        fontSize: 12,
    },
    tierXP: {
        fontFamily: 'Carlito',
        fontSize: 12,
    },
});
