import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    View,
    StyleSheet,
    TouchableWithoutFeedback,
    Image,
} from 'react-native';
import { PlantAnimationTrigger } from '../types';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const POTATO_IMAGE = require('../../assets/mascot/potato.png') as number;

interface PotatoPlantProps {
    health: number;                         // 0–100
    animationTrigger: PlantAnimationTrigger;
    onClearTrigger: () => void;
    onWater: () => void;
    onTend: () => void;
    width?: number;
    height?: number;
}

export const PotatoPlant: React.FC<PotatoPlantProps> = ({
    health,
    animationTrigger,
    onClearTrigger,
    onWater,
    onTend,
    width = 280,
    height = 240,
}) => {
    const swayAnim   = useRef(new Animated.Value(0)).current;
    const scaleAnim  = useRef(new Animated.Value(1)).current;
    const dropOpacity = useRef(new Animated.Value(0)).current;
    const dropY       = useRef(new Animated.Value(0)).current;
    const [showDrop, setShowDrop] = useState(false);

    // ── Idle sway ───────────────────────────────────────────
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(swayAnim, { toValue:  1.4, duration: 3000, useNativeDriver: true }),
                Animated.timing(swayAnim, { toValue: -1.4, duration: 3000, useNativeDriver: true }),
                Animated.timing(swayAnim, { toValue:  0,   duration: 3000, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [swayAnim]);

    // ── Animation triggers ──────────────────────────────────
    useEffect(() => {
        if (!animationTrigger) return;

        if (animationTrigger === 'water') {
            setShowDrop(true);
            dropOpacity.setValue(1);
            dropY.setValue(-18);
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1.1, useNativeDriver: true, tension: 220, friction: 7,
                }),
                Animated.sequence([
                    Animated.timing(dropY,       { toValue: 50, duration: 600, useNativeDriver: true }),
                    Animated.timing(dropOpacity, { toValue: 0,  duration: 200, useNativeDriver: true }),
                ]),
            ]).start(() => {
                Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
                setShowDrop(false);
                onClearTrigger();
            });
        } else {
            // Wiggle for tend / journal / canvas / etc.
            Animated.sequence([
                Animated.timing(swayAnim, { toValue:  7,  duration: 70, useNativeDriver: true }),
                Animated.timing(swayAnim, { toValue: -6,  duration: 70, useNativeDriver: true }),
                Animated.timing(swayAnim, { toValue:  4,  duration: 70, useNativeDriver: true }),
                Animated.timing(swayAnim, { toValue: -2,  duration: 70, useNativeDriver: true }),
                Animated.timing(swayAnim, { toValue:  0,  duration: 70, useNativeDriver: true }),
            ]).start(() => onClearTrigger());
        }
    }, [animationTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

    const rotate = swayAnim.interpolate({
        inputRange: [-7, 7],
        outputRange: ['-7deg', '7deg'],
    });

    // Potato looks droopy when health is low
    const healthOpacity = health < 30 ? 0.52 : health < 60 ? 0.80 : 1;
    const imgSize = Math.min(width * 0.78, height * 0.92);

    return (
        <TouchableWithoutFeedback onPress={onWater} onLongPress={onTend}>
            <View style={[styles.container, { width, height }]}>
                <Animated.View
                    style={{
                        transform: [{ rotate }, { scale: scaleAnim }],
                        opacity: healthOpacity,
                    }}
                >
                    <Image
                        source={POTATO_IMAGE}
                        style={{ width: imgSize, height: imgSize }}
                        resizeMode="contain"
                    />
                </Animated.View>

                {/* Water drop */}
                {showDrop && (
                    <Animated.View
                        style={[
                            styles.waterDrop,
                            { opacity: dropOpacity, transform: [{ translateY: dropY }] },
                        ]}
                    >
                        <View style={styles.dropCircle} />
                    </Animated.View>
                )}
            </View>
        </TouchableWithoutFeedback>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    waterDrop: {
        position: 'absolute',
        top: '15%',
        alignItems: 'center',
    },
    dropCircle: {
        width: 10,
        height: 14,
        borderRadius: 5,
        backgroundColor: '#4ECCA3',
        opacity: 0.85,
    },
});

export default PotatoPlant;
