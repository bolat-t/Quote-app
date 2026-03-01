import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path as SvgPath } from 'react-native-svg';

export type CanvasMode = 'draw';

const YELLOW = '#FFE600';
const BLACK = '#000000';
const WHITE = '#FFFFFF';

interface CanvasHeaderProps {
    onClose?: () => void;
    onDone: () => void;
    title?: string;
}

export const CanvasHeader: React.FC<CanvasHeaderProps> = ({
    onClose,
    onDone,
    title = 'Canvas',
}) => {
    return (
        <View style={styles.header}>
            {/* Left: Close or spacer */}
            {onClose ? (
                <TouchableOpacity style={styles.sideSlot} onPress={onClose} activeOpacity={0.7}>
                    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                        <SvgPath
                            d="M18 6L6 18M6 6l12 12"
                            stroke={BLACK + '60'}
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </Svg>
                </TouchableOpacity>
            ) : (
                <View style={styles.sideSlot} />
            )}

            {/* Center: title */}
            <Text style={styles.title}>{title}</Text>

            {/* Right: Done */}
            <TouchableOpacity
                style={styles.doneButton}
                onPress={onDone}
                activeOpacity={0.7}
            >
                <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        zIndex: 30,
        backgroundColor: WHITE + 'CC',
    },
    sideSlot: {
        padding: 6,
        width: 52,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontFamily: 'GasoekOne',
        fontSize: 20,
        letterSpacing: 0.5,
        color: BLACK,
    },

    // Done button
    doneButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
        alignItems: 'center',
        backgroundColor: YELLOW,
        elevation: 2,
        shadowColor: BLACK,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    doneText: {
        fontFamily: 'GasoekOne',
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: 0.5,
        color: BLACK,
    },
});
