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
                opacity: Animated.add(0.9, Animated.multiply(glowAnim, 0.1)),
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
                            {nextLevel ? `${xpInCurrentLevel}/${xpNeededForNext} XP` : 'MAX'}
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
        borderWidth: 2,
        borderColor: BLACK,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 8,
        paddingVertical: 7,
    },
    levelBadge: {
        width: 26,
        height: 26,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
        backgroundColor: YELLOW,
    },
    barSection: {
        flex: 1,
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    levelText: {
        fontSize: 12,
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        letterSpacing: 0.2,
        color: BLACK,
    },
    xpText: {
        fontSize: 11,
        fontFamily: 'OpenSans-SemiBold',
        color: '#555555',
    },
    track: {
        height: 5,
        borderRadius: 3,
        overflow: 'hidden',
        backgroundColor: '#E0E0E0',
    },
    fill: {
        height: '100%',
        borderRadius: 3,
        backgroundColor: YELLOW,
    },
});
