import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Path, Circle } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
// import LottieView from 'lottie-react-native'; // If available later

interface SavingOverlayProps {
    visible: boolean;
    status: 'saving' | 'success' | 'error';
    onClose?: () => void;
    onShare?: () => void;
    onAnalyze?: () => void;
}

export const SavingOverlay: React.FC<SavingOverlayProps> = ({
    visible,
    status,
    onClose,
    onShare,
    onAnalyze
}) => {
    const { theme } = useTheme();
    const colors = theme.colors;

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />

                <View style={[styles.card, { backgroundColor: colors.surface }]}>
                    {status === 'saving' && (
                        <>
                            <ActivityIndicator size="large" color={colors.primary} style={{ marginBottom: 16 }} />
                            <Text style={[styles.title, { color: colors.text }]}>Saving your masterpiece...</Text>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <View style={{ marginBottom: 16 }}>
                                <Svg width={52} height={52} viewBox="0 0 24 24" fill="none">
                                    <Circle cx="12" cy="12" r="10" stroke={colors.primary} strokeWidth={1.5} />
                                    <Path d="M8 12l3 3 5-5" stroke={colors.primary} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                                </Svg>
                            </View>
                            <Text style={[styles.title, { color: colors.text }]}>Saved to Calendar!</Text>
                            <Text style={[styles.subtitle, { color: colors.text }]}>Your reflection has been captured.</Text>

                            <View style={styles.actions}>
                                {onShare && (
                                    <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={onShare}>
                                        <Text style={[styles.buttonText, { color: '#FFF' }]}>Share</Text>
                                    </TouchableOpacity>
                                )}
                                {onAnalyze && (
                                    <TouchableOpacity style={[styles.button, { backgroundColor: colors.accent }]} onPress={onAnalyze}>
                                        <Text style={[styles.buttonText, { color: '#FFF' }]}>Analyze Spirit</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                                <Text style={[styles.closeText, { color: colors.text }]}>Close</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <View style={{ marginBottom: 16 }}>
                                <Svg width="56" height="56" viewBox="0 0 24 24" fill="none">
                                    <Circle cx="12" cy="12" r="10" stroke={colors.error} strokeWidth="2" />
                                    <Path d="M12 8v4M12 16h.01" stroke={colors.error} strokeWidth="2" strokeLinecap="round" />
                                </Svg>
                            </View>
                            <Text style={[styles.title, { color: colors.text }]}>Oops!</Text>
                            <Text style={[styles.subtitle, { color: colors.text }]}>Something went wrong while saving.</Text>
                            <TouchableOpacity style={[styles.button, { backgroundColor: colors.text, marginTop: 16 }]} onPress={onClose}>
                                <Text style={[styles.buttonText, { color: colors.background }]}>Okay</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    card: {
        width: 300,
        padding: 32,
        borderRadius: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 20,
    },
    title: {
        fontFamily: 'Caveat-Bold',
        fontSize: 28,
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontFamily: 'Carlito',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
        opacity: 0.7,
    },
    actions: {
        width: '100%',
        gap: 12,
    },
    button: {
        width: '100%',
        paddingVertical: 14,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        fontFamily: 'Caveat-Bold',
        fontSize: 20,
    },
    closeButton: {
        marginTop: 16,
        padding: 8,
    },
    closeText: {
        fontFamily: 'Carlito-Bold',
        fontSize: 16,
        opacity: 0.6,
    },
});
