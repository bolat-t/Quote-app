import { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { usePurchase } from '../context/PurchaseContext';
import {
    FEATURES,
    tierUnlocks,
    type FeatureId,
    type TierId,
    type PaywallTriggerId,
} from '../config/pricing';

export interface FeatureAccess {
    /** True if the user fully unlocks this feature (Pro user, or feature is free). */
    allowed:      boolean;
    /** Effective limit to apply right now. Undefined = unlimited. */
    limit:        number | undefined;
    /** What free users get (informational — useful for "Pro unlocks X" copy). */
    freeLimit:    number | undefined;
    /** What Pro users get. */
    proLimit:     number | undefined;
    /** Tier required for full access. */
    requiredTier: TierId;
    /** Trigger to use when opening the paywall from this feature. */
    trigger:      PaywallTriggerId;
    /** Convenience: navigate to the paywall with this feature's trigger. */
    openUpgrade:  () => void;
}

/**
 * Resolve whether the current user has access to a Pro feature, what limit
 * (if any) applies, and a one-call helper to open the paywall.
 *
 * Usage:
 *   const voice = useFeatureAccess('voice_long_recordings');
 *   <VoiceSheet maxSeconds={voice.limit ?? 60} />
 *   if (!voice.allowed) voice.openUpgrade();
 */
export const useFeatureAccess = (featureId: FeatureId): FeatureAccess => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { isPremium } = usePurchase();
    const feature = FEATURES[featureId];

    const userTier: TierId = isPremium ? 'pro' : 'free';
    const allowed = tierUnlocks(userTier, feature.requiredTier);
    const limit   = allowed ? feature.proLimit : feature.freeLimit;

    const openUpgrade = useCallback(() => {
        navigation.navigate('Paywall', { trigger: feature.trigger });
    }, [navigation, feature.trigger]);

    return useMemo(() => ({
        allowed,
        limit,
        freeLimit:    feature.freeLimit,
        proLimit:     feature.proLimit,
        requiredTier: feature.requiredTier,
        trigger:      feature.trigger,
        openUpgrade,
    }), [allowed, limit, feature, openUpgrade]);
};
