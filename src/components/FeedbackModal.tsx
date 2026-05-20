import React, { useState, useEffect, useRef } from 'react';
import { BLACK, GRAY, WHITE, YELLOW } from '../constants/colors';
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
    ActivityIndicator,
    ScrollView,
    Dimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { submitFeedback, FeedbackType } from '../utils/feedbackStorage';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

const { height: SCREEN_H } = Dimensions.get('window');

interface FeedbackModalProps {
    visible: boolean;
    onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ visible, onClose }) => {
    const { t } = useTranslation();
    const [message, setMessage]           = useState('');
    const [type, setType]                 = useState<FeedbackType>('general');
    const [rating, setRating]             = useState<number | undefined>(undefined);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted]       = useState(false);
    const scrollRef = useRef<ScrollView>(null);

    // Reset the form each time the modal closes so it's fresh on next open.
    useEffect(() => {
        if (!visible) {
            setSubmitted(false);
            setMessage('');
            setRating(undefined);
            setType('general');
        }
    }, [visible]);

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
            setSubmitted(true);
        } else {
            Alert.alert(t('feedback.error_title'), t('feedback.error_message'));
        }
    };

    const renderStars = () => (
        <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                    key={star}
                    onPress={() => { Haptics.selectionAsync(); setRating(star); }}
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

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            {/* The KeyboardAvoidingView IS the full-screen overlay (flex: 1) and
                carries NO padding of its own — that lets behavior="padding"
                animate the keyboard inset cleanly so the card lifts above the
                keyboard. The card itself uses margins for the floating look. */}
            <KeyboardAvoidingView
                style={styles.overlay}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                {/* Dimmed backdrop — sits behind the card; tap to dismiss */}
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={onClose}
                />

                <View style={styles.card}>
                    {submitted ? (
                        /* ── Inline success ──────────────────────────────────── */
                        <View style={styles.successContainer}>
                            <View style={styles.successIconWrap}>
                                <Svg width={44} height={44} viewBox="0 0 24 24" fill="none">
                                    <Path
                                        d="M20 6L9 17l-5-5"
                                        stroke={BLACK} strokeWidth={2.6}
                                        strokeLinecap="round" strokeLinejoin="round"
                                    />
                                </Svg>
                            </View>
                            <Text style={styles.successTitle}>{t('feedback.success_title')}</Text>
                            <Text style={styles.successMessage}>{t('feedback.success_message')}</Text>
                            <TouchableOpacity style={styles.doneButton} onPress={onClose}>
                                <Text style={styles.doneButtonText}>{t('feedback.done')}</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        /* ── Form ────────────────────────────────────────────── */
                        <>
                            <View style={styles.header}>
                                <Text style={styles.title}>{t('feedback.title')}</Text>
                                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                                        <Path
                                            d="M18 6L6 18M6 6L18 18"
                                            stroke={BLACK} strokeWidth={2.5}
                                            strokeLinecap="round" strokeLinejoin="round"
                                        />
                                    </Svg>
                                </TouchableOpacity>
                            </View>

                            {/* Scrollable form — bounded height keeps the card
                                short enough to clear the keyboard. On focus the
                                input is scrolled into view so it's easy to read
                                what you type. */}
                            <ScrollView
                                ref={scrollRef}
                                style={styles.formScroll}
                                contentContainerStyle={styles.content}
                                showsVerticalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                            >
                                <Text style={styles.sectionTitle}>{t('feedback.rate_label')}</Text>
                                {renderStars()}

                                <Text style={[styles.sectionTitle, { marginTop: 16 }]}>{t('feedback.type_label')}</Text>
                                <View style={styles.typeRow}>
                                    {(['general', 'feature', 'bug'] as FeedbackType[]).map((fbType) => (
                                        <TouchableOpacity
                                            key={fbType}
                                            style={[styles.typeButton, type === fbType && styles.typeButtonSelected]}
                                            onPress={() => { Haptics.selectionAsync(); setType(fbType); }}
                                        >
                                            <Text style={[styles.typeText, type === fbType && styles.typeTextSelected]}>
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
                                    onFocus={() => {
                                        // Let the keyboard animation start, then bring
                                        // the input up into the visible area.
                                        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
                                    }}
                                />

                                <TouchableOpacity
                                    style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                                    onPress={handleSubmit}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting
                                        ? <ActivityIndicator color={BLACK} />
                                        : <Text style={styles.submitButtonText}>{t('feedback.submit')}</Text>
                                    }
                                </TouchableOpacity>
                            </ScrollView>
                        </>
                    )}
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    card: {
        backgroundColor: WHITE,
        borderRadius: 24,
        padding: 24,
        marginHorizontal: 16,
        marginBottom: 32,
        maxHeight: '90%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontFamily: 'Inter-Bold',
        fontSize: 28,
        color: BLACK,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: GRAY,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Inline success state ───────────────────────────────────────────────────
    successContainer: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 4,
    },
    successIconWrap: {
        width: 84,
        height: 84,
        borderRadius: 42,
        backgroundColor: YELLOW + '33',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 22,
    },
    successTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 26,
        color: BLACK,
        marginBottom: 10,
        textAlign: 'center',
    },
    successMessage: {
        fontFamily: 'Inter-Medium',
        fontSize: 15,
        color: BLACK + '80',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 26,
        paddingHorizontal: 4,
    },
    doneButton: {
        backgroundColor: YELLOW,
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        alignSelf: 'stretch',
    },
    doneButtonText: {
        fontFamily: 'Inter-Bold',
        fontSize: 17,
        color: BLACK,
    },

    // ── Form ───────────────────────────────────────────────────────────────────
    formScroll: {
        maxHeight: SCREEN_H * 0.33,
    },
    content: {
        gap: 12,
        paddingBottom: 4,
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
        borderColor:     YELLOW,
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
        backgroundColor:   WHITE,
        borderWidth:       2,
        borderColor:       BLACK + '25',
        borderRadius:      14,
        padding:           16,
        height:            120,
        textAlignVertical: 'top',
        fontFamily:        'Inter-Medium',
        fontSize:          15,
        lineHeight:        22,
        color:             BLACK,
    },
    submitButton: {
        backgroundColor: YELLOW,
        paddingVertical: 16,
        borderRadius:    14,
        alignItems:      'center',
        marginTop:       8,
    },
    submitButtonDisabled: { opacity: 0.5 },
    submitButtonText: {
        fontFamily: 'Inter-Bold',
        fontSize:   17,
        color:      BLACK,
    },
});
