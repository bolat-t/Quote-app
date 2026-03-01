import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Image,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path, Circle } from 'react-native-svg';
import type { RootStackParamList } from '../types';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ULBO_IMAGE = require('../../assets/mascot/ulbos_coloured.png') as number;

const YELLOW = '#FFE600';
const BLACK = '#000000';
const WHITE = '#FFFFFF';
const screenWidth = Dimensions.get('window').width;

// ── Icons ──────────────────────────────────────────────────────────────────

const BackIcon = () => (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <Path
            d="M19 12H5M12 5l-7 7 7 7"
            stroke={BLACK}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

const FootIcon = ({ color }: { color: string }) => (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Circle cx="9" cy="5" r="2" fill={color} />
        <Path
            d="M6 8c0 4 2 8 6 9s6-3 6-7"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
        />
        <Path
            d="M10 14c1 1 2 3 1 5"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
        />
    </Svg>
);

// ── Main Component ──────────────────────────────────────────────────────────

export const WalkingScreen: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Walking'>>();
    const [steps, setSteps] = useState(0);
    const [isTracking, setIsTracking] = useState(false);
    const bounceAnim = useRef(new Animated.Value(0)).current;
    const loopRef = useRef<Animated.CompositeAnimation | null>(null);

    // Bounce mascot while walking
    useEffect(() => {
        if (isTracking) {
            loopRef.current = Animated.loop(
                Animated.sequence([
                    Animated.timing(bounceAnim, { toValue: -10, duration: 280, useNativeDriver: true }),
                    Animated.timing(bounceAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
                ])
            );
            loopRef.current.start();
        } else {
            loopRef.current?.stop();
            Animated.timing(bounceAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
        }
    }, [isTracking]); // eslint-disable-line react-hooks/exhaustive-deps

    // Simulate step counting
    useEffect(() => {
        if (!isTracking) return;
        const interval = setInterval(() => {
            setSteps(s => s + Math.floor(Math.random() * 3) + 1);
        }, 900);
        return () => clearInterval(interval);
    }, [isTracking]);

    const distanceKm = (steps * 0.000762).toFixed(2);
    const calories = Math.floor(steps * 0.04);
    const minutes = Math.floor(steps / 100);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>

            {/* ── Header ── */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => navigation.goBack()}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <BackIcon />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Walking</Text>
                <View style={styles.headerRight} />
            </View>

            {/* ── Step Count ── */}
            <View style={styles.stepSection}>
                <Text style={styles.stepCount}>{steps.toLocaleString()}</Text>
                <Text style={styles.stepLabel}>steps today</Text>
            </View>

            {/* ── Mascot Card ── */}
            <View style={styles.mascotCard}>
                <Animated.Image
                    source={ULBO_IMAGE}
                    style={[styles.mascotImage, { transform: [{ translateY: bounceAnim }] }]}
                    resizeMode="contain"
                />
                {/* Curved hill */}
                <Svg
                    width={screenWidth - 80}
                    height={44}
                    viewBox={`0 0 ${screenWidth - 80} 44`}
                    style={styles.hill}
                >
                    <Path
                        d={`M0 44 Q${(screenWidth - 80) / 2} 0 ${screenWidth - 80} 44`}
                        fill={BLACK}
                    />
                </Svg>
            </View>

            {/* ── Stats Row ── */}
            <View style={styles.statsRow}>
                <View style={styles.statCard}>
                    <Text style={styles.statValue}>{distanceKm}</Text>
                    <Text style={styles.statLabel}>km</Text>
                </View>
                <View style={[styles.statCard, styles.statCardMiddle]}>
                    <Text style={styles.statValue}>{calories}</Text>
                    <Text style={styles.statLabel}>cal</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statValue}>{minutes}</Text>
                    <Text style={styles.statLabel}>min</Text>
                </View>
            </View>

            {/* ── Goal Bar ── */}
            <View style={styles.goalSection}>
                <View style={styles.goalHeader}>
                    <Text style={styles.goalLabel}>Daily goal</Text>
                    <Text style={styles.goalValue}>{steps} / 10,000</Text>
                </View>
                <View style={styles.goalTrack}>
                    <View
                        style={[
                            styles.goalFill,
                            { width: `${Math.min((steps / 10000) * 100, 100)}%` },
                        ]}
                    />
                </View>
            </View>

            {/* ── Start / Stop ── */}
            <TouchableOpacity
                style={[styles.startBtn, isTracking && styles.stopBtn]}
                onPress={() => setIsTracking(t => !t)}
                activeOpacity={0.8}
            >
                <Text style={[styles.startBtnText, isTracking && styles.stopBtnText]}>
                    {isTracking ? 'Stop' : 'Start Walking'}
                </Text>
            </TouchableOpacity>

        </SafeAreaView>
    );
};

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: WHITE,
        paddingHorizontal: 20,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 8,
        paddingBottom: 16,
    },
    backBtn: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontFamily: 'GasoekOne',
        fontSize: 28,
        color: BLACK,
        textAlign: 'center',
    },
    headerRight: {
        width: 44,
    },

    // Step count
    stepSection: {
        alignItems: 'center',
        marginBottom: 20,
    },
    stepCount: {
        fontFamily: 'GasoekOne',
        fontSize: 72,
        color: BLACK,
        lineHeight: 72,
    },
    stepLabel: {
        fontFamily: 'GasoekOne',
        fontSize: 16,
        color: '#666',
        marginTop: 4,
    },

    // Mascot card
    mascotCard: {
        borderRadius: 24,
        backgroundColor: WHITE,
        elevation: 10,
        shadowColor: BLACK,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        height: 200,
        alignItems: 'center',
        justifyContent: 'flex-end',
        overflow: 'hidden',
        marginBottom: 20,
    },
    mascotImage: {
        width: 130,
        height: 130,
        position: 'absolute',
        bottom: 36,
        alignSelf: 'center',
    },
    hill: {
        width: '100%',
    },

    // Stats
    statsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
    },
    statCard: {
        flex: 1,
        borderRadius: 16,
        paddingVertical: 14,
        alignItems: 'center',
        backgroundColor: WHITE,
        elevation: 4,
        shadowColor: BLACK,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
    },
    statCardMiddle: {
        backgroundColor: YELLOW,
    },
    statValue: {
        fontFamily: 'GasoekOne',
        fontSize: 28,
        color: BLACK,
        lineHeight: 30,
    },
    statLabel: {
        fontFamily: 'GasoekOne',
        fontSize: 13,
        color: '#444',
        marginTop: 2,
    },

    // Goal bar
    goalSection: {
        marginBottom: 28,
    },
    goalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    goalLabel: {
        fontFamily: 'GasoekOne',
        fontSize: 18,
        color: BLACK,
    },
    goalValue: {
        fontFamily: 'GasoekOne',
        fontSize: 14,
        color: '#666',
    },
    goalTrack: {
        height: 10,
        borderRadius: 5,
        backgroundColor: '#F0F0F0',
        overflow: 'hidden',
    },
    goalFill: {
        height: '100%',
        backgroundColor: YELLOW,
        borderRadius: 5,
    },

    // Start/Stop button
    startBtn: {
        backgroundColor: YELLOW,
        borderRadius: 50,
        paddingVertical: 18,
        alignItems: 'center',
        elevation: 8,
        shadowColor: BLACK,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
    },
    stopBtn: {
        backgroundColor: WHITE,
    },
    startBtnText: {
        fontFamily: 'GasoekOne',
        fontSize: 22,
        color: BLACK,
    },
    stopBtnText: {
        color: '#cc0000',
    },
});

export default WalkingScreen;
