import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    withSpring,
    Easing,
} from 'react-native-reanimated';
import Svg, { Path, Rect, Circle, Ellipse, Polygon } from 'react-native-svg';

interface Props {
    width?: number;
    height?: number;
    stage: number;
}

export const AnimatedBonsai: React.FC<Props> = ({ width = 200, height = 200, stage }) => {
    const scaleAnim = useSharedValue(0);
    const sproutAnim = useSharedValue(0);
    const leafAnim = useSharedValue(0);
    const bloomAnim = useSharedValue(0);

    // Re-trigger animations on stage change or mount
    useEffect(() => {
        scaleAnim.value = 0;
        sproutAnim.value = 0;
        leafAnim.value = 0;
        bloomAnim.value = 0;

        // Use a slight timeout to ensure values reset before animating
        const timer = setTimeout(() => {
            scaleAnim.value = withSpring(1, { damping: 15, stiffness: 150 });
            sproutAnim.value = withDelay(200, withTiming(1, { duration: 1000, easing: Easing.out(Easing.cubic) }));
            leafAnim.value = withDelay(600, withSpring(1, { damping: 12, stiffness: 100 }));
            bloomAnim.value = withDelay(1000, withSpring(1, { damping: 10, stiffness: 80 }));
        }, 50);

        return () => clearTimeout(timer);
    }, [stage]);

    // Stage visual logic
    const isOvergrown = stage >= 4;
    const isPink = stage >= 7 && stage <= 8;
    const isPurple = stage >= 9;
    const hasFlowers = isPink || isPurple;
    const flowerColor = isPurple ? '#AB47BC' : '#F48FB1';
    const trunkColor = stage >= 7 ? '#5D4037' : '#795548';

    // Animate the Pot falling/scaling in
    const potStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: (1 - scaleAnim.value) * 30 }],
        opacity: scaleAnim.value,
    }));

    // Stem scales up
    const stemStyle = useAnimatedStyle(() => ({
        transform: [{ scaleY: sproutAnim.value }],
        opacity: sproutAnim.value,
    }));

    // Leaves pop
    const leafStyle = useAnimatedStyle(() => ({
        transform: [{ scale: leafAnim.value }],
        opacity: leafAnim.value,
    }));

    // Flowers pop
    const flowerStyle = useAnimatedStyle(() => ({
        transform: [{ scale: bloomAnim.value }],
        opacity: bloomAnim.value,
    }));

    return (
        <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
            {/* The Trunk / Stem */}
            <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
                <Animated.View style={[{ width: '100%', height: '100%' }, stemStyle]}>
                    <Svg width="100%" height="100%" viewBox="0 0 100 100">
                        {/* Main trunk */}
                        <Path
                            d="M50 85 Q45 60 55 45 T45 20"
                            fill="none"
                            stroke={trunkColor}
                            strokeWidth="6"
                            strokeLinecap="round"
                        />
                        {/* Branches */}
                        {isOvergrown && (
                            <Path
                                d="M52 50 Q65 40 75 35"
                                fill="none"
                                stroke={trunkColor}
                                strokeWidth="4"
                                strokeLinecap="round"
                            />
                        )}
                        <Path
                            d="M54 35 Q35 30 25 35"
                            fill="none"
                            stroke={trunkColor}
                            strokeWidth="4"
                            strokeLinecap="round"
                        />
                    </Svg>
                </Animated.View>
            </View>

            {/* Leaves */}
            <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]} pointerEvents="none">
                <Animated.View style={[{ position: 'absolute', top: '25%', left: '20%', width: 30, height: 30 }, leafStyle]}>
                    <Svg width="100%" height="100%" viewBox="0 0 24 24">
                        <Ellipse cx="12" cy="12" rx="10" ry="6" fill={isPink ? '#f8bbd0' : isPurple ? '#e1bee7' : '#81C784'} transform="rotate(-20 12 12)" />
                    </Svg>
                </Animated.View>

                {isOvergrown && (
                    <Animated.View style={[{ position: 'absolute', top: '30%', left: '60%', width: 36, height: 36 }, leafStyle]}>
                        <Svg width="100%" height="100%" viewBox="0 0 24 24">
                            <Ellipse cx="12" cy="12" rx="12" ry="7" fill={isPink ? '#f48fb1' : isPurple ? '#ce93d8' : '#66BB6A'} transform="rotate(25 12 12)" />
                        </Svg>
                    </Animated.View>
                )}

                <Animated.View style={[{ position: 'absolute', top: '10%', left: '35%', width: 40, height: 40 }, leafStyle]}>
                    <Svg width="100%" height="100%" viewBox="0 0 24 24">
                        <Ellipse cx="12" cy="12" rx="11" ry="8" fill={isPink ? '#f06292' : isPurple ? '#ba68c8' : '#4CAF50'} />
                    </Svg>
                </Animated.View>
            </View>

            {/* Flowers */}
            {hasFlowers && (
                <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]} pointerEvents="none">
                    <Animated.View style={[{ position: 'absolute', top: '12%', left: '42%', width: 24, height: 24 }, flowerStyle]}>
                        <Svg width="100%" height="100%" viewBox="0 0 24 24">
                            <Circle cx="8" cy="8" r="5" fill={flowerColor} />
                            <Circle cx="16" cy="8" r="5" fill={flowerColor} />
                            <Circle cx="8" cy="16" r="5" fill={flowerColor} />
                            <Circle cx="16" cy="16" r="5" fill={flowerColor} />
                            <Circle cx="12" cy="12" r="3" fill="#FFCA28" />
                        </Svg>
                    </Animated.View>

                    <Animated.View style={[{ position: 'absolute', top: '32%', left: '68%', width: 20, height: 20 }, flowerStyle]}>
                        <Svg width="100%" height="100%" viewBox="0 0 24 24">
                            <Circle cx="8" cy="8" r="5" fill={flowerColor} />
                            <Circle cx="16" cy="8" r="5" fill={flowerColor} />
                            <Circle cx="8" cy="16" r="5" fill={flowerColor} />
                            <Circle cx="16" cy="16" r="5" fill={flowerColor} />
                            <Circle cx="12" cy="12" r="3" fill="#FFCA28" />
                        </Svg>
                    </Animated.View>

                    <Animated.View style={[{ position: 'absolute', top: '22%', left: '20%', width: 16, height: 16 }, flowerStyle]}>
                        <Svg width="100%" height="100%" viewBox="0 0 24 24">
                            <Circle cx="8" cy="8" r="5" fill={flowerColor} />
                            <Circle cx="16" cy="8" r="5" fill={flowerColor} />
                            <Circle cx="8" cy="16" r="5" fill={flowerColor} />
                            <Circle cx="16" cy="16" r="5" fill={flowerColor} />
                            <Circle cx="12" cy="12" r="3" fill="#FFCA28" />
                        </Svg>
                    </Animated.View>
                </View>
            )}

            {/* The Pot */}
            <Animated.View style={[{ position: 'absolute', bottom: '5%', width: '50%', height: '20%' }, potStyle]}>
                <Svg width="100%" height="100%" viewBox="0 0 100 50">
                    <Polygon points="12,12 88,12 78,45 22,45" fill="#4E342E" />
                    <Polygon points="10,10 90,10 80,45 20,45" fill="#8D6E63" />
                    <Rect x="5" y="0" width="90" height="10" rx="2" fill="#5D4037" />
                    <Rect x="5" y="0" width="90" height="4" fill="#795548" />
                </Svg>
            </Animated.View>
        </View>
    );
};
