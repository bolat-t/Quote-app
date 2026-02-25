import React, { memo, useEffect, useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    withSpring,
    withDelay,
    Easing,
    cancelAnimation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { BonsaiAnimationTrigger } from '../../types';
import { getBonsaiColors } from './bonsaiColors';
import BonsaiParticles from './BonsaiParticles';
import { AnimatedBonsai } from './AnimatedBonsai';

interface BonsaiTreeProps {
    stage: number;
    health: number;
    effectiveLeafCount: number;
    effectiveBlossomCount: number;
    isDark: boolean;
    animationTrigger: BonsaiAnimationTrigger;
    onClearTrigger: () => void;
    onWater: () => void;
    onTend: () => void;
    width?: number;
    height?: number;
}

const BonsaiTree: React.FC<BonsaiTreeProps> = ({
    stage,
    health,
    isDark,
    animationTrigger,
    onClearTrigger,
    onWater,
    onTend,
    width = 220,
    height = 250,
}) => {
    const colors = getBonsaiColors(isDark);

    // Gentle continuous scale: 75% at stage 1 → 100% at stage 10
    const stageScale = 0.75 + (stage - 1) / 9 * 0.25;
    // Health-based opacity: wilting tree looks faded
    const healthOpacity = health < 30 ? 0.55 : health < 60 ? 0.78 : 1.0;

    // ── Idle sway ──
    const swayRotation = useSharedValue(0);
    useEffect(() => {
        swayRotation.value = withRepeat(
            withSequence(
                withTiming(1.2, { duration: 3200, easing: Easing.inOut(Easing.ease) }),
                withTiming(-1.2, { duration: 3200, easing: Easing.inOut(Easing.ease) }),
            ),
            -1,
            true,
        );
        return () => cancelAnimation(swayRotation);
    }, []);

    const canopySwayStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${swayRotation.value}deg` }],
    }));

    // ── Interaction wiggle ──
    const wiggle = useSharedValue(0);
    const wiggleStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${wiggle.value}deg` }],
    }));

    const triggerWiggle = useCallback(() => {
        wiggle.value = withSequence(
            withTiming(4, { duration: 80 }),
            withTiming(-4, { duration: 80 }),
            withTiming(3, { duration: 70 }),
            withTiming(-2, { duration: 70 }),
            withTiming(0, { duration: 100 }),
        );
    }, []);

    // ── Water droplet ──
    const dropOpacity = useSharedValue(0);
    const dropY = useSharedValue(0);

    const triggerWaterDrop = useCallback(() => {
        dropOpacity.value = 0;
        dropY.value = 0;
        dropOpacity.value = withSequence(
            withTiming(1, { duration: 100 }),
            withDelay(500, withTiming(0, { duration: 200 })),
        );
        dropY.value = withTiming(40, { duration: 600, easing: Easing.in(Easing.quad) });
    }, []);

    const dropStyle = useAnimatedStyle(() => ({
        position: 'absolute' as const,
        left: width / 2 - 3,
        top: height * 0.5 + dropY.value,
        width: 6,
        height: 8,
        borderRadius: 3,
        backgroundColor: colors.water,
        opacity: dropOpacity.value,
    }));

    // ── Scale bounce for level up ──
    const treeScale = useSharedValue(1);
    const treeScaleStyle = useAnimatedStyle(() => ({
        transform: [{ scale: treeScale.value }],
    }));

    // ── Animation triggers ──
    useEffect(() => {
        if (!animationTrigger) return;

        switch (animationTrigger) {
            case 'water':
                triggerWaterDrop();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                break;
            case 'tend':
                triggerWiggle();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                break;
            case 'levelUp':
                treeScale.value = withSequence(
                    withSpring(1.08, { damping: 4, stiffness: 200 }),
                    withSpring(1, { damping: 8, stiffness: 150 }),
                );
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                break;
            case 'journal':
            case 'hunt':
            case 'canvas':
            case 'quote':
                triggerWiggle();
                break;
        }

        const timeout = setTimeout(() => onClearTrigger(), 1200);
        return () => clearTimeout(timeout);
    }, [animationTrigger]);

    // ── Tap handler ──
    const handlePress = useCallback((event: any) => {
        const { locationY } = event.nativeEvent;
        if (locationY > height * 0.65) {
            onWater();
        } else {
            onTend();
        }
    }, [height, onWater, onTend]);

    const imageWidth = width * stageScale;
    const imageHeight = height * stageScale;

    return (
        <Pressable onPress={handlePress} style={[styles.container, { width, height }]}>
            <Animated.View style={[styles.treeWrapper, treeScaleStyle]}>
                {/* Subtle card surface behind image so white bg blends in both themes */}
                <View style={[
                    styles.imageCard,
                    {
                        width: imageWidth,
                        height: imageHeight,
                        backgroundColor: isDark ? '#FFFFFF10' : 'transparent',
                    }
                ]}>
                    <Animated.View style={[canopySwayStyle, wiggleStyle, { width: imageWidth, height: imageHeight, opacity: healthOpacity }]}>
                        <AnimatedBonsai stage={stage} width={imageWidth} height={imageHeight} />
                    </Animated.View>
                </View>

                {/* Falling petal particles rendered on top */}
                <BonsaiParticles
                    colors={colors}
                    width={width}
                    height={height}
                    stage={stage}
                    health={health}
                />

                {/* Water drop overlay */}
                <Animated.View style={dropStyle} pointerEvents="none" />
            </Animated.View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    treeWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    imageCard: {
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
});

export default memo(BonsaiTree);
