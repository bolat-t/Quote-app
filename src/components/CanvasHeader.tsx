import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path as SvgPath } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';

export type CanvasMode = 'draw' | 'journal';

interface CanvasHeaderProps {
    onClose?: () => void;
    onDone: () => void;
    title?: string;
    mode?: CanvasMode;
    onModeChange?: (mode: CanvasMode) => void;
}

export const CanvasHeader: React.FC<CanvasHeaderProps> = ({
    onClose,
    onDone,
    title = 'Canvas',
    mode,
    onModeChange,
}) => {
    const { theme } = useTheme();
    const colors = theme.colors;
    const hasSegment = mode !== undefined && onModeChange !== undefined;

    return (
        <View style={[styles.header, { backgroundColor: colors.background + 'CC' }]}>
            {/* Left: Close or spacer */}
            {onClose ? (
                <TouchableOpacity style={styles.sideSlot} onPress={onClose} activeOpacity={0.7}>
                    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                        <SvgPath
                            d="M18 6L6 18M6 6l12 12"
                            stroke={colors.text + '60'}
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </Svg>
                </TouchableOpacity>
            ) : (
                <View style={styles.sideSlot} />
            )}

            {/* Center: segment control or title */}
            {hasSegment ? (
                <View style={[styles.segmentTrack, { backgroundColor: colors.text + '10' }]}>
                    {/* Draw segment */}
                    <TouchableOpacity
                        style={[
                            styles.segment,
                            mode === 'draw' && { backgroundColor: colors.primary },
                        ]}
                        onPress={() => onModeChange!('draw')}
                        activeOpacity={0.75}
                    >
                        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" style={{ marginRight: 5 }}>
                            <SvgPath
                                d="M16.04 3.02L8.16 10.9C7.86 11.2 7.56 11.79 7.5 12.22L7.07 15.23C6.91 16.32 7.68 17.08 8.77 16.93L11.78 16.5C12.2 16.44 12.79 16.14 13.1 15.84L20.98 7.96C22.34 6.6 22.98 5.02 20.98 3.02C18.98 1.02 17.4 1.66 16.04 3.02Z"
                                stroke={mode === 'draw' ? '#FFFFFF' : colors.text + '70'}
                                strokeWidth={1.5}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </Svg>
                        <Text style={[
                            styles.segmentLabel,
                            { color: mode === 'draw' ? '#FFFFFF' : colors.text + '70' },
                        ]}>
                            Draw
                        </Text>
                    </TouchableOpacity>

                    {/* Journal segment */}
                    <TouchableOpacity
                        style={[
                            styles.segment,
                            mode === 'journal' && { backgroundColor: colors.primary },
                        ]}
                        onPress={() => onModeChange!('journal')}
                        activeOpacity={0.75}
                    >
                        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" style={{ marginRight: 5 }}>
                            <SvgPath
                                d="M6 2H14L18 6V20C18 21.1 17.1 22 16 22H6C4.9 22 4 21.1 4 20V4C4 2.9 4.9 2 6 2ZM14 2V6H18"
                                stroke={mode === 'journal' ? '#FFFFFF' : colors.text + '70'}
                                strokeWidth={1.5}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <SvgPath
                                d="M8 13H14M8 17H12"
                                stroke={mode === 'journal' ? '#FFFFFF' : colors.text + '70'}
                                strokeWidth={1.5}
                                strokeLinecap="round"
                            />
                        </Svg>
                        <Text style={[
                            styles.segmentLabel,
                            { color: mode === 'journal' ? '#FFFFFF' : colors.text + '70' },
                        ]}>
                            Journal
                        </Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            )}

            {/* Right: Done */}
            <TouchableOpacity
                style={[styles.doneButton, { backgroundColor: colors.primary + '15' }]}
                onPress={onDone}
                activeOpacity={0.7}
            >
                <Text style={[styles.doneText, { color: colors.primary }]}>Done</Text>
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
    },
    sideSlot: {
        padding: 6,
        width: 52,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontFamily: 'Caveat-Bold',
        fontSize: 20,
        letterSpacing: 0.5,
    },
    // Segment control
    segmentTrack: {
        flexDirection: 'row',
        borderRadius: 20,
        padding: 3,
        gap: 2,
    },
    segment: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 16,
    },
    segmentLabel: {
        fontFamily: 'Caveat-Bold',
        fontSize: 15,
        letterSpacing: 0.3,
    },
    // Done button
    doneButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
        alignItems: 'center',
    },
    doneText: {
        fontFamily: 'Caveat-Bold',
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});
