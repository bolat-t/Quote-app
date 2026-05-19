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
import { useTranslation } from 'react-i18next';

interface FeedbackModalProps {
    visible: boolean;
    onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ visible, onClose }) => {
    const { t } = useTranslation();
    const [message, setMessage] = useState('');
    const [type, setType] = useState<FeedbackType>('general');
    const [rating, setRating] = useState<number | undefined>(undefined);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!message.trim()) {
            Alert.alert(t('feedback.validation_title'), t('feedback.validation_message'));
            return;
        }

        setIsSubmitting(true);
        const success = await submitFeedback({ message, type, rating });
        setIsSubmitting(false);

        if (success) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(t('feedback.success_title'), t('feedback.success_message'));
            setMessage('');
            setRating(undefined);
            setType('general');
            onClose();
        } else {
            Alert.alert(t('feedback.error_title'), t('feedback.error_message'));
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
                        <Text style={styles.title}>{t('feedback.title')}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                                <Path d="M18 6L6 18M6 6L18 18" stroke={BLACK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <View style={styles.content}>
                        <Text style={styles.sectionTitle}>{t('feedback.rate_label')}</Text>
                        {renderStars()}

                        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>{t('feedback.type_label')}</Text>
                        <View style={styles.typeRow}>
                            {(['general', 'feature', 'bug'] as FeedbackType[]).map((fbType) => (
                                <TouchableOpacity
                                    key={fbType}
                                    style={[
                                        styles.typeButton,
                                        type === fbType && styles.typeButtonSelected
                                    ]}
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        setType(fbType);
                                    }}
                                >
                                    <Text style={[
                                        styles.typeText,
                                        type === fbType && styles.typeTextSelected
                                    ]}>
                                        {t(`feedback.type_${fbType}`)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>{t('feedback.message_label')}</Text>
                        <TextInput
                            style={styles.textInput}
                            multiline
                            placeholder={type === 'bug' ? t('feedback.bug_placeholder') : t('feedback.general_placeholder')}
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
                                <Text style={styles.submitButtonText}>{t('feedback.submit')}</Text>
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
        fontFamily: 'Inter-Medium',
        fontSize:   14,
        color:      BLACK + '70',
        letterSpacing: 0.2,
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
        flex:              1,
        paddingVertical:   10,
        paddingHorizontal: 12,
        borderRadius:      20,
        borderWidth:       2,
        borderColor:       BLACK + '25',
        alignItems:        'center',
        backgroundColor:   WHITE,
    },
    typeButtonSelected: {
        backgroundColor: YELLOW,
        borderColor:     BLACK,
    },
    typeText: {
        fontFamily: 'Inter-Medium',
        fontSize:   14,
        color:      BLACK + '70',
    },
    typeTextSelected: {
        color:      BLACK,
        fontFamily: 'Inter-Bold',
    },
    textInput: {
        backgroundColor: WHITE,
        borderWidth:     2,
        borderColor:     BLACK + '25',
        borderRadius:    14,
        padding:         16,
        height:          120,
        textAlignVertical: 'top',
        fontFamily:      'Inter-Medium',
        fontSize:        15,
        lineHeight:      22,
        color:           BLACK,
    },
    submitButton: {
        backgroundColor: YELLOW,
        paddingVertical: 16,
        borderRadius:    14,
        borderWidth:     2,
        borderColor:     BLACK,
        alignItems:      'center',
        marginTop:       8,
        marginBottom:    24,
    },
    submitButtonDisabled: { opacity: 0.5 },
    submitButtonText: {
        fontFamily: 'Inter-Bold',
        fontSize:   17,
        color:      BLACK,
    },
});
