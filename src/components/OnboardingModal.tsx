/**
 * OnboardingModal — first-run flow.
 *
 * Despite the name (kept stable for import compatibility), this is no longer a
 * native `<Modal>` — it renders as an inline overlay inside HubScreen so the
 * surrounding `AppHeader` and `TabBar` remain visible during onboarding.
 *
 * 14 slides driven by `src/constants/onboardingContent.ts`. To change copy,
 * questions, options, or the order of slides, edit that file — not this one.
 *
 * Visual language:
 *   - White cards, 2px black border, 20px radius
 *   - Yellow accent for selected/active state
 *   - Inter typography
 *   - Ulbo (potato.png) is the only character
 *
 * Analytics: every slide view, advance, answer, and OS-permission outcome
 * fires a typed PostHog event (see `src/lib/analytics.ts`).
 */
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Keyboard,
    Platform,
    Image,
    Animated,
    Pressable,
    ScrollView,
    Dimensions,
} from 'react-native';
import { Svg, Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BLACK, WHITE, YELLOW } from '../constants/colors';
import { useHeaderHeight } from '../context/HeaderHeightContext';
import {
    ONBOARDING_TUNABLES,
    SLIDE_ORDER,
    projectedDateLabel,
} from '../constants/onboardingContent';
import { useTranslation } from 'react-i18next';
import { OnboardingAnswers, OnboardingMood } from '../types';
import { trackEvent } from '../lib/analytics';
import { saveOnboardingAnswers } from '../utils/storage';
import { requestNotificationPermissions, scheduleDailyReminder } from '../utils/notifications';
import { addHuntEntry } from '../utils/progressionStorage';
import { saveJournalEntry, generateJournalId, getTodayDateString } from '../utils/journalStorage';
import { useOnboarding } from '../context/OnboardingContext';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Map the 4-emotion picker to a representative point on the 1-10 mood scale
// the rest of the app (HuntScreen, journal AI, History) uses.
const EMOTION_TO_MOOD_SCORE: Record<OnboardingMood, number> = {
    happy: 8,
    bored: 5,
    upset: 4,
    sad:   2,
};

// Slides where the Ulbo mascot is rendered — used to gate the jump-on-CTA.
const SLIDES_WITH_MASCOT: ReadonlyArray<string> = [
    'welcome', 'outcomePromise', 'plan',
    'notification', 'socialProof1', 'socialProof2',
];

// ─── Assets ──────────────────────────────────────────────────────────────────

const ULBO = require('../../assets/mascot/potato.png');

const EMOTION_IMAGES: Record<OnboardingMood, { selected: any; unselected: any }> = {
    happy: {
        selected:   require('../../assets/mascot/potato_emotion_states/potato_happy_selected.png'),
        unselected: require('../../assets/mascot/potato_emotion_states/potato_happy_unselected.png'),
    },
    sad: {
        selected:   require('../../assets/mascot/potato_emotion_states/potato_sad_selected.png'),
        unselected: require('../../assets/mascot/potato_emotion_states/potato_sad_unselected.png'),
    },
    upset: {
        selected:   require('../../assets/mascot/potato_emotion_states/potato_upset_selected.png'),
        unselected: require('../../assets/mascot/potato_emotion_states/potato_upset_unselected.png'),
    },
    bored: {
        selected:   require('../../assets/mascot/potato_emotion_states/potato_bored_selected.png'),
        unselected: require('../../assets/mascot/potato_emotion_states/potato_bored_unselected.png'),
    },
};
const EMOTION_ORDER: OnboardingMood[] = ['happy', 'sad', 'upset', 'bored'];

// ─── Layout tunables ─────────────────────────────────────────────────────────
// Match the Hub screen's card pattern (see HubScreen.tsx → MainCard styles):
//   container: BLACK | scrollContent paddingHorizontal: 16
//   card:      WHITE | borderWidth 2 | borderColor BLACK | borderRadius 20
//   inner:     paddingHorizontal 24 | paddingTop 24

// HubScreen.scrollContent already provides the 16px outer horizontal padding,
// so the slide card has no horizontal margin of its own.
const CARD_INNER_PADDING_X = 24;
const CARD_INNER_PADDING_Y = 24;
const CARD_RADIUS          = 20;
const CARD_BORDER          = 2;
// Tuned so Ulbo fits the slide card with title + body + CTA on every supported
// phone height, and shrinks to a sensible size when the card squares-up above
// the keyboard.
const MASCOT_HERO_SIZE     = 110;
const MASCOT_DEFAULT_SIZE  = 110;

// ─── Option ID arrays (used for rendering translated option labels) ───────────

const INTENT_OPTION_IDS = ['less_anxious', 'be_grateful', 'think_clear', 'sleep_better', 'grow', 'just_looking'] as const;

const FIELD_OPTION_IDS: Record<'frequency' | 'area' | 'stakes', readonly string[]> = {
    frequency: ['rarely', 'sometimes', 'often', 'constant'],
    area:      ['work', 'rels', 'body', 'mind', 'purpose'],
    stakes:    ['fine', 'tired', 'regret', 'find_out'],
};

const INTENT_SUMMARY_KEYS: Record<string, string> = {
    less_anxious: 'calm',
    be_grateful:  'gratitude',
    think_clear:  'clarity',
    sleep_better: 'rest',
    grow:         'growth',
    just_looking: 'curiosity',
};

// ─── Empty answers (fresh state for every modal open) ────────────────────────

const EMPTY_ANSWERS: OnboardingAnswers = {
    name:           '',
    intents:        [],
    moodNow:        null,
    moodNote:       '',
    frequency:      null,
    area:           null,
    stakes:         null,
    notifyOptIn:    null,
    journalEntries: ['', '', ''],
    signaturePath:  '',
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface OnboardingModalProps {
    visible:    boolean;
    onComplete: (name: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ visible, onComplete }) => {
    const { t } = useTranslation();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers]           = useState<OnboardingAnswers>(EMPTY_ANSWERS);
    const [isSigning, setIsSigning]       = useState(false);

    const localizedSummarizeIntents = useCallback((intentIds: readonly string[]): string => {
        const summaries = intentIds
            .map(id => {
                const key = INTENT_SUMMARY_KEYS[id];
                return key ? t(`onboarding.intent.summary_${key}`) : null;
            })
            .filter((s): s is string => s !== null);
        if (summaries.length === 0) return t('onboarding.intent.summary_yourself');
        if (summaries.length === 1) return summaries[0];
        if (summaries.length === 2) return `${summaries[0]} ${t('onboarding.intent.summary_and')} ${summaries[1]}`;
        return `${summaries.slice(0, -1).join(', ')}${t('onboarding.intent.summary_comma_and')} ${summaries[summaries.length - 1]}`;
    }, [t]);

    const { setProgress: setHeaderProgress } = useOnboarding();
    const insets       = useSafeAreaInsets();
    const headerHeight = useHeaderHeight();

    const fade           = useRef(new Animated.Value(1)).current;
    const floatAnim      = useRef(new Animated.Value(0)).current;
    const mascotJumpAnim = useRef(new Animated.Value(0)).current;

    // Refs for the three journal-taste inputs so Enter can advance focus.
    const journalInputRefs   = useRef<Array<TextInput | null>>([null, null, null]);
    // Kept in sync synchronously inside updateEntry so onSubmitEditing can
    // check the latest values without waiting for a React re-render.
    const journalEntriesRef  = useRef<string[]>(['', '', '']);

    // Card-height animation (matches HuntScreen): when the keyboard rises, the
    // slide card shrinks to a square sitting above the keyboard.
    const cardW = SCREEN_W - 32;
    const naturalCardHeight = Math.max(
        320,
        SCREEN_H - (headerHeight || 80) - insets.bottom - 32,
    );
    const cardH               = useRef(new Animated.Value(naturalCardHeight)).current;
    const naturalCardHRef     = useRef(naturalCardHeight);
    const headerHeightRef     = useRef(headerHeight);
    const keyboardOpenRef     = useRef(false);

    useEffect(() => {
        naturalCardHRef.current = naturalCardHeight;
        headerHeightRef.current = headerHeight;
        if (!keyboardOpenRef.current) cardH.setValue(naturalCardHeight);
    }, [naturalCardHeight, headerHeight, cardH]);

    const slideId  = SLIDE_ORDER[currentIndex];
    const isLast   = currentIndex === SLIDE_ORDER.length - 1;

    // Mirror slide progress into the OnboardingContext so the AppHeader can
    // render the progress pill in its title card. Reset to 0 when the flow
    // ends so a future replay starts clean.
    useEffect(() => {
        if (visible) setHeaderProgress((currentIndex + 1) / SLIDE_ORDER.length);
        else         setHeaderProgress(0);
    }, [visible, currentIndex, setHeaderProgress]);

    // Helper — update one field of the answers object.
    const setAnswer = useCallback(<K extends keyof OnboardingAnswers>(
        key:   K,
        value: OnboardingAnswers[K],
    ) => {
        setAnswers(prev => ({ ...prev, [key]: value }));
    }, []);

    // ── Mascot float (welcome only) ─────────────────────────────────────────
    useEffect(() => {
        if (!visible) return;
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, { toValue: -8, duration: 1800, useNativeDriver: true }),
                Animated.timing(floatAnim, { toValue:  0, duration: 1800, useNativeDriver: true }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, [visible, floatAnim]);

    // ── Reset state every time modal re-opens ───────────────────────────────
    useEffect(() => {
        if (visible) {
            setCurrentIndex(0);
            setAnswers(EMPTY_ANSWERS);
            fade.setValue(1);
            trackEvent('onboarding_started');
            trackEvent('onboarding_step_viewed', { step: SLIDE_ORDER[0], index: 0 });
        }
    }, [visible, fade]);

    // ── Keyboard → square card animation (matches HuntScreen) ──────────────
    useEffect(() => {
        if (!visible) return;
        const show = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (e) => {
                keyboardOpenRef.current = true;
                const kbH          = e?.endCoordinates?.height ?? 0;
                if (kbH <= 0) return;
                const hh           = headerHeightRef.current || 80;
                // Android often reports kb height excluding the IME suggestion
                // toolbar — reserve extra space so buttons aren't clipped.
                const safetyMargin = Platform.OS === 'android' ? 140 : 32;
                const availH       = SCREEN_H - kbH - hh - safetyMargin;
                // Floor at 280 so a freak measurement can't collapse the card.
                const target       = Math.max(280, Math.min(cardW, availH));
                Animated.timing(cardH, {
                    toValue:         target,
                    duration:        300,
                    useNativeDriver: false,
                }).start();
            },
        );
        const hide = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => {
                keyboardOpenRef.current = false;
                Animated.timing(cardH, {
                    toValue:         naturalCardHRef.current,
                    duration:        300,
                    useNativeDriver: false,
                }).start();
            },
        );
        return () => { show.remove(); hide.remove(); };
    }, [visible, cardW, cardH]);

    // ── Mascot jump (tap-to-bounce; also fires on CTA for slides with Ulbo) ──
    // Lift kept modest (-34) so the float (-8) + jump combined never exceeds
    // the slide's top padding and Ulbo never clips against the card border.
    const triggerMascotJump = useCallback(() => {
        mascotJumpAnim.setValue(0);
        Animated.sequence([
            Animated.timing(mascotJumpAnim, { toValue: -34, duration: 170, useNativeDriver: true }),
            Animated.spring(mascotJumpAnim,  { toValue:   0, tension: 220, friction: 7, useNativeDriver: true }),
        ]).start();
    }, [mascotJumpAnim]);

    const handleMascotTap = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        triggerMascotJump();
    }, [triggerMascotJump]);

    // ── Cross-fade slide transition ─────────────────────────────────────────
    const goToIndex = useCallback((nextIndex: number) => {
        if (nextIndex < 0 || nextIndex >= SLIDE_ORDER.length) return;
        Animated.timing(fade, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
            setCurrentIndex(nextIndex);
            const nextStep = SLIDE_ORDER[nextIndex];
            trackEvent('onboarding_step_viewed', { step: nextStep, index: nextIndex });
            // Slide-specific entry events.
            if (nextStep === 'notification') {
                trackEvent('onboarding_notification_prompt_shown');
            }
            Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }).start();
        });
    }, [fade]);

    // ── Final completion ────────────────────────────────────────────────────
    const finishOnboarding = useCallback(async () => {
        // 1) Persist survey answers for marketing segmentation + later personalization.
        await saveOnboardingAnswers({
            intents:   answers.intents,
            moodNow:   answers.moodNow,
            frequency: answers.frequency,
            area:      answers.area,
            stakes:    answers.stakes,
        });

        // 2) Persist the journal taste entries into today's hunt so the user
        //    sees real content on day 0.
        const filledEntries = answers.journalEntries.map(e => e.trim()).filter(Boolean);
        if (filledEntries.length > 0) {
            try {
                let hunt = undefined;
                for (const text of filledEntries) {
                    hunt = await addHuntEntry(text, hunt);
                }
            } catch (err) {
                console.error('[onboarding] saving journal taste failed:', err);
            }
        }

        // 2b) Save the mood-now check-in as a journal entry so it appears in
        //     History with the right mood color, just like a journal-tab entry.
        if (answers.moodNow) {
            try {
                const note = answers.moodNote.trim();
                await saveJournalEntry({
                    id:            generateJournalId(),
                    quoteId:       -1,
                    quoteText:     '',
                    response:      note || `Feeling ${answers.moodNow} today.`,
                    createdAt:     Date.now(),
                    date:          getTodayDateString(),
                    moodScore:     EMOTION_TO_MOOD_SCORE[answers.moodNow],
                    sentimentTags: ['emotion_check', answers.moodNow, 'onboarding'],
                });
            } catch (err) {
                console.error('[onboarding] saving mood check-in failed:', err);
            }
        }

        // 3) Final funnel event with a complete answer snapshot.
        trackEvent('onboarding_completed', {
            intents:                 answers.intents,
            intent_count:            answers.intents.length,
            mood_now:                answers.moodNow,
            mood_note_length:        answers.moodNote.trim().length,
            frequency:               answers.frequency,
            area:                    answers.area,
            stakes:                  answers.stakes,
            notify_opt_in:           answers.notifyOptIn,
            journal_entries_count:   filledEntries.length,
        });

        // 4) Hand back to the host (HubScreen) — it owns navigation to paywall.
        onComplete(answers.name.trim());
    }, [answers, onComplete]);

    // ── CTA: advance ────────────────────────────────────────────────────────
    const handleNext = useCallback(async () => {
        Haptics.selectionAsync();
        // Jump Ulbo on slides where he's visible — playful, mirrors the CTA.
        if (SLIDES_WITH_MASCOT.includes(slideId)) triggerMascotJump();
        trackEvent('onboarding_step_completed', { step: slideId, index: currentIndex });
        if (isLast) {
            await finishOnboarding();
            return;
        }
        goToIndex(currentIndex + 1);
    }, [slideId, currentIndex, isLast, goToIndex, finishOnboarding, triggerMascotJump]);

    // ── Per-slide validation: disable CTA until the slide's answer is ready ──
    const isCTADisabled = useMemo(() => {
        switch (slideId) {
            case 'intent':    return answers.intents.length === 0;
            case 'moodNow':   return answers.moodNow === null;
            case 'frequency': return answers.frequency === null;
            case 'area':      return answers.area === null;
            case 'stakes':    return answers.stakes === null;
            case 'name':      return answers.name.trim().length === 0;
            case 'promise':   return answers.signaturePath.length < 20;
            default:          return false;
        }
    }, [slideId, answers]);

    // ── Footer CTA label per slide ──────────────────────────────────────────
    const ctaLabel = useMemo(() => {
        switch (slideId) {
            case 'welcome':         return t('onboarding.welcome.cta');
            case 'outcomePromise':  return t('onboarding.outcome_promise.cta');
            case 'intent':          return t('onboarding.intent.cta');
            case 'moodNow':         return t('onboarding.mood_now.cta');
            case 'frequency':       return t('onboarding.frequency.cta');
            case 'socialProof1':    return t('onboarding.social_proof1.cta');
            case 'area':            return t('onboarding.area.cta');
            case 'stakes':          return t('onboarding.stakes.cta');
            case 'name':            return t('onboarding.name.cta');
            case 'plan':            return t('onboarding.plan.cta');
            case 'notification':    return ''; // notification slide renders its own buttons
            case 'journalTaste':    return t('onboarding.journal_taste.cta');
            case 'socialProof2':    return t('onboarding.social_proof2.cta');
            case 'promise':         return t('onboarding.promise.cta');
        }
    }, [slideId, t]);

    // ── Interpolation context for templated copy ────────────────────────────
    const interpolationCtx = useMemo(() => ({
        name:           answers.name.trim(),
        intentSummary:  localizedSummarizeIntents(answers.intents),
        date30:         projectedDateLabel(ONBOARDING_TUNABLES.projectionDays),
        projectionDays: ONBOARDING_TUNABLES.projectionDays,
        userCount:      ONBOARDING_TUNABLES.socialProofUserCount,
    }), [answers.name, answers.intents, localizedSummarizeIntents]);

    // ───────────────────────────────────────────────────────────────────────
    // Slide renderers (kept tiny — all copy comes from i18n translations)
    // ───────────────────────────────────────────────────────────────────────

    const renderWelcome = () => {
        return (
            <SlideShell cta={{ label: t('onboarding.welcome.cta'), onPress: handleNext }} hasMascot isHero>
                <View style={styles.textBlock}>
                    <Text style={styles.title}>{t('onboarding.welcome.title')}</Text>
                    <Text style={styles.body}>{t('onboarding.welcome.body')}</Text>
                </View>
            </SlideShell>
        );
    };

    const renderOutcomePromise = () => {
        return (
            <SlideShell cta={{ label: t('onboarding.outcome_promise.cta'), onPress: handleNext }} hasMascot>
                <View style={styles.textBlock}>
                    <Text style={styles.title}>{t('onboarding.outcome_promise.title', interpolationCtx)}</Text>
                    <Text style={styles.body}>{t('onboarding.outcome_promise.body')}</Text>
                </View>
            </SlideShell>
        );
    };

    const renderIntent = () => {
        const toggle = (id: string) => {
            const next = answers.intents.includes(id)
                ? answers.intents.filter(x => x !== id)
                : [...answers.intents, id];
            setAnswer('intents', next);
            Haptics.selectionAsync();
            trackEvent('onboarding_question_answered', {
                question_id: 'intent',
                answer:      next,
            });
        };
        return (
            <SlideShell cta={{ label: t('onboarding.intent.cta'), onPress: handleNext, disabled: isCTADisabled }}>
                <View style={styles.questionHeader}>
                    <Text style={styles.questionTitle}>{t('onboarding.intent.question')}</Text>
                    <Text style={styles.questionSub}>{t('onboarding.intent.sub')}</Text>
                </View>
                <View style={styles.optionsList}>
                    {INTENT_OPTION_IDS.map(id => {
                        const active = answers.intents.includes(id);
                        return (
                            <TouchableOpacity
                                key={id}
                                style={[styles.optionCard, active && styles.optionCardActive]}
                                onPress={() => toggle(id)}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.optionLabel}>{t(`onboarding.intent.option_${id}`)}</Text>
                                <View style={[styles.checkbox, active && styles.checkboxActive]}>
                                    {active && <CheckIcon />}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </SlideShell>
        );
    };

    const renderMoodNow = () => {
        const select = (mood: OnboardingMood) => {
            setAnswer('moodNow', mood);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            trackEvent('onboarding_mood_selected', { mood });
            trackEvent('onboarding_question_answered', {
                question_id: 'moodNow',
                answer:      mood,
            });
        };
        return (
            <SlideShell cta={{ label: t('onboarding.mood_now.cta'), onPress: handleNext, disabled: isCTADisabled }}>
                <Text style={styles.emotionTitle}>{t('onboarding.mood_now.emotion_title')}</Text>
                <View style={styles.emotionRow}>
                    {EMOTION_ORDER.map(emotion => (
                        <Pressable key={emotion} onPress={() => select(emotion)} style={styles.emotionBtn}>
                            <Image
                                source={
                                    answers.moodNow === emotion
                                        ? EMOTION_IMAGES[emotion].selected
                                        : EMOTION_IMAGES[emotion].unselected
                                }
                                style={styles.emotionImg}
                                resizeMode="contain"
                            />
                        </Pressable>
                    ))}
                </View>
                <View style={styles.reflectDivider} />
                <TextInput
                    style={styles.emotionInput}
                    placeholder={t('onboarding.mood_now.note_placeholder')}
                    placeholderTextColor="#AAAAAA"
                    multiline
                    value={answers.moodNote}
                    onChangeText={(text) => setAnswer('moodNote', text)}
                    textAlignVertical="top"
                    autoFocus
                />
            </SlideShell>
        );
    };

    const renderSingleSelect = (field: 'frequency' | 'area' | 'stakes') => {
        const section = field as string;
        const hasSub = field === 'stakes';
        return (
            <SlideShell cta={{ label: t(`onboarding.${section}.cta`), onPress: handleNext, disabled: isCTADisabled }}>
                <View style={styles.questionHeader}>
                    <Text style={styles.questionTitle}>{t(`onboarding.${section}.question`)}</Text>
                    {hasSub && <Text style={styles.questionSub}>{t(`onboarding.${section}.sub`)}</Text>}
                </View>
                <View style={styles.optionsList}>
                    {FIELD_OPTION_IDS[field].map(id => {
                        const active = answers[field] === id;
                        return (
                            <TouchableOpacity
                                key={id}
                                style={[styles.optionCard, active && styles.optionCardActive]}
                                onPress={() => {
                                    setAnswer(field, id);
                                    Haptics.selectionAsync();
                                    trackEvent('onboarding_question_answered', {
                                        question_id: field,
                                        answer:      id,
                                    });
                                }}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.optionLabel}>{t(`onboarding.${section}.option_${id}`)}</Text>
                                <View style={[styles.radio, active && styles.radioActive]}>
                                    {active && <View style={styles.radioDot} />}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </SlideShell>
        );
    };

    const renderSocialProof = (section: 'social_proof1' | 'social_proof2') => (
        <SlideShell cta={{ label: t(`onboarding.${section}.cta`), onPress: handleNext }} hasMascot>
            <View style={styles.textBlock}>
                <Text style={styles.title}>{t(`onboarding.${section}.title`, interpolationCtx)}</Text>
                <Text style={styles.body}>{t(`onboarding.${section}.body`, interpolationCtx)}</Text>
                <View style={styles.testimonialCard}>
                    <Text style={styles.testimonialText}>{t(`onboarding.${section}.testimonial_text`)}</Text>
                    <Text style={styles.testimonialByline}>{t(`onboarding.${section}.testimonial_byline`)}</Text>
                </View>
            </View>
        </SlideShell>
    );

    const renderName = () => {
        return (
            <SlideShell cta={{ label: t('onboarding.name.cta'), onPress: handleNext, disabled: isCTADisabled }}>
                <View style={styles.questionHeader}>
                    <Text style={styles.questionTitle}>{t('onboarding.name.question')}</Text>
                </View>
                <TextInput
                    style={styles.nameInput}
                    placeholder={t('onboarding.name.placeholder')}
                    placeholderTextColor={BLACK + '40'}
                    value={answers.name}
                    onChangeText={(text) => setAnswer('name', text)}
                    autoCorrect={false}
                    returnKeyType="done"
                    autoFocus
                    onSubmitEditing={() => { if (answers.name.trim()) handleNext(); }}
                />
            </SlideShell>
        );
    };

    const renderPlan = () => {
        return (
            <SlideShell cta={{ label: t('onboarding.plan.cta'), onPress: handleNext }} hasMascot>
                <View style={styles.textBlock}>
                    <Text style={styles.title}>{t('onboarding.plan.title', interpolationCtx)}</Text>
                    <Text style={styles.body}>{t('onboarding.plan.intro')}</Text>
                    <View style={styles.planBullets}>
                        {[1, 2, 3, 4].map(i => (
                            <View key={i} style={styles.planBulletRow}>
                                <View style={styles.planBulletDot} />
                                <Text style={styles.planBulletText}>{t(`onboarding.plan.bullet_${i}`, interpolationCtx)}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            </SlideShell>
        );
    };

    const renderNotification = () => {
        const handleAccept = async () => {
            Haptics.selectionAsync();
            setAnswer('notifyOptIn', true);
            const granted = await requestNotificationPermissions();
            if (granted) {
                await scheduleDailyReminder(ONBOARDING_TUNABLES.notifyHour, ONBOARDING_TUNABLES.notifyMinute);
            }
            // Track the user's choice + the OS-level outcome separately so we can
            // see how many people *intended* to opt in vs. actually granted.
            trackEvent('onboarding_notification_accepted', { os_granted: granted });
            trackEvent('onboarding_step_completed', { step: 'notification', index: currentIndex });
            goToIndex(currentIndex + 1);
        };

        const handleDecline = () => {
            Haptics.selectionAsync();
            setAnswer('notifyOptIn', false);
            trackEvent('onboarding_notification_declined');
            trackEvent('onboarding_step_completed', { step: 'notification', index: currentIndex });
            goToIndex(currentIndex + 1);
        };

        return (
            <SlideShell
                cta={{ label: t('onboarding.notification.cta_yes'), onPress: handleAccept }}
                extraBottom={
                    <TouchableOpacity onPress={handleDecline} style={styles.skipInline} activeOpacity={0.7}>
                        <Text style={styles.skipInlineText}>{t('onboarding.notification.cta_no')}</Text>
                    </TouchableOpacity>
                }
                hasMascot
            >
                <View style={styles.textBlock}>
                    <Text style={styles.title}>{t('onboarding.notification.title')}</Text>
                    <Text style={styles.body}>{t('onboarding.notification.body')}</Text>
                    <Text style={styles.notifTimeLine}>{t('onboarding.notification.time_line')}</Text>

                    {/* Faux notification preview — anchors what they're opting in to. */}
                    <View style={styles.notifPreview}>
                        <View style={styles.notifPreviewIcon} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.notifPreviewTitle}>{t('onboarding.notification.preview_title')}</Text>
                            <Text style={styles.notifPreviewBody}>{t('onboarding.notification.preview_body')}</Text>
                        </View>
                    </View>
                </View>
            </SlideShell>
        );
    };

    const renderJournalTaste = () => {
        const updateEntry = (idx: number, text: string) => {
            const next = [...answers.journalEntries];
            next[idx] = text;
            // Sync the ref immediately so onSubmitEditing reads fresh values.
            journalEntriesRef.current = next;
            setAnswer('journalEntries', next);
        };
        const filledCount = answers.journalEntries.filter(e => e.trim()).length;
        const allFilled   = filledCount === 3;

        const handleSave = () => {
            trackEvent('onboarding_journal_taste_saved', { entry_count: filledCount });
            handleNext();
        };
        const handleSkip = () => {
            Haptics.selectionAsync();
            trackEvent('onboarding_journal_taste_skipped');
            trackEvent('onboarding_step_completed', { step: 'journalTaste', index: currentIndex });
            goToIndex(currentIndex + 1);
        };

        const placeholders = [
            t('onboarding.journal_taste.placeholder_1'),
            t('onboarding.journal_taste.placeholder_2'),
            t('onboarding.journal_taste.placeholder_3'),
        ];

        return (
            <SlideShell
                // CTA only appears once all 3 are filled.
                cta={allFilled ? { label: t('onboarding.journal_taste.cta'), onPress: handleSave } : undefined}
                // Skip link shown while still writing; hidden once complete.
                extraBottom={
                    !allFilled ? (
                        <TouchableOpacity onPress={handleSkip} style={styles.skipInline} activeOpacity={0.7}>
                            <Text style={styles.skipInlineText}>{t('onboarding.journal_taste.skip_label')}</Text>
                        </TouchableOpacity>
                    ) : null
                }
            >
                <Text style={styles.title}>{t('onboarding.journal_taste.title')}</Text>
                <View style={styles.gratitudeHeader}>
                    <Text style={styles.gratitudeTitle}>{t('onboarding.journal_taste.header_label')}</Text>
                    <Text style={styles.gratitudeCounter}>
                        <Text style={styles.gratitudeCountNum}>{filledCount}</Text>
                        <Text style={styles.gratitudeCountTotal}>/3</Text>
                    </Text>
                </View>
                <View style={styles.gratitudeDivider} />
                {[0, 1, 2].map(i => (
                    <View key={i}>
                        <View style={styles.gratitudeRow}>
                            <ArrowRightIcon />
                            <TextInput
                                ref={(el) => { journalInputRefs.current[i] = el; }}
                                style={styles.gratitudeInput}
                                placeholder={placeholders[i]}
                                placeholderTextColor="#AAAAAA"
                                value={answers.journalEntries[i]}
                                onChangeText={(text) => updateEntry(i, text)}
                                returnKeyType={i < 2 ? 'next' : 'done'}
                                blurOnSubmit={i === 2}
                                onSubmitEditing={() => {
                                    if (i < 2) {
                                        journalInputRefs.current[i + 1]?.focus();
                                    } else {
                                        // Read from ref — state update from onChangeText
                                        // is async so answers.journalEntries may be stale.
                                        const allNowFilled = journalEntriesRef.current.every(e => e.trim());
                                        if (allNowFilled) handleSave();
                                    }
                                }}
                                autoFocus={i === 0}
                            />
                        </View>
                        {i < 2 && <View style={styles.gratitudeDivider} />}
                    </View>
                ))}
            </SlideShell>
        );
    };

    const renderPromise = () => {
        const contract = t('onboarding.promise.contract_template', interpolationCtx);
        const hasSignature = answers.signaturePath.length > 0;

        // Functional updates — successive touch events must compose against the
        // *latest* path, not the path captured when this render ran.
        const appendPath = (segment: string) =>
            setAnswers(prev => ({ ...prev, signaturePath: prev.signaturePath + segment }));

        const handleStart = (event: any) => {
            const { locationX, locationY } = event.nativeEvent;
            appendPath(`M ${locationX} ${locationY}`);
            setIsSigning(true);
        };
        const handleMove = (event: any) => {
            if (!isSigning) return;
            const { locationX, locationY } = event.nativeEvent;
            appendPath(` L ${locationX} ${locationY}`);
        };
        const handleEnd = () => {
            setIsSigning(false);
            // Read the latest length via a functional read — `answers` here may
            // be stale relative to the just-applied appendPath.
            setAnswers(prev => {
                if (prev.signaturePath.length >= 20) {
                    trackEvent('onboarding_signature_signed');
                }
                return prev;
            });
        };
        const clear = () => setAnswer('signaturePath', '');

        return (
            <SlideShell cta={{ label: t('onboarding.promise.cta'), onPress: handleNext, disabled: isCTADisabled }}>
                <View style={styles.questionHeader}>
                    <Text style={styles.questionTitle}>{t('onboarding.promise.title')}</Text>
                    <Text style={styles.questionSub}>{t('onboarding.promise.sub')}</Text>
                </View>
                <View style={styles.contractBlock}>
                    <Text style={styles.contractText}>{contract}</Text>
                    <View
                        style={styles.signatureBox}
                        onTouchStart={handleStart}
                        onTouchMove={handleMove}
                        onTouchEnd={handleEnd}
                    >
                        <Svg style={StyleSheet.absoluteFill}>
                            <Path
                                d={answers.signaturePath}
                                stroke={BLACK}
                                strokeWidth={3}
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </Svg>
                        {!hasSignature && (
                            <Text style={styles.signaturePlaceholder}>{t('onboarding.promise.signature_placeholder')}</Text>
                        )}
                    </View>
                    {hasSignature && (
                        <TouchableOpacity onPress={clear} style={styles.clearBtn}>
                            <Text style={styles.clearBtnText}>{t('onboarding.promise.clear_label')}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </SlideShell>
        );
    };

    // ── Slide dispatcher ─────────────────────────────────────────────────────
    const renderSlide = (): React.ReactNode => {
        switch (slideId) {
            case 'welcome':         return renderWelcome();
            case 'outcomePromise':  return renderOutcomePromise();
            case 'intent':          return renderIntent();
            case 'moodNow':         return renderMoodNow();
            case 'frequency':       return renderSingleSelect('frequency');
            case 'socialProof1':    return renderSocialProof('social_proof1');
            case 'area':            return renderSingleSelect('area');
            case 'stakes':          return renderSingleSelect('stakes');
            case 'name':            return renderName();
            case 'plan':            return renderPlan();
            case 'notification':    return renderNotification();
            case 'journalTaste':    return renderJournalTaste();
            case 'socialProof2':    return renderSocialProof('social_proof2');
            case 'promise':         return renderPromise();
        }
    };

    // ── Layout ───────────────────────────────────────────────────────────────
    if (!visible) return null;

    // Renders inline inside HubScreen — AppHeader (above) shows the progress
    // pill via OnboardingContext, TabBar (below) is hidden via the same context.
    // The slide card has its own animated height (driven by the keyboard
    // listener) so KeyboardAvoidingView is no longer needed here.
    //
    // Two nested Animated.Views: the outer drives `opacity` (native driver),
    // the inner drives `height` (JS driver). Mixing both on one Animated.View
    // throws because height can't run on the native animation thread.
    return (
        <View style={styles.container}>
            <Animated.View style={{ flex: 1, opacity: fade }}>
                <Animated.View style={[styles.slideCard, { height: cardH }]}>
                    {renderSlide()}
                </Animated.View>

                {/* Mascot sits OUTSIDE the overflow:hidden card so float + jump
                    animations are never clipped. Absolutely positioned over the
                    card's top area; paddingTop on mascot slides reserves that space. */}
                {SLIDES_WITH_MASCOT.includes(slideId) && (
                    <Pressable
                        onPress={handleMascotTap}
                        style={styles.mascotFloat}
                        hitSlop={12}
                    >
                        <Animated.View style={{
                            transform: [
                                { translateY: floatAnim },
                                { translateY: mascotJumpAnim },
                            ],
                        }}>
                            <Image
                                source={ULBO}
                                style={{
                                    width:  slideId === 'welcome' ? MASCOT_HERO_SIZE : MASCOT_DEFAULT_SIZE,
                                    height: slideId === 'welcome' ? MASCOT_HERO_SIZE : MASCOT_DEFAULT_SIZE,
                                }}
                                resizeMode="contain"
                            />
                        </Animated.View>
                    </Pressable>
                )}
            </Animated.View>
        </View>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// InlineCTA — grey pill button. Sits inside a slide (not the modal footer).
// ─────────────────────────────────────────────────────────────────────────────
const InlineCTA: React.FC<{
    label:    string;
    onPress:  () => void;
    disabled?: boolean;
}> = ({ label, onPress, disabled }) => (
    <TouchableOpacity
        style={[styles.ctaBtn, disabled && styles.ctaBtnDisabled]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.85}
    >
        <Text style={styles.ctaBtnText}>{label}</Text>
    </TouchableOpacity>
);

// ─────────────────────────────────────────────────────────────────────────────
// SlideShell — standard slide layout: scrollable content area + bottom CTA.
// `extraBottom` is for slides that need extra UI below the CTA (skip link, or
// a custom button row when `cta` is omitted).
// ─────────────────────────────────────────────────────────────────────────────
const SlideShell: React.FC<{
    children:     React.ReactNode;
    cta?:         { label: string; onPress: () => void; disabled?: boolean };
    extraBottom?: React.ReactNode;
    hasMascot?:   boolean;
    isHero?:      boolean;
}> = ({ children, cta, extraBottom, hasMascot, isHero }) => (
    <View style={[
        styles.slide,
        hasMascot && (isHero ? styles.slidePadHero : styles.slidePadMascot),
    ]}>
        <ScrollView
            style={{ flex: 1, width: '100%' }}
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 4 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
        >
            {children}
        </ScrollView>
        {cta && <InlineCTA {...cta} />}
        {extraBottom}
    </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// Small subcomponents
// ─────────────────────────────────────────────────────────────────────────────

const CheckIcon: React.FC = () => (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
        <Path d="M5 12l5 5L20 7" stroke={BLACK} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

const ArrowRightIcon: React.FC = () => (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
        <Path d="M5 12h14M13 6l6 6-6 6" stroke={BLACK} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    // Inline overlay — parent (HubScreen) provides BLACK bg + AppHeader/TabBar padding.
    container: { flex: 1 },

    // White slide card — sits flush inside HubScreen.scrollContent which
    // already provides 16px horizontal padding. Height is animated by the
    // Keyboard listener so the card "snaps to a square" above the keyboard,
    // matching HuntScreen's reflect/journal pattern.
    slideCard: {
        backgroundColor: WHITE,
        borderWidth:     CARD_BORDER,
        borderColor:     BLACK,
        borderRadius:    CARD_RADIUS,
        overflow:        'hidden',
    },

    // Mascot floats above the card — absolutely positioned sibling so
    // overflow:hidden on slideCard can never clip the float/jump animation.
    mascotFloat: {
        position:   'absolute',
        top:        60,
        left:       0,
        right:      0,
        alignItems: 'center',
        zIndex:     10,
    },

    // Slide content (lives inside slideCard).
    // Default `alignItems: stretch` lets the InlineCTA span full width.
    // Non-mascot slides use a compact paddingTop; mascot slides reserve space
    // at the top so text starts below where Ulbo floats.
    slide: {
        flex:              1,
        paddingHorizontal: CARD_INNER_PADDING_X,
        paddingTop:        24,
        paddingBottom:     16,
    },
    // Extra top padding injected on slides that show the mascot overlay.
    // = top offset (16) + image height + gap (16).
    slidePadMascot: { paddingTop: 24 + MASCOT_DEFAULT_SIZE + 16 },  // 104
    slidePadHero:   { paddingTop: 16 + MASCOT_HERO_SIZE    + 16 },  // 142
    textBlock:     { width: '100%', flex: 1 },

    title: {
        fontFamily: 'Inter-Bold',
        fontSize:   30,
        lineHeight: 36,
        color:      BLACK,
        marginBottom: 12,
    },
    body: {
        fontFamily: 'Inter-Medium',
        fontSize:   16,
        lineHeight: 24,
        color:      BLACK + '70',
        marginBottom: 24,
    },

    // Question header (used by survey + name + journal taste + promise)
    questionHeader: { width: '100%', marginBottom: 20 },
    questionTitle: {
        fontFamily: 'Inter-Bold',
        fontSize:   28,
        lineHeight: 34,
        color:      BLACK,
        marginBottom: 8,
    },
    questionSub: {
        fontFamily: 'Inter-Medium',
        fontSize:   15,
        lineHeight: 22,
        color:      BLACK + '70',
    },

    // Generic option list (intent multi + frequency/area/stakes single)
    optionsList: { width: '100%', gap: 10, paddingBottom: 12 },
    optionCard: {
        flexDirection:   'row',
        alignItems:      'center',
        justifyContent:  'space-between',
        backgroundColor: WHITE,
        borderWidth:     1.5,
        borderColor:     BLACK + '15',     // softer, since it sits inside the white slideCard
        borderRadius:    14,
        paddingVertical:   14,
        paddingHorizontal: 16,
    },
    optionCardActive: { borderColor: BLACK, borderWidth: 2, backgroundColor: YELLOW },
    optionLabel: {
        fontFamily: 'Inter-Bold',
        fontSize:   16,
        color:      BLACK,
        flex:       1,
        paddingRight: 12,
    },

    // Multi-select checkbox
    checkbox: {
        width: 24, height: 24, borderRadius: 6,
        borderWidth: 2, borderColor: BLACK + '30',
        backgroundColor: WHITE,
        justifyContent: 'center', alignItems: 'center',
    },
    checkboxActive: { backgroundColor: WHITE, borderColor: BLACK },

    // Single-select radio
    radio: {
        width: 24, height: 24, borderRadius: 12,
        borderWidth: 2, borderColor: BLACK + '30',
        backgroundColor: WHITE,
        justifyContent: 'center', alignItems: 'center',
    },
    radioActive:  { borderColor: BLACK },
    radioDot:     { width: 10, height: 10, borderRadius: 5, backgroundColor: BLACK },

    // Mood emotion picker — lifted 1:1 from HuntScreen Step 0
    emotionTitle: {
        fontFamily:    'Inter-Bold',
        fontSize:      16,
        color:         BLACK,
        letterSpacing: 0.2,
        marginBottom:  10,
    },
    emotionRow: {
        flexDirection:  'row',
        justifyContent: 'space-between',
        marginBottom:   4,
    },
    emotionBtn: {
        flex:              1,
        alignItems:        'center',
        paddingVertical:   2,
        paddingHorizontal: 2,
    },
    emotionImg: { width: 50, height: 50 },
    emotionInput: {
        fontFamily:        'Inter-Medium',
        fontSize:          16,
        color:             BLACK,
        minHeight:         80,
        paddingTop:        12,
        paddingBottom:     16,
        lineHeight:        24,
        textAlignVertical: 'top',
    },
    // Used between the emotion picker and the multi-line note (matches HuntScreen)
    reflectDivider: {
        height:          1.5,
        backgroundColor: BLACK,
        marginTop:       8,
    },

    // Social-proof testimonial — softer than the parent card to avoid card-on-card noise
    testimonialCard: {
        backgroundColor: '#F6F6F6',
        borderRadius:    14,
        padding:         14,
        marginTop:       4,
    },
    testimonialText: {
        fontFamily: 'Inter-Medium',
        fontSize:   15,
        lineHeight: 22,
        color:      BLACK + '85',
        fontStyle:  'italic',
        marginBottom: 8,
    },
    testimonialByline: {
        fontFamily: 'Inter-Bold',
        fontSize:   13,
        color:      BLACK + '60',
    },

    // Name input
    nameInput: {
        fontFamily: 'Inter-Bold',
        fontSize:   28,
        color:      BLACK,
        borderBottomWidth: 2,
        borderBottomColor: BLACK,
        paddingBottom: 8,
        width: '100%',
    },

    // Personalized plan
    planBullets: { gap: 12, marginTop: 4 },
    planBulletRow: {
        flexDirection: 'row',
        alignItems:    'flex-start',
        gap:           12,
    },
    planBulletDot: {
        width: 10, height: 10, borderRadius: 5,
        backgroundColor: YELLOW,
        borderWidth: 1.5, borderColor: BLACK,
        marginTop: 7,
    },
    planBulletText: {
        flex: 1,
        fontFamily: 'Inter-Medium',
        fontSize:   16,
        lineHeight: 24,
        color:      BLACK,
    },

    // Notification slide
    notifTimeLine: {
        fontFamily: 'Inter-Bold',
        fontSize:   17,
        color:      BLACK,
        marginBottom: 16,
    },
    notifPreview: {
        flexDirection:   'row',
        alignItems:      'center',
        gap:             12,
        backgroundColor: '#F2F2F2',
        borderRadius:    14,
        padding:         12,
        marginBottom:    20,
    },
    notifPreviewIcon: {
        width: 36, height: 36, borderRadius: 8,
        backgroundColor: YELLOW,
        borderWidth: 1.5, borderColor: BLACK,
    },
    notifPreviewTitle: {
        fontFamily: 'Inter-Bold',
        fontSize:   13,
        color:      BLACK,
    },
    notifPreviewBody: {
        fontFamily: 'Inter-Medium',
        fontSize:   13,
        color:      BLACK + '70',
        marginTop:  2,
    },

    // Journal taste (3 things) — lifted 1:1 from HuntScreen Step 1
    gratitudeHeader: {
        flexDirection:  'row',
        alignItems:     'center',
        justifyContent: 'space-between',
        marginTop:      4,
        marginBottom:   12,
    },
    gratitudeTitle: {
        fontFamily:    'Inter-Bold',
        fontSize:      16,
        color:         BLACK,
        letterSpacing: 0.2,
    },
    gratitudeCounter:    { fontSize: 16 },
    gratitudeCountNum:   { fontFamily: 'Inter-Bold', fontSize: 16, color: BLACK },
    gratitudeCountTotal: { fontFamily: 'Inter-Bold', fontSize: 16, color: '#AAAAAA' },
    gratitudeDivider:    { height: 1, backgroundColor: '#E5E5E5' },
    gratitudeRow: {
        flexDirection:   'row',
        alignItems:      'center',
        gap:             12,
        paddingVertical: 14,
        minHeight:       52,
    },
    gratitudeInput: {
        flex:           1,
        fontFamily:     'Inter-Medium',
        fontSize:       16,
        color:          BLACK,
        paddingVertical: 0,
        minHeight:      28,
    },
    skipInline:     { alignItems: 'center', paddingVertical: 8 },
    skipInlineText: {
        fontFamily: 'Inter-Medium',
        fontSize:   14,
        color:      BLACK + '55',
        textDecorationLine: 'underline',
    },

    // Promise + signature
    contractBlock: { width: '100%', gap: 16 },
    contractText: {
        fontFamily: 'Inter-Medium',
        fontSize:   15,
        lineHeight: 24,
        color:      BLACK + '85',
        fontStyle:  'italic',
    },
    signatureBox: {
        width: '100%', height: 130,
        backgroundColor: WHITE,
        borderWidth: CARD_BORDER, borderColor: BLACK, borderRadius: 12,
        justifyContent: 'center', alignItems: 'center',
        overflow: 'hidden',
    },
    signaturePlaceholder: {
        fontFamily: 'Inter-Medium',
        fontSize:   16,
        color:      BLACK + '35',
    },
    clearBtn:     { alignSelf: 'flex-end', paddingVertical: 4 },
    clearBtnText: {
        fontFamily: 'Inter-Bold',
        fontSize:   13,
        color:      BLACK + '60',
        textDecorationLine: 'underline',
    },

    // Inline CTA — grey pill, lives at the bottom of each slide inside the card.
    // Visual matches HuntScreen's `emotionSaveBtn` so the buttons read as one
    // language across onboarding and the journal flow.
    ctaBtn: {
        height:          50,
        borderRadius:    25,
        backgroundColor: '#EEEEEE',
        justifyContent:  'center',
        alignItems:      'center',
        marginTop:       12,
    },
    ctaBtnDisabled: { opacity: 0.4 },
    ctaBtnText: {
        fontFamily:     'Inter-SemiBold',
        fontSize:       16,
        color:          BLACK,
        letterSpacing:  1,
        textTransform:  'uppercase',
    },
});
