/**
 * ActivityRings — Apple Watch-style animated activity rings for React Native
 * Adapted from @kokonutui apple-activity-ring
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import Animated, {
    useSharedValue,
    withTiming,
    withDelay,
    useAnimatedProps,
    Easing,
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const BLACK = '#000000';
const WHITE = '#FFFFFF';
const TRACK = '#EBEBEB';  // neutral gray — works for all ring colors on white

// ─── Ring dimensions ─────────────────────────────────────────────────────────
// Calculated for a 160×160 SVG with 4 px gaps between rings and 10 px to edge
//   Outer  r=64  spans 58–70  gap-to-edge = 10px
//   Middle r=48  spans 42–54  gap-to-outer = 4px
//   Inner  r=32  spans 26–38  gap-to-middle = 4px
const STROKE_W = 12;
const SVG_SIZE = 160;
const CX = SVG_SIZE / 2;
const CY = SVG_SIZE / 2;

// ─── Types ───────────────────────────────────────────────────────────────────

interface RingConfig {
    label: string;
    color: string;
    trackColor: string;
    radius: number;
    current: number;
    target: number;
    unit: string;
}

export interface ActivityRingsProps {
    entriesTotal: number;
    streak: number;
    /** Average mood score 0–10 */
    avgMood: number;
}

// ─── AnimatedRing ─────────────────────────────────────────────────────────────

const AnimatedRing: React.FC<{ config: RingConfig; index: number }> = ({ config, index }) => {
    const circumference = 2 * Math.PI * config.radius;
    const ratio         = Math.min(Math.max(config.current / config.target, 0), 1);
    const targetOffset  = circumference * (1 - ratio);

    const offset = useSharedValue(circumference);

    useEffect(() => {
        offset.value = withDelay(
            index * 200,
            withTiming(targetOffset, {
                duration: 1400,
                easing: Easing.out(Easing.cubic),
            }),
        );
    }, [targetOffset, index, offset]);

    const animatedProps = useAnimatedProps(() => ({
        strokeDashoffset: offset.value,
    }));

    return (
        <G transform={`rotate(-90, ${CX}, ${CY})`}>
            {/* Track — raised opacity so it's visible on any background */}
            <Circle
                cx={CX}
                cy={CY}
                r={config.radius}
                fill="none"
                stroke={config.trackColor}
                strokeWidth={STROKE_W}
            />
            {/* Animated progress arc */}
            <AnimatedCircle
                cx={CX}
                cy={CY}
                r={config.radius}
                fill="none"
                stroke={config.color}
                strokeWidth={STROKE_W}
                strokeDasharray={String(circumference)}
                animatedProps={animatedProps}
                strokeLinecap="round"
            />
        </G>
    );
};

// ─── DetailRow ────────────────────────────────────────────────────────────────

const DetailRow: React.FC<{ config: RingConfig }> = ({ config }) => {
    // Guard: avoid division by zero, clamp to [0, 100]
    const pct = config.target > 0
        ? Math.min(100, Math.round((config.current / config.target) * 100))
        : 0;

    return (
        <View style={detSt.row}>
            <View style={[detSt.dot, { backgroundColor: config.color }]} />
            <View style={detSt.textCol}>
                <Text style={detSt.label}>{config.label}</Text>
                <View style={detSt.valueRow}>
                    <Text style={[detSt.value, { color: config.color }]}>
                        {config.current}
                    </Text>
                    <Text style={detSt.meta}>/{config.target} {config.unit}</Text>
                </View>
            </View>
            <View style={[detSt.pctPill, { backgroundColor: config.color + '18' }]}>
                <Text style={[detSt.pct, { color: config.color }]}>{pct}%</Text>
            </View>
        </View>
    );
};

const detSt = StyleSheet.create({
    row: {
        flexDirection: 'row', alignItems: 'center',
        gap: 8, marginBottom: 14,
    },
    dot: { width: 9, height: 9, borderRadius: 4.5, flexShrink: 0 },
    textCol: { flex: 1 },
    label: {
        fontFamily: 'Inter-Medium', fontSize: 9, color: '#999999',
        textTransform: 'uppercase', letterSpacing: 1, marginBottom: 1,
    },
    valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
    value:  { fontFamily: 'Inter-Bold', fontSize: 17, lineHeight: 20 },
    meta:   { fontFamily: 'Inter-Medium', fontSize: 11, color: '#AAAAAA' },
    pctPill: {
        borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3,
    },
    pct: { fontFamily: 'Inter-Medium', fontSize: 11 },
});

// ─── ActivityRings ────────────────────────────────────────────────────────────

export const ActivityRings: React.FC<ActivityRingsProps> = ({
    entriesTotal,
    streak,
    avgMood,
}) => {
    const rings: RingConfig[] = [
        {
            label:      'Entries',
            color:      '#FF2D55',
            trackColor: TRACK,
            radius:     64,
            current:    entriesTotal,
            target:     100,
            unit:       'logged',
        },
        {
            label:      'Streak',
            color:      '#A3F900',
            trackColor: TRACK,
            radius:     48,
            current:    streak,
            target:     30,
            unit:       'days',
        },
        {
            label:      'Mood',
            color:      '#04C7DD',
            trackColor: TRACK,
            radius:     32,
            current:    Math.round(avgMood * 10),
            target:     100,
            unit:       'avg',
        },
    ];

    return (
        <View style={actSt.card}>
            {/* Header row: title + small legend dots */}
            <View style={actSt.headerRow}>
                <Text style={actSt.title}>Rings</Text>
                <View style={actSt.legend}>
                    {rings.map(r => (
                        <View key={r.label} style={actSt.legendItem}>
                            <View style={[actSt.legendDot, { backgroundColor: r.color }]} />
                            <Text style={actSt.legendLabel}>{r.label}</Text>
                        </View>
                    ))}
                </View>
            </View>

            {/* Body: SVG rings + detail stats */}
            <View style={actSt.body}>
                <Svg width={SVG_SIZE} height={SVG_SIZE}>
                    {rings.map((ring, i) => (
                        <AnimatedRing key={ring.label} config={ring} index={i} />
                    ))}
                </Svg>
                <View style={actSt.details}>
                    {rings.map(ring => (
                        <DetailRow key={ring.label} config={ring} />
                    ))}
                </View>
            </View>
        </View>
    );
};

const actSt = StyleSheet.create({
    card: {
        backgroundColor: WHITE,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: BLACK,
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 16,
        marginBottom: 20,
    },
    headerRow: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 12,
    },
    title: {
        fontFamily: 'Inter-Bold', fontSize: 18, color: BLACK,
    },
    legend: {
        flexDirection: 'row', gap: 10,
    },
    legendItem: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
    },
    legendDot: { width: 6, height: 6, borderRadius: 3 },
    legendLabel: {
        fontFamily: 'Inter-Medium', fontSize: 10, color: '#AAAAAA',
    },
    body: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
    },
    details: { flex: 1 },
});
