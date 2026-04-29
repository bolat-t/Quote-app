import React, { useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import * as Haptics from 'expo-haptics';
import { usePurchase, PurchasesPackage } from '../context/PurchaseContext';
import { Svg, Path } from 'react-native-svg';

const FEATURES = [
    { title: 'Deeper Reflections', desc: 'Unlock guided prompts & themes', color: '#7C5CFC' },
    { title: 'AI Insights', desc: 'Smart mood analysis & patterns', color: '#3B82F6' },
    { title: 'Evolving Journal', desc: 'Custom backgrounds & fonts', color: '#10B981' },
    { title: 'Mood Dashboard', desc: 'Track your emotional journey', color: '#F59E0B' },
    { title: 'Longer Recordings', desc: 'Unlimited voice reflections', color: '#EC4899' },
    { title: 'Weekly Summaries', desc: 'AI-powered weekly insights', color: '#8B5CF6' },
];

/** Small rounded-square icon for feature rows */
const FeatureIcon: React.FC<{ color: string }> = ({ color }) => (
    <View style={[styles.featureIcon, { backgroundColor: color + '18' }]}>
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path
                d="M20 6L9 17l-5-5"
                stroke={color}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    </View>
);

/** Checkmark circle for plan selection */
const CheckCircle: React.FC<{ selected: boolean }> = ({ selected }) => (
    <View style={[styles.checkCircle, selected && styles.checkCircleSelected]}>
        {selected && (
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                <Path d="M20 6L9 17l-5-5" stroke={BLACK} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
        )}
    </View>
);

export const PaywallScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Paywall'>>();
    const { packages, purchasePackage, restorePurchases, isLoading } = usePurchase();
    const [purchasing, setPurchasing] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<'annual' | 'weekly'>('annual');

    const handlePurchase = async (pkg: PurchasesPackage) => {
        setPurchasing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            const success = await purchasePackage(pkg);
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

    const displayPackages = packages.length > 0 ? packages : [
        { identifier: 'monthly', product: { identifier: 'w', priceString: '$2.99', title: 'Weekly', description: '' }, packageType: 'MONTHLY' },
        { identifier: 'annual', product: { identifier: 'y', priceString: '$29.99', title: 'Yearly', description: '' }, packageType: 'ANNUAL' },
    ] as PurchasesPackage[];

    const annualPkg = displayPackages.find(p => p.packageType === 'ANNUAL');
    const weeklyPkg = displayPackages.find(p => p.packageType === 'MONTHLY');
    const annualPrice = annualPkg?.product.priceString || '$29.99';
    const weeklyPrice = weeklyPkg?.product.priceString || '$2.99';

    // Calculate savings % for annual vs weekly
    const annualRaw = annualPkg?.product.price ?? 29.99;
    const weeklyRaw = weeklyPkg?.product.price ?? 2.99;
    const weeklyAnnualised = weeklyRaw * 52;
    const savingsPct = weeklyAnnualised > 0
        ? Math.round(((weeklyAnnualised - annualRaw) / weeklyAnnualised) * 100)
        : 80;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Close */}
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton} accessibilityLabel="Close paywall" accessibilityRole="button">
                    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                        <Path d="M18 6L6 18M6 6l12 12" stroke={BLACK + '55'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                </TouchableOpacity>

                {/* Mascot */}
                <View style={styles.mascotSection}>
                    <Image
                        source={require('../../assets/mascot/ulbos_coloured.png')}
                        style={styles.mascotImage}
                        resizeMode="contain"
                    />
                </View>

                {/* Title */}
                <Text style={styles.title}>Unlock All Features</Text>

                {/* Feature List */}
                <View style={styles.featureList}>
                    {FEATURES.map((f, i) => (
                        <View key={i} style={styles.featureRow}>
                            <FeatureIcon color={f.color} />
                            <View style={styles.featureText}>
                                <Text style={styles.featureTitle}>{f.title}</Text>
                                <Text style={styles.featureDesc}>{f.desc}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Plan Selection */}
                <View style={styles.planSection}>
                    {/* Annual */}
                    <TouchableOpacity
                        style={[styles.planCard, selectedPlan === 'annual' && styles.planCardSelected]}
                        onPress={() => setSelectedPlan('annual')}
                        activeOpacity={0.8}
                        accessibilityLabel={`Annual plan, ${annualPrice} per year, save ${savingsPct}%`}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selectedPlan === 'annual' }}
                    >
                        <View style={styles.bestOfferBadge}>
                            <Text style={styles.bestOfferText}>SAVE {savingsPct}%</Text>
                        </View>
                        <CheckCircle selected={selectedPlan === 'annual'} />
                        <View style={styles.planInfo}>
                            <Text style={styles.planName}>Annual</Text>
                            <Text style={styles.planPriceMain}>
                                {annualPrice}<Text style={styles.planPeriod}>/year</Text>
                            </Text>
                            <Text style={styles.planSavingsNote}>vs {weeklyPrice}/week billed weekly</Text>
                        </View>
                        <Text style={styles.planWeekly}>$0.58/week</Text>
                    </TouchableOpacity>

                    {/* Weekly */}
                    <TouchableOpacity
                        style={[styles.planCard, selectedPlan === 'weekly' && styles.planCardSelected]}
                        onPress={() => setSelectedPlan('weekly')}
                        activeOpacity={0.8}
                        accessibilityLabel={`Weekly plan, ${weeklyPrice} per week`}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selectedPlan === 'weekly' }}
                    >
                        <CheckCircle selected={selectedPlan === 'weekly'} />
                        <View style={styles.planInfo}>
                            <Text style={styles.planName}>Weekly</Text>
                            <Text style={styles.planPriceMain}>
                                {weeklyPrice}<Text style={styles.planPeriod}>/week</Text>
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Billing note */}
                <Text style={styles.billingNote}>
                    {selectedPlan === 'annual' ? 'Billed annually. Cancel anytime.' : 'Billed weekly. Cancel anytime.'}
                </Text>

                {/* CTA Button */}
                <TouchableOpacity
                    style={styles.ctaButton}
                    onPress={() => {
                        const pkg = selectedPlan === 'annual' ? annualPkg : weeklyPkg;
                        if (pkg) handlePurchase(pkg);
                    }}
                    disabled={purchasing}
                    activeOpacity={0.85}
                    accessibilityLabel={`Continue with ${selectedPlan} plan`}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: purchasing }}
                >
                    {purchasing
                        ? <ActivityIndicator size="small" color={BLACK} />
                        : <Text style={styles.ctaText}>Continue</Text>
                    }
                </TouchableOpacity>

                {/* Footer Links */}
                <View style={styles.footerLinks}>
                    <TouchableOpacity onPress={handleRestore} disabled={purchasing} accessibilityLabel="Restore purchases" accessibilityRole="button">
                        <Text style={styles.footerLink}>Restore</Text>
                    </TouchableOpacity>
                    <Text style={styles.footerDot}>·</Text>
                    <TouchableOpacity>
                        <Text style={styles.footerLink}>Terms</Text>
                    </TouchableOpacity>
                    <Text style={styles.footerDot}>·</Text>
                    <TouchableOpacity>
                        <Text style={styles.footerLink}>Privacy Policy</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
};

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
        marginBottom: 28,
        color: BLACK,
    },
    featureList: {
        gap: 16,
        marginBottom: 32,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    featureIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    featureText: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 16,
        fontFamily: 'Inter-Bold',
        marginBottom: 1,
        color: BLACK,
    },
    featureDesc: {
        fontSize: 13,
        fontFamily: 'Inter-Bold',
        color: '#666',
    },
    planSection: {
        gap: 12,
        marginBottom: 12,
    },
    planCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 18,
        paddingHorizontal: 16,
        borderRadius: 14,
        position: 'relative',
        gap: 12,
        backgroundColor: WHITE,
        elevation: 4,
        shadowColor: BLACK,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
    },
    planCardSelected: {
        backgroundColor: '#FFFBE6',
        elevation: 8,
        shadowOpacity: 0.15,
        shadowRadius: 10,
    },
    bestOfferBadge: {
        position: 'absolute',
        top: -10,
        left: 16,
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: BLACK,
    },
    bestOfferText: {
        color: YELLOW,
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.8,
    },
    checkCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#F0F0F0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkCircleSelected: {
        backgroundColor: YELLOW,
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
    billingNote: {
        textAlign: 'center',
        fontSize: 13,
        fontFamily: 'Inter-Bold',
        marginBottom: 20,
        color: '#888',
    },
    ctaButton: {
        paddingVertical: 18,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        backgroundColor: YELLOW,
        elevation: 6,
        shadowColor: BLACK,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    ctaText: {
        fontSize: 20,
        fontFamily: 'Inter-Bold',
        color: BLACK,
        letterSpacing: 0.3,
    },
    footerLinks: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    footerLink: {
        fontSize: 13,
        fontFamily: 'Inter-Bold',
        color: '#888',
    },
    footerDot: {
        fontSize: 13,
        color: '#CCC',
    },
});
