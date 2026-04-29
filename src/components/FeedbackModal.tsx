import React, { useState } from 'react';
import { BLACK, WHITE, YELLOW } from '../constants/colors';
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

interface FeedbackModalProps {
    visible: boolean;
    onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ visible, onClose }) => {
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
                                stroke={BLACK}
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                fill={rating && star <= rating ? YELLOW : 'none'}
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
                                <Path d="M18 6L6 18M6 6L18 18" stroke={BLACK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
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
                            placeholderTextColor={BLACK + '60'}
                            value={message}
                            onChangeText={setMessage}
                        />

                        <TouchableOpacity
                            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                            onPress={handleSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color={BLACK} />
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
        backgroundColor: WHITE,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderTopWidth: 2,
        borderLeftWidth: 2,
        borderRightWidth: 2,
        borderColor: BLACK,
        padding: 24,
        maxHeight: '90%',
        elevation: 0,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontFamily: 'Inter-Bold',
        fontSize: 28,
        color: BLACK,
    },
    closeButton: {
        padding: 4,
    },
    content: {
        gap: 12,
    },
    sectionTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 16,
        color: BLACK + '80',
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
        borderWidth: 2,
        borderColor: BLACK + '40',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    typeButtonSelected: {
        backgroundColor: YELLOW,
        borderColor: BLACK,
    },
    typeText: {
        fontFamily: 'Inter-Bold',
        fontSize: 14,
        color: BLACK,
    },
    typeTextSelected: {
        color: BLACK,
        fontFamily: 'Inter-Bold',
    },
    textInput: {
        backgroundColor: '#F8FAFC',
        borderWidth: 2,
        borderColor: BLACK + '40',
        borderRadius: 12,
        padding: 16,
        height: 120,
        textAlignVertical: 'top',
        fontFamily: 'Inter-Bold',
        fontSize: 16,
        color: BLACK,
    },
    submitButton: {
        backgroundColor: YELLOW,
        paddingVertical: 16,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: BLACK,
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 24,
        elevation: 0,
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        fontFamily: 'Inter-Bold',
        fontSize: 20,
        color: BLACK,
    },
});
