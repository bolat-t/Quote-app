import React, { useRef, useEffect } from 'react';
import { View, Animated } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

const YELLOW     = '#FFE600';
const BLACK      = '#000000';
const WATER_BLUE = '#60A5FA';

// ── Watering Can SVG ───────────────────────────────────────────────────────
//
//  Oriented so the spout points to lower-left (pouring position).
//  Body is on the right, handle arcs behind, nozzle (rose) at lower-left.
//  90 × 90 viewBox.
//  Nozzle centre ≈ (12, 72) — water drops originate here.

const WateringCanSVG = ({ isPouring }: { isPouring: boolean }) => (
    <Svg width={90} height={90} viewBox="0 0 90 90">
        {/* Spout tube (drawn before body so body sits on top) */}
        <Path d="M48 32 L12 72" stroke={BLACK}  strokeWidth={8} strokeLinecap="round" />
        <Path d="M48 32 L12 72" stroke={YELLOW} strokeWidth={3} strokeLinecap="round" />

        {/* Body */}
        <Path
            d="M42 8 L80 8 L76 50 L46 50 Z"
            fill={YELLOW}
            stroke={BLACK}
            strokeWidth={3}
            strokeLinejoin="round"
        />

        {/* Handle */}
        <Path
            d="M74 14 Q96 8 94 36 Q92 52 74 46"
            fill="none"
            stroke={BLACK}
            strokeWidth={3.5}
            strokeLinecap="round"
        />

        {/* Rose / nozzle head */}
        <Circle cx="12" cy="72" r="10" fill={YELLOW} stroke={BLACK} strokeWidth={2.5} />

        {/* Nozzle holes — fully visible when pouring, faint otherwise */}
        <Circle cx="8"  cy="70" r="1.5" fill={BLACK} opacity={isPouring ? 1 : 0.35} />
        <Circle cx="13" cy="68" r="1.5" fill={BLACK} opacity={isPouring ? 1 : 0.35} />
        <Circle cx="16" cy="74" r="1.5" fill={BLACK} opacity={isPouring ? 1 : 0.35} />
        <Circle cx="9"  cy="77" r="1.5" fill={BLACK} opacity={isPouring ? 1 : 0.35} />
    </Svg>
);

// ── Single animated water drop ─────────────────────────────────────────────

interface DropProps { delay: number; offsetX: number; }

const WaterDrop: React.FC<DropProps> = ({ delay, offsetX }) => {
    const translateY = useRef(new Animated.Value(0)).current;
    const opacity    = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.parallel([
                    Animated.timing(translateY, {
                        toValue: 65, duration: 540, useNativeDriver: true,
                    }),
                    Animated.sequence([
                        Animated.timing(opacity, { toValue: 1,   duration: 80,  useNativeDriver: true }),
                        Animated.timing(opacity, { toValue: 0,   duration: 460, useNativeDriver: true }),
                    ]),
                ]),
                // Reset without animation
                Animated.timing(translateY, { toValue: 0, duration: 0, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <Animated.View
            style={{
                position:  'absolute',
                left:      12 + offsetX,   // nozzle centre x in SVG = 12
                top:       80,             // just below nozzle centre (72 + 8)
                opacity,
                transform: [{ translateY }],
            }}
        >
            <View
                style={{
                    width:        5,
                    height:       9,
                    borderRadius: 3,
                    backgroundColor: WATER_BLUE,
                }}
            />
        </Animated.View>
    );
};

// ── Overlay component ──────────────────────────────────────────────────────

interface WateringCanOverlayProps {
    canX:      Animated.Value;
    canY:      Animated.Value;
    isPouring: boolean;
}

export const WateringCanOverlay: React.FC<WateringCanOverlayProps> = ({
    canX,
    canY,
    isPouring,
}) => (
    <Animated.View
        pointerEvents="none"
        style={{
            position:  'absolute',
            top:       0,
            left:      0,
            width:     90,
            height:    200,   // extra height so drops don't clip
            zIndex:    9999,
            transform: [{ translateX: canX }, { translateY: canY }],
        }}
    >
        <WateringCanSVG isPouring={isPouring} />

        {/* Three staggered drops appear only when hovering over the potato */}
        {isPouring && (
            <>
                <WaterDrop delay={0}   offsetX={-4} />
                <WaterDrop delay={190} offsetX={3}  />
                <WaterDrop delay={380} offsetX={-1} />
            </>
        )}
    </Animated.View>
);

export default WateringCanOverlay;
