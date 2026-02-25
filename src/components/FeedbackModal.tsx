import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TextInput,
    TouchableOpacity,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { submitFeedback, FeedbackType } from '../utils/feedbackStorage';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';

interface FeedbackModalProps {
    visible: boolean;
    onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ visible, onClose }) => {
    const { theme } = useTheme();
    const colors = theme.colors;
    const [message, setMessage] = useState('');
    const [type, setType] = useState<FeedbackType>('general');
    const [rating, setRating] = useState<number | undefined>(undefined);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!message.trim()) {
            Alert.alert('Please enter a message', 'We need to know what you think!');
            return;
        }

        setIsSubmitting(true);
        const success = await submitFeedback({ message, type, rating });
        setIsSubmitting(false);

        if (success) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Thank you!', 'Your feedback helps us make Ulbo better.');
            setMessage('');
            setRating(undefined);
            setType('general');
            onClose();
        } else {
            Alert.alert('Error', 'Something went wrong. Please try again later.');
        }
    };

    const renderStars = () => {
        return (
            <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                        key={star}
                        onPress={() => {
                            Haptics.selectionAsync();
                            setRating(star);
                        }}
                        style={styles.starButton}
                    >
                        <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
                            <Path
                                d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                                stroke={colors.onSurface}
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                fill={rating && star <= rating ? '#FFD700' : 'none'}
                            />
                        </Svg>
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.overlay}
            >
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>How's Ulbo?</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                                <Path d="M18 6L6 18M6 6L18 18" stroke={colors.onSurface} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <View style={styles.content}>
                        <Text style={styles.sectionTitle}>How would you rate your experience?</Text>
                        {renderStars()}

                        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>What kind of feedback is this?</Text>
                        <View style={styles.typeRow}>
                            {(['general', 'feature', 'bug'] as FeedbackType[]).map((t) => (
                                <TouchableOpacity
                                    key={t}
                                    style={[
                                        styles.typeButton,
                                        type === t && styles.typeButtonSelected
                                    ]}
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        setType(t);
                                    }}
                                >
                                    <Text style={[
                                        styles.typeText,
                                        type === t && styles.typeTextSelected
                                    ]}>
                                        {t.charAt(0).toUpperCase() + t.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Tell us more...</Text>
                        <TextInput
                            style={styles.textInput}
                            multiline
                            placeholder={type === 'bug' ? "What happened? Steps to reproduce?" : "Share your thoughts..."}
                            placeholderTextColor={colors.onSurface + '60'}
                            value={message}
                            onChangeText={setMessage}
                        />

                        <TouchableOpacity
                            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                            onPress={handleSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.submitButtonText}>Send Feedback</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '90%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontFamily: 'Caveat-Bold',
        fontSize: 28,
        color: '#1A1D23',
    },
    closeButton: {
        padding: 4,
    },
    content: {
        gap: 12,
    },
    sectionTitle: {
        fontFamily: 'Carlito',
        fontSize: 16,
        color: '#1A1D2380',
    },
    starRow: {
        flexDirection: 'row',
        gap: 12,
        justifyContent: 'center',
        paddingVertical: 8,
    },
    starButton: {
        padding: 4,
    },
    typeRow: {
        flexDirection: 'row',
        gap: 8,
    },
    typeButton: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#94A3B860',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    typeButtonSelected: {
        backgroundColor: '#4ECCA3',
        borderColor: '#4ECCA3',
    },
    typeText: {
        fontFamily: 'Carlito',
        fontSize: 14,
        color: '#1A1D23',
    },
    typeTextSelected: {
        color: '#FFF',
    },
    textInput: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#94A3B860',
        borderRadius: 12,
        padding: 16,
        height: 120,
        textAlignVertical: 'top',
        fontFamily: 'Carlito',
        fontSize: 16,
        color: '#1A1D23',
    },
    submitButton: {
        backgroundColor: '#4ECCA3',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 24,
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        fontFamily: 'Caveat-Bold',
        fontSize: 20,
        color: '#FFF',
    },
});
