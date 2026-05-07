/**
 * pricing.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * SINGLE EDIT-HERE FILE for the entire pricing & paywall stack.
 *
 * Edit this file to change:
 *   • Plans (monthly / annual / lifetime, prices, trial length)
 *   • Tiers (Free / Pro / Studio) and what each unlocks
 *   • Gift offer (% off, window, copy)
 *   • Paywall copy (titles, CTAs, billing notes)
 *   • Paywall triggers (where in the app a paywall fires + headline shown)
 *
 * Nothing else hard-codes prices or feature lists. PaywallScreen, PurchaseContext
 * mock packages, and any feature-gate trigger all read from here.
 *
 * Adding a plan: append to PLANS. Adding a feature: append to TIERS.<tier>.features.
 * Adding a paywall trigger: append to PAYWALL_TRIGGERS, then call
 *   navigation.navigate('Paywall', { trigger: 'your_id' }) wherever it fires.
 *
 * Real prices come from the App Store / Play Console via RevenueCat at runtime;
 * the priceString here is the fallback shown in dev / Expo Go.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Tier IDs ─────────────────────────────────────────────────────────────────
// Add a new tier (e.g. 'studio') by extending this union and TIERS below.
export type TierId = 'free' | 'pro';

// ── Plan IDs (billing periods) ───────────────────────────────────────────────
// Add a new plan (e.g. 'lifetime') by extending this union, appending to PLANS,
// and configuring the matching App Store / RevenueCat product.
export type PlanId = 'monthly' | 'annual';

// RevenueCat package types — must match what RC returns for offerings.
export type RCPackageType = 'MONTHLY' | 'ANNUAL' | 'LIFETIME' | 'CUSTOM';

// ── Plans ────────────────────────────────────────────────────────────────────

export interface PricingPlan {
    id:             PlanId;
    /** Tier this plan unlocks. */
    tier:           TierId;
    /** RevenueCat packageType — used to map App Store offerings. */
    rcPackageType:  RCPackageType;
    /** App Store / Play Console product id. Keep stable; changing breaks restores. */
    rcProductId:    string;
    /** Card label. */
    displayName:    string;
    /** USD price — single source of truth. priceString is derived. */
    priceUSD:       number;
    /** Display string. Locale formatting (RC) overrides this at runtime. */
    priceString:    string;
    /** "/yr", "/mo", "" (lifetime). */
    periodSuffix:   string;
    /** 0 = no trial. Currently only used for annual. */
    trialDays:      number;
    /** Show "MOST POPULAR" pill on this plan card. Exactly one plan should set this. */
    isHighlighted?: boolean;
    /** Pre-selected when paywall opens (unless trigger overrides). Exactly one. */
    isDefault?:     boolean;
}

// Trial is wired in code (paywall renders a "DAYS FREE" pill + adjusts CTA when
// trialDays > 0) but disabled at launch — App Store / RC trial config required.
// To enable: set trialDays on a plan and configure the matching offer in RC.
export const PLANS: PricingPlan[] = [
    {
        id:            'monthly',
        tier:          'pro',
        rcPackageType: 'MONTHLY',
        rcProductId:   'ulbo_pro_monthly',
        displayName:   'Monthly',
        priceUSD:      7.99,
        priceString:   '$7.99',
        periodSuffix:  '/mo',
        trialDays:     0,
    },
    {
        id:            'annual',
        tier:          'pro',
        rcPackageType: 'ANNUAL',
        rcProductId:   'ulbo_pro_annual',
        displayName:   'Annual',
        priceUSD:      39.99,
        priceString:   '$39.99',
        periodSuffix:  '/yr',
        trialDays:     0,
        isHighlighted: true,
        isDefault:     true,
    },
];

// ── Tiers ────────────────────────────────────────────────────────────────────

export interface PricingFeature {
    title: string;
    desc:  string;
}

export interface PricingTier {
    id:        TierId;
    name:      string;
    tagline:   string;
    /** Features displayed on the paywall for this tier. */
    features:  PricingFeature[];
}

export const TIERS: Record<TierId, PricingTier> = {
    free: {
        id:      'free',
        name:    'Free',
        tagline: 'Daily practice',
        // Free-tier feature gates aren't enforced in code yet — these are
        // marketing-only until the paid features below are actually behind a flag.
        features: [
            { title: 'Daily reflection',      desc: 'Emotion + 3 things + reflect' },
            { title: 'Daily quote + AI chat', desc: 'A few messages a day' },
            { title: 'Streak & levels',       desc: 'Track your practice' },
        ],
    },
    pro: {
        id:      'pro',
        name:    'Ulbo Pro',
        tagline: 'Go deeper, every day',
        features: [
            { title: 'Deeper Reflections', desc: 'Unlock guided prompts & themes' },
            { title: 'AI Insights',        desc: 'Smart mood analysis & patterns' },
            { title: 'Evolving Journal',   desc: 'Custom backgrounds & fonts' },
            { title: 'Mood Dashboard',     desc: 'Track your emotional journey' },
            { title: 'Longer Recordings',  desc: 'Unlimited voice reflections' },
            { title: 'Weekly Summaries',   desc: 'AI-powered weekly insights' },
        ],
    },
};

// ── Gift offer ───────────────────────────────────────────────────────────────
// Triggered post-onboarding (signed-promise → Paywall with offer='first_promise_gift').
// Lowering discountPct below 25 makes the gift feel weak; raising above 50 erodes LTV.

export const GIFT_OFFER = {
    enabled:          true,
    discountPct:      40,
    windowHours:      24,
    /** Which plan the gift applies to. Other plans ignore the discount. */
    appliesToPlanId: 'annual' as PlanId,
    copy: {
        eyebrow:         'Your first-promise gift.',
        body:            "You showed up. You signed it. Here's something to help you keep it.",
        countdownPrefix: 'Ends in',
        savingsLabel:    'One-time first-promise gift',
    },
} as const;

// ── Paywall copy ─────────────────────────────────────────────────────────────

export const PAYWALL_COPY = {
    /** Default headline when no trigger overrides. */
    defaultTitle: 'Unlock All Features',
    /** Used when a gift is active. {pct} → discount %. */
    giftTitleTemplate: '{pct}% off your first year',
    /** CTA text per plan-state. The withTrial branch only fires if a plan has
     *  trialDays > 0 — currently dormant, ready when App Store trial is configured. */
    cta: {
        default:   'Continue',
        withTrial: 'Start {trialDays}-day free trial',
    },
    /** Billing note shown under the plan cards. */
    billingNote: {
        monthly:         'Billed monthly. Cancel anytime.',
        annual:          'Billed annually. Cancel anytime.',
        annualWithTrial: '{trialDays} days free, then {priceString}/yr. Cancel anytime.',
    },
    footerLinks: {
        restore: 'Restore',
        terms:   'Terms',
        privacy: 'Privacy Policy',
    },
} as const;

// ── Paywall triggers ─────────────────────────────────────────────────────────
// Each entry defines what the paywall says when opened from a specific moment.
// Add a new trigger by appending an entry, then calling:
//   navigation.navigate('Paywall', { trigger: 'your_trigger_id' })

export type PaywallTriggerId =
    | 'onboarding_complete'
    | 'voice_length_cap'
    | 'ai_insight_preview'
    | 'streak_milestone'
    | 'history_age_cap'
    | 'level_cap'
    | 'weekly_summary_unlock'
    | 'theme_locked'
    | 'settings_upgrade';

export interface PaywallTrigger {
    id:             PaywallTriggerId;
    /** Headline shown when paywall opens via this trigger. Overrides default. */
    title?:         string;
    /** Optional sub-headline / contextual line. */
    body?:          string;
    /** Plan to pre-select on arrival. Falls back to PLANS' isDefault. */
    highlightPlan?: PlanId;
}

export const PAYWALL_TRIGGERS: Record<PaywallTriggerId, PaywallTrigger> = {
    onboarding_complete: {
        id:            'onboarding_complete',
        title:         'Unlock Ulbo Pro',
        highlightPlan: 'annual',
    },
    voice_length_cap: {
        id:            'voice_length_cap',
        title:         'Keep recording',
        body:          'Pro unlocks 10-minute voice reflections.',
        highlightPlan: 'annual',
    },
    ai_insight_preview: {
        id:            'ai_insight_preview',
        title:         'See what Ulbo noticed',
        body:          'Unlock AI Insights to read patterns in your reflections.',
        highlightPlan: 'annual',
    },
    streak_milestone: {
        id:            'streak_milestone',
        title:         'Your streak is growing',
        body:          'Level up your practice with Pro.',
        highlightPlan: 'annual',
    },
    history_age_cap: {
        id:            'history_age_cap',
        title:         'Your full story',
        body:          'Pro unlocks your complete journal history.',
        highlightPlan: 'annual',
    },
    level_cap: {
        id:            'level_cap',
        title:         'Level 5 reached',
        body:          'Unlock Levels 6–9 and watch your potato grow.',
        highlightPlan: 'annual',
    },
    weekly_summary_unlock: {
        id:            'weekly_summary_unlock',
        title:         'Your week, summarized',
        body:          'Pro delivers an AI-written weekly summary every Sunday.',
        highlightPlan: 'annual',
    },
    theme_locked: {
        id:            'theme_locked',
        title:         'Make Ulbo yours',
        body:          'Pro unlocks every theme, font, and background.',
        highlightPlan: 'annual',
    },
    settings_upgrade: {
        id:            'settings_upgrade',
        title:         'Unlock Ulbo Pro',
        highlightPlan: 'annual',
    },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

export const getPlan = (id: PlanId): PricingPlan | undefined =>
    PLANS.find(p => p.id === id);

export const getDefaultPlan = (): PricingPlan =>
    PLANS.find(p => p.isDefault) ?? PLANS[0];

export const getTier = (id: TierId): PricingTier => TIERS[id];

/** Apply gift discount to a USD price. Caller decides whether the gift is active. */
export const applyGiftDiscount = (priceUSD: number): number =>
    priceUSD * (1 - GIFT_OFFER.discountPct / 100);

/** Format a USD number into a "$X.XX" string. Currency symbol is hard-coded —
 *  RC's localized priceString supersedes this in production. */
export const formatUSD = (n: number): string => `$${n.toFixed(2)}`;

/** Per-week derivation from any annual price (marketing line). */
export const weeklyEquivalent = (annualUSD: number): string =>
    `${formatUSD(annualUSD / 52)}/wk`;

/** Per-month derivation from any annual price (marketing line). */
export const monthlyEquivalent = (annualUSD: number): string =>
    `${formatUSD(annualUSD / 12)}/mo`;

/** % saved by paying annual instead of 12× monthly. Rounds to nearest int. */
export const annualSavingsPct = (annualUSD: number, monthlyUSD: number): number => {
    const fullYear = monthlyUSD * 12;
    if (fullYear <= 0) return 0;
    return Math.round(((fullYear - annualUSD) / fullYear) * 100);
};

/** Lightweight {token} replacer for paywall copy templates. */
export const interpolatePaywall = (
    template: string,
    ctx: { pct?: number | string; trialDays?: number | string; priceString?: string },
): string =>
    template
        .replace(/\{pct\}/g,         String(ctx.pct ?? GIFT_OFFER.discountPct))
        .replace(/\{trialDays\}/g,   String(ctx.trialDays ?? ''))
        .replace(/\{priceString\}/g, String(ctx.priceString ?? ''));
