/**
 * OnboardingModal — first-run flow shown until the user finishes the
 * promise / signature. After completion, `completeOnboarding(name)` is called
 * by the host (HubScreen) and this modal is permanently dismissed.
 *
 * Visual language matches the rest of the app:
 *   - White cards with 2px black border and 20px radius
 *   - Yellow accent for the active state (dot, button, selected option)
 *   - Inter typography end-to-end
 *   - Ulbo (`mascot/potato.png`) is the only character — there is no second
 *     mascot, no mint/teal/coral accents, no per-feature color coding
 */
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
import { BLACK, WHITE, YELLOW } from '../constants/colors';

const ULBO = require('../../assets/mascot/potato.png');
const { width } = Dimensions.get('window');

// ─── Tunable layout ──────────────────────────────────────────────────────────
// Edit these to adjust onboarding spacing without touching the styles below.
const SLIDE_PADDING_X    = 28;
const MASCOT_HERO_SIZE   = 220;   // hero slide (welcome)
const MASCOT_DEFAULT_SIZE = 170;  // every other slide
const CARD_RADIUS        = 20;
const CARD_BORDER        = 2;

// ─── Slide model ─────────────────────────────────────────────────────────────

type SlideId = 'welcome' | 'features' | 'commit' | 'name' | 'promise';

interface Slide {
    id:          SlideId;
    title:       string;
    description: string;
    mascotSize:  number;
}

const SLIDES: Slide[] = [
    {
        id:          'welcome',
        title:       "Hi, I'm Ulbo!",
        description: 'Your daily companion for gratitude and mindful growth.',
        mascotSize:  MASCOT_HERO_SIZE,
    },
    {
        id:          'features',
        title:       'Track, reflect, thrive',
        description: 'Everything you need to build a lasting gratitude habit.',
        mascotSize:  MASCOT_DEFAULT_SIZE,
    },
    {
        id:          'commit',
        title:       'How much time can you give?',
        description: 'Choose a daily commitment. You can always change it later.',
        mascotSize:  MASCOT_DEFAULT_SIZE,
    },
    {
        id:          'name',
        title:       'What should I call you?',
        description: "Let's make this personal.",
        mascotSize:  MASCOT_DEFAULT_SIZE,
    },
    {
        id:          'promise',
        title:       'Our promise',
        description: 'Sign below to commit to your practice.',
        mascotSize:  140,
    },
];

const FEATURES: { label: string; sublabel: string }[] = [
    { label: 'Daily journaling',  sublabel: 'Grow through consistent reflection' },
    { label: 'Streak tracking',   sublabel: 'Build momentum day by day' },
    { label: 'AI mood insights',  sublabel: 'Understand your emotional patterns' },
];

const COMMIT_OPTIONS: { mins: 5 | 10 | 20; label: string; sub: string }[] = [
    { mins: 5,  label: '5 min / day',  sub: '2 daily missions' },
    { mins: 10, label: '10 min / day', sub: '3 daily missions' },
    { mins: 20, label: '20 min / day', sub: '5 daily missions' },
];

interface OnboardingModalProps {
    visible:    boolean;
    onComplete: (name: string) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ visible, onComplete }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [name, setName] = useState('');
    const [commitMins, setCommitMins] = useState<5 | 10 | 20>(20);
    const [signaturePath, setSignaturePath] = useState('');
    const [isSigning, setIsSigning] = useState(false);

    const flatListRef = useRef<FlatList>(null);
    const floatAnim   = useRef(new Animated.Value(0)).current;

    // ── Mascot float animation ──────────────────────────────────────────────
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, { toValue: -8, duration: 1800, useNativeDriver: true }),
                Animated.timing(floatAnim, { toValue:  0, duration: 1800, useNativeDriver: true }),
            ])
        );
        if (visible) loop.start();
        return () => loop.stop();
    }, [visible, floatAnim]);

    // ── Reset state every time the modal re-opens ───────────────────────────
    useEffect(() => {
        if (visible) {
            setCurrentIndex(0);
            setName('');
            setSignaturePath('');
            flatListRef.current?.scrollToIndex({ index: 0, animated: false });
        }
    }, [visible]);

    // ── Signature drawing ───────────────────────────────────────────────────
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
    const clearSignature     = () => setSignaturePath('');

    // ── Navigation ──────────────────────────────────────────────────────────
    const goToIndex = (index: number) => {
        flatListRef.current?.scrollToIndex({ index });
        setCurrentIndex(index);
    };

    const handleNext = async () => {
        if (currentIndex < SLIDES.length - 1) {
            goToIndex(currentIndex + 1);
            return;
        }
        // Final slide — persist commitment + finish onboarding.
        await AsyncStorage.setItem('@ulbo_commitment_minutes', String(commitMins));
        await AsyncStorage.setItem('@ulbo_focus_duration_seconds', String(commitMins * 60));
        onComplete(name.trim());
    };

    const handleSkip = () => {
        // Jump straight to the name slide (last two are required steps).
        const nameIdx = SLIDES.findIndex(s => s.id === 'name');
        goToIndex(nameIdx);
    };

    // Disable the CTA on slides that need input
    const currentSlide  = SLIDES[currentIndex];
    const isNextDisabled =
        (currentSlide.id === 'name'    && !name.trim()) ||
        (currentSlide.id === 'promise' && signaturePath.length < 20);

    // ── Per-slide widget under the title/description ────────────────────────
    const renderWidget = (slide: Slide) => {
        switch (slide.id) {
            case 'features':
                return (
                    <View style={styles.featureList}>
                        {FEATURES.map((f, i) => (
                            <View key={i} style={styles.featureRow}>
                                <View style={styles.featureBullet} />
                                <View style={styles.featureTextBlock}>
                                    <Text style={styles.featureLabel}>{f.label}</Text>
                                    <Text style={styles.featureSublabel}>{f.sublabel}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                );

            case 'commit':
                return (
                    <View style={styles.commitOptions}>
                        {COMMIT_OPTIONS.map(o => {
                            const active = commitMins === o.mins;
                            return (
                                <TouchableOpacity
                                    key={o.mins}
                                    style={[styles.commitOption, active && styles.commitOptionActive]}
                                    onPress={() => setCommitMins(o.mins)}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.commitLabel}>{o.label}</Text>
                                    <Text style={[styles.commitSub, active && styles.commitSubActive]}>
                                        {o.sub}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                );

            case 'name':
                return (
                    <TextInput
                        style={styles.nameInput}
                        placeholder="Your name..."
                        placeholderTextColor={BLACK + '40'}
                        value={name}
                        onChangeText={setName}
                        autoCorrect={false}
                        returnKeyType="done"
                        onSubmitEditing={() => { if (name.trim()) handleNext(); }}
                    />
                );

            case 'promise': {
                const displayName = name.trim() || 'I';
                return (
                    <View style={styles.contractBlock}>
                        <Text style={styles.contractText}>
                            {`"${displayName}, I promise to show up for myself.\nEven just 5 minutes a day.\nI'll show up for Ulbo, and\nin return, Ulbo will take care of me."`}
                        </Text>
                        <View
                            style={styles.signatureBox}
                            onTouchStart={handleSignatureStart}
                            onTouchMove={handleSignatureMove}
                            onTouchEnd={handleSignatureEnd}
                        >
                            <Svg style={StyleSheet.absoluteFill}>
                                <Path
                                    d={signaturePath}
                                    stroke={BLACK}
                                    strokeWidth={3}
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </Svg>
                            {signaturePath.length === 0 && (
                                <Text style={styles.signaturePlaceholder}>Sign here</Text>
                            )}
                        </View>
                        {signaturePath.length > 0 && (
                            <TouchableOpacity onPress={clearSignature} style={styles.clearBtn}>
                                <Text style={styles.clearBtnText}>Clear</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                );
            }

            default:
                return null;
        }
    };

    // ── A single slide ──────────────────────────────────────────────────────
    const renderItem = ({ item }: { item: Slide }) => (
        <View style={[styles.slide, { width }]}>
            {/* Mascot */}
            <Animated.View style={[styles.mascotContainer, { transform: [{ translateY: floatAnim }] }]}>
                <Image
                    source={ULBO}
                    style={{ width: item.mascotSize, height: item.mascotSize }}
                    resizeMode="contain"
                />
            </Animated.View>

            {/* Title + description + per-slide widget */}
            <View style={styles.textBlock}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.description}>{item.description}</Text>
                {renderWidget(item)}
            </View>
        </View>
    );

    const nameIdx = SLIDES.findIndex(s => s.id === 'name');

    return (
        <Modal visible={visible} animationType="fade" transparent={false} statusBarTranslucent>
            <SafeAreaView style={styles.container}>

                {/* ── Header: Skip + dot indicator ── */}
                <View style={styles.header}>
                    {currentIndex < nameIdx ? (
                        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
                            <Text style={styles.skipText}>Skip</Text>
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
                                    i === currentIndex ? styles.dotActive : styles.dotInactive,
                                ]}
                            />
                        ))}
                    </View>
                </View>

                {/* ── Slides ── */}
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

                {/* ── Footer: CTA ── */}
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.footer}
                >
                    <TouchableOpacity
                        style={[styles.ctaBtn, isNextDisabled && styles.ctaBtnDisabled]}
                        onPress={handleNext}
                        disabled={isNextDisabled}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.ctaBtnText}>
                            {currentIndex === SLIDES.length - 1 ? 'Begin' : 'Continue'}
                        </Text>
                    </TouchableOpacity>
                </KeyboardAvoidingView>

            </SafeAreaView>
        </Modal>
    );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: WHITE,
    },

    // Header
    header: {
        flexDirection:    'row',
        justifyContent:   'space-between',
        alignItems:       'center',
        paddingHorizontal: 24,
        paddingTop:        12,
        paddingBottom:     8,
    },
    skipBtn:  { paddingVertical: 6, paddingHorizontal: 4, minWidth: 40 },
    skipText: { fontFamily: 'Inter-Bold', fontSize: 15, color: BLACK + '60' },

    dotsRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
    dot:     { borderRadius: 4 },
    dotActive: {
        width:           20,
        height:          8,
        backgroundColor: YELLOW,
        borderWidth:     1.5,
        borderColor:     BLACK,
    },
    dotInactive: {
        width:           8,
        height:          8,
        backgroundColor: BLACK + '20',
    },

    // Slide
    slide: {
        flex:              1,
        alignItems:        'center',
        paddingHorizontal: SLIDE_PADDING_X,
        paddingTop:        16,
    },
    mascotContainer: { marginBottom: 20, alignItems: 'center' },
    textBlock:       { width: '100%', flex: 1 },
    title: {
        fontFamily: 'Inter-Bold',
        fontSize:   32,
        lineHeight: 38,
        color:      BLACK,
        marginBottom: 10,
    },
    description: {
        fontFamily: 'Inter-Medium',
        fontSize:   16,
        lineHeight: 24,
        color:      BLACK + '70',
        marginBottom: 28,
    },

    // Features (slide 2)
    featureList: { gap: 14 },
    featureRow: {
        flexDirection: 'row',
        alignItems:    'center',
        gap:           14,
        backgroundColor: WHITE,
        borderWidth:    CARD_BORDER,
        borderColor:    BLACK,
        borderRadius:   CARD_RADIUS,
        paddingVertical:   14,
        paddingHorizontal: 16,
    },
    featureBullet: {
        width:  10,
        height: 10,
        borderRadius: 5,
        backgroundColor: YELLOW,
        borderWidth: 1.5,
        borderColor: BLACK,
    },
    featureTextBlock: { flex: 1 },
    featureLabel: {
        fontFamily: 'Inter-Bold',
        fontSize:   16,
        color:      BLACK,
        marginBottom: 2,
    },
    featureSublabel: {
        fontFamily: 'Inter-Medium',
        fontSize:   13,
        color:      BLACK + '60',
    },

    // Commitment (slide 3)
    commitOptions: { gap: 12, width: '100%' },
    commitOption: {
        backgroundColor: WHITE,
        borderWidth:     CARD_BORDER,
        borderColor:     BLACK + '25',
        borderRadius:    16,
        paddingVertical:   16,
        paddingHorizontal: 20,
    },
    commitOptionActive: {
        borderColor:     BLACK,
        backgroundColor: YELLOW,
    },
    commitLabel: {
        fontFamily: 'Inter-Bold',
        fontSize:   18,
        color:      BLACK,
    },
    commitSub: {
        fontFamily: 'Inter-Medium',
        fontSize:   13,
        color:      BLACK + '50',
        marginTop:  2,
    },
    commitSubActive: { color: BLACK + '75' },

    // Name (slide 4)
    nameInput: {
        fontFamily: 'Inter-Bold',
        fontSize:   28,
        color:      BLACK,
        borderBottomWidth: 2,
        borderBottomColor: BLACK,
        paddingBottom: 8,
        width: '100%',
    },

    // Promise + signature (slide 5)
    contractBlock: { width: '100%', gap: 16 },
    contractText: {
        fontFamily: 'Inter-Medium',
        fontSize:   15,
        lineHeight: 24,
        color:      BLACK + '85',
        fontStyle:  'italic',
    },
    signatureBox: {
        width:           '100%',
        height:          130,
        backgroundColor: WHITE,
        borderWidth:     CARD_BORDER,
        borderColor:     BLACK,
        borderRadius:    12,
        justifyContent:  'center',
        alignItems:      'center',
        overflow:        'hidden',
    },
    signaturePlaceholder: {
        fontFamily: 'Inter-Medium',
        fontSize:   16,
        color:      BLACK + '35',
    },
    clearBtn: { alignSelf: 'flex-end', paddingVertical: 4 },
    clearBtnText: {
        fontFamily: 'Inter-Bold',
        fontSize:   13,
        color:      BLACK + '60',
        textDecorationLine: 'underline',
    },

    // Footer CTA
    footer: {
        paddingHorizontal: 24,
        paddingBottom:     20,
        paddingTop:        12,
    },
    ctaBtn: {
        height:          56,
        borderRadius:    16,
        backgroundColor: YELLOW,
        borderWidth:     CARD_BORDER,
        borderColor:     BLACK,
        justifyContent:  'center',
        alignItems:      'center',
    },
    ctaBtnDisabled: { opacity: 0.4 },
    ctaBtnText: {
        fontFamily: 'Inter-Bold',
        fontSize:   17,
        color:      BLACK,
        letterSpacing: 0.3,
    },
});
