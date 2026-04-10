import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    TextInput,
    TouchableOpacity,
    Text,
    StyleSheet,
    Keyboard,
    Alert,
    Platform,
    Dimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import {
    saveJournalEntry,
    getJournalEntryByDate,
    generateJournalId,
    getTodayDateString,
    JournalEntry,
} from '../utils/journalStorage';

const { height: screenHeight } = Dimensions.get('window');

const YELLOW = '#FFE600';
const BLACK  = '#000000';
const WHITE  = '#FFFFFF';

interface JournalInputProps {
    quoteId: number;
    quoteText: string;
    onSaveToCanvas?: (text: string) => void;
    onAddMoreText?: () => void;
    onClose?: () => void;
    hasReflection?: boolean;
    autoFocus?: boolean;
    prompt?: string; // New prompt prop
}

export const JournalInput: React.FC<JournalInputProps> = ({
    quoteId,
    quoteText,
    onSaveToCanvas,
    onAddMoreText,
    onClose: onCloseProp,
    hasReflection = false,
    autoFocus = false,
    prompt,
}) => {
    const [response, setResponse] = useState('');
    const [isExpanded, setIsExpanded] = useState(autoFocus);
    const [existingEntry, setExistingEntry] = useState<JournalEntry | null>(null);
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<TextInput>(null);

    // Listen for keyboard
    useEffect(() => {
        const showSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            () => setKeyboardVisible(true)
        );
        const hideSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => setKeyboardVisible(false)
        );

        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    // Load existing entry for today on mount - DISABLED for fresh start
    /*
    useEffect(() => {
        const loadTodayEntry = async () => {
            const todayDate = getTodayDateString();
            const entry = await getJournalEntryByDate(todayDate);
            if (entry) {
                setExistingEntry(entry);
                setResponse(entry.response);
            }
        };
        loadTodayEntry();
    }, []);
    */

    // Focus input when expanded
    useEffect(() => {
        if (isExpanded) {
            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isExpanded]);

    const handleSave = useCallback(async () => {
        if (!response.trim()) {
            setSaveError('Write something first before saving.');
            return;
        }

        setIsSaving(true);
        setSaveError(null);
        try {
            // ALWAYS create a new entry ID for "fresh start" behavior
            const entry: JournalEntry = {
                id: generateJournalId(),
                quoteId,
                quoteText,
                response: response.trim(),
                createdAt: Date.now(),
                date: getTodayDateString(),
                images: [], // New entry starts with no images
                imageUri: undefined,
            };

            await saveJournalEntry(entry);
            Keyboard.dismiss();
            setIsExpanded(false);

            onSaveToCanvas?.(response.trim());
        } catch {
            setSaveError('Could not save your reflection. Please try again.');
        } finally {
            setIsSaving(false);
        }
    }, [response, quoteId, quoteText, existingEntry, onSaveToCanvas]);

    const handleExpand = () => {
        setIsExpanded(true);
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const handleClose = () => {
        setIsExpanded(false);
        Keyboard.dismiss();
        onCloseProp?.();
    };

    // Collapsed state
    if (!isExpanded) {
        if (hasReflection) return null; // Hide if reflection exists

        return (
            <View style={styles.container}>
                <TouchableOpacity
                    onPress={handleExpand}
                    style={styles.promptButton}
                    activeOpacity={0.7}
                    accessibilityLabel={prompt || "What does this mean to you?"}
                    accessibilityRole="button"
                    accessibilityHint="Tap to write your reflection"
                >
                    <Text style={styles.promptText}>
                        {prompt || "What does this mean to you?"}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Expanded - position at top of screen when keyboard is visible
    return (
        <View
            style={[
                styles.expandedWrapper,
                keyboardVisible ? styles.expandedTop : styles.expandedBottom,
            ]}
        >
            {/* Header with close button */}
            <View style={styles.header}>
                <Text style={styles.headerText}>
                    {prompt ? "Daily Prompt" : "Your reflection"}
                </Text>
                <TouchableOpacity
                    onPress={handleClose}
                    style={styles.closeButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityLabel="Close reflection input"
                    accessibilityRole="button"
                >
                    <Svg width={20} height={20} viewBox="0 0 24 24">
                        <Path
                            d="M18 6L6 18M6 6l12 12"
                            stroke={BLACK + '80'}
                            strokeWidth={2}
                            strokeLinecap="round"
                        />
                    </Svg>
                </TouchableOpacity>
            </View>

            {/* Display Prompt in Expanded View */}
            {prompt && (
                <Text style={{
                    fontFamily: 'MontserratAlternates-ExtraBoldItalic',
                    fontSize: 18,
                    marginBottom: 16,
                    color: BLACK,
                    textAlign: 'center',
                    lineHeight: 24
                }}>
                    {prompt}
                </Text>
            )}

            {/* Text Input */}
            <TextInput
                ref={inputRef}
                style={[styles.input, isFocused && styles.inputFocused]}
                placeholder="Write your thoughts..."
                placeholderTextColor={BLACK + '40'}
                value={response}
                onChangeText={(t) => { setResponse(t); if (saveError) setSaveError(null); }}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
                accessibilityLabel="Write your reflection"
                accessibilityHint="Type your thoughts here"
            />

            {/* Inline error */}
            {saveError ? (
                <Text style={styles.errorText}>{saveError}</Text>
            ) : null}

            {/* Save button */}
            <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                onPress={handleSave}
                activeOpacity={0.7}
                disabled={isSaving}
                accessibilityLabel="Save reflection to canvas"
                accessibilityRole="button"
            >
                <Text style={styles.buttonText}>{isSaving ? 'Saving…' : 'Save to Canvas'}</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 32,
        paddingBottom: 24,
    },
    promptButton: {
        borderWidth: 2,
        borderRadius: 20,
        paddingVertical: 12,
        paddingHorizontal: 24,
        alignSelf: 'center',
        backgroundColor: YELLOW,
        borderColor: BLACK,
    },
    promptText: {
        fontSize: 16,
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        textAlign: 'center',
        color: BLACK,
    },
    expandedWrapper: {
        position: 'absolute',
        top: 100,
        left: 20,
        right: 20,
        borderRadius: 16,
        borderWidth: 2.5,
        borderColor: BLACK,
        backgroundColor: WHITE,
        padding: 24,
        zIndex: 300,
    },
    expandedTop: {
        top: 60, // Higher if keyboard is up? Actually, let's keep it centered-ish or fixed top.
    },
    expandedBottom: {
        // No change needed if we fix top
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerText: {
        fontSize: 14,
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        textTransform: 'uppercase',
        letterSpacing: 1,
        opacity: 0.7,
        color: BLACK,
    },
    quoteText: {
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        fontSize: 16,
        paddingHorizontal: 20,
        marginBottom: 12,
        opacity: 0.7,
        textAlign: 'center',
    },
    input: {
        borderWidth: 0,
        borderBottomWidth: 1,
        borderBottomColor: BLACK + '20',
        borderRadius: 0,
        padding: 0,
        paddingBottom: 8,
        fontSize: 22,
        lineHeight: 30,
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        minHeight: 80,
        maxHeight: 200,
        textAlignVertical: 'top',
        color: BLACK,
    },
    inputFocused: {
        borderBottomColor: YELLOW,
        borderBottomWidth: 2,
    },
    errorText: {
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        fontSize: 13,
        color: '#D32F2F',
        marginTop: 8,
        textAlign: 'center',
    },
    saveButton: {
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 30,
        alignSelf: 'center',
        marginTop: 24,
        backgroundColor: YELLOW,
        borderWidth: 2,
        borderColor: BLACK,
    },
    saveButtonDisabled: {
        backgroundColor: '#F2F2F2',
        borderColor: '#CCCCCC',
    },
    closeButton: {
        padding: 4,
        opacity: 0.6,
    },
    buttonText: {
        fontSize: 16,
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        color: BLACK,
    },
});
