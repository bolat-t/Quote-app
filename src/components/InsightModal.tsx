
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Dimensions
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/*
  Expected Data Shape from Edge Function:
  {
    summary: string,
    key_theme: string,
    strength: string,
    suggestion: string
  }
  OR
  {
    not_enough_data: true,
    message: string
  }
*/

interface InsightData {
    summary?: string;
    key_theme?: string;
    strength?: string;
    suggestion?: string;
    not_enough_data?: boolean;
    message?: string;
}

interface InsightModalProps {
    visible: boolean;
    onClose: () => void;
    loading: boolean;
    data: InsightData | null;
    error?: string | null;
}

const { width: screenWidth } = Dimensions.get('window');

export const InsightModal: React.FC<InsightModalProps> = ({
    visible,
    onClose,
    loading,
    data,
    error
}) => {
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <BlurView intensity={20} tint="dark" style={styles.blurContainer}>
                <View style={[styles.container, {
                    backgroundColor: theme.colors.paper,
                    marginTop: insets.top + 20,
                    marginBottom: insets.bottom + 20
                }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: theme.colors.primary }]}>
                            Weekly Wisdom
                        </Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Text style={[styles.closeText, { color: theme.colors.text }]}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <ScrollView contentContainerStyle={styles.content}>
                        {loading ? (
                            <View style={styles.centerBox}>
                                <ActivityIndicator size="large" color={theme.colors.primary} />
                                <Text style={[styles.loadingText, { color: theme.colors.text }]}>
                                    Consulting with the spirits...
                                </Text>
                            </View>
                        ) : error ? (
                            <View style={styles.centerBox}>
                                <Text style={[styles.errorText, { color: theme.colors.error }]}>
                                    {error}
                                </Text>
                            </View>
                        ) : data?.not_enough_data ? (
                            <View style={styles.centerBox}>
                                <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                                    Not Enough Ink
                                </Text>
                                <Text style={[styles.emptyText, { color: theme.colors.text }]}>
                                    {data.message || "Write at least 3 journal entries this week to unlock insights!"}
                                </Text>
                            </View>
                        ) : data ? (
                            <>
                                <View style={[styles.section, { borderColor: theme.colors.border }]}>
                                    <Text style={[styles.sectionTitle, { color: theme.colors.tertiary }]}>The Week In Review</Text>
                                    <Text style={[styles.bodyText, { color: theme.colors.text }]}>{data.summary}</Text>
                                </View>

                                <View style={styles.row}>
                                    <View style={[styles.card, { backgroundColor: theme.colors.secondaryContainer, flex: 1, marginRight: 8 }]}>
                                        <Text style={[styles.cardTitle, { color: theme.colors.onSecondaryContainer }]}>Key Theme</Text>
                                        <Text style={[styles.cardBody, { color: theme.colors.onSecondaryContainer }]}>{data.key_theme}</Text>
                                    </View>
                                    <View style={[styles.card, { backgroundColor: theme.colors.tertiaryContainer, flex: 1, marginLeft: 8 }]}>
                                        <Text style={[styles.cardTitle, { color: theme.colors.onTertiaryContainer }]}>Strength</Text>
                                        <Text style={[styles.cardBody, { color: theme.colors.onTertiaryContainer }]}>{data.strength}</Text>
                                    </View>
                                </View>

                                <View style={[styles.suggestionBox, { backgroundColor: theme.colors.primaryContainer }]}>
                                    <Text style={[styles.suggestionTitle, { color: theme.colors.onPrimaryContainer }]}>✨ Spirit Suggestion</Text>
                                    <Text style={[styles.suggestionBody, { color: theme.colors.onPrimaryContainer }]}>{data.suggestion}</Text>
                                </View>
                            </>
                        ) : null}
                    </ScrollView>
                </View>
            </BlurView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    blurContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    container: {
        width: '100%',
        maxHeight: '80%',
        borderRadius: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    title: {
        fontFamily: 'Caveat-Bold',
        fontSize: 28,
    },
    closeButton: {
        padding: 8,
    },
    closeText: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    content: {
        padding: 20,
    },
    centerBox: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    loadingText: {
        marginTop: 16,
        fontFamily: 'Carlito',
        fontSize: 18,
    },
    errorText: {
        fontFamily: 'Carlito',
        fontSize: 16,
        textAlign: 'center',
    },
    section: {
        marginBottom: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderStyle: 'dashed',
    },
    sectionTitle: {
        fontFamily: 'Caveat-Bold',
        fontSize: 22,
        marginBottom: 8,
    },
    bodyText: {
        fontFamily: 'Carlito',
        fontSize: 18,
        lineHeight: 26,
    },
    row: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    card: {
        padding: 16,
        borderRadius: 16,
    },
    cardTitle: {
        fontFamily: 'Caveat-Bold',
        fontSize: 18,
        marginBottom: 4,
        opacity: 0.8,
    },
    cardBody: {
        fontFamily: 'Carlito',
        fontSize: 16,
        lineHeight: 22,
    },
    suggestionBox: {
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
    },
    suggestionTitle: {
        fontFamily: 'Caveat-Bold',
        fontSize: 24,
        marginBottom: 8,
    },
    suggestionBody: {
        fontFamily: 'Carlito',
        fontSize: 18,
        textAlign: 'center',
        lineHeight: 26,
    },
    emptyTitle: {
        fontFamily: 'Caveat-Bold',
        fontSize: 24,
        marginBottom: 12,
    },
    emptyText: {
        fontFamily: 'Carlito',
        fontSize: 16,
        textAlign: 'center',
        opacity: 0.8,
    },
});
