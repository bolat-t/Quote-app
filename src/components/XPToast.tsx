import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Path as SvgPath } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';

interface XPToastProps {
    xpAmount: number;
    label?: string;
    leveledUp?: boolean;
    newLevelTitle?: string;
    visible: boolean;
    onDismiss: () => void;
}

const StarIcon = ({ size = 22, color = '#4ECCA3' }: { size?: number; color?: string }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <SvgPath
            d="M12 2L14.09 8.26L21 9.27L16 14.14L17.18 21.02L12 17.77L6.82 21.02L8 14.14L3 9.27L9.91 8.26L12 2Z"
            stroke={color}
            strokeWidth={1.5}
            fill={color + '30'}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

export const XPToast: React.FC<XPToastProps> = ({
    xpAmount,
    label,
    leveledUp,
    newLevelTitle,
    visible,
    onDismiss,
}) => {
    const { theme } = useTheme();
    const colors = theme.colors;
    const translateY = useRef(new Animated.Value(80)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(0.8)).current;

    useEffect(() => {
        if (visible && xpAmount > 0) {
            // Haptic feedback
            if (leveledUp) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }

            // Animate in
            Animated.parallel([
                Animated.spring(translateY, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
                Animated.spring(scale, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
            ]).start();

            // Auto-dismiss after 2.5s
            const timer = setTimeout(() => {
                Animated.parallel([
                    Animated.timing(translateY, { toValue: -40, duration: 300, useNativeDriver: true }),
                    Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
                ]).start(() => {
                    translateY.setValue(80);
                    scale.setValue(0.8);
                    onDismiss();
                });
            }, leveledUp ? 3500 : 2000);

            return () => clearTimeout(timer);
        }
    }, [visible, xpAmount]);

    if (!visible || xpAmount === 0) return null;

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    transform: [{ translateY }, { scale }],
                    opacity,
                },
            ]}
            pointerEvents="none"
        >
            {leveledUp ? (
                <View style={[styles.levelUpContainer, { borderColor: colors.primary, backgroundColor: colors.surface }]}>
                    <StarIcon color={colors.primary} />
                    <View>
                        <Text style={[styles.levelUpText, { color: colors.primary }]}>Level Up!</Text>
                        <Text style={[styles.levelUpTitle, { color: colors.onSurface }]}>{newLevelTitle}</Text>
                    </View>
                    <StarIcon color={colors.primary} />
                </View>
            ) : (
                <View style={[styles.xpContainer, { borderColor: colors.primary + '40', backgroundColor: colors.surface }]}>
                    <Text style={[styles.xpAmount, { color: colors.primary }]}>+{xpAmount} XP</Text>
                    {label && <Text style={[styles.xpLabel, { color: colors.onSurface + '90' }]}>{label}</Text>}
                </View>
            )}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 100,
        alignSelf: 'center',
        zIndex: 9999,
    },
    xpContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderWidth: 1.5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
        gap: 6,
    },
    xpAmount: {
        fontSize: 18,
        fontFamily: 'Caveat-Bold',
        letterSpacing: 0.5,
    },
    xpLabel: {
        fontSize: 13,
        fontFamily: 'Caveat-Regular',
    },
    levelUpContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 24,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderWidth: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
        gap: 8,
    },
    levelUpText: {
        fontSize: 20,
        fontFamily: 'Caveat-Bold',
        textAlign: 'center',
    },
    levelUpTitle: {
        fontSize: 14,
        fontFamily: 'Caveat-Regular',
        textAlign: 'center',
    },
});
