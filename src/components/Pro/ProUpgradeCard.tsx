import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { BLACK, WHITE } from '../../constants/colors';
import { ProBadge } from './ProBadge';
import { useFeatureAccess } from '../../hooks/useFeatureAccess';
import { FEATURES, type FeatureId } from '../../config/pricing';

export interface ProUpgradeCardProps {
    /** Feature this card promotes. Drives the paywall trigger when tapped. */
    featureId: FeatureId;
    /** Headline. Defaults to "Unlock <feature.label>". */
    title?:    string;
    /** Optional body line under the title. */
    body?:     string;
    /** If true, hides the card when user already has access. Default true. */
    hideWhenAllowed?: boolean;
}

/**
 * Inline upgrade prompt — a tappable card that opens the paywall with the
 * feature's trigger pre-set. Renders nothing for users who already have access.
 *
 * Place this where the user encounters a gated affordance (below a feature, at
 * a limit, in a list of locked options). Stays small and unobtrusive.
 */
export const ProUpgradeCard: React.FC<ProUpgradeCardProps> = ({
    featureId,
    title,
    body,
    hideWhenAllowed = true,
}) => {
    const access  = useFeatureAccess(featureId);
    const feature = FEATURES[featureId];

    if (hideWhenAllowed && access.allowed) return null;

    return (
        <TouchableOpacity
            onPress={access.openUpgrade}
            activeOpacity={0.85}
            style={styles.card}
            accessibilityRole="button"
            accessibilityLabel={`Upgrade to Pro to unlock ${feature.label}`}
        >
            <View style={styles.headerRow}>
                <ProBadge size="sm" />
                <Text style={styles.title}>{title ?? `Unlock ${feature.label}`}</Text>
            </View>
            {body ? <Text style={styles.body}>{body}</Text> : null}
            <View style={styles.ctaRow}>
                <Text style={styles.ctaText}>Upgrade</Text>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                    <Path
                        d="M5 12h14M13 5l7 7-7 7"
                        stroke={BLACK}
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </Svg>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        padding:         14,
        borderRadius:    12,
        borderWidth:     1.5,
        borderColor:     BLACK + '20',
        backgroundColor: WHITE,
        gap:             6,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems:    'center',
        gap:           8,
    },
    title: {
        flex:       1,
        fontSize:   14,
        fontFamily: 'Inter-Bold',
        color:      BLACK,
    },
    body: {
        fontSize:   12,
        fontFamily: 'Inter-Medium',
        color:      BLACK + '70',
        lineHeight: 17,
    },
    ctaRow: {
        flexDirection: 'row',
        alignItems:    'center',
        gap:           4,
        marginTop:     2,
    },
    ctaText: {
        fontSize:   12,
        fontFamily: 'Inter-Bold',
        color:      BLACK,
        letterSpacing: 0.3,
    },
});
