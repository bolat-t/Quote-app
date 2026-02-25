import React, { memo, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    withRepeat,
    withSequence,
    Easing,
    runOnJS,
} from 'react-native-reanimated';
import { BonsaiColorPalette } from './bonsaiColors';

interface BonsaiParticlesProps {
    colors: BonsaiColorPalette;
    width: number;
    height: number;
    stage: number;
    health: number;
}

interface Petal {
    id: number;
    startX: number;
    size: number;
    delay: number;
    duration: number;
    swayAmount: number;
    color: string;
}

const PETAL_COUNT = 4;

const FallingPetal: React.FC<{ petal: Petal; height: number }> = memo(({ petal, height }) => {
    const translateY = useSharedValue(-10);
    const translateX = useSharedValue(petal.startX);
    const opacity = useSharedValue(0);
    const rotation = useSharedValue(0);

    useEffect(() => {
        // Fade in, fall, fade out — then repeat
        opacity.value = withDelay(
            petal.delay,
            withRepeat(
                withSequence(
                    withTiming(0.7, { duration: 300 }),
                    withTiming(0.7, { duration: petal.duration - 800 }),
                    withTiming(0, { duration: 500 }),
                    // Stay invisible briefly before restarting
                    withTiming(0, { duration: 1000 }),
                ),
                -1,
            ),
        );

        translateY.value = withDelay(
            petal.delay,
            withRepeat(
                withSequence(
                    withTiming(height * 0.85, {
                        duration: petal.duration,
                        easing: Easing.in(Easing.quad),
                    }),
                    // Reset instantly
                    withTiming(-10, { duration: 0 }),
                    // Wait during invisible period
                    withTiming(-10, { duration: 1000 }),
                ),
                -1,
            ),
        );

        // Gentle horizontal sway
        translateX.value = withDelay(
            petal.delay,
            withRepeat(
                withSequence(
                    withTiming(petal.startX + petal.swayAmount, { duration: petal.duration * 0.5, easing: Easing.inOut(Easing.ease) }),
                    withTiming(petal.startX - petal.swayAmount * 0.5, { duration: petal.duration * 0.5, easing: Easing.inOut(Easing.ease) }),
                ),
                -1,
                true,
            ),
        );

        // Spin
        rotation.value = withDelay(
            petal.delay,
            withRepeat(
                withTiming(360, { duration: petal.duration * 1.2, easing: Easing.linear }),
                -1,
            ),
        );
    }, []);

    const animStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { rotate: `${rotation.value}deg` },
        ],
        opacity: opacity.value,
    }));

    return (
        <Animated.View
            style={[
                styles.petal,
                {
                    width: petal.size,
                    height: petal.size * 0.6,
                    backgroundColor: petal.color,
                    borderRadius: petal.size * 0.3,
                },
                animStyle,
            ]}
            pointerEvents="none"
        />
    );
});

const BonsaiParticles: React.FC<BonsaiParticlesProps> = ({
    colors,
    width,
    height,
    stage,
    health,
}) => {
    const [petals, setPetals] = useState<Petal[]>([]);
    const [mounted, setMounted] = useState(false);

    // Delay mount by 2s for performance
    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), 2000);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!mounted) return;

        // Only show particles at stage 4+ with decent health
        const count = stage < 4 ? 0 : Math.min(PETAL_COUNT, Math.floor((stage - 3) * 0.8) + 1);
        if (count === 0 || health < 30) {
            setPetals([]);
            return;
        }

        const newPetals: Petal[] = [];
        const treeLeft = width * 0.2;
        const treeRight = width * 0.8;

        for (let i = 0; i < count; i++) {
            const isBlossomPetal = i % 2 === 0;
            newPetals.push({
                id: i,
                startX: treeLeft + Math.random() * (treeRight - treeLeft),
                size: 4 + Math.random() * 3,
                delay: i * 2500 + Math.random() * 1500,
                duration: 4000 + Math.random() * 2000,
                swayAmount: 10 + Math.random() * 15,
                color: isBlossomPetal ? colors.blossom : colors.leafHealthy,
            });
        }

        setPetals(newPetals);
    }, [mounted, stage, health, colors.blossom, colors.leafHealthy, width]);

    if (!mounted || petals.length === 0) return null;

    return (
        <>
            {petals.map(petal => (
                <FallingPetal key={petal.id} petal={petal} height={height} />
            ))}
        </>
    );
};

const styles = StyleSheet.create({
    petal: {
        position: 'absolute',
        top: 0,
        left: 0,
    },
});

export default memo(BonsaiParticles);
