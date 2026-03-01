
import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Animated,
} from 'react-native';
import { Svg, Path } from 'react-native-svg';

const YELLOW = '#FFE600';
const BLACK = '#000000';
const WHITE = '#FFFFFF';

const LOADING_MESSAGES = [
    'Ulbo is reading your words...',
    'Thinking it over...',
    'Almost got it...',
    'Putting thoughts together...',
];

const LoadingDots: React.FC = () => {
    const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];

    useEffect(() => {
        const animations = dots.map((dot, i) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(i * 180),
                    Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
                    Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
                    Animated.delay((dots.length - i) * 180),
                ])
            )
        );
        animations.forEach(a => a.start());
        return () => animations.forEach(a => a.stop());
    }, []);

    return (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
            {dots.map((dot, i) => (
                <Animated.View
                    key={i}
                    style={{
                        width: 10, height: 10, borderRadius: 5,
                        backgroundColor: BLACK,
                        opacity: dot,
                        transform: [{ scaleY: dot.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
                    }}
                />
            ))}
        </View>
    );
};

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
    const [msgIndex, setMsgIndex] = useState(0);

    useEffect(() => {
        if (!loading) return;
        setMsgIndex(0);
        const interval = setInterval(() => {
            setMsgIndex(i => (i + 1) % LOADING_MESSAGES.length);
        }, 2000);
        return () => clearInterval(interval);
    }, [loading]);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>

                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>
                            {loading ? "Ulbo is reading..." : "Ulbo's Take"}
                        </Text>
                        {!loading && (
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                                    <Path d="M18 6L6 18M6 6l12 12" stroke={BLACK + '80'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                                </Svg>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Content */}
                    <View style={styles.content}>
                        {loading ? (
                            <View style={styles.loadingContainer}>
                                <Text style={styles.loadingText}>{LOADING_MESSAGES[msgIndex]}</Text>
                                <LoadingDots />
                            </View>
                        ) : data ? (
                            <>
                                <View style={styles.replyContainer}>
                                    <Text style={styles.replyText}>"{data.reply}"</Text>
                                </View>

                                <View style={styles.statsContainer}>
                                    <View style={styles.statBadge}>
                                        <Text style={styles.statLabel}>MOOD</Text>
                                        <Text style={styles.statValue}>{data.mood}/10</Text>
                                    </View>
                                    <View style={styles.tagsWrapper}>
                                        {data.tags.map((tag, i) => (
                                            <View key={i} style={styles.tag}>
                                                <Text style={styles.tagText}>#{tag}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>

                                {data.followUp && (
                                    <View style={styles.followUpContainer}>
                                        <View style={styles.followUpHeader}>
                                            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                                                <Path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 17V16C12 15.5 12.25 15.25 12.5 15C13.5 14 14.5 13.5 14.5 12.5C14.5 11.5 13.5 11 12.5 11C11.5 11 11 11.5 11 12H9C9 10.5 10 9 12 9C14 9 16 10 16 12C16 13.5 14.5 14.5 13.25 15.5C12.95 15.75 12.75 16 12.75 16.5H12V17ZM13 19H11V18H13V19Z" fill={BLACK} />
                                            </Svg>
                                            <Text style={styles.followUpLabel}>THINK ABOUT THIS</Text>
                                        </View>
                                        <Text style={styles.followUpText}>"{data.followUp}"</Text>
                                    </View>
                                )}

                                {/* Share Button */}
                                {onShare && (
                                    <TouchableOpacity
                                        onPress={onShare}
                                        style={styles.shareButton}
                                        activeOpacity={0.8}
                                    >
                                        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                                            <Path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" stroke={BLACK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                                            <Path d="M16 6l-4-4-4 4" stroke={BLACK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                                            <Path d="M12 2v13" stroke={BLACK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                                        </Svg>
                                        <Text style={styles.shareButtonText}>Share to Community</Text>
                                    </TouchableOpacity>
                                )}
                            </>
                        ) : (
                            <Text style={{ color: BLACK }}>Something went wrong. Try again later~</Text>
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
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    container: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        backgroundColor: WHITE,
        elevation: 10,
        shadowColor: BLACK,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
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
        fontFamily: 'GasoekOne',
        textAlign: 'center',
        color: BLACK,
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
        fontFamily: 'IndieFlower-Regular',
        fontSize: 19,
        opacity: 0.85,
        color: BLACK,
    },
    replyContainer: {
        marginBottom: 24,
        width: '100%',
    },
    replyText: {
        fontSize: 21,
        fontFamily: 'IndieFlower-Regular',
        textAlign: 'center',
        lineHeight: 30,
        color: BLACK,
    },
    statsContainer: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: BLACK + '15',
    },
    statBadge: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: YELLOW,
    },
    statLabel: {
        fontFamily: 'Carlito-Bold',
        fontSize: 10,
        letterSpacing: 1,
        marginBottom: 2,
        color: BLACK,
    },
    statValue: {
        fontSize: 18,
        fontFamily: 'GasoekOne',
        color: BLACK,
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
        backgroundColor: '#F0F0F0',
        borderWidth: 1,
        borderColor: BLACK + '10',
    },
    tagText: {
        fontSize: 13,
        fontFamily: 'Carlito-Bold',
        color: BLACK,
    },
    followUpContainer: {
        marginTop: 20,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: BLACK + '20',
        backgroundColor: '#F8F8F8',
        width: '100%',
    },
    followUpHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 6,
    },
    followUpLabel: {
        fontFamily: 'Carlito-Bold',
        fontSize: 10,
        letterSpacing: 1,
        color: BLACK,
    },
    followUpText: {
        fontSize: 17,
        fontFamily: 'Carlito-Italic',
        lineHeight: 25,
        color: BLACK,
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
        backgroundColor: YELLOW,
        elevation: 4,
        shadowColor: BLACK,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    shareButtonText: {
        color: BLACK,
        fontFamily: 'GasoekOne',
        fontSize: 16,
    },
});
