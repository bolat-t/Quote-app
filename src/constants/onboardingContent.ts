/**
 * onboardingContent.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * SINGLE EDIT-HERE FILE for every word the user reads during onboarding.
 *
 * To change a question, an option, the welcome line, the contract text, or the
 * gift discount: edit it here. The OnboardingModal renders directly from this
 * object — there is no other source of truth.
 *
 * Order of slides is controlled by SLIDE_ORDER at the bottom. Re-arranging the
 * array re-arranges the flow.
 *
 * Notes on placeholders inside templates:
 *   {name}            → the user-typed name (or "you" if blank)
 *   {intentSummary}   → joined summary of selected intents (e.g. "calm and growth")
 *   {date30}          → today + 30 days, e.g. "June 2"
 *   {projectionDays}  → ONBOARDING_TUNABLES.projectionDays (default 30)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Tunables a non-engineer might want to tweak ──────────────────────────────
//
// Pricing-related tunables (gift discount %, gift window) live in
// src/config/pricing.ts — keep all monetization config in one file.

export const ONBOARDING_TUNABLES = {
    /** Projection horizon in days. Used in the personalized plan + outcome promise. */
    projectionDays:   30,
    /** Default reminder time if user opts in on the notification slide (24-hour). */
    notifyHour:       19,   // 7 PM
    notifyMinute:     0,
    /** Social-proof number shown on the two break slides. Bump as we grow. */
    socialProofUserCount: 23762,
};

// ── Slide IDs (one per screen in the flow) ───────────────────────────────────

export type SlideId =
    | 'welcome'
    | 'outcomePromise'
    | 'intent'
    | 'moodNow'
    | 'frequency'
    | 'socialProof1'
    | 'area'
    | 'stakes'
    | 'name'
    | 'plan'
    | 'notification'
    | 'journalTaste'
    | 'socialProof2'
    | 'promise';
//  Paywall is a separate screen, not a slide — see PaywallScreen.tsx.

// ── Per-slide content ────────────────────────────────────────────────────────

export const ONBOARDING_CONTENT = {

    // 1 — Welcome / congratulation. Ulbo speaks.
    welcome: {
        title: 'You made it here.',
        body:  "Most people don't.\nThat already matters.",
        cta:   'Begin',
    },

    // 2 — Outcome promise. Future-Self voice. Replaces the old feature list.
    outcomePromise: {
        title: "In 30 days, you'll have written over 100 reflections.",
        body:  "You'll have met your past self on the page.\nYou'll know what your inner voice actually sounds like, not the noise around it.\n\nLet's get you there.",
        cta:   'Continue',
    },

    // 3 — Intent. Multi-select. Drives the {intentSummary} interpolation later.
    intent: {
        question: 'What brought you here?',
        sub:      "Pick everything that fits. There's no wrong answer.",
        options: [
            { id: 'less_anxious', label: 'I want to feel less anxious', summary: 'calm'      },
            { id: 'be_grateful',  label: 'I want to be more grateful',  summary: 'gratitude' },
            { id: 'think_clear',  label: 'I want to think more clearly',summary: 'clarity'   },
            { id: 'sleep_better', label: 'I want to sleep better',      summary: 'rest'      },
            { id: 'grow',         label: 'I want to grow',              summary: 'growth'    },
            { id: 'just_looking', label: "I'm just looking around",     summary: 'curiosity' },
        ] as const,
        cta: 'Continue',
    },

    // 4 — Mood right now. First product touch — uses the same 4-emotion picker
    //     + free-text input as the Journal tab so the muscle memory transfers.
    moodNow: {
        question:        'Before we go further, how are you, right now?',
        sub:             'No need to be brave about it.',
        notePlaceholder: "What's on your mind?",
        cta:             'Continue',
    },

    // 5 — Frequency (soft pain).
    frequency: {
        question: 'How often does do you question your own decisions?',
        options: [
            { id: 'rarely',    label: 'Almost never' },
            { id: 'sometimes', label: 'Some weeks'   },
            { id: 'often',     label: 'Most days'    },
            { id: 'constant',  label: 'Constantly'   },
        ] as const,
        cta: 'Continue',
    },

    // 6 — Social proof break #1.
    socialProof1: {
        title: "You're not alone in this.",
        body:  '{userCount} people opened Ulbo this week.',
        testimonial: {
            text:    '"I started Ulbo when I was burning out. The reflections gave me back twenty quiet minutes a day."',
            byline:  '- Mira, 1-year user',
        },
        cta: 'Continue',
    },

    // 7 — Area of life off-balance.
    area: {
        question: 'Where in your life does it feel most off-balance?',
        options: [
            { id: 'work',     label: 'Work'         },
            { id: 'rels',     label: 'Relationships'},
            { id: 'body',     label: 'Body'         },
            { id: 'mind',     label: 'Mind'         },
            { id: 'purpose',  label: 'Purpose'      },
        ] as const,
        cta: 'Continue',
    },

    // 8 — Stakes. The gut-punch question, last by design (sunk-cost ladder).
    stakes: {
        question: 'One more.',
        sub:      'If a year from now, nothing has changed, same noise, same feeling, same loop, how would that sit with you?',
        options: [
            { id: 'fine',         label: "I'd be fine"             },
            { id: 'tired',        label: "I'd be tired"            },
            { id: 'regret',       label: "I'd regret it"           },
            { id: 'find_out',     label: "I don't want to find out"},
        ] as const,
        cta: 'Continue',
    },

    // 9 — Name.
    name: {
        question:    'What should I call you?',
        placeholder: 'Your name...',
        cta:         'Continue',
    },

    // 10 — Personalized plan. The {…} tokens are interpolated at render time.
    plan: {
        title:   "{name} — here's your Ulbo plan.",
        intro:   'Built from what you told me:',
        bullets: [
            'Your first reflections will focus on {intentSummary}',
            "One small action a day — that's all",
            'By {date30}, you\'ll have 30 reflections in your journal',
            'Your potato will grow from Raw Spud to Sprouting Potato',
        ],
        cta: "Let's begin",
    },

    // 11 — Notification prime. Custom screen *before* the OS prompt.
    notification: {
        title:        'One small thing.',
        body:         'Can I check in with you once a day? A short nudge.',
        timeLine:     '7:00 PM sounds good?',
        previewTitle: 'ulbo.',
        previewBody:  "take two minutes. just for you. i'll be here.",
        ctaYes:       'Yes, nudge me',
        ctaNo:        'Maybe later',
    },

    // 12 — Aha taste. Real journal entry. Persists into today's hunt and uses
    //      the exact same gratitude UI as the Journal tab (HuntScreen Step 1).
    journalTaste: {
        title:        "Let's start with one.",
        headerLabel:  "TODAY'S GRATITUDE",
        placeholders: [
            'Something good today...',
            'Something your happy about...',
            'What makes you smile...',
        ],
        cta:         'Save my first reflection',
        skipLabel:   "I'll do this later",
    },

    // 13 — Social proof break #2.
    socialProof2: {
        title:       'You just did the thing most people put off forever.',
        body:        '{name}, you\'re now one of the {userCount} reflecting this week.',
        testimonial: {
            text:    '"After my first entry I sat there a little surprised. It was lighter than I thought."',
            byline:  '— Sam, new user',
        },
        cta: 'Continue',
    },

    // 14 — Signed promise. Contract text uses {name} + {intentSummary}.
    promise: {
        title: 'Our promise',
        sub:   'Sign below to commit to your practice.',
        contractTemplate:
            '"{name}, I promise to show up for myself.\n' +
            'One reflection a day. That\'s enough.\n' +
            'I\'ll show up for {intentSummary}.\n' +
            'I\'ll show up for Ulbo, and Ulbo will show up for me."',
        signaturePlaceholder: 'Sign here',
        clearLabel:           'Clear',
        cta:                  'Sign and begin',
    },

    // Paywall gift copy lives in src/config/pricing.ts (GIFT_OFFER.copy).

} as const;

// ── Order of slides. Re-arranging this re-arranges the flow. ─────────────────

export const SLIDE_ORDER: SlideId[] = [
    'welcome',
    'outcomePromise',
    'intent',
    'moodNow',
    'frequency',
    'socialProof1',
    'area',
    'stakes',
    'name',
    'plan',
    'notification',
    'journalTaste',
    'socialProof2',
    'promise',
];

// ── Helpers used by the modal to interpolate templates ───────────────────────

/** Turns a list of intent ids into a friendly clause:
 *    ['less_anxious']                 → "calm"
 *    ['less_anxious','grow']          → "calm and growth"
 *    ['less_anxious','grow','rest']   → "calm, growth, and rest"
 *  Falls back to "yourself" when nothing was selected.
 */
export const summarizeIntents = (intentIds: readonly string[]): string => {
    // The `as const` on the options array means each `summary` is a narrow
    // string-literal union; we collect them as plain strings for join'ing.
    const summaries: string[] = [];
    for (const id of intentIds) {
        const opt = ONBOARDING_CONTENT.intent.options.find(o => o.id === id);
        if (opt) summaries.push(opt.summary);
    }
    if (summaries.length === 0) return 'yourself';
    if (summaries.length === 1) return summaries[0];
    if (summaries.length === 2) return `${summaries[0]} and ${summaries[1]}`;
    return `${summaries.slice(0, -1).join(', ')}, and ${summaries[summaries.length - 1]}`;
};

/** Date N days from today, formatted like "June 2". */
export const projectedDateLabel = (daysFromNow: number): string => {
    const d = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
};

/** Lightweight {token} replacer — supports the four documented placeholders. */
export const interpolate = (
    template: string,
    ctx: { name?: string; intentSummary?: string; date30?: string; userCount?: number | string },
): string => {
    return template
        .replace(/\{name\}/g,            ctx.name || 'you')
        .replace(/\{intentSummary\}/g,   ctx.intentSummary || 'yourself')
        .replace(/\{date30\}/g,          ctx.date30 || projectedDateLabel(ONBOARDING_TUNABLES.projectionDays))
        .replace(/\{projectionDays\}/g,  String(ONBOARDING_TUNABLES.projectionDays))
        .replace(/\{userCount\}/g,       (ctx.userCount ?? ONBOARDING_TUNABLES.socialProofUserCount).toLocaleString());
};
