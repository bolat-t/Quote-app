import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { UserProgress } from '../types';
import { getXPProgress } from '../data/progressionConfig';
import { LevelIcon } from './LevelIcon';

const YELLOW = '#FFE600';
const BLACK  = '#000000';

interface XPBarProps {
    progress: UserProgress;
    onPress: () => void;
}

export const XPBar: React.FC<XPBarProps> = ({ progress, onPress }) => {
    const { currentLevel, nextLevel, xpInCurrentLevel, xpNeededForNext, percentage } = getXPProgress(progress.totalXP);
    const animatedWidth = useRef(new Animated.Value(0)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(animatedWidth, {
            toValue: percentage,
            friction: 8,
            tension: 40,
            useNativeDriver: false,
        }).start();
    }, [percentage]);

    useEffect(() => {
        Animated.sequence([
            Animated.timing(glowAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(glowAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]).start();
    }, [progress.totalXP]);

    return (
        <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
            <Animated.View style={[styles.inner, {
                opacity: Animated.add(0.85, Animated.multiply(glowAnim, 0.15)),
            }]}>
                {/* Level badge */}
                <View style={styles.levelBadge}>
                    <LevelIcon level={currentLevel.level} color={BLACK} size={14} />
                </View>

                {/* Bar + label */}
                <View style={styles.barSection}>
                    <View style={styles.labelRow}>
                        <Text style={styles.levelText}>
                            Lv.{currentLevel.level} {currentLevel.title}
                        </Text>
                        <Text style={styles.xpText}>
                            {nextLevel ? `${xpInCurrentLevel}/${xpNeededForNext}` : 'MAX'}
                        </Text>
                    </View>

                    {/* Progress track */}
                    <View style={styles.track}>
                        <Animated.View
                            style={[
                                styles.fill,
                                {
                                    width: animatedWidth.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: ['0%', '100%'],
                                    }),
                                },
                            ]}
                        />
                    </View>
                </View>
            </Animated.View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginHorizontal: 8,
    },
    inner: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: BLACK,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 8,
        paddingVertical: 5,
    },
    levelBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 6,
        backgroundColor: YELLOW,
    },
    barSection: {
        flex: 1,
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    levelText: {
        fontSize: 10,
        fontFamily: 'GasoekOne',
        letterSpacing: 0.3,
        color: BLACK,
    },
    xpText: {
        fontSize: 9,
        fontFamily: 'GasoekOne',
        color: BLACK + '80',
    },
    track: {
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
        backgroundColor: BLACK + '10',
    },
    fill: {
        height: '100%',
        borderRadius: 2,
        backgroundColor: YELLOW,
    },
});
