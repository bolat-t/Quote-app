
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Svg, Path } from 'react-native-svg';

const { width } = Dimensions.get('window');

interface SpiritResponseModalProps {
    visible: boolean;
    onClose: () => void;
    onShare?: () => void;
    data: {
        reply: string;
        mood: number;
        tags: string[];
        followUp?: string;
    } | null;
    loading?: boolean;
}

export const SpiritResponseModal: React.FC<SpiritResponseModalProps> = ({ visible, onClose, onShare, data, loading }) => {
    const { theme } = useTheme();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                <View style={[styles.container, { backgroundColor: theme.colors.paper }]}>

                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: theme.colors.primary }]}>
                            {loading ? "Ulbo is reading..." : "Ulbo's Take"}
                        </Text>
                        {!loading && (
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                                    <Path d="M18 6L6 18M6 6l12 12" stroke={theme.colors.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                                </Svg>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Content */}
                    <View style={styles.content}>
                        {loading ? (
                            <View style={styles.loadingContainer}>
                                <Text style={[styles.loadingText, { color: theme.colors.text }]}>
                                    Reading your entry...
                                </Text>
                                {/* Add a simple pulse animation or illustration here if needed */}
                            </View>
                        ) : data ? (
                            <>
                                <View style={styles.replyContainer}>
                                    <Text style={[styles.replyText, { color: theme.colors.text }]}>
                                        "{data.reply}"
                                    </Text>
                                </View>

                                <View style={styles.statsContainer}>
                                    <View style={[styles.statBadge, { backgroundColor: theme.colors.background }]}>
                                        <Text style={[styles.statLabel, { color: theme.colors.accent }]}>MOOD</Text>
                                        <Text style={[styles.statValue, { color: theme.colors.text }]}>{data.mood}/10</Text>
                                    </View>
                                    <View style={[styles.tagsWrapper]}>
                                        {data.tags.map((tag, i) => (
                                            <View key={i} style={[styles.tag, { backgroundColor: theme.colors.background }]}>
                                                <Text style={[styles.tagText, { color: theme.colors.text }]}>#{tag}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>

                                {data.followUp && (
                                    <View style={[styles.followUpContainer, { backgroundColor: theme.colors.background, borderColor: theme.colors.accent }]}>
                                        <View style={styles.followUpHeader}>
                                            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                                                <Path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 17V16C12 15.5 12.25 15.25 12.5 15C13.5 14 14.5 13.5 14.5 12.5C14.5 11.5 13.5 11 12.5 11C11.5 11 11 11.5 11 12H9C9 10.5 10 9 12 9C14 9 16 10 16 12C16 13.5 14.5 14.5 13.25 15.5C12.95 15.75 12.75 16 12.75 16.5H12V17ZM13 19H11V18H13V19Z" fill={theme.colors.accent} />
                                            </Svg>
                                            <Text style={[styles.followUpLabel, { color: theme.colors.accent }]}>THINK ABOUT THIS</Text>
                                        </View>
                                        <Text style={[styles.followUpText, { color: theme.colors.text }]}>
                                            "{data.followUp}"
                                        </Text>
                                    </View>
                                )}

                                {/* Share Button */}
                                {onShare && (
                                    <TouchableOpacity
                                        onPress={onShare}
                                        style={[styles.shareButton, { backgroundColor: theme.colors.primary }]}
                                        activeOpacity={0.8}
                                    >
                                        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                                            <Path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" stroke="#FFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                                            <Path d="M16 6l-4-4-4 4" stroke="#FFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                                            <Path d="M12 2v13" stroke="#FFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                                        </Svg>
                                        <Text style={styles.shareButtonText}>Share to Community</Text>
                                    </TouchableOpacity>
                                )}
                            </>
                        ) : (
                            <Text style={{ color: theme.colors.text }}>Something went wrong. Try again later~</Text>
                        )}
                    </View>

                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    container: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    },
    header: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        position: 'relative',
    },
    title: {
        fontSize: 24,
        fontFamily: 'Caveat-Bold',
        textAlign: 'center',
    },
    closeButton: {
        position: 'absolute',
        right: 0,
        top: 0,
    },
    content: {
        width: '100%',
        alignItems: 'center',
    },
    loadingContainer: {
        paddingVertical: 40,
        alignItems: 'center',
    },
    loadingText: {
        fontFamily: 'Carlito',
        fontSize: 18,
        opacity: 0.8,
    },
    replyContainer: {
        marginBottom: 24,
        width: '100%',
    },
    replyText: {
        fontSize: 20,
        fontFamily: 'Carlito',
        textAlign: 'center',
        lineHeight: 28,
    },
    statsContainer: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    statBadge: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1,
        marginBottom: 2,
    },
    statValue: {
        fontSize: 18,
        fontFamily: 'Caveat-Bold',
    },
    tagsWrapper: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        justifyContent: 'flex-end',
        flex: 1,
        marginLeft: 16,
    },
    tag: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    tagText: {
        fontSize: 14,
        fontFamily: 'Caveat-Regular',
    },
    followUpContainer: {
        marginTop: 20,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderStyle: 'dashed',
        width: '100%',
    },
    followUpHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 6,
    },
    followUpLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    followUpText: {
        fontSize: 16,
        fontFamily: 'Carlito',
        lineHeight: 24,
        fontStyle: 'italic',
    },
    shareButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 14,
        gap: 8,
        width: '100%',
    },
    shareButtonText: {
        color: '#FFF',
        fontFamily: 'Carlito-Bold',
        fontSize: 16,
    },
});
