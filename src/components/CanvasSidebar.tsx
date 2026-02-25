import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import Svg, { Path as SvgPath } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';

const PALETTE_COLORS = ['#5E4B3C', '#8B4513', '#2F4F4F', '#191970', '#4A0404', '#1C1C1C'];

interface CanvasSidebarProps {
    isDrawing: boolean;
    onDrawToggle: () => void;
    onUndo: () => void;
    onRedo: () => void;
    historyLength: number;
    redoLength: number;
    selectedColor: string;
    onColorChange: (color: string) => void;
    isPremium: boolean;
    onShowPaywall: () => void;
}

export const CanvasSidebar: React.FC<CanvasSidebarProps> = ({
    isDrawing,
    onDrawToggle,
    onUndo,
    onRedo,
    historyLength,
    redoLength,
    selectedColor,
    onColorChange,
    isPremium,
    onShowPaywall,
}) => {
    const { theme } = useTheme();
    const [showColors, setShowColors] = useState(false);
    const colors = theme.colors;
    const iconColor = colors.text;
    const mutedColor = iconColor + '40';

    return (
        <View style={[styles.container, { backgroundColor: colors.paper, borderColor: colors.border + '30' }]}>
            {/* Draw Toggle */}
            <TouchableOpacity
                style={[
                    styles.toolButton,
                    isDrawing && { backgroundColor: colors.primary },
                ]}
                onPress={onDrawToggle}
                activeOpacity={0.7}
            >
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                    <SvgPath
                        d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
                        stroke={isDrawing ? '#FFF' : iconColor}
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </Svg>
            </TouchableOpacity>

            {/* Eraser / Clear */}
            <TouchableOpacity style={styles.toolButton} onPress={onUndo} disabled={historyLength === 0} activeOpacity={0.7}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                    <SvgPath
                        d="M3 10H14C16.21 10 18 11.79 18 14C18 16.21 16.21 18 14 18H13"
                        stroke={historyLength > 0 ? iconColor : mutedColor}
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <SvgPath
                        d="M7 6L3 10L7 14"
                        stroke={historyLength > 0 ? iconColor : mutedColor}
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </Svg>
            </TouchableOpacity>

            {/* Redo */}
            <TouchableOpacity style={styles.toolButton} onPress={onRedo} disabled={redoLength === 0} activeOpacity={0.7}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                    <SvgPath
                        d="M21 10H10C7.79 10 6 11.79 6 14C6 16.21 7.79 18 10 18H11"
                        stroke={redoLength > 0 ? iconColor : mutedColor}
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <SvgPath
                        d="M17 6L21 10L17 14"
                        stroke={redoLength > 0 ? iconColor : mutedColor}
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </Svg>
            </TouchableOpacity>

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: colors.primary + '15' }]} />

            {/* Color Swatches */}
            {showColors ? (
                <View style={styles.colorColumn}>
                    {PALETTE_COLORS.map((color, index) => {
                        const isLocked = !isPremium && index >= 5;
                        return (
                            <TouchableOpacity
                                key={color}
                                style={[
                                    styles.colorSwatch,
                                    { backgroundColor: color },
                                    selectedColor === color && {
                                        borderWidth: 2,
                                        borderColor: colors.primary,
                                        shadowColor: colors.primary,
                                        shadowOpacity: 0.4,
                                        shadowRadius: 4,
                                        elevation: 3,
                                    },
                                    isLocked && { opacity: 0.35 },
                                ]}
                                onPress={() => {
                                    if (isLocked) {
                                        onShowPaywall();
                                    } else {
                                        onColorChange(color);
                                        setShowColors(false);
                                    }
                                }}
                                activeOpacity={0.7}
                            />
                        );
                    })}
                </View>
            ) : (
                <TouchableOpacity
                    style={[
                        styles.colorSwatch,
                        { backgroundColor: selectedColor, alignSelf: 'center' },
                    ]}
                    onPress={() => setShowColors(true)}
                    activeOpacity={0.7}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 12,
        top: '15%',
        zIndex: 50,
        padding: 6,
        borderRadius: 20,
        borderWidth: 1,
        gap: 4,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 5,
    },
    toolButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    divider: {
        width: '80%',
        height: 1,
        marginVertical: 4,
    },
    colorColumn: {
        gap: 6,
        padding: 4,
        alignItems: 'center',
    },
    colorSwatch: {
        width: 24,
        height: 24,
        borderRadius: 12,
    },
});
