import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Svg, { Path as SvgPath } from 'react-native-svg';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';

const BLACK = '#000000';
const WHITE = '#FFFFFF';

interface CanvasFooterProps {
    isDragging: boolean;
    isDraggingOverDelete: boolean;
    deleteButtonRef: React.RefObject<View | null>;
    onDeleteZoneLayout: () => void;
}

export const CanvasFooter: React.FC<CanvasFooterProps> = ({
    isDragging,
    isDraggingOverDelete,
    deleteButtonRef,
    onDeleteZoneLayout,
}) => {
    if (!isDragging) return null;

    return (
        <Animated.View
            entering={SlideInDown.duration(200)}
            exiting={SlideOutDown.duration(200)}
            style={[
                styles.deleteZone,
                isDraggingOverDelete && styles.deleteZoneActive,
            ]}
        >
            <View
                ref={deleteButtonRef}
                onLayout={onDeleteZoneLayout}
                style={styles.deleteZoneInner}
            >
                <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
                    <SvgPath
                        d="M21 5.98C17.67 5.65 14.32 5.48 10.98 5.48C9 5.48 7.02 5.58 5.04 5.78L3 5.98M8.5 4.97L8.72 3.66C8.88 2.71 9 2 10.69 2H13.31C15 2 15.13 2.75 15.28 3.67L15.5 4.97M18.85 9.14L18.2 19.21C18.09 20.78 18 22 15.21 22H8.79C6 22 5.91 20.78 5.8 19.21L5.15 9.14"
                        stroke={isDraggingOverDelete ? WHITE : BLACK + '60'}
                        strokeWidth={1.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </Svg>
                <Text style={[styles.deleteText, { color: isDraggingOverDelete ? WHITE : BLACK + '60' }]}>
                    Drop to delete
                </Text>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    deleteZone: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 40 : 20,
        alignSelf: 'center',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 24,
        backgroundColor: WHITE,
        zIndex: 100,
    },
    deleteZoneActive: {
        backgroundColor: '#D32F2F',
    },
    deleteZoneInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    deleteText: {
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        fontSize: 18,
    },
});
