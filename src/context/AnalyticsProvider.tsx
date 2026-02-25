import React, { useEffect, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
    initAnalytics,
    trackEvent,
    identifyUser,
    resetAnalytics,
    flushAnalytics,
} from '../lib/analytics';
import { useAuth } from './AuthContext';

interface AnalyticsProviderProps {
    children: ReactNode;
}

/**
 * AnalyticsProvider initializes PostHog and auto-identifies users.
 * Wrap this inside AuthProvider so we can read auth state.
 */
export const AnalyticsProvider: React.FC<AnalyticsProviderProps> = ({ children }) => {
    const { user } = useAuth();

    // Initialize PostHog on mount
    useEffect(() => {
        initAnalytics().then(() => {
            trackEvent('app_opened', { source: 'cold_start' });
        });
    }, []);

    // Identify / reset on auth state change
    useEffect(() => {
        if (user) {
            identifyUser(user.id, {
                email: user.email,
                created_at: user.created_at,
            });
        } else {
            resetAnalytics();
        }
    }, [user]);

    // Flush events when app goes to background
    useEffect(() => {
        const handleAppState = (state: AppStateStatus) => {
            if (state === 'background') {
                flushAnalytics();
            }
            if (state === 'active') {
                trackEvent('app_opened', { source: 'resume' });
            }
        };

        const subscription = AppState.addEventListener('change', handleAppState);
        return () => subscription.remove();
    }, []);

    return <>{children}</>;
};
