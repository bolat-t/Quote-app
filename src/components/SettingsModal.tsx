import React, { useState } from 'react';
import {
    View, Text, StyleSheet, Modal, TouchableOpacity,
    Switch, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { Svg, Path, Circle } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { usePurchase } from '../context/PurchaseContext';
import { AuthModal } from './AuthModal';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';

const YELLOW = '#FFE600';
const BLACK  = '#000000';
const WHITE  = '#FFFFFF';
const GRAY   = '#F2F2F2';
const MUTED  = '#AAAAAA';

interface SettingsModalProps {
    visible: boolean;
    onClose: () => void;
    onNotificationToggle: () => void;
    areNotificationsEnabled: boolean;
    onExportData: () => Promise<void>;
    isExporting?: boolean;
    onFeedback: () => void;
    onShowOnboarding?: () => void;
    onClearMemory?: () => Promise<void>;
}

// ─── Section header ──────────────────────────────────────────────────────────

const Section: React.FC<{ label: string }> = ({ label }) => (
    <View style={sec.row}>
        <Text style={sec.label}>{label}</Text>
        <View style={sec.line} />
    </View>
);
const sec = StyleSheet.create({
    row:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6, marginTop: 18 },
    label: { fontFamily: 'OpenSans-SemiBold', fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: 1.3 },
    line:  { flex: 1, height: 1, backgroundColor: BLACK + '14' },
});

// ─── Row patterns ─────────────────────────────────────────────────────────────

/** Nav row: icon + label + optional description + chevron */
const NavRow: React.FC<{
    icon: React.ReactNode;
    label: string;
    sub?: string;
    onPress: () => void;
}> = ({ icon, label, sub, onPress }) => (
    <TouchableOpacity style={row.wrap} onPress={onPress} activeOpacity={0.7}>
        <View style={row.iconWrap}>{icon}</View>
        <View style={{ flex: 1 }}>
            <Text style={row.label}>{label}</Text>
            {sub ? <Text style={row.sub}>{sub}</Text> : null}
        </View>
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path d="M9 18l6-6-6-6" stroke={BLACK + '50'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    </TouchableOpacity>
);

/** Toggle row: icon + label + optional description + switch */
const ToggleRow: React.FC<{
    icon: React.ReactNode;
    label: string;
    sub?: string;
    value: boolean;
    onToggle: () => void;
}> = ({ icon, label, sub, value, onToggle }) => (
    <View style={row.wrap}>
        <View style={row.iconWrap}>{icon}</View>
        <View style={{ flex: 1 }}>
            <Text style={row.label}>{label}</Text>
            {sub ? <Text style={row.sub}>{sub}</Text> : null}
        </View>
        <Switch
            trackColor={{ false: '#D0D0D0', true: YELLOW + '99' }}
            thumbColor={value ? YELLOW : '#f4f3f4'}
            ios_backgroundColor="#D0D0D0"
            onValueChange={onToggle}
            value={value}
        />
    </View>
);

/** Action row: icon + label + right element */
const ActionRow: React.FC<{
    icon: React.ReactNode;
    label: string;
    sub?: string;
    right?: React.ReactNode;
    onPress: () => void;
    disabled?: boolean;
}> = ({ icon, label, sub, right, onPress, disabled }) => (
    <TouchableOpacity style={row.wrap} onPress={onPress} activeOpacity={0.7} disabled={disabled}>
        <View style={row.iconWrap}>{icon}</View>
        <View style={{ flex: 1 }}>
            <Text style={[row.label, disabled && { color: MUTED }]}>{label}</Text>
            {sub ? <Text style={row.sub}>{sub}</Text> : null}
        </View>
        {right}
    </TouchableOpacity>
);

const row = StyleSheet.create({
    wrap:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, gap: 12 },
    iconWrap:{ width: 32, height: 32, borderRadius: 8, backgroundColor: GRAY, alignItems: 'center', justifyContent: 'center' },
    label:   { fontFamily: 'MontserratAlternates-Bold', fontSize: 15, color: BLACK },
    sub:     { fontFamily: 'OpenSans-SemiBold', fontSize: 12, color: MUTED, marginTop: 1 },
});

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const sz = 16;
const IconUser     = () => <Svg width={sz} height={sz} viewBox="0 0 24 24" fill="none"><Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={BLACK} strokeWidth={1.8} strokeLinecap="round"/><Circle cx="12" cy="7" r="4" stroke={BLACK} strokeWidth={1.8}/></Svg>;
const IconBell     = () => <Svg width={sz} height={sz} viewBox="0 0 24 24" fill="none"><Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={BLACK} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/><Path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={BLACK} strokeWidth={1.8} strokeLinecap="round"/></Svg>;
const IconTimer    = () => <Svg width={sz} height={sz} viewBox="0 0 24 24" fill="none"><Circle cx="12" cy="12" r="9" stroke={BLACK} strokeWidth={1.8}/><Path d="M12 7v5l3 2" stroke={BLACK} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/></Svg>;
const IconDownload = () => <Svg width={sz} height={sz} viewBox="0 0 24 24" fill="none"><Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke={BLACK} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/><Path d="M7 10l5 5 5-5M12 15V3" stroke={BLACK} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/></Svg>;
const IconChat     = () => <Svg width={sz} height={sz} viewBox="0 0 24 24" fill="none"><Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke={BLACK} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/></Svg>;
const IconTrash    = () => <Svg width={sz} height={sz} viewBox="0 0 24 24" fill="none"><Path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" stroke={BLACK} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/></Svg>;
const IconWrench   = () => <Svg width={sz} height={sz} viewBox="0 0 24 24" fill="none"><Path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" stroke={BLACK} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/></Svg>;

// ─── Main component ───────────────────────────────────────────────────────────

export const SettingsModal: React.FC<SettingsModalProps> = ({
    visible,
    onClose,
    onNotificationToggle,
    areNotificationsEnabled,
    onExportData,
    isExporting = false,
    onFeedback,
    onShowOnboarding,
    onClearMemory,
}) => {
    const { user, signOut } = useAuth();
    const { isPremium }     = usePurchase();
    const [isAuthModalVisible, setIsAuthModalVisible] = useState(false);
    const [localPremium,       setLocalPremium]       = useState(isPremium);
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

    const handleSignOut = () => {
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: async () => { await signOut(); } },
        ]);
    };

    const nav = (screen: keyof RootStackParamList) => {
        onClose();
        navigation.navigate(screen as any);
    };

    return (
        <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
            <View style={styles.overlay}>
                <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />

                <View style={styles.sheet}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Settings</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                                <Path d="M18 6L6 18M6 6L18 18" stroke={BLACK} strokeWidth={2} strokeLinecap="round" />
                            </Svg>
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>

                        {/* ── Account ── */}
                        <Section label="Account" />
                        <ActionRow
                            icon={<IconUser />}
                            label="Cloud Sync"
                            sub={user ? `Signed in as ${user.email}` : 'Back up your journal'}
                            onPress={() => user ? handleSignOut() : setIsAuthModalVisible(true)}
                            right={
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{user ? 'Sign Out' : 'Sign In'}</Text>
                                </View>
                            }
                        />

                        {/* ── Productivity ── */}
                        <Section label="Productivity" />
                        <ToggleRow
                            icon={<IconBell />}
                            label="Daily Reminders"
                            sub="Get nudged to reflect each day"
                            value={areNotificationsEnabled}
                            onToggle={onNotificationToggle}
                        />
                        <NavRow
                            icon={<IconBell />}
                            label="Reminder Settings"
                            sub="Times, frequency & days"
                            onPress={() => nav('ReminderSettings')}
                        />
                        <NavRow
                            icon={<IconTimer />}
                            label="Focus Timer"
                            sub="Set your session length"
                            onPress={() => nav('FocusTimerPicker')}
                        />

                        {/* ── Data ── */}
                        <Section label="Data" />
                        <ActionRow
                            icon={<IconDownload />}
                            label="Export Journal"
                            sub="Download your reflections as JSON"
                            onPress={onExportData}
                            disabled={isExporting}
                            right={
                                isExporting
                                    ? <ActivityIndicator size="small" color={YELLOW} />
                                    : <View style={styles.badge}><Text style={styles.badgeText}>Export</Text></View>
                            }
                        />

                        {/* ── Support ── */}
                        <Section label="Support" />
                        <NavRow
                            icon={<IconChat />}
                            label="Give Feedback"
                            sub="Bug reports & suggestions"
                            onPress={() => { onClose(); setTimeout(() => onFeedback(), 400); }}
                        />
                        <ActionRow
                            icon={<IconTrash />}
                            label="Clear Mascot Memory"
                            sub="Resets mood pattern memory"
                            onPress={() => {
                                Alert.alert(
                                    'Clear Mascot Memory?',
                                    "Resets what your mascot remembers about your mood. Journal entries stay safe.",
                                    [
                                        { text: 'Cancel', style: 'cancel' },
                                        { text: 'Clear', style: 'destructive', onPress: async () => {
                                            if (onClearMemory) {
                                                await onClearMemory();
                                                Alert.alert('Cleared', 'Mascot has a fresh start.');
                                            }
                                        }},
                                    ]
                                );
                            }}
                        />

                        {/* ── Dev Tools ── */}
                        <Section label="Dev Tools" />

                        <View style={row.wrap}>
                            <View style={row.iconWrap}><IconWrench /></View>
                            <View style={{ flex: 1 }}>
                                <Text style={row.label}>Premium Mode</Text>
                                <Text style={row.sub}>{localPremium ? 'All features unlocked' : 'Free version'}</Text>
                            </View>
                            <Switch
                                trackColor={{ false: '#D0D0D0', true: YELLOW + '99' }}
                                thumbColor={localPremium ? YELLOW : '#f4f3f4'}
                                ios_backgroundColor="#D0D0D0"
                                onValueChange={async (value) => {
                                    await AsyncStorage.setItem('@ulbo_is_premium', value ? 'true' : 'false');
                                    setLocalPremium(value);
                                    Alert.alert(
                                        value ? 'Premium Enabled' : 'Premium Disabled',
                                        'Restart the app for full effect.',
                                    );
                                }}
                                value={localPremium}
                            />
                        </View>

                        <View style={styles.devBtnRow}>
                            <TouchableOpacity
                                style={styles.devBtn}
                                onPress={() => { onClose(); if (onShowOnboarding) onShowOnboarding(); }}
                            >
                                <Text style={styles.devBtnText}>Onboarding</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.devBtn}
                                onPress={() => nav('Paywall')}
                            >
                                <Text style={styles.devBtnText}>Paywall</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={{ height: 8 }} />

                    </ScrollView>

                    <View style={styles.footer}>
                        <Text style={styles.version}>ulbo. v1.0.1</Text>
                    </View>
                </View>
            </View>

            <AuthModal visible={isAuthModalVisible} onClose={() => setIsAuthModalVisible(false)} />
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center', alignItems: 'center',
    },
    sheet: {
        width: '88%', maxWidth: 420, maxHeight: '88%',
        backgroundColor: WHITE,
        borderRadius: 24, borderWidth: 2, borderColor: BLACK,
        paddingHorizontal: 20, paddingTop: 20, paddingBottom: 0,
    },
    header: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 4,
    },
    title: {
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        fontSize: 22, color: BLACK,
    },
    closeBtn: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: GRAY, alignItems: 'center', justifyContent: 'center',
    },
    badge: {
        backgroundColor: GRAY, borderRadius: 8,
        paddingHorizontal: 10, paddingVertical: 5,
        borderWidth: 1, borderColor: BLACK + '18',
    },
    badgeText: { fontFamily: 'OpenSans-SemiBold', fontSize: 12, color: BLACK },
    devBtnRow: { flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 8 },
    devBtn: {
        flex: 1, paddingVertical: 10, borderRadius: 10,
        backgroundColor: YELLOW + '22', borderWidth: 1.5, borderColor: YELLOW,
        alignItems: 'center',
    },
    devBtnText: { fontFamily: 'OpenSans-SemiBold', fontSize: 13, color: BLACK },
    footer: {
        paddingVertical: 14, borderTopWidth: 1, borderTopColor: BLACK + '12',
        alignItems: 'center',
    },
    version: { fontFamily: 'OpenSans-SemiBold', fontSize: 11, color: MUTED },
});

export default SettingsModal;
