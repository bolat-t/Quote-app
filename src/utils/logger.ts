/**
 * Production-safe logger.
 *
 * In dev (`__DEV__` is true) every level prints to the JS console.
 * In a release build only `error` is emitted — `log` and `warn` become no-ops
 * so verbose dev output never reaches the user's device.
 *
 * Errors are also forwarded to PostHog so we can see them in production.
 *
 * Usage:
 *   import { logger } from '../utils/logger';
 *   logger.log('[Hub] streak loaded', streak);
 *   logger.warn('[Storage] retry');
 *   logger.error('[Hub] loadData failed', err);
 *
 * Always prefix messages with a tag in square brackets so logs are greppable.
 */
import { trackEvent } from '../lib/analytics';

const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : true;

type Args = unknown[];

export const logger = {
    log: (...args: Args) => {
        if (isDev) {
            // eslint-disable-next-line no-console
            console.log(...args);
        }
    },

    warn: (...args: Args) => {
        if (isDev) {
            // eslint-disable-next-line no-console
            console.warn(...args);
        }
    },

    error: (...args: Args) => {
        // eslint-disable-next-line no-console
        console.error(...args);
        // Best-effort telemetry — don't let analytics failures swallow the original error.
        try {
            const message = args
                .map(a => (a instanceof Error ? a.message : typeof a === 'string' ? a : ''))
                .filter(Boolean)
                .join(' ');
            trackEvent('client_error', { message: message.slice(0, 200) });
        } catch {
            // ignore
        }
    },
};
