
import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Svg, Path } from 'react-native-svg';
import { useAuth } from '../context/AuthContext';
import { BLACK, WHITE, YELLOW } from '../constants/colors';

interface AuthModalProps {
    visible: boolean;
    onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ visible, onClose }) => {
    const { signIn, signUp, isLoading: isAuthLoading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [emailFocused, setEmailFocused] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);

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
                    style={styles.modalView}
                >
                    <View style={styles.header}>
                        <Text style={styles.modalTitle}>
                            {isSignUp ? 'Join Ulbo' : 'Welcome Back'}
                        </Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityLabel="Close" accessibilityRole="button">
                            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                                <Path d="M18 6L6 18M6 6L18 18" stroke={BLACK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subtitle}>
                        {isSignUp
                            ? 'Create an account to backup your journal to the cloud.'
                            : 'Sign in to sync your reflections across devices.'}
                    </Text>

                    <View style={styles.inputContainer}>
                        <TextInput
                            style={[styles.input, emailFocused && styles.inputFocused]}
                            placeholder="Email"
                            placeholderTextColor={BLACK + '50'}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            onFocus={() => setEmailFocused(true)}
                            onBlur={() => setEmailFocused(false)}
                            accessibilityLabel="Email address"
                        />
                        <TextInput
                            style={[styles.input, passwordFocused && styles.inputFocused]}
                            placeholder="Password"
                            placeholderTextColor={BLACK + '50'}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            onFocus={() => setPasswordFocused(true)}
                            onBlur={() => setPasswordFocused(false)}
                            accessibilityLabel="Password"
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.authButton, loading && styles.authButtonDisabled]}
                        onPress={handleAuth}
                        disabled={loading}
                        accessibilityLabel={isSignUp ? 'Create account' : 'Sign in'}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: loading }}
                    >
                        {loading ? (
                            <ActivityIndicator color={BLACK} />
                        ) : (
                            <Text style={styles.authButtonText}>
                                {isSignUp ? 'Create Account' : 'Sign In'}
                            </Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.switchButton}
                        onPress={() => setIsSignUp(!isSignUp)}
                        accessibilityLabel={isSignUp ? 'Switch to sign in' : 'Switch to create account'}
                        accessibilityRole="button"
                    >
                        <Text style={styles.switchText}>
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
        backgroundColor: WHITE,
        elevation: 10,
        shadowColor: BLACK,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    modalTitle: {
        fontSize: 28,
        fontFamily: 'Inter-Bold',
        color: BLACK,
    },
    closeButton: {
        padding: 4,
    },
    subtitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 16,
        marginBottom: 24,
        color: BLACK + '80',
    },
    inputContainer: {
        gap: 16,
        marginBottom: 24,
    },
    input: {
        height: 52,
        borderRadius: 16,
        paddingHorizontal: 16,
        fontFamily: 'Inter-Bold',
        fontSize: 18,
        color: BLACK,
        backgroundColor: '#F0F4F8',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    inputFocused: {
        borderColor: YELLOW,
        backgroundColor: WHITE,
    },
    authButton: {
        height: 52,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: BLACK,
        backgroundColor: YELLOW,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        elevation: 4,
        shadowColor: BLACK,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    authButtonDisabled: {
        opacity: 0.7,
    },
    authButtonText: {
        fontFamily: 'Inter-Bold',
        fontSize: 22,
        color: BLACK,
    },
    switchButton: {
        alignItems: 'center',
        padding: 8,
    },
    switchText: {
        fontFamily: 'Inter-Bold',
        fontSize: 16,
        textDecorationLine: 'underline',
        color: BLACK,
    },
});
