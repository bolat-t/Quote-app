import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BLACK, YELLOW } from '../../constants/colors';

export interface ProBadgeProps {
    /** sm = inline w/ text (10px), md = standalone (12px). */
    size?: 'sm' | 'md';
    /** Inverts colors: yellow text on black instead of black on yellow. */
    inverted?: boolean;
}

/**
 * Small "PRO" pill used to mark Pro-only affordances throughout the app.
 * Visual contract: always uppercase, always letter-spaced, always Inter-Bold.
 */
export const ProBadge: React.FC<ProBadgeProps> = ({ size = 'sm', inverted = false }) => (
    <View
        style={[
            styles.badge,
            size === 'md' && styles.badgeMd,
            inverted && styles.badgeInverted,
        ]}
    >
        <Text style={[styles.text, size === 'md' && styles.textMd, inverted && styles.textInverted]}>
            PRO
        </Text>
    </View>
);

const styles = StyleSheet.create({
    badge: {
        paddingHorizontal: 6,
        paddingVertical:   2,
        borderRadius:      4,
        backgroundColor:   YELLOW,
        borderWidth:       1,
        borderColor:       BLACK,
        alignSelf:         'flex-start',
    },
    badgeMd: {
        paddingHorizontal: 8,
        paddingVertical:   3,
        borderRadius:      5,
    },
    badgeInverted: {
        backgroundColor: BLACK,
        borderColor:     BLACK,
    },
    text: {
        fontFamily:    'Inter-Bold',
        fontSize:      9,
        color:         BLACK,
        letterSpacing: 0.8,
    },
    textMd: {
        fontSize: 11,
    },
    textInverted: {
        color: YELLOW,
    },
});
