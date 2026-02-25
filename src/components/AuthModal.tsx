
import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Svg, Path } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
    visible: boolean;
    onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ visible, onClose }) => {
    const { theme } = useTheme();
    const { signIn, signUp, isLoading: isAuthLoading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);

    // Use theme colors
    const colors = theme.colors;

    const handleAuth = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter both email and password');
            return;
        }

        setLoading(true);
        try {
            if (isSignUp) {
                await signUp(email, password);
                // Alert handled in context for check email
                onClose();
            } else {
                await signIn(email, password);
                onClose();
            }
        } catch (error) {
            // Alert handled in context
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.centeredView}>
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={[styles.modalView, { backgroundColor: colors.surface, borderColor: colors.outline + '30' }]}
                >
                    <View style={styles.header}>
                        <Text style={[styles.modalTitle, { color: colors.onSurface }]}>
                            {isSignUp ? 'Join Ulbo' : 'Welcome Back'}
                        </Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                                <Path d="M18 6L6 18M6 6L18 18" stroke={colors.onSurface} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.subtitle, { color: colors.onSurface + '80' }]}>
                        {isSignUp
                            ? 'Create an account to backup your journal to the cloud.'
                            : 'Sign in to sync your reflections across devices.'}
                    </Text>

                    <View style={styles.inputContainer}>
                        <TextInput
                            style={[styles.input, { color: colors.onSurface, borderColor: colors.outline + '40', backgroundColor: colors.onSurface + '05' }]}
                            placeholder="Email"
                            placeholderTextColor={colors.onSurface + '50'}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                        <TextInput
                            style={[styles.input, { color: colors.onSurface, borderColor: colors.outline + '40', backgroundColor: colors.onSurface + '05' }]}
                            placeholder="Password"
                            placeholderTextColor={colors.onSurface + '50'}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.authButton, { backgroundColor: colors.primary }]}
                        onPress={handleAuth}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={colors.onPrimary} />
                        ) : (
                            <Text style={[styles.authButtonText, { color: colors.onPrimary }]}>
                                {isSignUp ? 'Create Account' : 'Sign In'}
                            </Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.switchButton}
                        onPress={() => setIsSignUp(!isSignUp)}
                    >
                        <Text style={[styles.switchText, { color: colors.onSurface }]}>
                            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                        </Text>
                    </TouchableOpacity>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    modalView: {
        width: '85%',
        maxWidth: 400,
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    modalTitle: {
        fontSize: 28,
        fontFamily: 'Caveat-Bold',
    },
    closeButton: {
        padding: 4,
    },
    subtitle: {
        fontFamily: 'Carlito',
        fontSize: 16,
        marginBottom: 24,
    },
    inputContainer: {
        gap: 16,
        marginBottom: 24,
    },
    input: {
        height: 50,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        fontFamily: 'Carlito',
        fontSize: 18,
    },
    authButton: {
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    authButtonText: {
        fontFamily: 'Caveat-Bold',
        fontSize: 22,
    },
    switchButton: {
        alignItems: 'center',
        padding: 8,
    },
    switchText: {
        fontFamily: 'Carlito',
        fontSize: 16,
        textDecorationLine: 'underline',
    },
});
