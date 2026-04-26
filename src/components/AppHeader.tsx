import React, { useState, useEffect } from 'react';
import { BLACK, GRAY, WHITE, YELLOW } from '../constants/colors';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Switch,
    Alert,
    Share,
    ActivityIndicator,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useCommitmentMins, useSetCommitmentMins } from '../context/CommitmentContext';
import { useSetTimerSecs } from '../context/TimerSecondsContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';

import { useAuth } from '../context/AuthContext';
import { usePurchase } from '../context/PurchaseContext';
import { useHistoryCalendar } from '../context/HistoryCalendarContext';
import { requestNotificationPermissions, scheduleDailyReminder } from '../utils/notifications';
import { exportJournalData } from '../utils/journalStorage';
import { clearMemory } from '../memory/MemorySystem';
import { AuthModal } from './AuthModal';
import { FeedbackModal } from './FeedbackModal';

const SUBTEXT = '#4B5563';

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const HamburgerIcon = () => (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <Path d="M3 6h18M3 12h18M3 18h18" stroke={BLACK} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
);

const CloseIcon = () => (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <Path d="M18 6L6 18M6 6l12 12" stroke={BLACK} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
);

const CalendarIcon = () => (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <Path
            d="M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"
            stroke={BLACK}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M16 2v4M8 2v4M3 10h18"
            stroke={BLACK}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

// ─── Props ────────────────────────────────────────────────────────────────────

interface AppHeaderProps {
    title: string;
    subtitle?: string;
    currentRoute?: string;
}

// ─── Row helpers ──────────────────────────────────────────────────────────────

interface RowProps {
    label: string;
    subtext?: string;
    onPress?: () => void;
    right?: React.ReactNode;
    disabled?: boolean;
}

const SettingsRow: React.FC<RowProps> = ({ label, subtext, onPress, right, disabled }) => (
    <TouchableOpacity
        style={styles.settingsRow}
        onPress={onPress}
        activeOpacity={onPress ? 0.7 : 1}
        disabled={disabled || !onPress}
    >
        <View style={styles.rowBody}>
            <Text style={styles.settingsLabel}>{label}</Text>
            {subtext ? <Text style={styles.settingsSubtext}>{subtext}</Text> : null}
        </View>
        {right ? <View style={styles.rowRight}>{right}</View> : null}
    </TouchableOpacity>
);

// ─── Focus timer pills ────────────────────────────────────────────────────────

const FOCUS_OPTIONS: { mins: 5 | 10 | 15 | 20; label: string }[] = [
    { mins: 5,  label: '5m'  },
    { mins: 10, label: '10m' },
    { mins: 15, label: '15m' },
    { mins: 20, label: '20m' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export const AppHeader: React.FC<AppHeaderProps> = ({ title, subtitle, currentRoute }) => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { user, signOut } = useAuth();
    const { isPremium } = usePurchase();
    const commitmentMins    = useCommitmentMins();
    const setCommitmentMins = useSetCommitmentMins();
    const setTimerSecs      = useSetTimerSecs();
    const { expanded: calExpanded, toggle: toggleCal } = useHistoryCalendar();
    const isHistory = currentRoute === 'History';
    // focusMins drives which pill is highlighted — derived from shared context so it
    // updates immediately when FocusTimerPickerScreen saves a new value.
    const focusMins = commitmentMins as 5 | 10 | 20;

    const [isExpanded, setIsExpanded] = useState(false);
    const [isAuthVisible, setIsAuthVisible] = useState(false);
    const [isFeedbackVisible, setIsFeedbackVisible] = useState(false);
    const [areNotificationsOn, setAreNotificationsOn] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [localPremium, setLocalPremium] = useState(isPremium);

    const handleFocusPill = async (mins: 5 | 10 | 15 | 20) => {
        // map 15m → 20 commitment bucket
        const commitMins = mins <= 5 ? 5 : mins <= 10 ? 10 : 20;
        await AsyncStorage.setItem('@ulbo_commitment_minutes', String(commitMins));
        await AsyncStorage.setItem('@ulbo_focus_duration_seconds', String(mins * 60));
        setCommitmentMins(commitMins);
        setTimerSecs(mins * 60);
    };

    const handleNotificationToggle = async (value: boolean) => {
        if (!value) {
            setAreNotificationsOn(false);
            Alert.alert('Notifications Disabled', 'Daily reminders turned off.');
        } else {
            const granted = await requestNotificationPermissions();
            if (granted) {
                await scheduleDailyReminder();
                Alert.alert('Reminder Set', "You'll be notified daily at 8:00 AM to reflect.");
                setAreNotificationsOn(true);
            }
        }
    };

    return (
        <View style={styles.headerCard}>
            {/* ── Top Row ── */}
            <View style={styles.headerTop}>
                <View style={styles.titleArea}>
                    <Text style={styles.titleLine}>{title}</Text>
                    {subtitle ? <Text style={styles.titleLine}>{subtitle}</Text> : null}
                </View>
                <View style={styles.headerTopRight}>
                    {isHistory ? (
                        <TouchableOpacity
                            onPress={toggleCal}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            style={styles.hamburgerBtn}
                            accessibilityLabel={calExpanded ? 'Hide calendar' : 'Show calendar'}
                            accessibilityRole="button"
                            accessibilityState={{ expanded: calExpanded }}
                        >
                            <CalendarIcon />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            onPress={() => setIsExpanded(v => !v)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            style={styles.hamburgerBtn}
                            accessibilityLabel={isExpanded ? 'Close settings' : 'Open settings'}
                            accessibilityRole="button"
                            accessibilityState={{ expanded: isExpanded }}
                        >
                            {isExpanded ? <CloseIcon /> : <HamburgerIcon />}
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* ── Settings Panel ── */}
            {isExpanded && (
                <View style={styles.settingsPanel}>
                    <View style={styles.divider} />

                    {/* 1. Cloud Sync */}
                    <SettingsRow
                        label={user && !user.is_anonymous ? 'Sign Out' : 'Sign In'}
                        subtext={user && !user.is_anonymous ? user.email : undefined}
                        onPress={() => {
                            if (user && !user.is_anonymous) {
                                Alert.alert('Sign Out', 'Are you sure?', [
                                    { text: 'Cancel', style: 'cancel' },
                                    { text: 'Sign Out', style: 'destructive', onPress: () => { setIsExpanded(false); signOut(); } },
                                ]);
                            } else {
                                setIsAuthVisible(true);
                            }
                        }}
                    />

                    <View style={styles.divider} />

                    {/* 2. Daily Reminders */}
                    <SettingsRow
                        label="Daily Reminders"
                        subtext="Receive a daily prompt to reflect."
                        right={
                            <Switch
                                trackColor={{ false: '#D0D0D0', true: YELLOW }}
                                thumbColor={areNotificationsOn ? BLACK : '#f4f3f4'}
                                ios_backgroundColor="#D0D0D0"
                                onValueChange={handleNotificationToggle}
                                value={areNotificationsOn}
                            />
                        }
                    />

                    <View style={styles.divider} />

                    {/* 3. Focus Timer — inline pills */}
                    <View style={styles.settingsRow}>
                        <View style={[styles.rowBody, { flex: 1 }]}>
                            <Text style={styles.settingsLabel}>Focus Timer</Text>
                            <Text style={styles.settingsSubtext}>Default journaling session length</Text>
                            <View style={styles.pillRow}>
                                {FOCUS_OPTIONS.map(o => {
                                    const active = focusMins === o.mins;
                                    return (
                                        <TouchableOpacity
                                            key={o.mins}
                                            style={[styles.pill, active && styles.pillActive]}
                                            onPress={() => handleFocusPill(o.mins)}
                                            activeOpacity={0.75}
                                        >
                                            <Text style={[styles.pillText, active && styles.pillTextActive]}>
                                                {o.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    {/* 4. Export Journal */}
                    <SettingsRow
                        label="Export Journal Data"
                        disabled={isExporting}
                        right={isExporting ? <ActivityIndicator size="small" color={BLACK} /> : undefined}
                        onPress={async () => {
                            setIsExpanded(false);
                            setIsExporting(true);
                            try {
                                const result = await exportJournalData();
                                if (result.success && result.data) {
                                    await Share.share({ message: result.data, title: result.filename });
                                } else {
                                    Alert.alert('Export Failed', 'Could not generate export data.');
                                }
                            } catch {
                                Alert.alert('Error', 'An error occurred during export.');
                            } finally {
                                setIsExporting(false);
                            }
                        }}
                    />

                    <View style={styles.divider} />

                    {/* 5. Give Feedback */}
                    <SettingsRow
                        label="Give Feedback"
                        onPress={() => { setIsExpanded(false); setTimeout(() => setIsFeedbackVisible(true), 300); }}
                    />

                    <View style={styles.divider} />

                    {/* 6. Clear Mascot Memory */}
                    <SettingsRow
                        label="Clear Mascot Memory"
                        subtext="Resets what your mascot remembers."
                        onPress={() => Alert.alert(
                            'Clear Mascot Memory?',
                            'Resets what your mascot remembers about your mood.',
                            [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Clear', style: 'destructive', onPress: async () => { await clearMemory(); setIsExpanded(false); Alert.alert('Cleared', 'Mascot has a fresh start.'); } },
                            ]
                        )}
                    />

                    {/* ── Dev section ── */}
                    <View style={[styles.divider, { marginTop: 8, height: 2, backgroundColor: '#E0E0E0' }]} />

                    {/* 7. Premium Mode */}
                    <SettingsRow
                        label="Premium Mode"
                        right={
                            <Switch
                                trackColor={{ false: '#D0D0D0', true: YELLOW }}
                                thumbColor={localPremium ? BLACK : '#f4f3f4'}
                                ios_backgroundColor="#D0D0D0"
                                onValueChange={async (value) => {
                                    await AsyncStorage.setItem('@ulbo_is_premium', value ? 'true' : 'false');
                                    setLocalPremium(value);
                                }}
                                value={localPremium}
                            />
                        }
                    />

                    <View style={styles.divider} />

                    {/* 8. Onboarding */}
                    <SettingsRow
                        label="Onboarding"
                        onPress={() => { setIsExpanded(false); Alert.alert('Onboarding', 'A restart would be required to redo onboarding.'); }}
                    />

                    <View style={styles.divider} />

                    {/* 9. Paywall */}
                    <SettingsRow
                        label="Paywall"
                        onPress={() => { setIsExpanded(false); navigation.navigate('Paywall'); }}
                    />
                </View>
            )}

            {/* ── Modals ── */}
            <AuthModal visible={isAuthVisible} onClose={() => setIsAuthVisible(false)} />
            <FeedbackModal visible={isFeedbackVisible} onClose={() => setIsFeedbackVisible(false)} />
        </View>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    headerCard: {
        backgroundColor: WHITE,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        paddingTop: 14,
        paddingBottom: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 4,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 60,
        paddingHorizontal: 32,
    },
    titleArea: {
        flex: 1,
        justifyContent: 'center',
    },
    titleLine: {
        fontFamily: 'Inter-Bold',
        fontSize: 24,
        color: BLACK,
        lineHeight: 30,
    },
    headerTopRight: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        gap: 4,
    },
    hamburgerBtn: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingsPanel: {
        marginTop: 4,
        paddingHorizontal: 16,
    },
    divider: {
        height: 1,
        backgroundColor: '#EEEEEE',
    },
    settingsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        gap: 12,
    },
    rowBody: {
        flex: 1,
        gap: 2,
    },
    rowRight: {
        marginLeft: 8,
    },
    settingsLabel: {
        fontFamily: 'Inter-Medium',
        fontSize: 20,
        color: BLACK,
        lineHeight: 26,
    },
    settingsSubtext: {
        fontFamily: 'Inter-Medium',
        fontSize: 12,
        color: SUBTEXT,
        lineHeight: 16,
    },
    // Focus timer pills
    pillRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 10,
        flexWrap: 'wrap',
    },
    pill: {
        borderWidth: 1.5,
        borderColor: BLACK,
        borderRadius: 50,
        paddingHorizontal: 16,
        paddingVertical: 6,
    },
    pillActive: {
        backgroundColor: YELLOW,
        borderColor: BLACK,
    },
    pillText: {
        fontFamily: 'Inter-Medium',
        fontSize: 14,
        color: BLACK,
    },
    pillTextActive: {
        color: BLACK,
    },
});
