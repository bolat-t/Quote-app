import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BLACK, WHITE, YELLOW } from '../constants/colors';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
    Animated,
    Alert,
    Dimensions,
} from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../lib/supabase';
import Svg, { Path } from 'react-native-svg';

const { width } = Dimensions.get('window');

// ─── Mic SVG ───
const MicIcon = ({ color, size = 28 }: { color: string; size?: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" fill={color} />
        <Path
            d="M19 10v2a7 7 0 0 1-14 0v-2"
            stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
        />
        <Path
            d="M12 19v4M8 23h8"
            stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
        />
    </Svg>
);

export interface VoiceSheetProps {
    visible: boolean;
    onDismiss: () => void;
    onTranscriptionComplete: (text: string) => void;
    /** Max recording duration in seconds. Defaults to 120 (2 min). */
    maxSeconds?: number;
}

export const VoiceSheet: React.FC<VoiceSheetProps> = ({
    visible,
    onDismiss,
    onTranscriptionComplete,
    maxSeconds = 120,
}) => {
    const [recordingObj, setRecordingObj] = useState<Audio.Recording | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // ── Animations ──
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const ringScale = useRef(new Animated.Value(0.9)).current;
    const ringOpacity = useRef(new Animated.Value(0)).current;
    const waveBars = useRef(
        [0.3, 0.5, 0.8, 0.5, 0.35].map(v => new Animated.Value(v))
    ).current;

    // Reset when sheet closes
    useEffect(() => {
        if (!visible) {
            cleanupAll();
        }
    }, [visible]);

    // Auto-stop at maxSeconds
    useEffect(() => {
        if (isRecording && elapsedSeconds >= maxSeconds) {
            stopRecording();
        }
    }, [elapsedSeconds, isRecording]);

    const cleanupAll = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setElapsedSeconds(0);
        setIsRecording(false);
        setIsProcessing(false);
        stopAllAnimations();
    };

    // ── Animation helpers ──
    const startAllAnimations = () => {
        // Mic pulse
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.08, duration: 650, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1.0, duration: 650, useNativeDriver: true }),
            ])
        ).start();

        // Expanding ring
        Animated.loop(
            Animated.parallel([
                Animated.timing(ringScale, { toValue: 1.7, duration: 1100, useNativeDriver: true }),
                Animated.timing(ringOpacity, { toValue: 0, duration: 1100, useNativeDriver: true }),
            ])
        ).start();

        // Wave bars
        waveBars.forEach((bar, i) => {
            bar.setValue(0.3);
            Animated.loop(
                Animated.sequence([
                    Animated.timing(bar, { toValue: 1.0, duration: 280 + i * 70, useNativeDriver: true }),
                    Animated.timing(bar, { toValue: 0.2, duration: 280 + i * 70, useNativeDriver: true }),
                ])
            ).start();
        });
    };

    const stopAllAnimations = () => {
        pulseAnim.stopAnimation();
        pulseAnim.setValue(1);
        ringScale.stopAnimation();
        ringScale.setValue(0.9);
        ringOpacity.stopAnimation();
        ringOpacity.setValue(0);
        waveBars.forEach(bar => { bar.stopAnimation(); bar.setValue(0.3); });
    };

    const softProcessingAnimation = () => {
        waveBars.forEach((bar, i) => {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(bar, { toValue: 0.7, duration: 450 + i * 90, useNativeDriver: true }),
                    Animated.timing(bar, { toValue: 0.2, duration: 450 + i * 90, useNativeDriver: true }),
                ])
            ).start();
        });
    };

    // ── Recording logic ──
    const startRecording = async () => {
        try {
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Microphone Access', 'Please allow microphone access in Settings to use voice input.');
                return;
            }

            await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });

            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );

            setRecordingObj(recording);
            setIsRecording(true);
            setElapsedSeconds(0);
            startAllAnimations();

            timerRef.current = setInterval(() => {
                setElapsedSeconds(prev => prev + 1);
            }, 1000);
        } catch (err) {
            console.error('[VoiceSheet] startRecording error:', err);
        }
    };

    const stopRecording = useCallback(async () => {
        if (!recordingObj) return;
        if (timerRef.current) clearInterval(timerRef.current);

        setIsRecording(false);
        stopAllAnimations();

        try {
            await recordingObj.stopAndUnloadAsync();
            const uri = recordingObj.getURI();
            setRecordingObj(null);

            if (!uri) throw new Error('No recording URI');

            setIsProcessing(true);
            softProcessingAnimation();
            await transcribeAudio(uri);
        } catch (err: any) {
            if (!err?.message?.includes('no valid audio data')) {
                console.error('[VoiceSheet] stopRecording error:', err);
            }
            setRecordingObj(null);
            setIsProcessing(false);
            stopAllAnimations();
            onDismiss();
        }
    }, [recordingObj]);

    const transcribeAudio = async (uri: string) => {
        try {
            const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
            const { data, error } = await supabase.functions.invoke('transcribe', {
                body: { audio_base64: base64 },
            });
            if (error) throw new Error(error.message);
            if (data?.text) {
                onTranscriptionComplete(data.text);
            }
        } catch (err) {
            console.error('[VoiceSheet] transcription error:', err);
        } finally {
            setIsProcessing(false);
            stopAllAnimations();
            onDismiss();
        }
    };

    // ── Helpers ──
    const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    const remaining = maxSeconds - elapsedSeconds;

    const handleMicPress = () => {
        if (isProcessing) return;
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const handleBackdropPress = () => {
        if (isRecording) {
            stopRecording();
        } else if (!isProcessing) {
            onDismiss();
        }
    };

    // ── Status label ──
    const statusLabel = isProcessing
        ? 'PROCESSING...'
        : isRecording
        ? 'LISTENING...'
        : 'READY';

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={handleBackdropPress}
        >
            {/* Semi-transparent backdrop — tap to cancel when not recording */}
            <TouchableOpacity
                style={styles.backdrop}
                activeOpacity={1}
                onPress={handleBackdropPress}
            />

            <View style={styles.sheet} pointerEvents="box-none">
                {/* Handle bar */}
                <View style={styles.handle} />

                {/* Status */}
                <Text style={[styles.status, isRecording && styles.statusActive]}>
                    {statusLabel}
                </Text>

                {/* Timer — shown while recording or processing */}
                <View style={styles.timerRow}>
                    <Text style={styles.timerElapsed}>
                        {fmt(elapsedSeconds)}
                    </Text>
                    {isRecording && (
                        <Text style={styles.timerRemaining}> / {fmt(maxSeconds)}</Text>
                    )}
                </View>

                {/* Mic button with expanding ring */}
                <View style={styles.micArea}>
                    {/* Outer expanding ring (only when recording) */}
                    {isRecording && (
                        <Animated.View
                            style={[
                                styles.micRing,
                                { transform: [{ scale: ringScale }], opacity: ringOpacity },
                            ]}
                        />
                    )}

                    {/* Inner static ring (always shown while recording) */}
                    {isRecording && (
                        <View style={styles.micRingStatic} />
                    )}

                    {/* Mic button */}
                    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                        <TouchableOpacity
                            style={[
                                styles.micBtn,
                                isRecording && styles.micBtnRecording,
                                isProcessing && styles.micBtnProcessing,
                            ]}
                            onPress={handleMicPress}
                            disabled={isProcessing}
                            activeOpacity={0.85}
                        >
                            <MicIcon
                                color={isRecording ? BLACK : isProcessing ? '#CCCCCC' : BLACK}
                                size={32}
                            />
                        </TouchableOpacity>
                    </Animated.View>
                </View>

                {/* Waveform bars */}
                <View style={styles.waveRow}>
                    {waveBars.map((bar, i) => (
                        <Animated.View
                            key={i}
                            style={[
                                styles.waveBar,
                                {
                                    height: [18, 28, 36, 24, 20][i],
                                    transform: [{ scaleY: bar }],
                                    backgroundColor: isRecording ? YELLOW : '#E0E0E0',
                                },
                            ]}
                        />
                    ))}
                </View>

                {/* Hint text */}
                <Text style={styles.hint}>
                    {isProcessing
                        ? 'Transcribing your voice...'
                        : isRecording
                        ? `Release to finish · ${fmt(remaining)} left`
                        : 'Tap the microphone to start speaking'}
                </Text>

                {/* Cancel / Stop button */}
                {!isProcessing && (
                    <TouchableOpacity
                        onPress={isRecording ? stopRecording : onDismiss}
                        style={styles.cancelBtn}
                        activeOpacity={0.6}
                    >
                        <Text style={styles.cancelText}>
                            {isRecording ? 'Stop & Save' : 'Cancel'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        </Modal>
    );
};

// ─── Small inline trigger button ───
export const MicTriggerButton = ({
    onPress,
    label = 'Speak',
}: {
    onPress: () => void;
    label?: string;
}) => (
    <TouchableOpacity style={triggerStyles.btn} onPress={onPress} activeOpacity={0.7}>
        <View style={triggerStyles.iconWrap}>
            <MicIcon color={BLACK} size={16} />
        </View>
        <Text style={triggerStyles.label}>{label}</Text>
    </TouchableOpacity>
);

const triggerStyles = StyleSheet.create({
    btn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: BLACK + '20',
        backgroundColor: WHITE,
        alignSelf: 'flex-start',
    },
    iconWrap: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: YELLOW,
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        fontSize: 13,
        color: BLACK,
    },
});

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#00000045',
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: WHITE,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderTopWidth: 2,
        borderTopColor: BLACK,
        paddingTop: 14,
        paddingBottom: 52,
        paddingHorizontal: 32,
        alignItems: 'center',
        gap: 14,
    },
    handle: {
        width: 44,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#00000018',
        marginBottom: 2,
    },
    status: {
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        fontSize: 12,
        letterSpacing: 2.5,
        color: '#BBBBBB',
    },
    statusActive: {
        color: YELLOW,
    },
    timerRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginTop: -8,
    },
    timerElapsed: {
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        fontSize: 32,
        color: BLACK,
        letterSpacing: 1,
    },
    timerRemaining: {
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        fontSize: 16,
        color: '#AAAAAA',
    },
    micArea: {
        width: 110,
        height: 110,
        alignItems: 'center',
        justifyContent: 'center',
    },
    micRing: {
        position: 'absolute',
        width: 96,
        height: 96,
        borderRadius: 48,
        borderWidth: 2,
        borderColor: YELLOW,
    },
    micRingStatic: {
        position: 'absolute',
        width: 96,
        height: 96,
        borderRadius: 48,
        borderWidth: 1.5,
        borderColor: YELLOW + '40',
    },
    micBtn: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#F0F0F0',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#E0E0E0',
    },
    micBtnRecording: {
        backgroundColor: YELLOW,
        borderColor: BLACK,
    },
    micBtnProcessing: {
        backgroundColor: '#F8F8F8',
        borderColor: '#E0E0E0',
    },
    waveRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        height: 44,
        marginTop: -6,
    },
    waveBar: {
        width: 4,
        borderRadius: 2,
    },
    hint: {
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        fontSize: 13,
        color: '#999999',
        textAlign: 'center',
        marginTop: -4,
    },
    cancelBtn: {
        paddingVertical: 6,
        paddingHorizontal: 20,
        marginTop: 4,
    },
    cancelText: {
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        fontSize: 14,
        color: '#AAAAAA',
    },
});
