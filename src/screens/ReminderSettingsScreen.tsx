import React, { useState, useEffect } from 'react';
import { BLACK, GRAY, WHITE, YELLOW } from '../constants/colors';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, Modal, Alert, Dimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
    useSharedValue, withSpring, useAnimatedStyle,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WheelPicker } from '../components/WheelPicker';
import { requestNotificationPermissions, scheduleDailyReminder } from '../utils/notifications';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { useTranslation } from 'react-i18next';

const { height: SCREEN_H } = Dimensions.get('window');
const MUTED   = '#9A9A9A';
const DIVIDER = BLACK + '0D';

const HOURS   = ['1','2','3','4','5','6','7','8','9','10','11','12'];
const MINUTES = ['00','05','10','15','20','25','30','35','40','45','50','55'];

type FrequencyOption = 'daily' | 'weekdays' | 'specific';

const DAYS     = ['S','M','T','W','T','F','S'];
const DAY_KEYS = ['sun','mon','tue','wed','thu','fri','sat'] as const;

const formatTime = (hourIdx: number, minIdx: number, isPM: boolean): string =>
    `${HOURS[hourIdx]}:${MINUTES[minIdx]} ${isPM ? 'PM' : 'AM'}`;

// ─── Section label ─────────────────────────────────────────────────────────────

const SectionLabel: React.FC<{ label: string }> = ({ label }) => (
    <Text style={secSt.text}>{label}</Text>
);
const secSt = StyleSheet.create({
    text: {
        fontFamily: 'Inter-Bold', fontSize: 11, color: MUTED,
        textTransform: 'uppercase', letterSpacing: 1.2,
        marginBottom: 10, marginTop: 22, marginLeft: 4,
    },
});

// ─── Soft toggle ───────────────────────────────────────────────────────────────

const SoftToggle: React.FC<{ value: boolean; onToggle: () => void }> = ({ value, onToggle }) => {
    const thumbX = useSharedValue(value ? 20 : 0);
    const handlePress = () => {
        thumbX.value = withSpring(value ? 0 : 20, { damping: 14, stiffness: 200 });
        onToggle();
    };
    const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: thumbX.value }] }));
    return (
        <TouchableOpacity onPress={handlePress} activeOpacity={0.85}
            style={[togSt.track, value && togSt.trackActive]}>
            <Animated.View style={[togSt.thumb, value && togSt.thumbActive, thumbStyle]} />
        </TouchableOpacity>
    );
};
const togSt = StyleSheet.create({
    track:       { width: 48, height: 28, borderRadius: 14, backgroundColor: '#D6D6D6', padding: 3, justifyContent: 'center' },
    trackActive: { backgroundColor: YELLOW },
    thumb:       { width: 22, height: 22, borderRadius: 11, backgroundColor: WHITE },
    thumbActive: { backgroundColor: BLACK },
});

// ─── DayBubble ─────────────────────────────────────────────────────────────────

const DayBubble: React.FC<{ label: string; active: boolean; onPress: () => void }> = ({ label, active, onPress }) => {
    const scale = useSharedValue(1);
    const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
    const handlePress = () => {
        scale.value = withSpring(0.88, { duration: 80 }, () => { scale.value = withSpring(1, { duration: 140 }); });
        onPress();
    };
    return (
        <TouchableOpacity onPress={handlePress} activeOpacity={1}>
            <Animated.View style={[daySt.bubble, active && daySt.active, aStyle]}>
                <Text style={[daySt.label, active && daySt.labelActive]}>{label}</Text>
            </Animated.View>
        </TouchableOpacity>
    );
};
const daySt = StyleSheet.create({
    bubble:      { width: 40, height: 40, borderRadius: 20, backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center' },
    active:      { backgroundColor: YELLOW },
    label:       { fontFamily: 'Inter-Medium', fontSize: 13, color: MUTED },
    labelActive: { color: BLACK, fontFamily: 'Inter-Bold' },
});

// ─── Component ────────────────────────────────────────────────────────────────

interface Props { visible: boolean; onClose: () => void; }

const STORAGE_KEY = STORAGE_KEYS.REMINDER_SETTINGS;

export const ReminderSettingsScreen: React.FC<Props> = ({ visible, onClose }) => {
    const { t } = useTranslation();

    const FREQ_OPTIONS: { value: FrequencyOption; label: string; sub: string }[] = [
        { value: 'daily',    label: t('reminders.freq_daily_label'),    sub: t('reminders.freq_daily_sub') },
        { value: 'weekdays', label: t('reminders.freq_weekdays_label'), sub: t('reminders.freq_weekdays_sub') },
        { value: 'specific', label: t('reminders.freq_specific_label'), sub: t('reminders.freq_specific_sub') },
    ];

    const [enabled,    setEnabled]    = useState(true);
    const [reminders,  setReminders]  = useState<string[]>(['7:00 AM']);
    const [freq,       setFreq]       = useState<FrequencyOption>('daily');
    const [activeDays, setActiveDays] = useState<Set<number>>(new Set([1,2,3,4,5]));
    const [isSaving,   setIsSaving]   = useState(false);
    const [saved,      setSaved]      = useState(false);

    // Reset success state when the modal closes
    useEffect(() => {
        if (!visible) setSaved(false);
    }, [visible]);

    // Load persisted settings each time the modal opens
    useEffect(() => {
        if (!visible) return;
        (async () => {
            try {
                const stored = await AsyncStorage.getItem(STORAGE_KEY);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (parsed.enabled   !== undefined) setEnabled(parsed.enabled);
                    if (parsed.reminders)               setReminders(parsed.reminders);
                    if (parsed.freq)                    setFreq(parsed.freq);
                    if (parsed.activeDays)              setActiveDays(new Set(parsed.activeDays));
                }
            } catch { /* use defaults */ }
        })();
    }, [visible]);

    // Time picker state
    const [pickerVisible, setPickerVisible] = useState(false);
    const [pickHour,      setPickHour]      = useState(6);
    const [pickMin,       setPickMin]       = useState(0);
    const [pickIsPM,      setPickIsPM]      = useState(false);

    const openPicker = () => {
        setPickHour(6); setPickMin(0); setPickIsPM(false);
        setPickerVisible(true);
    };

    const confirmTime = () => {
        setReminders(prev => [...prev, formatTime(pickHour, pickMin, pickIsPM)]);
        setPickerVisible(false);
    };

    const removeReminder = (i: number) =>
        setReminders(prev => prev.filter((_, idx) => idx !== i));

    const toggleDay = (i: number) => {
        setActiveDays(prev => {
            const next = new Set(prev);
            next.has(i) ? next.delete(i) : next.add(i);
            return next;
        });
    };

    const btnScale = useSharedValue(1);
    const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

    const handleSave = async () => {
        btnScale.value = withSpring(0.94, { duration: 80 }, () => {
            btnScale.value = withSpring(1, { duration: 120 });
        });
        setIsSaving(true);
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
                enabled,
                reminders,
                freq,
                activeDays: Array.from(activeDays),
            }));

            if (enabled && reminders.length > 0) {
                const granted = await requestNotificationPermissions();
                if (granted) {
                    const first = reminders[0];
                    const [timePart, meridiem] = first.split(' ');
                    const [h, m] = timePart.split(':').map(Number);
                    const hour = meridiem === 'PM' && h !== 12 ? h + 12 : (meridiem === 'AM' && h === 12 ? 0 : h);
                    await scheduleDailyReminder(hour, m);
                } else {
                    Alert.alert(t('reminders.permission_title'), t('reminders.permission_message'));
                }
            }

            setSaved(true);   // ← inline success instead of Alert + goBack
        } catch {
            Alert.alert(t('reminders.error_title'), t('reminders.error_message'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleBackdropPress = () => {
        if (pickerVisible) setPickerVisible(false);
        else onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={handleBackdropPress}
        >
            <View style={st.overlay}>
                {/* Dimmed backdrop — earlier in tree so the card sits on top */}
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={handleBackdropPress}
                />

                {/* ── Main floating card ── */}
                <View style={st.card}>
                    {saved ? (
                        /* ── Inline success state ── */
                        <View style={st.successContainer}>
                            <View style={st.successIconWrap}>
                                <Svg width={44} height={44} viewBox="0 0 24 24" fill="none">
                                    <Path
                                        d="M20 6L9 17l-5-5"
                                        stroke={BLACK} strokeWidth={2.6}
                                        strokeLinecap="round" strokeLinejoin="round"
                                    />
                                </Svg>
                            </View>
                            <Text style={st.successTitle}>{t('reminders.saved_title')}</Text>
                            <Text style={st.successMsg}>
                                {enabled
                                    ? t('reminders.active_count', { count: reminders.length })
                                    : t('reminders.all_off')
                                }
                            </Text>
                            <TouchableOpacity style={st.doneButton} onPress={onClose}>
                                <Text style={st.doneButtonText}>{t('reminders.done')}</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <>
                            {/* Drag handle */}
                            <View style={st.handle} />

                            {/* Header */}
                            <View style={st.cardHeader}>
                                <Text style={st.headerTitle}>{t('reminders.title')}</Text>
                                <TouchableOpacity onPress={onClose} style={st.closeBtn}>
                                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                                        <Path
                                            d="M18 6L6 18M6 6L18 18"
                                            stroke={BLACK} strokeWidth={2.5}
                                            strokeLinecap="round" strokeLinejoin="round"
                                        />
                                    </Svg>
                                </TouchableOpacity>
                            </View>

                            {/* Scrollable content — maxHeight keeps the card on-screen */}
                            <ScrollView
                                contentContainerStyle={st.scroll}
                                showsVerticalScrollIndicator={false}
                                style={{ maxHeight: SCREEN_H * 0.66 }}
                            >
                                {/* Master toggle */}
                                <View style={[st.toggleCard, enabled && st.toggleCardActive]}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={st.toggleTitle}>{t('header.reminders')}</Text>
                                        <Text style={st.toggleSub}>
                                            {enabled
                                                ? t('reminders.active_count', { count: reminders.length })
                                                : t('reminders.all_off')}
                                        </Text>
                                    </View>
                                    <SoftToggle value={enabled} onToggle={() => setEnabled(v => !v)} />
                                </View>

                                {/* Dimmed when off */}
                                <View style={[st.block, !enabled && st.blockDisabled]}
                                    pointerEvents={enabled ? 'auto' : 'none'}>

                                    {/* Reminder times list */}
                                    <SectionLabel label={t('reminders.section_times')} />
                                    <View style={st.groupCard}>
                                        {reminders.length === 0 && (
                                            <View style={st.emptyRow}>
                                                <Text style={st.emptyText}>{t('reminders.no_reminders')}</Text>
                                            </View>
                                        )}
                                        {reminders.map((r, i) => (
                                            <View
                                                key={`${r}-${i}`}
                                                style={[st.timeRow, i < reminders.length - 1 && st.rowDivider]}
                                            >
                                                <Text style={st.timeText}>{r}</Text>
                                                <TouchableOpacity
                                                    onPress={() => removeReminder(i)}
                                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                    style={st.removeBtn}
                                                >
                                                    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
                                                        <Path d="M18 6L6 18M6 6L18 18" stroke={MUTED} strokeWidth={2.4}
                                                            strokeLinecap="round" strokeLinejoin="round" />
                                                    </Svg>
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                        <TouchableOpacity style={st.addRow} onPress={openPicker} activeOpacity={0.7}>
                                            <View style={st.addIcon}>
                                                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                                                    <Path d="M12 5v14M5 12h14" stroke={BLACK} strokeWidth={2.6}
                                                        strokeLinecap="round" strokeLinejoin="round" />
                                                </Svg>
                                            </View>
                                            <Text style={st.addText}>{t('reminders.add_reminder')}</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Frequency */}
                                    <SectionLabel label={t('reminders.section_repeat')} />
                                    <View style={st.groupCard}>
                                        {FREQ_OPTIONS.map((opt, i) => {
                                            const active = freq === opt.value;
                                            return (
                                                <TouchableOpacity
                                                    key={opt.value}
                                                    style={[st.freqRow, i < FREQ_OPTIONS.length - 1 && st.rowDivider]}
                                                    onPress={() => setFreq(opt.value)}
                                                    activeOpacity={0.7}
                                                >
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={[st.freqLabel, active && st.freqLabelActive]}>{opt.label}</Text>
                                                        <Text style={st.freqSub}>{opt.sub}</Text>
                                                    </View>
                                                    <View style={[st.radioDot, active && st.radioDotActive]}>
                                                        {active && <View style={st.radioFill} />}
                                                    </View>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>

                                    {/* Day picker — only when Specific selected */}
                                    {freq === 'specific' && (
                                        <View style={[st.groupCard, { padding: 16, marginTop: 8 }]}>
                                            <Text style={st.daysHint}>{t('reminders.days_hint')}</Text>
                                            <View style={st.daysRow}>
                                                {DAYS.map((d, i) => (
                                                    <DayBubble
                                                        key={DAY_KEYS[i]}
                                                        label={d}
                                                        active={activeDays.has(i)}
                                                        onPress={() => toggleDay(i)}
                                                    />
                                                ))}
                                            </View>
                                        </View>
                                    )}
                                </View>

                                {/* Save button */}
                                <Animated.View style={[st.saveBtnWrap, btnStyle]}>
                                    <TouchableOpacity
                                        style={[st.saveBtn, (!enabled || isSaving) && st.saveBtnDisabled]}
                                        onPress={handleSave}
                                        activeOpacity={0.85}
                                        disabled={isSaving}
                                        accessibilityLabel={enabled ? 'Save reminders' : 'Save with reminders off'}
                                        accessibilityRole="button"
                                    >
                                        <Text style={[st.saveBtnText, (!enabled || isSaving) && st.saveBtnTextDisabled]}>
                                            {isSaving ? t('reminders.saving') : enabled ? t('reminders.save') : t('reminders.save_off')}
                                        </Text>
                                    </TouchableOpacity>
                                </Animated.View>
                            </ScrollView>
                        </>
                    )}
                </View>

                {/* ── Time picker overlay ──────────────────────────────────────────────────
                 * Rendered as an absolute overlay inside the outer Modal (same z-stack),
                 * avoiding nested-Modal issues on Android while keeping the slide-up feel.
                 */}
                {pickerVisible && (
                    <View style={[StyleSheet.absoluteFill, st.pickerOverlay]}>
                        <TouchableOpacity
                            style={StyleSheet.absoluteFill}
                            activeOpacity={1}
                            onPress={() => setPickerVisible(false)}
                        />
                        <View style={st.pickerSheet}>
                            <View style={st.sheetHandle} />
                            <Text style={st.sheetTitle}>{t('reminders.picker_title')}</Text>

                            <View style={st.wheelRow}>
                                <WheelPicker
                                    items={HOURS}
                                    selectedIndex={pickHour}
                                    onIndexChange={setPickHour}
                                    width={80}
                                    fontSize={28}
                                />
                                <Text style={st.colonText}>:</Text>
                                <WheelPicker
                                    items={MINUTES}
                                    selectedIndex={pickMin}
                                    onIndexChange={setPickMin}
                                    width={80}
                                    fontSize={28}
                                />
                                <View style={st.ampmWrap}>
                                    {(['AM','PM'] as const).map(label => {
                                        const active = label === 'AM' ? !pickIsPM : pickIsPM;
                                        return (
                                            <TouchableOpacity
                                                key={label}
                                                style={[st.ampmBtn, active && st.ampmActive]}
                                                onPress={() => setPickIsPM(label === 'PM')}
                                                activeOpacity={0.8}
                                            >
                                                <Text style={[st.ampmText, active && st.ampmTextActive]}>{label}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            <View style={st.sheetActions}>
                                <TouchableOpacity
                                    style={st.sheetCancelBtn}
                                    onPress={() => setPickerVisible(false)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={st.sheetCancelText}>{t('reminders.cancel')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={st.sheetConfirmBtn}
                                    onPress={confirmTime}
                                    activeOpacity={0.85}
                                >
                                    <Text style={st.sheetConfirmText}>{t('reminders.add')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}
            </View>
        </Modal>
    );
};

// ─── Styles ────────────────────────────────────────────────────────────────────

const st = StyleSheet.create({

    // ── Outer overlay ──────────────────────────────────────────────────────────
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
        paddingHorizontal: 16,
        paddingBottom: 32,
    },

    // ── Floating card ──────────────────────────────────────────────────────────
    card: {
        backgroundColor: WHITE,
        borderRadius: 24,
    },

    handle: {
        width: 36, height: 4, borderRadius: 2,
        backgroundColor: BLACK + '14',
        alignSelf: 'center',
        marginTop: 10, marginBottom: 2,
    },

    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 14,
        paddingBottom: 6,
    },
    headerTitle: { fontFamily: 'Inter-Bold', fontSize: 26, color: BLACK },
    closeBtn: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: GRAY,
        alignItems: 'center', justifyContent: 'center',
    },

    scroll: { paddingHorizontal: 24, paddingBottom: 28 },

    // ── Success state ──────────────────────────────────────────────────────────
    successContainer: {
        alignItems: 'center',
        paddingHorizontal: 28,
        paddingTop: 44,
        paddingBottom: 36,
    },
    successIconWrap: {
        width: 84, height: 84, borderRadius: 42,
        backgroundColor: YELLOW + '33',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 22,
    },
    successTitle: {
        fontFamily: 'Inter-Bold', fontSize: 26, color: BLACK,
        marginBottom: 10, textAlign: 'center',
    },
    successMsg: {
        fontFamily: 'Inter-Medium', fontSize: 15, color: BLACK + '80',
        textAlign: 'center', lineHeight: 22, marginBottom: 26,
    },
    doneButton: {
        backgroundColor: YELLOW,
        paddingVertical: 16, borderRadius: 14,
        alignItems: 'center', alignSelf: 'stretch',
    },
    doneButtonText: { fontFamily: 'Inter-Bold', fontSize: 17, color: BLACK },

    // ── Master toggle card ─────────────────────────────────────────────────────
    toggleCard: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 18, paddingVertical: 16,
        borderRadius: 18,
        backgroundColor: GRAY,
        marginTop: 8, marginBottom: 2,
    },
    toggleCardActive: { backgroundColor: YELLOW + '26' },
    toggleTitle: { fontFamily: 'Inter-Bold', fontSize: 16, color: BLACK },
    toggleSub:   { fontFamily: 'Inter-Medium', fontSize: 12.5, color: BLACK + '66', marginTop: 3 },

    block:         {},
    blockDisabled: { opacity: 0.4 },

    // ── Grouped card (times / frequency / days) ────────────────────────────────
    groupCard: {
        borderRadius: 18,
        backgroundColor: GRAY,
        overflow: 'hidden',
    },
    rowDivider: { borderBottomWidth: 1, borderBottomColor: DIVIDER },

    // ── Reminder rows ──────────────────────────────────────────────────────────
    emptyRow:  { paddingVertical: 20, paddingHorizontal: 18 },
    emptyText: { fontFamily: 'Inter-Medium', fontSize: 13, color: MUTED, textAlign: 'center' },
    timeRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 15 },
    timeText:  { fontFamily: 'Inter-Bold', fontSize: 18, color: BLACK, flex: 1 },
    removeBtn: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center',
    },
    addRow: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingHorizontal: 18, paddingVertical: 14,
        borderTopWidth: 1, borderTopColor: DIVIDER,
    },
    addIcon: {
        width: 26, height: 26, borderRadius: 13,
        backgroundColor: YELLOW,
        alignItems: 'center', justifyContent: 'center',
    },
    addText: { fontFamily: 'Inter-Bold', fontSize: 14, color: BLACK },

    // ── Frequency ──────────────────────────────────────────────────────────────
    freqRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 18, gap: 12 },
    freqLabel:        { fontFamily: 'Inter-Medium', fontSize: 15, color: MUTED },
    freqLabelActive:  { color: BLACK, fontFamily: 'Inter-Bold' },
    freqSub:          { fontFamily: 'Inter-Medium', fontSize: 12, color: BLACK + '40', marginTop: 2 },
    radioDot: {
        width: 22, height: 22, borderRadius: 11,
        borderWidth: 2, borderColor: '#CFCFCF',
        alignItems: 'center', justifyContent: 'center',
    },
    radioDotActive: { borderColor: BLACK },
    radioFill: { width: 11, height: 11, borderRadius: 6, backgroundColor: BLACK },

    // ── Days ───────────────────────────────────────────────────────────────────
    daysHint: { fontFamily: 'Inter-Medium', fontSize: 11, color: MUTED, marginBottom: 14, textAlign: 'center' },
    daysRow:  { flexDirection: 'row', justifyContent: 'space-between' },

    // ── Save button ────────────────────────────────────────────────────────────
    saveBtnWrap: { marginTop: 24 },
    saveBtn: {
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: YELLOW, borderRadius: 16,
        paddingVertical: 17,
    },
    saveBtnDisabled:     { backgroundColor: GRAY },
    saveBtnText:         { fontFamily: 'Inter-Bold', fontSize: 16, color: BLACK },
    saveBtnTextDisabled: { color: MUTED },

    // ── Time picker overlay ────────────────────────────────────────────────────
    pickerOverlay: {
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    pickerSheet: {
        backgroundColor: WHITE,
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingHorizontal: 24, paddingBottom: 40, paddingTop: 14,
    },
    sheetHandle: {
        width: 36, height: 4, borderRadius: 2,
        backgroundColor: BLACK + '14', alignSelf: 'center', marginBottom: 18,
    },
    sheetTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 18, color: BLACK, textAlign: 'center', marginBottom: 8,
    },
    wheelRow: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: 4,
    },
    colonText: { fontFamily: 'Inter-Bold', fontSize: 28, color: BLACK, width: 20, textAlign: 'center' },
    ampmWrap: { marginLeft: 12, gap: 6 },
    ampmBtn: {
        paddingHorizontal: 16,
        paddingVertical:   9,
        borderRadius:      12,
        backgroundColor:   GRAY,
    },
    ampmActive:     { backgroundColor: YELLOW },
    ampmText:       { fontFamily: 'Inter-Medium', fontSize: 13, color: BLACK + '60' },
    ampmTextActive: { color: BLACK, fontFamily: 'Inter-Bold' },
    sheetActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
    sheetCancelBtn: {
        flex: 1, paddingVertical: 16, borderRadius: 14,
        alignItems: 'center', backgroundColor: GRAY,
    },
    sheetCancelText: { fontFamily: 'Inter-Bold', fontSize: 16, color: MUTED },
    sheetConfirmBtn: {
        flex: 2, paddingVertical: 16, borderRadius: 14,
        alignItems: 'center', backgroundColor: YELLOW,
    },
    sheetConfirmText: { fontFamily: 'Inter-Bold', fontSize: 16, color: BLACK },
});

export default ReminderSettingsScreen;
