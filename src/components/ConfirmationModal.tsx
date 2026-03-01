import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';

const YELLOW = '#FFE600';
const BLACK  = '#000000';
const WHITE  = '#FFFFFF';

interface ConfirmationModalProps {
    visible: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isDestructive?: boolean;
}

const { width } = Dimensions.get('window');

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    visible,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
    isDestructive = false,
}) => {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View style={styles.overlay}>
                <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onCancel}>
                    <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
                </TouchableOpacity>

                <View style={styles.card}>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>

                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                            <Text style={[styles.buttonText, { color: BLACK }]}>{cancelLabel}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.confirmButton, isDestructive && styles.destructiveButton]}
                            onPress={onConfirm}
                        >
                            <Text style={[styles.buttonText, { color: isDestructive ? WHITE : BLACK }]}>{confirmLabel}</Text>
                        </TouchableOpacity>
                    </View>
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
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    card: {
        width: width * 0.85,
        maxWidth: 340,
        padding: 24,
        borderRadius: 24,
        borderWidth: 2.5,
        borderColor: BLACK,
        backgroundColor: WHITE,
        alignItems: 'center',
    },
    title: {
        fontFamily: 'GasoekOne',
        fontSize: 28,
        marginBottom: 8,
        textAlign: 'center',
        color: BLACK,
    },
    message: {
        fontFamily: 'GasoekOne',
        fontSize: 17,
        marginBottom: 24,
        textAlign: 'center',
        opacity: 0.8,
        lineHeight: 24,
        color: BLACK,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: BLACK + '40',
    },
    confirmButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: YELLOW,
        borderWidth: 2,
        borderColor: BLACK,
    },
    destructiveButton: {
        backgroundColor: '#D32F2F',
        borderColor: '#D32F2F',
    },
    buttonText: {
        fontFamily: 'GasoekOne',
        fontSize: 18,
    },
});
