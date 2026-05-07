import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BLACK, WHITE, YELLOW } from '../constants/colors';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import * as Haptics from 'expo-haptics';
import { usePurchase, PurchasesPackage } from '../context/PurchaseContext';
import { Svg, Path } from 'react-native-svg';
import { trackEvent } from '../lib/analytics';
import { getGiftDeadline } from '../utils/storage';
import {
    PLANS,
    TIERS,
    GIFT_OFFER,
    PAYWALL_COPY,
    PAYWALL_TRIGGERS,
    getPlan,
    getDefaultPlan,
    applyGiftDiscount,
    annualSavingsPct,
    weeklyEquivalent,
    interpolatePaywall,
    type PlanId,
    type PricingPlan,
} from '../config/pricing';

// ── Small icons ──────────────────────────────────────────────────────────────

const FeatureIcon: React.FC = () => (
    <View style={styles.featureIcon}>
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path
                d="M20 6L9 17l-5-5"
                stroke={BLACK}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    </View>
);

const CheckCircle: React.FC<{ selected: boolean }> = ({ selected }) => (
    <View style={[styles.checkCircle, selected && styles.checkCircleSelected]}>
        {selected && (
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                <Path
                    d="M20 6L9 17l-5-5"
                    stroke={BLACK}
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </Svg>
        )}
    </View>
);

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Pull a USD number out of a localized priceString like "$39.99" or "€39,99". */
const parsePriceUSD = (s?: string, fallback = 0): number => {
    if (!s) return fallback;
    // Match either dot- or comma-decimal numerics; normalize to dot.
    const m = s.match(/[\d]+(?:[.,][\d]+)?/);
    if (!m) return fallback;
    return parseFloat(m[0].replace(',', '.'));
};

/** Replace only the numeric part of a price string, preserving currency symbol. */
const formatDiscounted = (originalString: string, originalNumber: number, pct: number): string => {
    const newNumber = originalNumber * (1 - pct / 100);
    const formatted = newNumber.toFixed(2);
    if (originalString && /[\d]+(?:[.,][\d]+)?/.test(originalString)) {
        return originalString.replace(/[\d]+(?:[.,][\d]+)?/, formatted);
    }
    return `$${formatted}`;
};

/** Countdown HH:MM:SS, "00:00:00" once expired. */
const formatRemaining = (ms: number): string => {
    if (ms <= 0) return '00:00:00';
    const total = Math.floor(ms / 1000);
    const h = String(Math.floor(total / 3600)).padStart(2, '0');
    const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
};

/** Per-plan computed display values. */
interface PlanDisplay {
    plan:             PricingPlan;
    pkg:              PurchasesPackage | undefined;
    realPriceString:  string;   // RC localized or fallback
    realPriceUSD:     number;
    effectiveString:  string;   // discounted if gift applies, else real
    effectiveUSD:     number;
    giftAppliesHere:  boolean;
}

// ── Screen ───────────────────────────────────────────────────────────────────

export const PaywallScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Paywall'>>();
    const route      = useRoute<RouteProp<RootStackParamList, 'Paywall'>>();
    const { packages, purchasePackage, restorePurchases, isLoading } = usePurchase();
    const [purchasing, setPurchasing] = useState(false);

    // ── Resolve trigger (drives copy + analytics) ───────────────────────────
    const triggerId = route.params?.trigger;
    const trigger   = triggerId ? PAYWALL_TRIGGERS[triggerId] : undefined;

    // Initial plan: trigger override → plan default → first plan.
    const initialPlanId: PlanId =
        trigger?.highlightPlan ?? getDefaultPlan().id;
    const [selectedPlanId, setSelectedPlanId] = useState<PlanId>(initialPlanId);

    // ── First-promise gift ──────────────────────────────────────────────────
    const isGiftRequested = route.params?.offer === 'first_promise_gift' && GIFT_OFFER.enabled;
    const [giftDeadline, setGiftDeadline] = useState<number | null>(null);
    const [now, setNow] = useState<number>(Date.now());
    const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (!isGiftRequested) return;
        getGiftDeadline(GIFT_OFFER.windowHours).then(setGiftDeadline);
    }, [isGiftRequested]);

    useEffect(() => {
        if (giftDeadline === null) return;
        if (tickRef.current) clearInterval(tickRef.current);
        tickRef.current = setInterval(() => setNow(Date.now()), 1000);
        return () => { if (tickRef.current) clearInterval(tickRef.current); };
    }, [giftDeadline]);

    const giftActive    = giftDeadline !== null && giftDeadline > now;
    const giftRemaining = giftActive ? giftDeadline! - now : 0;

    // ── Per-plan display values (price, gift application) ───────────────────
    const planDisplays = useMemo<PlanDisplay[]>(() => PLANS.map(plan => {
        const pkg = packages.find(p => p.packageType === plan.rcPackageType);
        const realPriceString = pkg?.product.priceString ?? plan.priceString;
        const realPriceUSD    = parsePriceUSD(realPriceString, plan.priceUSD);
        const giftAppliesHere = giftActive && plan.id === GIFT_OFFER.appliesToPlanId;
        const effectiveUSD    = giftAppliesHere ? applyGiftDiscount(realPriceUSD) : realPriceUSD;
        const effectiveString = giftAppliesHere
            ? formatDiscounted(realPriceString, realPriceUSD, GIFT_OFFER.discountPct)
            : realPriceString;
        return { plan, pkg, realPriceString, realPriceUSD, effectiveString, effectiveUSD, giftAppliesHere };
    }), [packages, giftActive]);

    const selectedDisplay = planDisplays.find(d => d.plan.id === selectedPlanId) ?? planDisplays[0];
    const monthlyDisplay  = planDisplays.find(d => d.plan.id === 'monthly');

    // ── Analytics: paywall_viewed once per mount, dismissed on close ────────
    const viewedRef = useRef(false);
    useEffect(() => {
        if (isLoading || viewedRef.current) return;
        viewedRef.current = true;
        trackEvent('paywall_viewed', {
            offer:       isGiftRequested ? 'first_promise_gift' : 'standard',
            gift_active: giftActive,
            trigger:     triggerId ?? null,
        });
    }, [isLoading, isGiftRequested, giftActive, triggerId]);

    const dismissPaywall = () => {
        trackEvent('paywall_dismissed', {
            offer:       isGiftRequested ? 'first_promise_gift' : 'standard',
            gift_active: giftActive,
            trigger:     triggerId ?? null,
        });
        navigation.goBack();
    };

    const handlePurchase = async () => {
        if (!selectedDisplay?.pkg) {
            Alert.alert('Unavailable', 'This plan is not currently available.');
            return;
        }
        setPurchasing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        trackEvent('paywall_purchase_started', {
            plan:        selectedDisplay.plan.id,
            tier:        selectedDisplay.plan.tier,
            gift_active: selectedDisplay.giftAppliesHere,
            trigger:     triggerId ?? null,
        });
        try {
            const success = await purchasePackage(selectedDisplay.pkg);
            if (success) navigation.goBack();
        } catch {
            Alert.alert('Error', 'Purchase failed. Please try again.');
        } finally {
            setPurchasing(false);
        }
    };

    const handleRestore = async () => {
        setPurchasing(true);
        try { await restorePurchases(); }
        finally { setPurchasing(false); }
    };

    if (isLoading) {
        return (
            <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color={YELLOW} />
            </View>
        );
    }

    // ── Resolved copy ───────────────────────────────────────────────────────
    const title = giftActive
        ? interpolatePaywall(PAYWALL_COPY.giftTitleTemplate, { pct: GIFT_OFFER.discountPct })
        : (trigger?.title ?? PAYWALL_COPY.defaultTitle);
    const subBody = !giftActive ? trigger?.body : undefined;

    const ctaText = (() => {
        const p = selectedDisplay.plan;
        if (p.trialDays > 0 && !selectedDisplay.giftAppliesHere) {
            return interpolatePaywall(PAYWALL_COPY.cta.withTrial, { trialDays: p.trialDays });
        }
        return PAYWALL_COPY.cta.default;
    })();

    const billingNote = (() => {
        const p = selectedDisplay.plan;
        if (p.id === 'monthly') return PAYWALL_COPY.billingNote.monthly;
        // Annual:
        if (p.trialDays > 0 && !selectedDisplay.giftAppliesHere) {
            return interpolatePaywall(PAYWALL_COPY.billingNote.annualWithTrial, {
                trialDays:   p.trialDays,
                priceString: selectedDisplay.realPriceString,
            });
        }
        return PAYWALL_COPY.billingNote.annual;
    })();

    const proFeatures = TIERS.pro.features;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Close */}
                <TouchableOpacity onPress={dismissPaywall} style={styles.closeButton} accessibilityLabel="Close paywall" accessibilityRole="button">
                    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                        <Path d="M18 6L6 18M6 6l12 12" stroke={BLACK + '55'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                </TouchableOpacity>

                {/* Mascot */}
                <View style={styles.mascotSection}>
                    <Image
                        source={require('../../assets/mascot/potato.png')}
                        style={styles.mascotImage}
                        resizeMode="contain"
                    />
                </View>

                {/* Gift banner */}
                {giftActive && (
                    <View style={styles.giftBanner}>
                        <Text style={styles.giftEyebrow}>{GIFT_OFFER.copy.eyebrow}</Text>
                        <Text style={styles.giftBody}>{GIFT_OFFER.copy.body}</Text>
                        <View style={styles.giftCountdownRow}>
                            <Text style={styles.giftCountdownLabel}>{GIFT_OFFER.copy.countdownPrefix}</Text>
                            <Text style={styles.giftCountdownValue}>{formatRemaining(giftRemaining)}</Text>
                        </View>
                    </View>
                )}

                {/* Title + optional sub */}
                <Text style={styles.title}>{title}</Text>
                {subBody && <Text style={styles.subBody}>{subBody}</Text>}

                {/* Pro feature list */}
                <View style={styles.featureList}>
                    {proFeatures.map((f, i) => (
                        <View key={i} style={styles.featureRow}>
                            <FeatureIcon />
                            <View style={styles.featureText}>
                                <Text style={styles.featureTitle}>{f.title}</Text>
                                {f.desc ? <Text style={styles.featureDesc}>{f.desc}</Text> : null}
                            </View>
                        </View>
                    ))}
                </View>

                {/* Plan cards */}
                <View style={styles.planSection}>
                    {planDisplays.map(d => (
                        <PlanCard
                            key={d.plan.id}
                            display={d}
                            selected={d.plan.id === selectedPlanId}
                            monthlyUSD={monthlyDisplay?.realPriceUSD}
                            onSelect={() => {
                                setSelectedPlanId(d.plan.id);
                                trackEvent('paywall_plan_selected', {
                                    plan:        d.plan.id,
                                    tier:        d.plan.tier,
                                    gift_active: d.giftAppliesHere,
                                    trigger:     triggerId ?? null,
                                });
                            }}
                        />
                    ))}
                </View>

                {/* Plan-specific billing note */}
                <Text style={styles.billingNote}>{billingNote}</Text>

                {/* CTA */}
                <TouchableOpacity
                    style={styles.ctaButton}
                    onPress={handlePurchase}
                    disabled={purchasing || !selectedDisplay.pkg}
                    activeOpacity={0.85}
                    accessibilityLabel={`Continue with ${selectedDisplay.plan.displayName} plan`}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: purchasing }}
                >
                    {purchasing
                        ? <ActivityIndicator size="small" color={BLACK} />
                        : <Text style={styles.ctaText}>{ctaText}</Text>
                    }
                </TouchableOpacity>

                {/* Footer */}
                <View style={styles.footerLinks}>
                    <TouchableOpacity onPress={handleRestore} disabled={purchasing} accessibilityLabel="Restore purchases" accessibilityRole="button">
                        <Text style={styles.footerLink}>{PAYWALL_COPY.footerLinks.restore}</Text>
                    </TouchableOpacity>
                    <Text style={styles.footerDot}>·</Text>
                    <TouchableOpacity>
                        <Text style={styles.footerLink}>{PAYWALL_COPY.footerLinks.terms}</Text>
                    </TouchableOpacity>
                    <Text style={styles.footerDot}>·</Text>
                    <TouchableOpacity>
                        <Text style={styles.footerLink}>{PAYWALL_COPY.footerLinks.privacy}</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
};

// ── PlanCard ─────────────────────────────────────────────────────────────────
// Extracted for readability — render logic for one row of the plan list.

interface PlanCardProps {
    display:    PlanDisplay;
    selected:   boolean;
    /** Used to compute "save X% vs monthly" on the annual card. */
    monthlyUSD: number | undefined;
    onSelect:   () => void;
}

const PlanCard: React.FC<PlanCardProps> = ({ display, selected, monthlyUSD, onSelect }) => {
    const { plan, realPriceString, realPriceUSD, effectiveString, effectiveUSD, giftAppliesHere } = display;

    // Headline badge (top-left of the card)
    const badge = (() => {
        if (giftAppliesHere) return `SAVE ${GIFT_OFFER.discountPct}%`;
        if (plan.id === 'annual' && monthlyUSD && monthlyUSD > 0) {
            const pct = annualSavingsPct(realPriceUSD, monthlyUSD);
            if (pct > 0) return `SAVE ${pct}%`;
        }
        return null;
    })();

    // Trial pill (top-right of the card)
    const showTrialPill = plan.trialDays > 0 && !giftAppliesHere;

    // Side caption (right side) — per-week eq for annual, "/mo" for monthly
    const sideCaption = (() => {
        if (plan.id === 'annual') return weeklyEquivalent(effectiveUSD);
        return null;
    })();

    // Sub-line under the price
    const subline = (() => {
        if (giftAppliesHere) return GIFT_OFFER.copy.savingsLabel;
        if (plan.id === 'annual' && monthlyUSD && monthlyUSD > 0) {
            return `vs $${monthlyUSD.toFixed(2)}/mo billed monthly`;
        }
        return null;
    })();

    return (
        <TouchableOpacity
            style={[styles.planCard, selected && styles.planCardSelected]}
            onPress={onSelect}
            activeOpacity={0.8}
            accessibilityLabel={`${plan.displayName} plan, ${effectiveString} ${plan.periodSuffix}`}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
        >
            {badge && (
                <View style={styles.bestOfferBadge}>
                    <Text style={styles.bestOfferText}>{badge}</Text>
                </View>
            )}
            {showTrialPill && (
                <View style={styles.trialPill}>
                    <Text style={styles.trialPillText}>{plan.trialDays} DAYS FREE</Text>
                </View>
            )}

            <CheckCircle selected={selected} />

            <View style={styles.planInfo}>
                <Text style={styles.planName}>{plan.displayName}</Text>
                {giftAppliesHere ? (
                    <Text style={styles.planPriceMain}>
                        {effectiveString}
                        <Text style={styles.planPeriod}>{plan.periodSuffix}</Text>
                        <Text style={styles.planPriceStrike}>  {realPriceString}</Text>
                    </Text>
                ) : (
                    <Text style={styles.planPriceMain}>
                        {effectiveString}
                        <Text style={styles.planPeriod}>{plan.periodSuffix}</Text>
                    </Text>
                )}
                {subline && <Text style={styles.planSavingsNote}>{subline}</Text>}
            </View>

            {sideCaption && <Text style={styles.planWeekly}>{sideCaption}</Text>}
        </TouchableOpacity>
    );
};

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: WHITE,
    },
    loadingWrap: {
        flex: 1,
        backgroundColor: WHITE,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 40,
    },
    closeButton: {
        alignSelf: 'flex-end',
        padding: 4,
        marginBottom: 4,
    },
    mascotSection: {
        alignItems: 'center',
        marginBottom: 20,
    },
    mascotImage: {
        width: 90,
        height: 90,
    },
    title: {
        fontSize: 32,
        fontFamily: 'Inter-Bold',
        textAlign: 'center',
        marginBottom: 8,
        color: BLACK,
    },
    subBody: {
        fontSize: 14,
        fontFamily: 'Inter-Medium',
        textAlign: 'center',
        marginBottom: 20,
        color: BLACK + '80',
        lineHeight: 20,
    },
    featureList: {
        gap: 16,
        marginTop: 20,
        marginBottom: 28,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    featureIcon: {
        width:           28,
        height:          28,
        borderRadius:    14,
        backgroundColor: YELLOW,
        borderWidth:     1.5,
        borderColor:     BLACK,
        justifyContent:  'center',
        alignItems:      'center',
    },
    featureText: { flex: 1 },
    featureTitle: {
        fontSize:   16,
        fontFamily: 'Inter-Bold',
        marginBottom: 1,
        color:      BLACK,
    },
    featureDesc: {
        fontSize:   13,
        fontFamily: 'Inter-Medium',
        color:      BLACK + '70',
    },
    planSection: {
        gap:          12,
        marginBottom: 12,
    },
    planCard: {
        flexDirection:   'row',
        alignItems:      'center',
        paddingVertical:   18,
        paddingHorizontal: 16,
        borderRadius:    16,
        borderWidth:     2,
        borderColor:     BLACK + '25',
        position:        'relative',
        gap:             12,
        backgroundColor: WHITE,
    },
    planCardSelected: {
        borderColor:     BLACK,
        backgroundColor: YELLOW,
    },
    bestOfferBadge: {
        position:        'absolute',
        top:             -10,
        left:            16,
        paddingHorizontal: 10,
        paddingVertical:   3,
        borderRadius:    6,
        backgroundColor: BLACK,
    },
    bestOfferText: {
        color:        YELLOW,
        fontFamily:   'Inter-Bold',
        fontSize:     10,
        letterSpacing: 0.8,
    },
    trialPill: {
        position:        'absolute',
        top:             -10,
        right:           16,
        paddingHorizontal: 10,
        paddingVertical:   3,
        borderRadius:    6,
        backgroundColor: WHITE,
        borderWidth:     1.5,
        borderColor:     BLACK,
    },
    trialPillText: {
        color:        BLACK,
        fontFamily:   'Inter-Bold',
        fontSize:     10,
        letterSpacing: 0.8,
    },
    checkCircle: {
        width:           24,
        height:          24,
        borderRadius:    12,
        backgroundColor: WHITE,
        borderWidth:     1.5,
        borderColor:     BLACK,
        justifyContent:  'center',
        alignItems:      'center',
    },
    checkCircleSelected: {
        backgroundColor: WHITE,
    },
    planInfo: {
        flex: 1,
    },
    planName: {
        fontSize: 16,
        fontFamily: 'Inter-Bold',
        marginBottom: 2,
        color: BLACK,
    },
    planPriceMain: {
        fontSize: 15,
        fontFamily: 'Inter-Bold',
        color: BLACK,
    },
    planPeriod: {
        fontSize: 13,
        fontWeight: '400',
        color: BLACK + '88',
    },
    planSavingsNote: {
        fontSize: 11,
        fontFamily: 'Inter-Bold',
        color: BLACK + '60',
        marginTop: 2,
    },
    planWeekly: {
        fontSize: 13,
        fontFamily: 'Inter-Bold',
        color: BLACK + '88',
    },
    planPriceStrike: {
        fontSize: 13,
        fontFamily: 'Inter-Medium',
        color: BLACK + '50',
        textDecorationLine: 'line-through',
    },

    // Gift banner
    giftBanner: {
        backgroundColor: YELLOW,
        borderWidth: 2,
        borderColor: BLACK,
        borderRadius: 16,
        padding: 16,
        marginBottom: 18,
    },
    giftEyebrow: {
        fontFamily: 'Inter-Bold',
        fontSize: 16,
        color: BLACK,
        marginBottom: 4,
    },
    giftBody: {
        fontFamily: 'Inter-Medium',
        fontSize: 13,
        lineHeight: 18,
        color: BLACK + '85',
        marginBottom: 12,
    },
    giftCountdownRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 6,
    },
    giftCountdownLabel: {
        fontFamily: 'Inter-Medium',
        fontSize: 12,
        color: BLACK + '70',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    giftCountdownValue: {
        fontFamily: 'Inter-Bold',
        fontSize: 18,
        color: BLACK,
        letterSpacing: 1,
    },
    billingNote: {
        textAlign:    'center',
        fontSize:     13,
        fontFamily:   'Inter-Medium',
        marginBottom: 20,
        marginTop:    8,
        color:        BLACK + '60',
    },
    ctaButton: {
        paddingVertical: 18,
        borderRadius:    50,
        alignItems:      'center',
        justifyContent:  'center',
        marginBottom:    20,
        backgroundColor: YELLOW,
        borderWidth:     2,
        borderColor:     BLACK,
    },
    ctaText: {
        fontSize:   18,
        fontFamily: 'Inter-Bold',
        color:      BLACK,
        letterSpacing: 0.3,
    },
    footerLinks: {
        flexDirection:  'row',
        justifyContent: 'center',
        alignItems:     'center',
        gap:            8,
    },
    footerLink: {
        fontSize:   13,
        fontFamily: 'Inter-Medium',
        color:      BLACK + '60',
    },
    footerDot: {
        fontSize: 13,
        color:    BLACK + '30',
    },
});
