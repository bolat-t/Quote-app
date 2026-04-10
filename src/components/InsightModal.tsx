
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

const YELLOW = '#FFE600';
const BLACK = '#000000';
const WHITE = '#FFFFFF';

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
                    backgroundColor: WHITE,
                    marginTop: insets.top + 20,
                    marginBottom: insets.bottom + 20
                }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: BLACK }]}>
                            Weekly Wisdom
                        </Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Text style={[styles.closeText, { color: BLACK }]}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <ScrollView contentContainerStyle={styles.content}>
                        {loading ? (
                            <View style={styles.centerBox}>
                                <ActivityIndicator size="large" color={BLACK} />
                                <Text style={[styles.loadingText, { color: BLACK }]}>
                                    Consulting with the spirits...
                                </Text>
                            </View>
                        ) : error ? (
                            <View style={styles.centerBox}>
                                <Text style={[styles.errorText, { color: '#D32F2F' }]}>
                                    {error}
                                </Text>
                            </View>
                        ) : data?.not_enough_data ? (
                            <View style={styles.centerBox}>
                                <Text style={[styles.emptyTitle, { color: BLACK }]}>
                                    Not Enough Ink
                                </Text>
                                <Text style={[styles.emptyText, { color: BLACK }]}>
                                    {data.message || "Write at least 3 journal entries this week to unlock insights!"}
                                </Text>
                            </View>
                        ) : data ? (
                            <>
                                <View style={[styles.section, { borderColor: BLACK + '25' }]}>
                                    <Text style={[styles.sectionTitle, { color: BLACK }]}>The Week In Review</Text>
                                    <Text style={[styles.bodyText, { color: BLACK }]}>{data.summary}</Text>
                                </View>

                                <View style={styles.row}>
                                    <View style={[styles.card, { backgroundColor: '#F0F0F0', borderWidth: 2, borderColor: BLACK, flex: 1, marginRight: 8 }]}>
                                        <Text style={[styles.cardTitle, { color: BLACK }]}>Key Theme</Text>
                                        <Text style={[styles.cardBody, { color: BLACK }]}>{data.key_theme}</Text>
                                    </View>
                                    <View style={[styles.card, { backgroundColor: YELLOW, borderWidth: 2, borderColor: BLACK, flex: 1, marginLeft: 8 }]}>
                                        <Text style={[styles.cardTitle, { color: BLACK }]}>Strength</Text>
                                        <Text style={[styles.cardBody, { color: BLACK }]}>{data.strength}</Text>
                                    </View>
                                </View>

                                <View style={[styles.suggestionBox, { backgroundColor: YELLOW, borderWidth: 2, borderColor: BLACK }]}>
                                    <Text style={[styles.suggestionTitle, { color: BLACK }]}>Spirit Suggestion</Text>
                                    <Text style={[styles.suggestionBody, { color: BLACK }]}>{data.suggestion}</Text>
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
        borderWidth: 2,
        borderColor: BLACK,
        elevation: 0,
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
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
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
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        fontSize: 18,
    },
    errorText: {
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
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
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        fontSize: 22,
        marginBottom: 8,
    },
    bodyText: {
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
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
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        fontSize: 18,
        marginBottom: 4,
        opacity: 0.8,
    },
    cardBody: {
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        fontSize: 16,
        lineHeight: 22,
    },
    suggestionBox: {
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
    },
    suggestionTitle: {
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        fontSize: 24,
        marginBottom: 8,
    },
    suggestionBody: {
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        fontSize: 18,
        textAlign: 'center',
        lineHeight: 26,
    },
    emptyTitle: {
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        fontSize: 24,
        marginBottom: 12,
    },
    emptyText: {
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        fontSize: 16,
        textAlign: 'center',
        opacity: 0.8,
    },
});
