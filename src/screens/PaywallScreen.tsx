import React, { useState } from 'react';
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
import { useTheme } from '../context/ThemeContext';
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
const CheckCircle: React.FC<{ selected: boolean; color: string }> = ({ selected, color }) => (
    <View style={[styles.checkCircle, { borderColor: selected ? color : '#D1D5DB', backgroundColor: selected ? color : 'transparent' }]}>
        {selected && (
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                <Path d="M20 6L9 17l-5-5" stroke="#FFF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
        )}
    </View>
);

export const PaywallScreen = () => {
    const { theme, isDark } = useTheme();
    const { colors } = theme;
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Paywall'>>();
    const { packages, purchasePackage, restorePurchases, isLoading } = usePurchase();
    const [purchasing, setPurchasing] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<'annual' | 'weekly'>('annual');

    const handlePurchase = async (pkg: PurchasesPackage) => {
        setPurchasing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            const success = await purchasePackage(pkg);
            if (success) {
                navigation.goBack();
            }
        } catch (e) {
            Alert.alert('Error', 'Purchase failed. Please try again.');
        } finally {
            setPurchasing(false);
        }
    };

    const handleRestore = async () => {
        setPurchasing(true);
        try {
            await restorePurchases();
        } finally {
            setPurchasing(false);
        }
    };

    if (isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    const displayPackages = packages.length > 0 ? packages : [
        {
            identifier: 'monthly',
            product: { identifier: 'w', priceString: '$7.99', title: 'Weekly', description: '' },
            packageType: 'MONTHLY'
        },
        {
            identifier: 'annual',
            product: { identifier: 'y', priceString: '$70.99', title: 'Yearly', description: '' },
            packageType: 'ANNUAL'
        }
    ] as PurchasesPackage[];

    const annualPkg = displayPackages.find(p => p.packageType === 'ANNUAL');
    const weeklyPkg = displayPackages.find(p => p.packageType === 'MONTHLY');

    const annualPrice = annualPkg?.product.priceString || '$70.99';
    const weeklyPrice = weeklyPkg?.product.priceString || '$7.99';

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Close Button */}
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
                    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                        <Path d="M18 6L6 18M6 6l12 12" stroke={colors.onSurface + '50'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
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
                <Text style={[styles.title, { color: colors.onSurface }]}>
                    Unlock All Features
                </Text>

                {/* Feature List */}
                <View style={styles.featureList}>
                    {FEATURES.map((f, i) => (
                        <View key={i} style={styles.featureRow}>
                            <FeatureIcon color={f.color} />
                            <View style={styles.featureText}>
                                <Text style={[styles.featureTitle, { color: colors.onSurface }]}>{f.title}</Text>
                                <Text style={[styles.featureDesc, { color: colors.onSurface + '70' }]}>{f.desc}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Plan Selection */}
                <View style={styles.planSection}>
                    {/* Annual */}
                    <TouchableOpacity
                        style={[
                            styles.planCard,
                            {
                                borderColor: selectedPlan === 'annual' ? colors.primary : (isDark ? '#333' : '#E5E7EB'),
                                backgroundColor: selectedPlan === 'annual'
                                    ? (isDark ? colors.primary + '15' : colors.primary + '08')
                                    : (isDark ? '#1A1A1A' : '#FAFAFA'),
                                borderWidth: selectedPlan === 'annual' ? 2 : 1,
                            }
                        ]}
                        onPress={() => setSelectedPlan('annual')}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.bestOfferBadge, { backgroundColor: colors.primary }]}>
                            <Text style={styles.bestOfferText}>BEST OFFER</Text>
                        </View>
                        <CheckCircle selected={selectedPlan === 'annual'} color={colors.primary} />
                        <View style={styles.planInfo}>
                            <Text style={[styles.planName, { color: colors.onSurface }]}>Annual</Text>
                            <Text style={[styles.planPriceMain, { color: colors.onSurface }]}>
                                {annualPrice}<Text style={[styles.planPeriod, { color: colors.onSurface + '60' }]}>/year</Text>
                            </Text>
                        </View>
                        <Text style={[styles.planWeekly, { color: colors.onSurface + '60' }]}>
                            $1.37/week
                        </Text>
                    </TouchableOpacity>

                    {/* Weekly */}
                    <TouchableOpacity
                        style={[
                            styles.planCard,
                            {
                                borderColor: selectedPlan === 'weekly' ? colors.primary : (isDark ? '#333' : '#E5E7EB'),
                                backgroundColor: selectedPlan === 'weekly'
                                    ? (isDark ? colors.primary + '15' : colors.primary + '08')
                                    : (isDark ? '#1A1A1A' : '#FAFAFA'),
                                borderWidth: selectedPlan === 'weekly' ? 2 : 1,
                            }
                        ]}
                        onPress={() => setSelectedPlan('weekly')}
                        activeOpacity={0.8}
                    >
                        <CheckCircle selected={selectedPlan === 'weekly'} color={colors.primary} />
                        <View style={styles.planInfo}>
                            <Text style={[styles.planName, { color: colors.onSurface }]}>Weekly</Text>
                            <Text style={[styles.planPriceMain, { color: colors.onSurface }]}>
                                {weeklyPrice}<Text style={[styles.planPeriod, { color: colors.onSurface + '60' }]}>/week</Text>
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Billing note */}
                <Text style={[styles.billingNote, { color: colors.onSurface + '50' }]}>
                    {selectedPlan === 'annual' ? 'Billed annually. Cancel anytime.' : 'Billed weekly. Cancel anytime.'}
                </Text>

                {/* CTA Button */}
                <TouchableOpacity
                    style={[styles.ctaButton, { backgroundColor: isDark ? '#FFFFFF' : '#1A1D23' }]}
                    onPress={() => {
                        const pkg = selectedPlan === 'annual' ? annualPkg : weeklyPkg;
                        if (pkg) handlePurchase(pkg);
                    }}
                    disabled={purchasing}
                    activeOpacity={0.85}
                >
                    {purchasing ? (
                        <ActivityIndicator size="small" color={isDark ? '#1A1D23' : '#FFFFFF'} />
                    ) : (
                        <Text style={[styles.ctaText, { color: isDark ? '#1A1D23' : '#FFFFFF' }]}>Continue</Text>
                    )}
                </TouchableOpacity>

                {/* Footer Links */}
                <View style={styles.footerLinks}>
                    <TouchableOpacity onPress={handleRestore} disabled={purchasing}>
                        <Text style={[styles.footerLink, { color: colors.onSurface + '50' }]}>Restore</Text>
                    </TouchableOpacity>
                    <Text style={[styles.footerDot, { color: colors.onSurface + '30' }]}>·</Text>
                    <TouchableOpacity>
                        <Text style={[styles.footerLink, { color: colors.onSurface + '50' }]}>Terms</Text>
                    </TouchableOpacity>
                    <Text style={[styles.footerDot, { color: colors.onSurface + '30' }]}>·</Text>
                    <TouchableOpacity>
                        <Text style={[styles.footerLink, { color: colors.onSurface + '50' }]}>Privacy Policy</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
        fontSize: 28,
        fontFamily: 'Caveat-Bold',
        textAlign: 'center',
        marginBottom: 28,
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
        fontFamily: 'Carlito-Bold',
        marginBottom: 1,
    },
    featureDesc: {
        fontSize: 13,
        fontFamily: 'Carlito',
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
    },
    bestOfferBadge: {
        position: 'absolute',
        top: -10,
        left: 16,
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 6,
    },
    bestOfferText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.8,
    },
    checkCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    planInfo: {
        flex: 1,
    },
    planName: {
        fontSize: 16,
        fontFamily: 'Carlito-Bold',
        marginBottom: 2,
    },
    planPriceMain: {
        fontSize: 15,
        fontFamily: 'Carlito-Bold',
    },
    planPeriod: {
        fontSize: 13,
        fontWeight: '400',
    },
    planWeekly: {
        fontSize: 13,
        fontFamily: 'Carlito',
    },
    billingNote: {
        textAlign: 'center',
        fontSize: 13,
        fontFamily: 'Carlito',
        marginBottom: 20,
    },
    ctaButton: {
        paddingVertical: 18,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    ctaText: {
        fontSize: 17,
        fontFamily: 'Carlito-Bold',
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
        fontFamily: 'Carlito',
    },
    footerDot: {
        fontSize: 13,
    },
});
