
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Animated,
} from 'react-native';
import { Audio } from 'expo-av';
import { Svg, Path, Circle } from 'react-native-svg';
// Use legacy import for readAsStringAsync as per deprecation warning
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../lib/supabase';

interface AudioInputProps {
    onTranscriptionComplete: (text: string) => void;
    onError: (error: string) => void;
}

// Animated SVG-compatible view for wave bars
const AnimatedView = Animated.View;

const YELLOW = '#FFE600';
const BLACK  = '#000000';

export const AudioInput: React.FC<AudioInputProps> = ({ onTranscriptionComplete, onError }) => {
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(20);
    const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const MAX_SECONDS = 20;

    // Pulse animation for mic button
    const pulseAnim = useRef(new Animated.Value(1)).current;
    // Ring pulse animation
    const ringAnim = useRef(new Animated.Value(0.8)).current;
    const ringOpacity = useRef(new Animated.Value(0.6)).current;
    // Wave bar animations (5 bars)
    const waveBars = useRef([
        new Animated.Value(0.3),
        new Animated.Value(0.5),
        new Animated.Value(0.7),
        new Animated.Value(0.4),
        new Animated.Value(0.6),
    ]).current;

    useEffect(() => {
        return () => {
            if (recording) {
                recording.stopAndUnloadAsync();
            }
        };
    }, []);

    const startAnimations = () => {
        // Pulse the mic
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.08,
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1.0,
                    duration: 600,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Expanding ring
        Animated.loop(
            Animated.parallel([
                Animated.timing(ringAnim, {
                    toValue: 1.6,
                    duration: 1200,
                    useNativeDriver: true,
                }),
                Animated.timing(ringOpacity, {
                    toValue: 0,
                    duration: 1200,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Wave bars
        waveBars.forEach((bar, i) => {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(bar, {
                        toValue: 1.0,
                        duration: 300 + i * 80,
                        useNativeDriver: true,
                    }),
                    Animated.timing(bar, {
                        toValue: 0.25,
                        duration: 300 + i * 80,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        });
    };

    const stopAnimations = () => {
        pulseAnim.stopAnimation();
        pulseAnim.setValue(1);
        ringAnim.stopAnimation();
        ringAnim.setValue(0.8);
        ringOpacity.stopAnimation();
        ringOpacity.setValue(0.6);
        waveBars.forEach(bar => {
            bar.stopAnimation();
            bar.setValue(0.3);
        });
    };

    const startProcessingAnimation = () => {
        // Softer wave for transcribing
        waveBars.forEach((bar, i) => {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(bar, {
                        toValue: 0.8,
                        duration: 400 + i * 100,
                        useNativeDriver: true,
                    }),
                    Animated.timing(bar, {
                        toValue: 0.2,
                        duration: 400 + i * 100,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        });
    };

    const stopProcessingAnimation = () => {
        waveBars.forEach(bar => {
            bar.stopAnimation();
            bar.setValue(0.3);
        });
    };

    const startRecording = async () => {
        try {
            if (recording) {
                await recording.stopAndUnloadAsync();
                setRecording(null);
            }

            const permission = await Audio.requestPermissionsAsync();
            if (permission.status !== 'granted') {
                Alert.alert('Permission Denied', 'Please allow microphone access to record your reflection.');
                return;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording: newRecording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );

            setRecording(newRecording);
            setIsRecording(true);
            startAnimations();

            // Auto-stop after MAX_SECONDS
            setSecondsLeft(MAX_SECONDS);
            autoStopTimerRef.current = setTimeout(() => stopRecording(), MAX_SECONDS * 1000);
            countdownRef.current = setInterval(() => {
                setSecondsLeft(prev => Math.max(0, prev - 1));
            }, 1000);
        } catch (err) {
            console.error('Failed to start recording', err);
            onError('Could not start recording.');
        }
    };

    const stopRecording = async () => {
        if (!recording) return;

        setIsRecording(false);
        stopAnimations();
        if (autoStopTimerRef.current) { clearTimeout(autoStopTimerRef.current); autoStopTimerRef.current = null; }
        if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
        setSecondsLeft(MAX_SECONDS);

        try {
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();

            if (!uri) throw new Error('No recording URI found');
            console.log('Recording stopped and stored at', uri);

            setIsProcessing(true);
            startProcessingAnimation();
            await transcribeAudio(uri);

        } catch (error: any) {
            if (error.message && error.message.includes('no valid audio data')) {
                console.log('Recording was too short or empty, ignoring.');
            } else {
                console.error('Stop recording failed', error);
                onError('Failed to process audio.');
            }
        } finally {
            setRecording(null);
            setIsProcessing(false);
            stopProcessingAnimation();
        }
    };

    const transcribeAudio = async (uri: string) => {
        try {
            setIsProcessing(true);

            const base64 = await FileSystem.readAsStringAsync(uri, {
                encoding: 'base64',
            });

            console.log("Audio converted to base64, sending to Edge Function...");

            const { data, error } = await supabase.functions.invoke('transcribe', {
                body: { audio_base64: base64 }
            });

            if (error) {
                console.error('Edge function error:', error);
                const detailedError = (error as any).message || JSON.stringify(error);
                throw new Error(`Transcription failed: ${detailedError}`);
            }

            console.log("Transcription result:", data);

            if (data && data.text) {
                onTranscriptionComplete(data.text);
            } else if (data && data.error) {
                throw new Error(data.error);
            } else {
                throw new Error("No transcription returned.");
            }

            setIsProcessing(false);

        } catch (error) {
            console.error('Transcription failed', error);
            onError('Transcription failed: ' + (error as any).message);
            setIsProcessing(false);
        }
    };

    const primaryColor = YELLOW;
    const primaryBg = BLACK + '10';
    const primaryRing = YELLOW + '50';

    // Render wave bars
    const renderWaveBars = (color: string) => (
        <View style={styles.waveBarsContainer}>
            {waveBars.map((bar, i) => (
                <Animated.View
                    key={i}
                    style={[
                        styles.waveBar,
                        {
                            backgroundColor: color,
                            transform: [{ scaleY: bar }],
                            height: [14, 22, 28, 20, 16][i],
                        },
                    ]}
                />
            ))}
        </View>
    );

    if (isProcessing) {
        return (
            <View style={styles.container}>
                <View style={styles.processingWrapper}>
                    {renderWaveBars(primaryColor + '80')}
                    <View style={[styles.micCircle, { backgroundColor: primaryBg }]}>
                        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                            <Path
                                d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
                                fill={primaryColor + '60'}
                            />
                            <Path
                                d="M19 10v2a7 7 0 0 1-14 0v-2"
                                stroke={primaryColor + '60'}
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <Path
                                d="M12 19v4M8 23h8"
                                stroke={primaryColor + '60'}
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </Svg>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={{ alignItems: 'center' }}>
                {isRecording && (
                    <Text style={styles.countdown}>{secondsLeft}s</Text>
                )}
                <TouchableOpacity
                    onPressIn={startRecording}
                    onPressOut={stopRecording}
                    activeOpacity={0.7}
                    style={styles.micButton}
                >
                    {/* Expanding ring (only during recording) */}
                    {isRecording && (
                        <Animated.View
                            style={[
                                styles.expandingRing,
                                {
                                    borderColor: primaryColor,
                                    transform: [{ scale: ringAnim }],
                                    opacity: ringOpacity,
                                },
                            ]}
                        />
                    )}

                    {/* Mic circle */}
                    <Animated.View
                        style={[
                            styles.micCircle,
                            {
                                backgroundColor: isRecording ? primaryColor : primaryBg,
                                transform: [{ scale: pulseAnim }],
                            },
                        ]}
                    >
                        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                            <Path
                                d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
                                fill={isRecording ? '#FFFFFF' : primaryColor}
                            />
                            <Path
                                d="M19 10v2a7 7 0 0 1-14 0v-2"
                                stroke={isRecording ? '#FFFFFF' : primaryColor}
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <Path
                                d="M12 19v4M8 23h8"
                                stroke={isRecording ? '#FFFFFF' : primaryColor}
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </Svg>
                    </Animated.View>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 4,
    },
    micButton: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    micCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    expandingRing: {
        position: 'absolute',
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
    },
    waveBarsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        marginTop: 0,
        height: 30,
    },
    waveBar: {
        width: 3,
        borderRadius: 2,
    },
    processingWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    countdown: {
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        fontSize: 13,
        color: YELLOW,
        marginBottom: 4,
    },
});
