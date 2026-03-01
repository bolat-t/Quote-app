import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Path as SvgPath } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

const YELLOW = '#FFE600';
const BLACK  = '#000000';

interface XPToastProps {
    xpAmount: number;
    label?: string;
    leveledUp?: boolean;
    newLevelTitle?: string;
    visible: boolean;
    onDismiss: () => void;
}

const StarIcon = ({ size = 22 }: { size?: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <SvgPath
            d="M12 2L14.09 8.26L21 9.27L16 14.14L17.18 21.02L12 17.77L6.82 21.02L8 14.14L3 9.27L9.91 8.26L12 2Z"
            stroke={BLACK}
            strokeWidth={1.5}
            fill={BLACK + '25'}
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
    const translateY = useRef(new Animated.Value(80)).current;
    const opacity    = useRef(new Animated.Value(0)).current;
    const scale      = useRef(new Animated.Value(0.8)).current;

    useEffect(() => {
        if (visible && xpAmount > 0) {
            if (leveledUp) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }

            Animated.parallel([
                Animated.spring(translateY, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
                Animated.timing(opacity,    { toValue: 1, duration: 200, useNativeDriver: true }),
                Animated.spring(scale,      { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
            ]).start();

            const timer = setTimeout(() => {
                Animated.parallel([
                    Animated.timing(translateY, { toValue: -40, duration: 300, useNativeDriver: true }),
                    Animated.timing(opacity,    { toValue: 0,   duration: 300, useNativeDriver: true }),
                ]).start(() => {
                    translateY.setValue(80);
                    scale.setValue(0.8);
                    onDismiss();
                });
            }, leveledUp ? 3500 : 2000);

            return () => clearTimeout(timer);
        }
    }, [visible, xpAmount]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!visible || xpAmount === 0) return null;

    return (
        <Animated.View
            style={[styles.container, { transform: [{ translateY }, { scale }], opacity }]}
            pointerEvents="none"
        >
            {leveledUp ? (
                <View style={styles.levelUpContainer}>
                    <StarIcon />
                    <View>
                        <Text style={styles.levelUpText}>Level Up!</Text>
                        <Text style={styles.levelUpTitle}>{newLevelTitle}</Text>
                    </View>
                    <StarIcon />
                </View>
            ) : (
                <View style={styles.xpContainer}>
                    <Text style={styles.xpAmount}>+{xpAmount} XP</Text>
                    {label && <Text style={styles.xpLabel}>{label}</Text>}
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
        borderWidth: 2,
        borderColor: BLACK,
        backgroundColor: YELLOW,
        gap: 6,
    },
    xpAmount: {
        fontSize: 18,
        fontFamily: 'GasoekOne',
        letterSpacing: 0.5,
        color: BLACK,
    },
    xpLabel: {
        fontSize: 13,
        fontFamily: 'GasoekOne',
        color: BLACK + 'BB',
    },
    levelUpContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 24,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderWidth: 2.5,
        borderColor: BLACK,
        backgroundColor: YELLOW,
        gap: 8,
    },
    levelUpText: {
        fontSize: 20,
        fontFamily: 'GasoekOne',
        textAlign: 'center',
        color: BLACK,
    },
    levelUpTitle: {
        fontSize: 14,
        fontFamily: 'GasoekOne',
        textAlign: 'center',
        color: BLACK + 'BB',
    },
});
