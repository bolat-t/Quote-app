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
import { useTheme } from '../context/ThemeContext';
import {
    saveJournalEntry,
    getJournalEntryByDate,
    generateJournalId,
    getTodayDateString,
    JournalEntry,
} from '../utils/journalStorage';

const { height: screenHeight } = Dimensions.get('window');

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
    const { theme } = useTheme();
    const [response, setResponse] = useState('');
    const [isExpanded, setIsExpanded] = useState(autoFocus);
    const [existingEntry, setExistingEntry] = useState<JournalEntry | null>(null);
    const [keyboardVisible, setKeyboardVisible] = useState(false);
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
            Alert.alert('Empty Response', 'Write something first!');
            return;
        }

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

            Alert.alert('Saved!', 'Drag your reflection to position it.');
        } catch (error) {
            Alert.alert('Error', 'Failed to save your reflection.');
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
                    style={[styles.promptButton, { borderColor: theme.colors.accent }]}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.promptText, { color: theme.colors.accent }]}>
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
                {
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.accent,
                }
            ]}
        >
            {/* Header with close button */}
            <View style={styles.header}>
                <Text style={[styles.headerText, { color: theme.colors.accent }]}>
                    {prompt ? "Daily Prompt" : "Your reflection"}
                </Text>
                <TouchableOpacity
                    onPress={handleClose}
                    style={styles.closeButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Svg width={20} height={20} viewBox="0 0 24 24">
                        <Path
                            d="M18 6L6 18M6 6l12 12"
                            stroke={theme.colors.text}
                            strokeWidth={2}
                            strokeLinecap="round"
                        />
                    </Svg>
                </TouchableOpacity>
            </View>

            {/* Display Prompt in Expanded View */}
            {prompt && (
                <Text style={{
                    fontFamily: 'Caveat-Bold',
                    fontSize: 18,
                    marginBottom: 16,
                    color: theme.colors.text,
                    textAlign: 'center',
                    lineHeight: 24
                }}>
                    {prompt}
                </Text>
            )}

            {/* Text Input */}
            <TextInput
                ref={inputRef}
                style={[
                    styles.input,
                    {
                        color: theme.colors.text,
                        borderColor: theme.colors.accent,
                        backgroundColor: theme.colors.background,
                    },
                ]}
                placeholder="Write your thoughts..."
                placeholderTextColor={theme.colors.accent}
                value={response}
                onChangeText={setResponse}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
            />

            {/* Save button */}
            <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: theme.colors.text }]}
                onPress={handleSave}
                activeOpacity={0.7}
            >
                <Text style={[styles.buttonText, { color: theme.colors.background }]}>
                    Save to Canvas
                </Text>
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
        borderWidth: 1,
        borderRadius: 20, // Keep this pillow shape for the button
        paddingVertical: 12,
        paddingHorizontal: 24,
        alignSelf: 'center',
        backgroundColor: 'rgba(255,255,255,0.4)', // Slightly filled
        borderColor: 'rgba(0,0,0,0.1)',
    },
    promptText: {
        fontSize: 16,
        fontFamily: 'Carlito',
        textAlign: 'center',
    },
    expandedWrapper: {
        position: 'absolute',
        top: 100, // Fixed top position for better stability
        left: 20,
        right: 20,
        borderRadius: 4, // Paper-like corner
        borderWidth: 0,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 10,
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
        fontFamily: 'Carlito',
        textTransform: 'uppercase',
        letterSpacing: 1,
        opacity: 0.7,
    },
    quoteText: {
        fontFamily: 'Caveat',
        fontSize: 16,
        paddingHorizontal: 20,
        marginBottom: 12,
        opacity: 0.7,
        textAlign: 'center',
    },
    input: {
        borderWidth: 0, // No border, like writing on the paper
        borderBottomWidth: 1, // Lined paper style? Or just blank.
        borderRadius: 0,
        padding: 0,
        paddingBottom: 8,
        fontSize: 22,
        lineHeight: 30,
        fontFamily: 'Caveat-Regular',
        minHeight: 80,
        maxHeight: 200, // Allow growing
        textAlignVertical: 'top',
    },
    saveButton: {
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 30,
        alignSelf: 'center',
        marginTop: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    closeButton: {
        padding: 4,
        opacity: 0.6,
    },
    buttonText: {
        fontSize: 16,
        fontFamily: 'Carlito',
        fontWeight: 'bold',
    },
});
