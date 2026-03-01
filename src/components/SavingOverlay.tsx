import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Path, Circle } from 'react-native-svg';
// import LottieView from 'lottie-react-native'; // If available later

const YELLOW = '#FFE600';
const BLACK  = '#000000';
const WHITE  = '#FFFFFF';

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
    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />

                <View style={styles.card}>
                    {status === 'saving' && (
                        <>
                            <ActivityIndicator size="large" color={YELLOW} style={{ marginBottom: 16 }} />
                            <Text style={styles.title}>Saving your masterpiece...</Text>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <View style={{ marginBottom: 16 }}>
                                <Svg width={52} height={52} viewBox="0 0 24 24" fill="none">
                                    <Circle cx="12" cy="12" r="10" stroke={BLACK} strokeWidth={1.5} fill={YELLOW} />
                                    <Path d="M8 12l3 3 5-5" stroke={BLACK} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                                </Svg>
                            </View>
                            <Text style={styles.title}>Saved to Calendar!</Text>
                            <Text style={styles.subtitle}>Your reflection has been captured.</Text>

                            <View style={styles.actions}>
                                {onShare && (
                                    <TouchableOpacity style={styles.button} onPress={onShare}>
                                        <Text style={styles.buttonText}>Share</Text>
                                    </TouchableOpacity>
                                )}
                                {onAnalyze && (
                                    <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={onAnalyze}>
                                        <Text style={styles.buttonText}>Analyze Spirit</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                                <Text style={styles.closeText}>Close</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <View style={{ marginBottom: 16 }}>
                                <Svg width="56" height="56" viewBox="0 0 24 24" fill="none">
                                    <Circle cx="12" cy="12" r="10" stroke="#D32F2F" strokeWidth="2" />
                                    <Path d="M12 8v4M12 16h.01" stroke="#D32F2F" strokeWidth="2" strokeLinecap="round" />
                                </Svg>
                            </View>
                            <Text style={styles.title}>Oops!</Text>
                            <Text style={styles.subtitle}>Something went wrong while saving.</Text>
                            <TouchableOpacity style={[styles.button, { marginTop: 16 }]} onPress={onClose}>
                                <Text style={styles.buttonText}>Okay</Text>
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
        backgroundColor: WHITE,
        borderWidth: 2.5,
        borderColor: BLACK,
    },
    title: {
        fontFamily: 'GasoekOne',
        fontSize: 28,
        textAlign: 'center',
        marginBottom: 8,
        color: BLACK,
    },
    subtitle: {
        fontFamily: 'GasoekOne',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
        opacity: 0.7,
        color: BLACK,
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
        backgroundColor: YELLOW,
        borderWidth: 2,
        borderColor: BLACK,
    },
    buttonSecondary: {
        backgroundColor: '#F0F0F0',
    },
    buttonText: {
        fontFamily: 'GasoekOne',
        fontSize: 20,
        color: BLACK,
    },
    closeButton: {
        marginTop: 16,
        padding: 8,
    },
    closeText: {
        fontFamily: 'GasoekOne',
        fontSize: 16,
        opacity: 0.6,
        color: BLACK,
    },
});
