import PostHog from 'posthog-react-native';

// PostHog Cloud — free tier (1M events/mo)
const POSTHOG_API_KEY = 'phc_FNZu0fAm6A1ohvq9uTtFKeOUXTD2gDBBGP0Uipwsw5O';
const POSTHOG_HOST = 'https://us.i.posthog.com';

let posthogClient: PostHog | null = null;

/**
 * Initialize PostHog. Call once at app startup.
 */
export const initAnalytics = async (): Promise<PostHog> => {
    if (posthogClient) return posthogClient;

    posthogClient = new PostHog(POSTHOG_API_KEY, {
        host: POSTHOG_HOST,
        // Autocapture: app lifecycle, screen views
        enableSessionReplay: false,
    });

    return posthogClient;
};

/**
 * Get the PostHog client instance.
 */
export const getAnalytics = (): PostHog | null => posthogClient;

// ─── Typed Event Names ────────────────────────────────────────────

export type AnalyticsEvent =
    | 'app_opened'
    | 'quote_viewed'
    | 'reflection_written'
    | 'canvas_saved'
    | 'canvas_shared'
    | 'hunt_completed'
    | 'hunt_entry_added'
    | 'level_up'
    | 'tab_switched'
    | 'paywall_viewed'
    | 'purchase_completed'
    | 'feedback_submitted'
    | 'journal_entry_viewed'
    | 'onboarding_completed'
    | 'sign_in'
    | 'sign_up'
    | 'client_error';

/**
 * Track a typed analytics event.
 */
export const trackEvent = (
    event: AnalyticsEvent,
    properties?: Record<string, any>
): void => {
    if (!posthogClient) return;
    posthogClient.capture(event, properties);
};

/**
 * Identify a user after authentication.
 */
export const identifyUser = (
    userId: string,
    traits?: Record<string, any>
): void => {
    if (!posthogClient) return;
    posthogClient.identify(userId, traits);
};

/**
 * Set persistent user properties (level, premium status, etc.)
 */
export const setUserProperties = (
    properties: Record<string, any>
): void => {
    if (!posthogClient) return;
    posthogClient.capture('$set', { $set: properties });
};

/**
 * Reset analytics on sign out.
 */
export const resetAnalytics = (): void => {
    if (!posthogClient) return;
    posthogClient.reset();
};

/**
 * Flush pending events. Call on app background.
 */
export const flushAnalytics = (): void => {
    if (!posthogClient) return;
    posthogClient.flush();
};
