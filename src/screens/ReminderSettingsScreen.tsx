import React, { useState, useEffect } from 'react';
import { BLACK, GRAY, WHITE, YELLOW } from '../constants/colors';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, SafeAreaView, Modal, Alert,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
    useSharedValue, withSpring, useAnimatedStyle,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WheelPicker } from '../components/WheelPicker';
import { requestNotificationPermissions, scheduleDailyReminder } from '../utils/notifications';
import { STORAGE_KEYS } from '../constants/storageKeys';

const MUTED  = '#AAAAAA';

const HOURS   = ['1','2','3','4','5','6','7','8','9','10','11','12'];
const MINUTES = ['00','05','10','15','20','25','30','35','40','45','50','55'];

type FrequencyOption = 'daily' | 'weekdays' | 'specific';

const FREQ_OPTIONS: { value: FrequencyOption; label: string; sub: string }[] = [
    { value: 'daily',    label: 'Every day',    sub: 'Mon – Sun' },
    { value: 'weekdays', label: 'Weekdays',      sub: 'Mon – Fri' },
    { value: 'specific', label: 'Specific days', sub: 'You choose' },
];

const DAYS     = ['S','M','T','W','T','F','S'];
const DAY_KEYS = ['sun','mon','tue','wed','thu','fri','sat'] as const;

const formatTime = (hourIdx: number, minIdx: number, isPM: boolean): string =>
    `${HOURS[hourIdx]}:${MINUTES[minIdx]} ${isPM ? 'PM' : 'AM'}`;

// ─── Section label ─────────────────────────────────────────────────────────────

const SectionLabel: React.FC<{ label: string }> = ({ label }) => (
    <View style={secSt.row}>
        <Text style={secSt.text}>{label}</Text>
        <View style={secSt.line} />
    </View>
);
const secSt = StyleSheet.create({
    row:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, marginTop: 20 },
    text: { fontFamily: 'Inter-Medium', fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: 1.2 },
    line: { flex: 1, height: 1, backgroundColor: BLACK + '14' },
});

// ─── BrutalToggle ──────────────────────────────────────────────────────────────

const BrutalToggle: React.FC<{ value: boolean; onToggle: () => void }> = ({ value, onToggle }) => {
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
    track:       { width: 48, height: 28, borderRadius: 14, backgroundColor: GRAY, borderWidth: 2, borderColor: BLACK + '30', padding: 2, justifyContent: 'center' },
    trackActive: { backgroundColor: YELLOW, borderColor: BLACK },
    thumb:       { width: 20, height: 20, borderRadius: 10, backgroundColor: '#CCCCCC', borderWidth: 1.5, borderColor: BLACK + '40' },
    thumbActive: { backgroundColor: BLACK, borderColor: BLACK },
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
    bubble:      { width: 38, height: 38, borderRadius: 19, backgroundColor: GRAY, alignItems: 'center', justifyContent: 'center', borderWidth: 0 },
    active:      { backgroundColor: YELLOW, borderWidth: 2, borderColor: BLACK },
    label:       { fontFamily: 'Inter-Medium', fontSize: 13, color: MUTED },
    labelActive: { color: BLACK },
});

// ─── Screen ────────────────────────────────────────────────────────────────────

interface Props { navigation: any }

const STORAGE_KEY = STORAGE_KEYS.REMINDER_SETTINGS;

export const ReminderSettingsScreen: React.FC<Props> = ({ navigation }) => {

    const [enabled,    setEnabled]    = useState(true);
    const [reminders,  setReminders]  = useState<string[]>(['7:00 AM']);
    const [freq,       setFreq]       = useState<FrequencyOption>('daily');
    const [activeDays, setActiveDays] = useState<Set<number>>(new Set([1,2,3,4,5]));
    const [isSaving,   setIsSaving]   = useState(false);

    // Load persisted settings on mount
    useEffect(() => {
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
    }, []);

    // Time picker modal
    const [pickerVisible, setPickerVisible] = useState(false);
    const [pickHour,      setPickHour]      = useState(6);    // index 6 = '7'
    const [pickMin,       setPickMin]       = useState(0);    // index 0 = '00'
    const [pickIsPM,      setPickIsPM]      = useState(false);

    const openPicker = () => {
        setPickHour(6);
        setPickMin(0);
        setPickIsPM(false);
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
            // Persist settings
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
                enabled,
                reminders,
                freq,
                activeDays: Array.from(activeDays),
            }));

            // Schedule or cancel notifications
            if (enabled && reminders.length > 0) {
                const granted = await requestNotificationPermissions();
                if (granted) {
                    // Schedule first reminder time
                    const first = reminders[0];
                    const [timePart, meridiem] = first.split(' ');
                    const [h, m] = timePart.split(':').map(Number);
                    const hour = meridiem === 'PM' && h !== 12 ? h + 12 : (meridiem === 'AM' && h === 12 ? 0 : h);
                    await scheduleDailyReminder(hour, m);
                } else {
                    Alert.alert('Permission needed', 'Please enable notifications in Settings to receive reminders.');
                }
            }
            Alert.alert('Saved', enabled ? `${reminders.length} reminder${reminders.length !== 1 ? 's' : ''} saved.` : 'Reminders turned off.');
            navigation.goBack();
        } catch {
            Alert.alert('Error', 'Could not save your settings. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <SafeAreaView style={st.screen}>

            {/* Header */}
            <View style={st.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    accessibilityLabel="Go back"
                    accessibilityRole="button">
                    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                        <Path d="M15 18l-6-6 6-6" stroke={BLACK} strokeWidth={2.2}
                            strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                </TouchableOpacity>
                <Text style={st.headerTitle}>Reminders</Text>
                <View style={{ width: 36 }} />
            </View>

            <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>

                {/* Master toggle */}
                <View style={[st.toggleCard, enabled && st.toggleCardActive]}>
                    <View style={{ flex: 1 }}>
                        <Text style={st.toggleTitle}>Reminders</Text>
                        <Text style={st.toggleSub}>
                            {enabled
                                ? `${reminders.length} reminder${reminders.length !== 1 ? 's' : ''} active`
                                : 'All reminders off'}
                        </Text>
                    </View>
                    <BrutalToggle value={enabled} onToggle={() => setEnabled(v => !v)} />
                </View>

                {/* Dimmed when off */}
                <View style={[st.block, !enabled && st.blockDisabled]}
                      pointerEvents={enabled ? 'auto' : 'none'}>

                    {/* Reminder times list */}
                    <SectionLabel label="Times" />

                    <View style={st.card}>
                        {reminders.length === 0 && (
                            <View style={st.emptyRow}>
                                <Text style={st.emptyText}>No reminders. Tap + to add one.</Text>
                            </View>
                        )}
                        {reminders.map((r, i) => (
                            <View
                                key={`${r}-${i}`}
                                style={[st.timeRow, i < reminders.length - 1 && st.timeRowBorder]}
                            >
                                <Text style={st.timeText}>{r}</Text>
                                <TouchableOpacity
                                    onPress={() => removeReminder(i)}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    style={st.removeBtn}
                                >
                                    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                                        <Path d="M18 6L6 18M6 6L18 18" stroke={MUTED} strokeWidth={2.2}
                                            strokeLinecap="round" strokeLinejoin="round" />
                                    </Svg>
                                </TouchableOpacity>
                            </View>
                        ))}
                        <TouchableOpacity style={st.addRow} onPress={openPicker} activeOpacity={0.7}>
                            <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
                                <Path d="M12 5v14M5 12h14" stroke={BLACK} strokeWidth={2.2}
                                    strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                            <Text style={st.addText}>Add reminder</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Frequency */}
                    <SectionLabel label="Repeat" />

                    <View style={st.card}>
                        {FREQ_OPTIONS.map((opt, i) => {
                            const active = freq === opt.value;
                            return (
                                <TouchableOpacity
                                    key={opt.value}
                                    style={[st.freqRow, i < FREQ_OPTIONS.length - 1 && st.freqRowBorder]}
                                    onPress={() => setFreq(opt.value)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[st.freqAccent, active && st.freqAccentActive]} />
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
                        <View style={[st.card, { padding: 16, marginTop: 8 }]}>
                            <Text style={st.daysHint}>Tap to toggle days</Text>
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

                {/* Save */}
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
                            {isSaving ? 'Saving…' : enabled ? 'Save' : 'Reminders off — save anyway'}
                        </Text>
                    </TouchableOpacity>
                </Animated.View>

            </ScrollView>

            {/* ── Time Picker Modal ────────────────────────────────────────────────────
             * Rendered outside the ScrollView — no scroll conflict with WheelPicker.
             */}
            <Modal
                visible={pickerVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setPickerVisible(false)}
            >
                <View style={st.modalBackdrop}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFillObject}
                        onPress={() => setPickerVisible(false)}
                        activeOpacity={1}
                    />
                    <View style={st.pickerSheet}>
                        <View style={st.sheetHandle} />
                        <Text style={st.sheetTitle}>Pick a time</Text>

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
                                <Text style={st.sheetCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={st.sheetConfirmBtn}
                                onPress={confirmTime}
                                activeOpacity={0.85}
                            >
                                <Text style={st.sheetConfirmText}>Add</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    );
};

// ─── Styles ────────────────────────────────────────────────────────────────────

const CARD_BASE = {
    borderWidth: 2, borderColor: BLACK, borderRadius: 16,
    backgroundColor: WHITE, overflow: 'hidden',
} as const;

const st = StyleSheet.create({

    screen: { flex: 1, backgroundColor: WHITE },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4,
    },
    backBtn: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: GRAY, alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontFamily: 'Inter-Bold', fontSize: 18, color: BLACK },

    scroll: { paddingHorizontal: 20, paddingBottom: 48 },

    // Toggle card
    toggleCard: {
        ...CARD_BASE, flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 16,
        marginTop: 12, marginBottom: 4, borderColor: BLACK + '30',
    },
    toggleCardActive: { borderColor: BLACK, backgroundColor: YELLOW + '22' },
    toggleTitle: { fontFamily: 'Inter-Bold', fontSize: 16, color: BLACK },
    toggleSub:   { fontFamily: 'Inter-Medium', fontSize: 12, color: MUTED, marginTop: 2 },

    block:         {},
    blockDisabled: { opacity: 0.35 },

    card: { ...CARD_BASE, marginBottom: 4 },

    // Reminder rows
    emptyRow: { paddingVertical: 18, paddingHorizontal: 16 },
    emptyText: { fontFamily: 'Inter-Medium', fontSize: 13, color: MUTED, textAlign: 'center' },
    timeRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
    timeRowBorder: { borderBottomWidth: 1, borderBottomColor: BLACK + '10' },
    timeText: { fontFamily: 'Inter-Bold', fontSize: 18, color: BLACK, flex: 1 },
    removeBtn: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: GRAY, alignItems: 'center', justifyContent: 'center',
    },
    addRow: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 16, paddingVertical: 14,
        borderTopWidth: 1, borderTopColor: BLACK + '10',
    },
    addText: { fontFamily: 'Inter-Medium', fontSize: 14, color: BLACK },

    // Frequency
    freqRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, gap: 12 },
    freqRowBorder: { borderBottomWidth: 1, borderBottomColor: BLACK + '10' },
    freqAccent:       { width: 4, height: 32, borderRadius: 2, backgroundColor: 'transparent' },
    freqAccentActive: { backgroundColor: YELLOW, borderWidth: 1, borderColor: BLACK },
    freqLabel:        { fontFamily: 'Inter-Medium', fontSize: 14, color: MUTED },
    freqLabelActive:  { color: BLACK },
    freqSub:          { fontFamily: 'Inter-Medium', fontSize: 11, color: '#CCCCCC', marginTop: 2 },
    radioDot: {
        width: 20, height: 20, borderRadius: 10,
        borderWidth: 2, borderColor: '#CCCCCC',
        alignItems: 'center', justifyContent: 'center',
    },
    radioDotActive: { borderColor: BLACK },
    radioFill: { width: 10, height: 10, borderRadius: 5, backgroundColor: BLACK },

    // Days
    daysHint: { fontFamily: 'Inter-Medium', fontSize: 10, color: MUTED, marginBottom: 12, textAlign: 'center' },
    daysRow:  { flexDirection: 'row', justifyContent: 'space-between' },

    // Save
    saveBtnWrap: { marginTop: 24 },
    saveBtn: {
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: YELLOW, borderWidth: 2, borderColor: BLACK, borderRadius: 16,
        paddingVertical: 18,
    },
    saveBtnDisabled:     { backgroundColor: GRAY, borderColor: '#DDDDDD' },
    saveBtnText:         { fontFamily: 'Inter-Bold', fontSize: 16, color: BLACK },
    saveBtnTextDisabled: { color: MUTED },

    // Modal
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    pickerSheet: {
        backgroundColor: WHITE,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        borderWidth: 2, borderColor: BLACK,
        paddingHorizontal: 24, paddingBottom: 40, paddingTop: 16,
    },
    sheetHandle: {
        width: 40, height: 4, borderRadius: 2,
        backgroundColor: BLACK + '20', alignSelf: 'center', marginBottom: 20,
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
        paddingHorizontal: 14,
        paddingVertical:   8,
        borderRadius:      10,
        backgroundColor:   WHITE,
        borderWidth:       1.5,
        borderColor:       BLACK + '25',
    },
    ampmActive:     { backgroundColor: YELLOW, borderColor: BLACK },
    ampmText:       { fontFamily: 'Inter-Medium', fontSize: 13, color: BLACK + '60' },
    ampmTextActive: { color: BLACK, fontFamily: 'Inter-Bold' },
    sheetActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
    sheetCancelBtn: {
        flex: 1, paddingVertical: 16, borderRadius: 14,
        borderWidth: 2, borderColor: BLACK + '30', alignItems: 'center', backgroundColor: GRAY,
    },
    sheetCancelText: { fontFamily: 'Inter-Bold', fontSize: 16, color: MUTED },
    sheetConfirmBtn: {
        flex: 2, paddingVertical: 16, borderRadius: 14,
        borderWidth: 2, borderColor: BLACK, alignItems: 'center', backgroundColor: YELLOW,
    },
    sheetConfirmText: { fontFamily: 'Inter-Bold', fontSize: 16, color: BLACK },
});

export default ReminderSettingsScreen;
