import React, { useState } from 'react';
import { BLACK, WHITE, YELLOW } from '../constants/colors';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Switch,
    Alert,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import i18n from '../lib/i18n';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';

import { useAuth } from '../context/AuthContext';
import { usePurchase } from '../context/PurchaseContext';
import { useHistoryCalendar } from '../context/HistoryCalendarContext';
import { useOnboarding } from '../context/OnboardingContext';
import { AuthModal } from './AuthModal';
import { FeedbackModal } from './FeedbackModal';
import { useTranslation } from 'react-i18next';

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

// ─── Component ────────────────────────────────────────────────────────────────

export const AppHeader: React.FC<AppHeaderProps> = ({ title, subtitle, currentRoute }) => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { user, signOut } = useAuth();
    const { isPremium } = usePurchase();
    const { expanded: calExpanded, toggle: toggleCal } = useHistoryCalendar();
    const { isActive: isOnboarding, progress: onboardingProgress } = useOnboarding();
    const { t } = useTranslation();
    const isHistory = currentRoute === 'History';

    const [isExpanded, setIsExpanded]                   = useState(false);
    const [isAuthVisible, setIsAuthVisible]             = useState(false);
    const [isFeedbackVisible, setIsFeedbackVisible]     = useState(false);
    const [localPremium, setLocalPremium]               = useState(isPremium);
    const [localLang, setLocalLang]                     = useState<'en' | 'ko'>(
        i18n.language.startsWith('ko') ? 'ko' : 'en'
    );

    return (
        <View style={styles.headerCard}>
            {/* ── Top Row ── */}
            <View style={styles.headerTop}>
                <View style={styles.titleArea}>
                    <Text style={styles.titleLine}>{title}</Text>
                    {/* During onboarding, the second title line is replaced by a
                        progress pill so the header doubles as the progress UI. */}
                    {isOnboarding ? (
                        <View style={styles.progressOuter}>
                            <View style={[styles.progressInner, { width: `${onboardingProgress * 100}%` }]} />
                        </View>
                    ) : (
                        subtitle ? <Text style={styles.titleLine}>{subtitle}</Text> : null
                    )}
                </View>
                <View style={styles.headerTopRight}>
                    {isHistory ? (
                        <TouchableOpacity
                            onPress={toggleCal}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            style={styles.hamburgerBtn}
                            accessibilityLabel={calExpanded ? t('header.hide_calendar') : t('header.show_calendar')}
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
                            accessibilityLabel={isExpanded ? t('header.close_settings') : t('header.open_settings')}
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
                        label={user && !user.is_anonymous ? t('header.sign_out') : t('header.sign_in')}
                        subtext={user && !user.is_anonymous ? user.email : undefined}
                        onPress={() => {
                            if (user && !user.is_anonymous) {
                                Alert.alert(t('header.signout_confirm_title'), t('header.signout_confirm_message'), [
                                    { text: t('header.signout_confirm_cancel'), style: 'cancel' },
                                    { text: t('header.signout_confirm_action'), style: 'destructive', onPress: () => { setIsExpanded(false); signOut(); } },
                                ]);
                            } else {
                                setIsAuthVisible(true);
                            }
                        }}
                    />

                    <View style={styles.divider} />

                    {/* 2. Daily Reminders — opens the picker so the user chooses time + days */}
                    <SettingsRow
                        label={t('header.reminders')}
                        subtext={t('header.reminders_sub')}
                        onPress={() => {
                            setIsExpanded(false);
                            navigation.navigate('ReminderSettings');
                        }}
                    />

                    <View style={styles.divider} />

                    {/* 3. Give Feedback */}
                    <SettingsRow
                        label={t('header.feedback')}
                        onPress={() => { setIsExpanded(false); setTimeout(() => setIsFeedbackVisible(true), 300); }}
                    />

                    {/* ── Dev section ── */}
                    <View style={[styles.divider, { marginTop: 8, height: 2, backgroundColor: '#E0E0E0' }]} />

                    {/* 7. Premium Mode */}
                    <SettingsRow
                        label={t('header.premium')}
                        right={
                            <Switch
                                trackColor={{ false: '#D0D0D0', true: YELLOW }}
                                thumbColor={localPremium ? BLACK : '#f4f3f4'}
                                ios_backgroundColor="#D0D0D0"
                                onValueChange={async (value) => {
                                    await AsyncStorage.setItem(STORAGE_KEYS.IS_PREMIUM, value ? 'true' : 'false');
                                    setLocalPremium(value);
                                }}
                                value={localPremium}
                            />
                        }
                    />

                    <View style={styles.divider} />

                    {/* Language switcher — dev tool for testing translations */}
                    <SettingsRow
                        label="Language"
                        subtext={localLang === 'ko' ? '한국어' : 'English'}
                        right={
                            <Switch
                                trackColor={{ false: '#D0D0D0', true: YELLOW }}
                                thumbColor={localLang === 'ko' ? BLACK : '#f4f3f4'}
                                ios_backgroundColor="#D0D0D0"
                                onValueChange={async (value) => {
                                    const next = value ? 'ko' : 'en';
                                    await AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE, next);
                                    i18n.changeLanguage(next);
                                    setLocalLang(next);
                                }}
                                value={localLang === 'ko'}
                            />
                        }
                    />

                    <View style={styles.divider} />

                    {/* 8. Onboarding — re-runs the welcome flow on demand.
                         Clears the completion flag and routes to Home; HubScreen
                         re-checks the flag on focus and renders the inline overlay. */}
                    <SettingsRow
                        label={t('header.onboarding')}
                        subtext={t('header.onboarding_sub')}
                        onPress={async () => {
                            setIsExpanded(false);
                            await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_DONE, 'false');
                            // @ts-expect-error — Tabs route accepts no params; navigation is typed loosely here.
                            navigation.navigate('Tabs', { screen: 'Home' });
                        }}
                    />

                    <View style={styles.divider} />

                    {/* 9. Paywall */}
                    <SettingsRow
                        label={t('header.paywall')}
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
    // Progress pill that replaces the subtitle line during onboarding.
    // Light grey track + yellow fill — the white headerCard would swallow a
    // pure-white track, so we use #EEEEEE here instead.
    progressOuter: {
        height:          14,
        borderRadius:    50,
        backgroundColor: '#EEEEEE',
        padding:         2,
        overflow:        'hidden',
        marginTop:       8,
        width:           '85%',
    },
    progressInner: {
        height:          '100%',
        backgroundColor: YELLOW,
        borderRadius:    50,
        minWidth:        12,
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
        paddingHorizontal: 32, // matches headerTop padding so rows align with the title
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
});
