import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Animated,
    Image,
} from 'react-native';
import { Svg, Path } from 'react-native-svg';
import { getAnalysisUsageToday } from '../utils/journalStorage';
import { useTranslation } from 'react-i18next';

const BLACK = '#000000';
const WHITE = '#FFFFFF';

const POTATO_IMAGES: Record<number, any> = {
    1: require('../../assets/mascot/potato_levels/level_1_potato.png'),
    2: require('../../assets/mascot/potato_levels/level_2_potato.png'),
    3: require('../../assets/mascot/potato_levels/level_3_potato.png'),
    4: require('../../assets/mascot/potato_levels/level_4_potato.png'),
    5: require('../../assets/mascot/potato_levels/level_5_potato.png'),
    6: require('../../assets/mascot/potato_levels/level_6_potato.png'),
    7: require('../../assets/mascot/potato_levels/level_7_potato.png'),
    8: require('../../assets/mascot/potato_levels/level_8_potato.png'),
    9: require('../../assets/mascot/potato_levels/level_9_potato.png'),
};


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
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 12 }}>
            {dots.map((dot, i) => (
                <Animated.View
                    key={i}
                    style={{
                        width: 8, height: 8, borderRadius: 4,
                        backgroundColor: '#AAAAAA',
                        opacity: dot,
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
    level?: number;
}

export const SpiritResponseModal: React.FC<SpiritResponseModalProps> = ({ visible, onClose, loading, data, level = 1 }) => {
    const { t } = useTranslation();
    const potatoImg = POTATO_IMAGES[Math.min(Math.max(level, 1), 9)];
    const [msgIndex, setMsgIndex] = useState(0);
    const [usageCount, setUsageCount] = useState(0);

    const LOADING_MESSAGES = [
        t('spirit.loading_msg_1'),
        t('spirit.loading_msg_2'),
        t('spirit.loading_msg_3'),
        t('spirit.loading_msg_4'),
    ];

    useEffect(() => {
        if (visible && !loading && data) {
            getAnalysisUsageToday().then(setUsageCount);
        }
    }, [visible, loading, data]);

    useEffect(() => {
        if (!loading) return;
        setMsgIndex(0);
        const interval = setInterval(() => {
            setMsgIndex(i => (i + 1) % LOADING_MESSAGES.length);
        }, 2000);
        return () => clearInterval(interval);
    }, [loading]);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.container}>

                    {/* Close button — top right */}
                    {!loading && (
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                                <Path d="M18 6L6 18M6 6l12 12" stroke={BLACK} strokeWidth={2.2} strokeLinecap="round" />
                            </Svg>
                        </TouchableOpacity>
                    )}

                    {/* Potato always at top */}
                    <Image source={potatoImg} style={styles.potatoImg} resizeMode="contain" />

                    {loading ? (
                        /* ── Loading state ── */
                        <>
                            <Text style={styles.loadingTitle}>{t('spirit.loading_title')}</Text>
                            <Text style={styles.loadingMsg}>{LOADING_MESSAGES[msgIndex]}</Text>
                            <LoadingDots />
                        </>
                    ) : data ? (
                        /* ── Reply state ── */
                        <>
                            <Text style={styles.replyTitle}>{t('spirit.reply_title')}</Text>
                            <Text style={styles.replyText}>{data.reply}</Text>
                            {usageCount >= 15 && (
                                <Text style={styles.usageWarning}>
                                    {usageCount >= 20
                                        ? t('spirit.limit_reached')
                                        : t('spirit.limit_warning', { count: usageCount })}
                                </Text>
                            )}
                        </>
                    ) : (
                        <Text style={styles.replyText}>{t('spirit.error')}</Text>
                    )}

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
        paddingHorizontal: 32,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    container: {
        width: '100%',
        borderRadius: 20,
        borderWidth: 2,
        borderColor: BLACK,
        paddingHorizontal: 24,
        paddingTop: 28,
        paddingBottom: 20,
        alignItems: 'center',
        backgroundColor: WHITE,
    },
    closeBtn: {
        position: 'absolute',
        top: 14,
        right: 14,
    },
    // Loading
    loadingTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 16,
        color: BLACK,
        marginBottom: 6,
        letterSpacing: 0.5,
    },
    loadingMsg: {
        fontFamily: 'Inter-Medium',
        fontSize: 16,
        color: '#4B5563',
        textAlign: 'center',
    },
    // Reply
    replyTitle: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 16,
        color: BLACK,
        marginBottom: 14,
        alignSelf: 'flex-start',
    },
    replyText: {
        fontFamily: 'Inter-Medium',
        fontSize: 16,
        lineHeight: 26,
        color: BLACK,
        width: '100%',
    },
    usageWarning: {
        fontFamily: 'Carlito',
        fontSize: 12,
        color: '#888888',
        textAlign: 'center',
        marginTop: 12,
    },
    // Potato
    potatoImg: {
        width: 72,
        height: 72,
        marginBottom: 12,
    },
});
