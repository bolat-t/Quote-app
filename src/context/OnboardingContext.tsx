/**
 * OnboardingContext — shared state for the inline first-run flow.
 *
 * Why a context: three components need to coordinate during onboarding:
 *   • HubScreen     — owns whether the overlay is rendered in its content area.
 *   • AppHeader     — renders the progress pill inside its title card when active.
 *   • BottomTabsInner (App.tsx) — hides the bottom TabBar while active.
 *
 * Rather than threading props through three separate ancestors, we lift the
 * state once to a tiny provider and let each consumer subscribe to the bits it
 * needs.
 *
 * Surface:
 *   isActive  — onboarding overlay is currently visible
 *   progress  — fraction in [0..1] for the header progress pill
 *   setActive — toggle from HubScreen.checkOnboarding / handleOnboardingComplete
 *   setProgress — called from OnboardingModal whenever the active slide changes
 */
import React, { createContext, useContext, useMemo, useState } from 'react';

interface OnboardingState {
    isActive:    boolean;
    progress:    number;                      // 0..1
    setActive:   (v: boolean) => void;
    setProgress: (p: number) => void;
}

const OnboardingContext = createContext<OnboardingState>({
    isActive:    false,
    progress:    0,
    setActive:   () => {},
    setProgress: () => {},
});

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isActive, setIsActive]   = useState(false);
    const [progress, setProgressInternal] = useState(0);

    const value = useMemo<OnboardingState>(() => ({
        isActive,
        progress,
        setActive:   setIsActive,
        // Clamp + reset to 0 when the flow ends so the header pill doesn't
        // briefly show a leftover fill on the next first-run launch.
        setProgress: (p) => setProgressInternal(Math.max(0, Math.min(1, p))),
    }), [isActive, progress]);

    return (
        <OnboardingContext.Provider value={value}>
            {children}
        </OnboardingContext.Provider>
    );
};

export const useOnboarding = (): OnboardingState => useContext(OnboardingContext);
