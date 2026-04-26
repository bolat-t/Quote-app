import React, { useState, useEffect } from 'react';
import { BLACK, GRAY, WHITE, YELLOW } from '../constants/colors';
import {
    View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
    useSharedValue, withSpring, useAnimatedStyle,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WheelPicker } from '../components/WheelPicker';
import { useSetCommitmentMins } from '../context/CommitmentContext';
import { useSetTimerSecs } from '../context/TimerSecondsContext';

const MUTED  = '#AAAAAA';

// Fine-grained 0–9, then 5-min steps to 60
const MINUTES = [
    '0','1','2','3','4','5','6','7','8','9',
    '10','15','20','25','30','35','40','45','50','55','60',
];
// 5-second steps
const SECONDS = ['00','05','10','15','20','25','30','35','40','45','50','55'];

interface Props { navigation: any }

export const FocusTimerPickerScreen: React.FC<Props> = ({ navigation }) => {
    const setCommitmentMins = useSetCommitmentMins();
    const setTimerSecs      = useSetTimerSecs();

    const [minIdx, setMinIdx] = useState(13); // '25' — Pomodoro default
    const [secIdx, setSecIdx] = useState(0);  // '00'
    const [loaded, setLoaded] = useState(false);

    // Restore previously saved duration on mount.
    // We gate WheelPicker rendering on `loaded` so the wheels mount exactly once
    // with the correct selectedIndex — WheelPicker's internal scroll only runs on mount.
    useEffect(() => {
        AsyncStorage.getItem('@ulbo_focus_duration_seconds').then(val => {
            if (val) {
                const total = parseInt(val, 10);
                const savedM = Math.floor(total / 60);
                const savedS = total % 60;
                const mI = MINUTES.reduce((best, v, i) =>
                    Math.abs(parseInt(v) - savedM) < Math.abs(parseInt(MINUTES[best]) - savedM) ? i : best, 0);
                const sI = SECONDS.reduce((best, v, i) =>
                    Math.abs(parseInt(v) - savedS) < Math.abs(parseInt(SECONDS[best]) - savedS) ? i : best, 0);
                setMinIdx(mI);
                setSecIdx(sI);
            }
            setLoaded(true);
        });
    }, []);

    const m        = parseInt(MINUTES[minIdx], 10);
    const s        = parseInt(SECONDS[secIdx], 10);
    const totalSec = m * 60 + s;
    const canSave  = totalSec > 0;

    const durationStr = canSave ? `${MINUTES[minIdx]}:${SECONDS[secIdx]}` : '—';
    const humanLabel  = m > 0 && s > 0 ? `${m} min ${s} sec`
                      : m > 0          ? `${m} min`
                      : s > 0          ? `${s} sec`
                      : '';

    const btnScale = useSharedValue(1);
    const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

    const handleSave = async () => {
        if (!canSave) return;
        btnScale.value = withSpring(0.94, { duration: 80 }, () => {
            btnScale.value = withSpring(1, { duration: 120 });
        });
        await AsyncStorage.setItem('@ulbo_focus_duration_seconds', String(totalSec));
        const commitMins = m <= 5 ? 5 : m <= 10 ? 10 : 20;
        await AsyncStorage.setItem('@ulbo_commitment_minutes', String(commitMins));
        setCommitmentMins(commitMins);
        setTimerSecs(totalSec);
        navigation.goBack();
    };

    return (
        <SafeAreaView style={st.screen}>

            {/* Header */}
            <View style={st.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={st.backBtn}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                        <Path d="M15 18l-6-6 6-6" stroke={BLACK} strokeWidth={2.2}
                            strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                </TouchableOpacity>
                <Text style={st.headerTitle}>Focus Timer</Text>
                <View style={{ width: 36 }} />
            </View>

            {/* Duration preview */}
            <View style={st.previewWrap}>
                <Text style={st.previewLabel}>Duration</Text>
                <Text style={[st.previewValue, !canSave && st.previewMuted]}>
                    {durationStr}
                </Text>
                {canSave && <Text style={st.previewSub}>{humanLabel}</Text>}
            </View>

            {/* Picker card */}
            <View style={st.pickerCard}>
                <View style={st.colLabels}>
                    <Text style={st.colLabel}>MIN</Text>
                    <View style={{ width: 28 }} />
                    <Text style={st.colLabel}>SEC</Text>
                </View>
                <View style={st.wheelRow}>
                    <View style={st.wheelWrap}>
                        {loaded && (
                            <WheelPicker
                                items={MINUTES}
                                selectedIndex={minIdx}
                                onIndexChange={setMinIdx}
                                width={110}
                                fontSize={34}
                            />
                        )}
                    </View>
                    <Text style={st.colon}>:</Text>
                    <View style={st.wheelWrap}>
                        {loaded && (
                            <WheelPicker
                                items={SECONDS}
                                selectedIndex={secIdx}
                                onIndexChange={setSecIdx}
                                width={110}
                                fontSize={34}
                            />
                        )}
                    </View>
                </View>
            </View>

            {/* Save button */}
            <View style={st.saveWrap}>
                <Animated.View style={btnStyle}>
                    <TouchableOpacity
                        style={[st.saveBtn, !canSave && st.saveBtnDisabled]}
                        onPress={handleSave}
                        activeOpacity={0.85}
                        disabled={!canSave}
                    >
                        <Text style={[st.saveBtnText, !canSave && st.saveBtnTextDisabled]}>
                            {canSave ? 'Set Timer' : 'Choose a duration'}
                        </Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>

        </SafeAreaView>
    );
};

const st = StyleSheet.create({

    screen: { flex: 1, backgroundColor: WHITE },

    header: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4,
    },
    backBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: GRAY, alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: {
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        fontSize: 18, color: BLACK,
    },

    previewWrap:  { alignItems: 'center', paddingVertical: 36 },
    previewLabel: {
        fontFamily: 'OpenSans-SemiBold', fontSize: 11,
        color: MUTED, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8,
    },
    previewValue: {
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        fontSize: 64, color: BLACK, lineHeight: 68,
    },
    previewMuted: { color: '#CCCCCC' },
    previewSub: {
        fontFamily: 'OpenSans-SemiBold', fontSize: 13,
        color: MUTED, marginTop: 6,
    },

    pickerCard: {
        borderWidth: 2, borderColor: BLACK, borderRadius: 20,
        backgroundColor: WHITE, overflow: 'hidden',
        marginHorizontal: 20, marginBottom: 32,
    },
    colLabels: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-around',
        paddingHorizontal: 24, paddingTop: 14, paddingBottom: 4,
    },
    colLabel: {
        fontFamily: 'OpenSans-SemiBold', fontSize: 10,
        color: MUTED, textTransform: 'uppercase', letterSpacing: 1.4,
        flex: 1, textAlign: 'center',
    },
    wheelRow: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', paddingBottom: 14,
    },
    wheelWrap: { flex: 1, alignItems: 'center' },
    colon: {
        fontFamily: 'GasoekOne', fontSize: 28, color: BLACK,
        width: 28, textAlign: 'center',
    },

    saveWrap: { paddingHorizontal: 20 },
    saveBtn: {
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: YELLOW,
        borderWidth: 2, borderColor: BLACK, borderRadius: 16,
        paddingVertical: 18,
    },
    saveBtnDisabled: { backgroundColor: GRAY, borderColor: '#DDDDDD' },
    saveBtnText: {
        fontFamily: 'MontserratAlternates-Bold', fontSize: 16, color: BLACK,
    },
    saveBtnTextDisabled: { color: '#CCCCCC' },
});

export default FocusTimerPickerScreen;
