import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    Dimensions,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Image,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
const ULBO = require('../../assets/mascot/ulbos_coloured.png');
const COACH = require('../../assets/mascot/coach_bunny.png');

const { width } = Dimensions.get('window');

const YELLOW = '#FFE600';
const BLACK = '#000000';
const WHITE = '#FFFFFF';

const MINT = '#4ECCA3';

interface OnboardingModalProps {
    visible: boolean;
    onComplete: (name: string) => void;
}

type SlideId = '1' | '2' | '3' | 'commit' | '4' | '5';

interface Slide {
    id: SlideId;
    title: string;
    description: string;
    mascot: any;
    mascotSize: number;
    mintBg?: boolean;
}

const SLIDES: Slide[] = [
    {
        id: '1',
        title: 'Hi, I\'m Ulbo!',
        description: 'Your daily companion for gratitude and mindful growth.',
        mascot: ULBO,
        mascotSize: 240,
        mintBg: true,
    },
    {
        id: '2',
        title: 'Grow with Ulbo',
        description: 'Journal every day and Ulbo thrives. Miss a day and he gets a little sad — come back and watch him light up.',
        mascot: ULBO,
        mascotSize: 200,
    },
    {
        id: '3',
        title: 'Track, Reflect, Thrive',
        description: 'Everything you need to build a lasting gratitude habit.',
        mascot: COACH,
        mascotSize: 190,
    },
    {
        id: 'commit',
        title: 'How much time can you give?',
        description: 'Choose a daily commitment. You can always adjust it later.',
        mascot: COACH,
        mascotSize: 180,
    },
    {
        id: '4',
        title: 'What should I call you?',
        description: 'Let\'s make this personal.',
        mascot: COACH,
        mascotSize: 170,
    },
    {
        id: '5',
        title: 'Our Promise',
        description: 'Sign below to commit to your practice.',
        mascot: ULBO,
        mascotSize: 140,
    },
];

const FEATURES = [
    { label: 'Daily Journaling', sublabel: 'Grow through consistent reflection', color: '#10B981' },
    { label: 'Streak Tracking', sublabel: 'Build momentum day by day', color: '#F59E0B' },
    { label: 'AI Mood Insights', sublabel: 'Understand your emotional patterns', color: '#7C5CFC' },
];

const CHIPS = [
    { label: 'Journaling', color: MINT },
    { label: 'Streaks', color: '#F59E0B' },
    { label: 'AI Insights', color: '#7C5CFC' },
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ visible, onComplete }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [name, setName] = useState('');
    const [commitMins, setCommitMins] = useState<5 | 10 | 20>(20);
    const flatListRef = useRef<FlatList>(null);
    const floatAnim = useRef(new Animated.Value(0)).current;

    // Signature State
    const [signaturePath, setSignaturePath] = useState('');
    const [isSigning, setIsSigning] = useState(false);
    const signatureRef = useRef<View>(null);

    // Mascot float animation
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, { toValue: -8, duration: 1800, useNativeDriver: true }),
                Animated.timing(floatAnim, { toValue: 0, duration: 1800, useNativeDriver: true }),
            ])
        );
        if (visible) loop.start();
        return () => loop.stop();
    }, [visible, floatAnim]);

    // Reset when re-opened
    useEffect(() => {
        if (visible) {
            setCurrentIndex(0);
            setName('');
            setSignaturePath('');
            flatListRef.current?.scrollToIndex({ index: 0, animated: false });
        }
    }, [visible]);

    const handleSignatureStart = (event: any) => {
        const { locationX, locationY } = event.nativeEvent;
        setSignaturePath(prev => prev + `M ${locationX} ${locationY}`);
        setIsSigning(true);
    };

    const handleSignatureMove = (event: any) => {
        if (!isSigning) return;
        const { locationX, locationY } = event.nativeEvent;
        setSignaturePath(prev => prev + ` L ${locationX} ${locationY}`);
    };

    const handleSignatureEnd = () => setIsSigning(false);
    const clearSignature = () => setSignaturePath('');

    const goToIndex = (index: number) => {
        flatListRef.current?.scrollToIndex({ index });
        setCurrentIndex(index);
    };

    const handleNext = async () => {
        if (currentIndex < SLIDES.length - 1) {
            goToIndex(currentIndex + 1);
        } else {
            const timerSec = commitMins * 60;
            await AsyncStorage.setItem('@ulbo_commitment_minutes', String(commitMins));
            await AsyncStorage.setItem('@ulbo_timer_minutes', String(commitMins));
            await AsyncStorage.setItem('@ulbo_focus_duration_seconds', String(timerSec));
            onComplete(name.trim());
        }
    };

    const handleSkip = () => {
        // Skip to name slide (index 4, after new commit slide)
        goToIndex(4);
    };

    const isNextDisabled =
        (currentIndex === 4 && !name.trim()) ||
        (currentIndex === 5 && signaturePath.length < 20);

    const btnBg = YELLOW;
    const btnText = BLACK;

    const renderWidget = (slide: Slide) => {
        if (slide.id === '2') {
            // Feature chips
            return (
                <View style={styles.chipsRow}>
                    {CHIPS.map((chip, i) => (
                        <View key={i} style={[styles.chip, { backgroundColor: chip.color + '18' }]}>
                            <View style={[styles.chipDot, { backgroundColor: chip.color }]} />
                            <Text style={[styles.chipLabel, { color: chip.color }]}>{chip.label}</Text>
                        </View>
                    ))}
                </View>
            );
        }

        if (slide.id === '3') {
            // Feature rows
            return (
                <View style={styles.featureList}>
                    {FEATURES.map((f, i) => (
                        <View key={i} style={styles.featureRow}>
                            <View style={[styles.featureIcon, { backgroundColor: f.color + '18' }]}>
                                <View style={[styles.featureIconDot, { backgroundColor: f.color }]} />
                            </View>
                            <View style={styles.featureTextBlock}>
                                <Text style={[styles.featureLabel, { color: BLACK }]}>{f.label}</Text>
                                <Text style={[styles.featureSublabel, { color: BLACK + '60' }]}>{f.sublabel}</Text>
                            </View>
                        </View>
                    ))}
                </View>
            );
        }

        if (slide.id === 'commit') {
            const options: { mins: 5 | 10 | 20; label: string; sub: string }[] = [
                { mins: 5,  label: '5 min / day',  sub: '2 daily missions' },
                { mins: 10, label: '10 min / day', sub: '3 daily missions' },
                { mins: 20, label: '20 min / day', sub: '5 daily missions' },
            ];
            return (
                <View style={styles.commitOptions}>
                    {options.map(o => {
                        const active = commitMins === o.mins;
                        return (
                            <TouchableOpacity
                                key={o.mins}
                                style={[styles.commitOption, active && styles.commitOptionActive]}
                                onPress={() => setCommitMins(o.mins)}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.commitLabel, active && styles.commitLabelActive]}>
                                    {o.label}
                                </Text>
                                <Text style={[styles.commitSub, active && styles.commitSubActive]}>
                                    {o.sub}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            );
        }

        if (slide.id === '4') {
            return (
                <TextInput
                    style={[styles.nameInput, { color: BLACK, borderBottomColor: MINT }]}
                    placeholder="Your name..."
                    placeholderTextColor={BLACK + '40'}
                    value={name}
                    onChangeText={setName}
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={() => { if (name.trim()) handleNext(); }}
                />
            );
        }

        if (slide.id === '5') {
            const displayName = name.trim() || 'I';
            return (
                <View style={styles.contractBlock}>
                    <Text style={[styles.contractText, { color: BLACK + '80' }]}>
                        {`"${displayName}, I promise to show up for myself.\nEven just 5 minutes a day.\nI'll show up for Ulbo, and\nin return, Ulbo will take care of me."`}
                    </Text>
                    <View
                        style={[styles.signatureBox, { borderColor: BLACK + '30' }]}
                        onTouchStart={handleSignatureStart}
                        onTouchMove={handleSignatureMove}
                        onTouchEnd={handleSignatureEnd}
                        ref={signatureRef}
                    >
                        <Svg style={StyleSheet.absoluteFill}>
                            <Path
                                d={signaturePath}
                                stroke={MINT}
                                strokeWidth={3}
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </Svg>
                        {signaturePath.length === 0 && (
                            <Text style={[styles.signaturePlaceholder, { color: BLACK + '30' }]}>
                                Sign here
                            </Text>
                        )}
                    </View>
                    {signaturePath.length > 0 && (
                        <TouchableOpacity onPress={clearSignature} style={styles.clearBtn}>
                            <Text style={[styles.clearBtnText, { color: BLACK + '50' }]}>Clear</Text>
                        </TouchableOpacity>
                    )}
                </View>
            );
        }

        return null;
    };

    const renderItem = ({ item }: { item: Slide }) => {
        const slideBg = item.mintBg ? '#EBF9F4' : WHITE;

        return (
            <View style={[styles.slide, { width, backgroundColor: slideBg }]}>
                {/* Mascot */}
                <Animated.View style={[styles.mascotContainer, { transform: [{ translateY: floatAnim }] }]}>
                    <Image
                        source={item.mascot}
                        style={{ width: item.mascotSize, height: item.mascotSize }}
                        resizeMode="contain"
                    />
                </Animated.View>

                {/* Text + Widget */}
                <View style={styles.textBlock}>
                    <Text style={[styles.title, { color: BLACK }]}>{item.title}</Text>
                    <Text style={[styles.description, { color: BLACK + '70' }]}>{item.description}</Text>
                    {renderWidget(item)}
                </View>
            </View>
        );
    };

    return (
        <Modal visible={visible} animationType="fade" transparent={false} statusBarTranslucent>
            <SafeAreaView style={[styles.container, { backgroundColor: WHITE }]}>

                {/* Header: Skip + Dots */}
                <View style={styles.header}>
                    {currentIndex < 4 ? (
                        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
                            <Text style={[styles.skipText, { color: BLACK + '50' }]}>Skip</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.skipBtn} />
                    )}

                    <View style={styles.dotsRow}>
                        {SLIDES.map((_, i) => (
                            <View
                                key={i}
                                style={[
                                    styles.dot,
                                    i === currentIndex
                                        ? styles.dotActive
                                        : [styles.dotInactive, { backgroundColor: MINT + '40' }]
                                ]}
                            />
                        ))}
                    </View>
                </View>

                {/* Slides */}
                <View style={{ flex: 1 }}>
                    <FlatList
                        ref={flatListRef}
                        data={SLIDES}
                        renderItem={renderItem}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        scrollEnabled={false}
                        keyExtractor={item => item.id}
                        getItemLayout={(_, index) => ({
                            length: width,
                            offset: width * index,
                            index,
                        })}
                    />
                </View>

                {/* Footer: CTA Button */}
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.footer}
                >
                    <TouchableOpacity
                        style={[
                            styles.ctaBtn,
                            { backgroundColor: btnBg },
                            isNextDisabled && styles.ctaBtnDisabled,
                        ]}
                        onPress={handleNext}
                        disabled={isNextDisabled}
                        activeOpacity={0.85}
                    >
                        <Text style={[styles.ctaBtnText, { color: btnText }]}>
                            {currentIndex === SLIDES.length - 1 ? 'Begin' : 'Continue'}
                        </Text>
                    </TouchableOpacity>
                </KeyboardAvoidingView>

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
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 8,
    },
    skipBtn: {
        paddingVertical: 6,
        paddingHorizontal: 4,
        minWidth: 40,
    },
    skipText: {
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        fontSize: 15,
    },
    dotsRow: {
        flexDirection: 'row',
        gap: 6,
        alignItems: 'center',
    },
    dot: {
        borderRadius: 4,
    },
    dotActive: {
        width: 20,
        height: 8,
        backgroundColor: MINT,
        borderRadius: 4,
    },
    dotInactive: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    slide: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 28,
        paddingTop: 16,
    },
    mascotContainer: {
        marginBottom: 20,
        alignItems: 'center',
    },
    textBlock: {
        width: '100%',
        flex: 1,
    },
    title: {
        fontSize: 36,
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        marginBottom: 10,
        lineHeight: 42,
    },
    description: {
        fontSize: 17,
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        lineHeight: 26,
        marginBottom: 28,
    },
    // Chips (slide 2)
    chipsRow: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        gap: 6,
    },
    chipDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    chipLabel: {
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        fontSize: 14,
    },
    // Feature rows (slide 3)
    featureList: {
        gap: 16,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    featureIcon: {
        width: 38,
        height: 38,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    featureIconDot: {
        width: 14,
        height: 14,
        borderRadius: 7,
    },
    featureTextBlock: {
        flex: 1,
    },
    featureLabel: {
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        fontSize: 16,
        marginBottom: 2,
    },
    featureSublabel: {
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        fontSize: 13,
    },
    // Commitment options (commit slide)
    commitOptions: {
        gap: 12,
        width: '100%',
    },
    commitOption: {
        borderWidth: 2,
        borderColor: BLACK + '20',
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 20,
    },
    commitOptionActive: {
        borderColor: BLACK,
        backgroundColor: YELLOW,
    },
    commitLabel: {
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        fontSize: 18,
        color: BLACK,
    },
    commitLabelActive: {
        color: BLACK,
    },
    commitSub: {
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        fontSize: 13,
        color: BLACK + '50',
        marginTop: 2,
    },
    commitSubActive: {
        color: BLACK + '70',
    },
    // Name input (slide 4)
    nameInput: {
        fontSize: 30,
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        borderBottomWidth: 2,
        paddingBottom: 8,
        width: '100%',
    },
    // Contract + signature (slide 5)
    contractBlock: {
        width: '100%',
        gap: 16,
    },
    contractText: {
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        fontSize: 16,
        lineHeight: 26,
        fontStyle: 'italic',
    },
    signatureBox: {
        width: '100%',
        height: 130,
        borderWidth: 1.5,
        borderStyle: 'solid',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    signaturePlaceholder: {
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        fontSize: 18,
    },
    clearBtn: {
        alignSelf: 'flex-end',
        paddingVertical: 4,
    },
    clearBtnText: {
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        fontSize: 13,
        textDecorationLine: 'underline',
    },
    // Footer
    footer: {
        paddingHorizontal: 24,
        paddingBottom: 20,
        paddingTop: 12,
    },
    ctaBtn: {
        height: 58,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: BLACK,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    ctaBtnDisabled: {
        opacity: 0.45,
    },
    ctaBtnText: {
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        fontSize: 17,
        letterSpacing: 0.3,
    },
});
