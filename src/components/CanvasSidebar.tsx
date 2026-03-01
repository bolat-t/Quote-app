import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path as SvgPath } from 'react-native-svg';

const PALETTE_COLORS = ['#5E4B3C', '#8B4513', '#2F4F4F', '#191970', '#4A0404', '#1C1C1C'];

const YELLOW = '#FFE600';
const BLACK = '#000000';
const WHITE = '#FFFFFF';

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
    onRegenerate: () => void;
    onAddImage: () => void;
    onPaper: () => void;
    onClear: () => void;
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
    onRegenerate,
    onAddImage,
    onPaper,
    onClear,
}) => {
    const [showColors, setShowColors] = useState(false);
    const mutedColor = BLACK + '40';

    return (
        <View style={styles.container}>
            {/* Draw Toggle */}
            <TouchableOpacity
                style={[styles.toolButton, isDrawing && styles.toolButtonActive]}
                onPress={onDrawToggle}
                activeOpacity={0.7}
            >
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                    <SvgPath
                        d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
                        stroke={BLACK}
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </Svg>
            </TouchableOpacity>

            {/* Undo */}
            <TouchableOpacity style={styles.toolButton} onPress={onUndo} disabled={historyLength === 0} activeOpacity={0.7}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                    <SvgPath
                        d="M3 10H14C16.21 10 18 11.79 18 14C18 16.21 16.21 18 14 18H13"
                        stroke={historyLength > 0 ? BLACK : mutedColor}
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <SvgPath
                        d="M7 6L3 10L7 14"
                        stroke={historyLength > 0 ? BLACK : mutedColor}
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
                        stroke={redoLength > 0 ? BLACK : mutedColor}
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <SvgPath
                        d="M17 6L21 10L17 14"
                        stroke={redoLength > 0 ? BLACK : mutedColor}
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </Svg>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider} />

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
                                    selectedColor === color && styles.colorSwatchSelected,
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
                    style={[styles.colorSwatch, { backgroundColor: selectedColor, alignSelf: 'center' }]}
                    onPress={() => setShowColors(true)}
                    activeOpacity={0.7}
                />
            )}

            {/* Divider */}
            <View style={styles.divider} />

            {/* New Quote */}
            <TouchableOpacity style={styles.toolButton} onPress={onRegenerate} activeOpacity={0.7}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                    <SvgPath
                        d="M22 12C22 17.52 17.52 22 12 22C6.48 22 3.11 16.44 3.11 16.44M3.11 16.44H7.63M3.11 16.44V21.44M2 12C2 6.48 6.44 2 12 2C18.67 2 22 7.56 22 7.56M22 7.56V2.56M22 7.56H17.56"
                        stroke={BLACK}
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </Svg>
            </TouchableOpacity>

            {/* Add Image */}
            <TouchableOpacity style={styles.toolButton} onPress={onAddImage} activeOpacity={0.7}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                    <SvgPath
                        d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 21"
                        stroke={BLACK}
                        strokeWidth={1.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </Svg>
            </TouchableOpacity>

            {/* Change Paper */}
            <TouchableOpacity style={styles.toolButton} onPress={onPaper} activeOpacity={0.7}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                    <SvgPath
                        d="M4 6H20M4 12H20M4 18H20"
                        stroke={BLACK}
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </Svg>
            </TouchableOpacity>

            {/* Clear Canvas */}
            <TouchableOpacity style={styles.toolButton} onPress={onClear} activeOpacity={0.7}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                    <SvgPath
                        d="M21 5.98C17.67 5.65 14.32 5.48 10.98 5.48C9 5.48 7.02 5.58 5.04 5.78L3 5.98M8.5 4.97L8.72 3.66C8.88 2.71 9 2 10.69 2H13.31C15 2 15.13 2.75 15.28 3.67L15.5 4.97M18.85 9.14L18.2 19.21C18.09 20.78 18 22 15.21 22H8.79C6 22 5.91 20.78 5.8 19.21L5.15 9.14"
                        stroke="#D32F2F"
                        strokeWidth={1.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </Svg>
            </TouchableOpacity>
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
        backgroundColor: WHITE,
        gap: 4,
        alignItems: 'center',
    },
    toolButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    toolButtonActive: {
        backgroundColor: YELLOW + '40',
    },
    divider: {
        width: '80%',
        height: 1,
        marginVertical: 4,
        backgroundColor: BLACK + '10',
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
    colorSwatchSelected: {
        borderWidth: 2,
        borderColor: WHITE,
    },
});
