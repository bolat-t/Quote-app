import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Image,
    FlatList,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';
import { AnimatedBonsai } from './AnimatedBonsai';

const YELLOW = '#FFE600';
const BLACK = '#000000';
const WHITE = '#FFFFFF';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const IMAGES = [
    {
        key: 'bonsai',
        label: 'Classic',
        desc: 'Traditional mature bonsai with white twisted trunk',
        stage: 1,
        currentStages: '1–3',
    },
    {
        key: 'bonsai_overgrown',
        label: 'Overgrown',
        desc: 'Lush and wild with hanging aerial roots',
        stage: 4,
        currentStages: '4–6',
    },
    {
        key: 'bonsai_pink',
        label: 'Cherry Blossom',
        desc: 'Stunning pink flowering bonsai',
        stage: 7,
        currentStages: '7–8',
    },
    {
        key: 'bonsai_purple',
        label: 'Wisteria',
        desc: 'Majestic purple flowering bonsai',
        stage: 9,
        currentStages: '9–10',
    },
];

interface Props {
    visible: boolean;
    onClose: () => void;
}

export const BonsaiImagePickerModal: React.FC<Props> = ({ visible, onClose }) => {
    const [index, setIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    const go = (dir: 1 | -1) => {
        const next = Math.max(0, Math.min(IMAGES.length - 1, index + dir));
        setIndex(next);
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
    };

    const current = IMAGES[index];
    const btnBg = BLACK;
    const btnText = WHITE;

    return (
        <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
            <SafeAreaView style={[styles.container, { backgroundColor: WHITE }]}>

                {/* Header */}
                <View style={styles.header}>
                    <Text style={[styles.headerTitle, { color: BLACK }]}>Bonsai Images</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                            <Path
                                d="M18 6L6 18M6 6l12 12"
                                stroke={BLACK + '70'}
                                strokeWidth={2}
                                strokeLinecap="round"
                            />
                        </Svg>
                    </TouchableOpacity>
                </View>

                {/* Paged image list */}
                <FlatList
                    ref={flatListRef}
                    data={IMAGES}
                    keyExtractor={item => item.key}
                    horizontal
                    pagingEnabled
                    scrollEnabled={false}
                    showsHorizontalScrollIndicator={false}
                    getItemLayout={(_, i) => ({ length: SCREEN_W, offset: SCREEN_W * i, index: i })}
                    renderItem={({ item }) => (
                        <View style={[styles.slide, { width: SCREEN_W }]}>
                            <AnimatedBonsai stage={item.stage} width={SCREEN_W * 0.82} height={SCREEN_H * 0.46} />
                        </View>
                    )}
                />

                {/* Info + nav */}
                <View style={styles.footer}>
                    {/* Dots */}
                    <View style={styles.dots}>
                        {IMAGES.map((_, i) => (
                            <TouchableOpacity key={i} onPress={() => { setIndex(i); flatListRef.current?.scrollToIndex({ index: i, animated: true }); }}>
                                <View style={[
                                    styles.dot,
                                    i === index
                                        ? [styles.dotActive, { backgroundColor: YELLOW }]
                                        : [styles.dotInactive, { backgroundColor: BLACK + '25' }]
                                ]} />
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Label */}
                    <Text style={[styles.label, { color: BLACK }]}>{current.label}</Text>
                    <Text style={[styles.sublabel, { color: BLACK + '60' }]}>{current.desc}</Text>
                    <View style={[styles.stagePill, { backgroundColor: YELLOW + '30' }]}>
                        <Text style={[styles.stagePillText, { color: BLACK }]}>
                            Currently used at stage {current.currentStages}
                        </Text>
                    </View>

                    {/* Prev / Next */}
                    <View style={styles.navRow}>
                        <TouchableOpacity
                            style={[styles.navBtn, { backgroundColor: index === 0 ? BLACK + '10' : btnBg }]}
                            onPress={() => go(-1)}
                            disabled={index === 0}
                            activeOpacity={0.8}
                        >
                            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                                <Path d="M15 18l-6-6 6-6" stroke={index === 0 ? BLACK + '30' : btnText} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                        </TouchableOpacity>

                        <Text style={[styles.counter, { color: BLACK + '50' }]}>
                            {index + 1} / {IMAGES.length}
                        </Text>

                        <TouchableOpacity
                            style={[styles.navBtn, { backgroundColor: index === IMAGES.length - 1 ? BLACK + '10' : btnBg }]}
                            onPress={() => go(1)}
                            disabled={index === IMAGES.length - 1}
                            activeOpacity={0.8}
                        >
                            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                                <Path d="M9 18l6-6-6-6" stroke={index === IMAGES.length - 1 ? BLACK + '30' : btnText} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                        </TouchableOpacity>
                    </View>
                </View>

            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    headerTitle: {
        fontFamily: 'GasoekOne',
        fontSize: 26,
    },
    closeBtn: {
        padding: 8,
    },
    slide: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bonsaiImage: {
        width: SCREEN_W * 0.82,
        height: SCREEN_H * 0.46,
    },
    footer: {
        paddingHorizontal: 28,
        paddingBottom: 24,
        alignItems: 'center',
        gap: 8,
    },
    dots: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 4,
    },
    dot: {
        borderRadius: 4,
    },
    dotActive: {
        width: 20,
        height: 8,
        borderRadius: 4,
    },
    dotInactive: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    label: {
        fontFamily: 'GasoekOne',
        fontSize: 28,
        textAlign: 'center',
    },
    sublabel: {
        fontFamily: 'GasoekOne',
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
    },
    stagePill: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        marginTop: 4,
    },
    stagePillText: {
        fontFamily: 'GasoekOne',
        fontSize: 13,
    },
    navRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 24,
        marginTop: 8,
    },
    navBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    counter: {
        fontFamily: 'GasoekOne',
        fontSize: 15,
        minWidth: 40,
        textAlign: 'center',
    },
});
