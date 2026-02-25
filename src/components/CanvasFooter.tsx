import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
    Dimensions,
    TextInput,
    Modal,
} from 'react-native';
import Svg, { Path as SvgPath } from 'react-native-svg';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    FadeIn,
    FadeOut,
    SlideInDown,
    SlideOutDown,
} from 'react-native-reanimated';
import { AudioInput } from './AudioInput';
import { useTheme } from '../context/ThemeContext';

interface CanvasFooterProps {
    onReflection: () => void;
    onSave: () => void;
    onClear: () => void;
    onAddText: () => void;
    onAddImage: () => void;
    onRegenerate: () => void;
    // Drag-to-delete
    isDragging: boolean;
    isDraggingOverDelete: boolean;
    deleteButtonRef: React.RefObject<View | null>;
    onDeleteZoneLayout: () => void;
    // Voice
    onVoiceInput: (text: string) => void;
    onVoiceError: (error: string) => void;
    onPaper: () => void;
}

export const CanvasFooter: React.FC<CanvasFooterProps> = ({
    onReflection,
    onSave,
    onClear,
    onAddText,
    onAddImage,
    onRegenerate,
    isDragging,
    isDraggingOverDelete,
    deleteButtonRef,
    onDeleteZoneLayout,
    onVoiceInput,
    onVoiceError,
    onPaper,
}) => {
    const { theme } = useTheme();
    const colors = theme.colors;
    const [showOverflow, setShowOverflow] = useState(false);

    return (
        <>
            {/* ===== DELETE ZONE (only visible when dragging) ===== */}
            {isDragging && (
                <Animated.View
                    entering={SlideInDown.duration(200)}
                    exiting={SlideOutDown.duration(200)}
                    style={[
                        styles.deleteZone,
                        {
                            backgroundColor: isDraggingOverDelete ? '#D32F2F' : colors.surface,
                            borderColor: isDraggingOverDelete ? '#D32F2F' : colors.text + '20',
                        },
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
                                stroke={isDraggingOverDelete ? '#FFF' : colors.text + '60'}
                                strokeWidth={1.5}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </Svg>
                        <Text style={[styles.deleteText, { color: isDraggingOverDelete ? '#FFF' : colors.text + '60' }]}>
                            Drop to delete
                        </Text>
                    </View>
                </Animated.View>
            )}

            {/* ===== MAIN FLOATING INPUT BAR ===== */}
            {!isDragging && (
                <View style={styles.bottomContainer}>
                    <View style={[styles.inputBar, { backgroundColor: colors.surface, borderColor: colors.primary + '15' }]}>
                        {/* Reflection Input Trigger */}
                        <TouchableOpacity
                            style={[styles.inputTrigger, { backgroundColor: colors.primaryContainer + '30' }]}
                            onPress={onReflection}
                            activeOpacity={0.7}
                        >
                            {/* Heart icon */}
                            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" style={{ marginRight: 10 }}>
                                <SvgPath
                                    d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"
                                    stroke={colors.primary + '80'}
                                    strokeWidth={1.5}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </Svg>
                            <Text style={[styles.inputPlaceholder, { color: colors.text + '40' }]}>
                                Write a reflection...
                            </Text>
                        </TouchableOpacity>

                        {/* Voice Button */}
                        <AudioInput
                            onTranscriptionComplete={onVoiceInput}
                            onError={onVoiceError}
                        />

                        {/* Overflow Menu */}
                        <TouchableOpacity
                            style={styles.overflowButton}
                            onPress={() => setShowOverflow(true)}
                            activeOpacity={0.7}
                        >
                            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                                <SvgPath
                                    d="M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM19 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"
                                    fill={colors.text + '40'}
                                />
                            </Svg>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* ===== OVERFLOW MENU MODAL ===== */}
            <Modal visible={showOverflow} transparent animationType="fade" onRequestClose={() => setShowOverflow(false)}>
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowOverflow(false)}
                >
                    <View style={[styles.overflowMenu, { backgroundColor: colors.surface, borderColor: colors.primary + '10' }]}>
                        <OverflowItem
                            icon="M22 12C22 17.52 17.52 22 12 22C6.48 22 3.11 16.44 3.11 16.44M3.11 16.44H7.63M3.11 16.44V21.44M2 12C2 6.48 6.44 2 12 2C18.67 2 22 7.56 22 7.56M22 7.56V2.56M22 7.56H17.56"
                            label="New Quote"
                            color={colors.text}
                            onPress={() => { onRegenerate(); setShowOverflow(false); }}
                        />
                        <View style={[styles.menuDivider, { backgroundColor: colors.text + '08' }]} />
                        <OverflowItem
                            icon="M11 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22H15C20 22 22 20 22 15V13M16.04 3.02L8.16 10.9C7.86 11.2 7.56 11.79 7.5 12.22L7.07 15.23C6.91 16.32 7.68 17.08 8.77 16.93L11.78 16.5C12.2 16.44 12.79 16.14 13.1 15.84L20.98 7.96C22.34 6.6 22.98 5.02 20.98 3.02C18.98 1.02 17.4 1.66 16.04 3.02Z"
                            label="Add Text"
                            color={colors.text}
                            onPress={() => { onAddText(); setShowOverflow(false); }}
                        />
                        <View style={[styles.menuDivider, { backgroundColor: colors.text + '08' }]} />
                        <OverflowItem
                            icon="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 21"
                            label="Add Image"
                            color={colors.text}
                            onPress={() => { onAddImage(); setShowOverflow(false); }}
                        />
                        <View style={[styles.menuDivider, { backgroundColor: colors.text + '08' }]} />
                        <OverflowItem
                            icon="M4 6H20M4 12H20M4 18H20"
                            label="Change Paper"
                            color={colors.text}
                            onPress={() => { onPaper(); setShowOverflow(false); }}
                        />
                        <View style={[styles.menuDivider, { backgroundColor: colors.text + '08' }]} />
                        <OverflowItem
                            icon="M21 5.98C17.67 5.65 14.32 5.48 10.98 5.48C9 5.48 7.02 5.58 5.04 5.78L3 5.98M8.5 4.97L8.72 3.66C8.88 2.71 9 2 10.69 2H13.31C15 2 15.13 2.75 15.28 3.67L15.5 4.97M18.85 9.14L18.2 19.21C18.09 20.78 18 22 15.21 22H8.79C6 22 5.91 20.78 5.8 19.21L5.15 9.14"
                            label="Clear Canvas"
                            color="#D32F2F"
                            onPress={() => { onClear(); setShowOverflow(false); }}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
        </>
    );
};

// Helper component for overflow menu items
const OverflowItem: React.FC<{ icon: string; label: string; color: string; onPress: () => void }> = ({
    icon, label, color, onPress,
}) => (
    <TouchableOpacity style={styles.overflowItem} onPress={onPress} activeOpacity={0.6}>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" style={{ marginRight: 14 }}>
            <SvgPath d={icon} stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
        <Text style={[styles.overflowLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    // Delete zone
    deleteZone: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 40 : 20,
        alignSelf: 'center',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 24,
        borderWidth: 1.5,
        zIndex: 100,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 8,
    },
    deleteZoneInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    deleteText: {
        fontFamily: 'Caveat-Medium',
        fontSize: 18,
    },

    // Bottom input bar
    bottomContainer: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 20 : 10,
        left: 0,
        right: 0,
        zIndex: 40,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    inputBar: {
        width: '100%',
        maxWidth: 480,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 24,
        borderWidth: 1,
        padding: 6,
        gap: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 8,
    },
    inputTrigger: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 13,
    },
    inputPlaceholder: {
        fontFamily: 'Caveat-Medium',
        fontSize: 18,
    },
    micButton: {
        width: 44,
        height: 44,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    overflowButton: {
        width: 44,
        height: 44,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Overflow menu modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'flex-end',
        paddingBottom: Platform.OS === 'ios' ? 100 : 80,
        paddingHorizontal: 24,
    },
    overflowMenu: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 10,
    },
    overflowItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
    },
    overflowLabel: {
        fontFamily: 'Caveat-Bold',
        fontSize: 19,
    },
    menuDivider: {
        height: 1,
        marginHorizontal: 12,
    },
});
