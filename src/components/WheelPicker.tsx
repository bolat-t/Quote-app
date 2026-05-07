/**
 * WheelPicker — Vertical scroll-wheel picker for React Native
 *
 * UX Design Rationale:
 * ─────────────────────────────────────────────────────────────────────
 * • ITEM_H = 54px  → large enough for finger accuracy, small enough for
 *   5 items to fit without dominating the screen
 * • YELLOW selection band behind the center row gives clear affordance
 *   without needing borders or shadows — consistent with brutalist style
 * • Opacity/scale gradient on items above/below selected:
 *     dist=0 → opacity 1.0, scale 1.0  (selected)
 *     dist=1 → opacity 0.45, scale 0.86 (adjacent — hint, not distracting)
 *     dist=2 → opacity 0.15, scale 0.72 (far — barely visible, signals more exist)
 * • decelerationRate="fast" + snapToInterval mimics the tactile click of
 *   a mechanical dial — more decisive than the slow iOS default
 * • useAnimatedScrollHandler runs on the UI thread, so opacity/scale
 *   update during drag without JS-thread jank
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { BLACK, YELLOW } from '../constants/colors';
import Animated, {
    useSharedValue,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    interpolate,
    Extrapolate,
} from 'react-native-reanimated';

// ─── Constants ────────────────────────────────────────────────────────────────

export const ITEM_H   = 54;   // row height — also the snap interval
export const PICKER_H = ITEM_H * 5;  // show 5 rows (2 + selected + 2)

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WheelPickerProps {
    items:           string[];
    selectedIndex:   number;
    onIndexChange:   (index: number) => void;
    /** Column width — caller controls layout */
    width?:          number;
    /** Font size for item labels */
    fontSize?:       number;
    /** Font family override */
    fontFamily?:     string;
}

// ─── WheelItem ────────────────────────────────────────────────────────────────
// Individual row — animates on the UI thread based on scroll position

const WheelItem: React.FC<{
    label:      string;
    index:      number;
    scrollY:    Animated.SharedValue<number>;
    fontSize:   number;
    fontFamily: string;
}> = ({ label, index, scrollY, fontSize, fontFamily }) => {

    const animStyle = useAnimatedStyle(() => {
        // Distance from this item's center to the selection band center
        const dist = Math.abs(index * ITEM_H - scrollY.value);

        const opacity = interpolate(
            dist,
            [0, ITEM_H, ITEM_H * 2],
            [1, 0.45, 0.15],
            Extrapolate.CLAMP,
        );
        const scale = interpolate(
            dist,
            [0, ITEM_H, ITEM_H * 2],
            [1, 0.86, 0.72],
            Extrapolate.CLAMP,
        );
        return { opacity, transform: [{ scale }] };
    });

    return (
        <View style={[itemSt.wrap, { height: ITEM_H }]}>
            <Animated.Text style={[itemSt.text, { fontSize, fontFamily }, animStyle]}>
                {label}
            </Animated.Text>
        </View>
    );
};

const itemSt = StyleSheet.create({
    wrap: { justifyContent: 'center', alignItems: 'center' },
    text: { color: BLACK, textAlign: 'center' },
});

// ─── Animated ScrollView wrapper ──────────────────────────────────────────────

const ReanimatedScrollView = Animated.createAnimatedComponent(ScrollView);

// ─── WheelPicker ──────────────────────────────────────────────────────────────

export const WheelPicker: React.FC<WheelPickerProps> = ({
    items,
    selectedIndex,
    onIndexChange,
    width      = 90,
    fontSize   = 30,
    fontFamily = 'Inter-Bold',
}) => {
    const scrollRef = useRef<ScrollView>(null);
    const scrollY   = useSharedValue(selectedIndex * ITEM_H);

    // Jump to initial position on mount
    useEffect(() => {
        const y = selectedIndex * ITEM_H;
        scrollRef.current?.scrollTo({ y, animated: false });
        scrollY.value = y;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Track scroll position on UI thread for live opacity/scale feedback
    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (e) => {
            scrollY.value = e.contentOffset.y;
        },
    });

    // Called when scroll settles — reports the snapped index to parent
    const reportIndex = (rawY: number) => {
        const idx = Math.max(0, Math.min(items.length - 1, Math.round(rawY / ITEM_H)));
        onIndexChange(idx);
    };

    return (
        <View style={[wSt.container, { width, height: PICKER_H }]}>

            {/*
             * YELLOW selection band sits BEHIND the scroll view.
             * Items have transparent backgrounds so the band shows through.
             * Position: centered vertically = ITEM_H * 2 from top (3rd of 5 rows).
             *
             * UX Note: using a YELLOW fill (not just top/bottom lines) so the
             * selected row is unambiguous — no squinting for hairlines.
             */}
            <View style={wSt.selectionBand} pointerEvents="none" />

            {/* Top and bottom edge fade — subtle white veil over outer rows */}
            <View style={wSt.fadeTop}    pointerEvents="none" />
            <View style={wSt.fadeBottom} pointerEvents="none" />

            <ReanimatedScrollView
                ref={scrollRef as any}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                snapToInterval={ITEM_H}
                decelerationRate="fast"          // tactile, decisive stop
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: ITEM_H * 2 }}
                onMomentumScrollEnd={(e) => reportIndex(e.nativeEvent.contentOffset.y)}
                onScrollEndDrag={(e)      => reportIndex(e.nativeEvent.contentOffset.y)}
            >
                {items.map((item, i) => (
                    <WheelItem
                        key={i}
                        label={item}
                        index={i}
                        scrollY={scrollY}
                        fontSize={fontSize}
                        fontFamily={fontFamily}
                    />
                ))}
            </ReanimatedScrollView>
        </View>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const wSt = StyleSheet.create({
    container: {
        overflow: 'hidden',
        position: 'relative',
    },
    selectionBand: {
        position: 'absolute',
        top:   ITEM_H * 2,
        left:  4,
        right: 4,
        height: ITEM_H,
        backgroundColor: YELLOW,
        borderRadius: 12,
        zIndex: 0,
    },
    // Soft white veil fades the outer 2 rows — suggests more items above/below
    fadeTop: {
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: ITEM_H * 2,
        backgroundColor: '#FFFFFF',
        opacity: 0.55,
        zIndex: 2,
        pointerEvents: 'none',
    },
    fadeBottom: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: ITEM_H * 2,
        backgroundColor: '#FFFFFF',
        opacity: 0.55,
        zIndex: 2,
        pointerEvents: 'none',
    },
});
