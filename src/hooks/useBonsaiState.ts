import { useState, useEffect, useCallback, useRef } from 'react';
import { BonsaiState, BonsaiAnimationTrigger, XPAction } from '../types';
import { BASE_LEAF_COUNT, BASE_BLOSSOM_COUNT } from '../components/bonsai/bonsaiPaths';
import {
    loadBonsaiState,
    saveBonsaiState,
    applyDecay,
    boostHealth,
    waterTree as waterTreeStorage,
} from '../utils/bonsaiStorage';

interface UseBonsaiStateReturn {
    bonsaiState: BonsaiState;
    isLoading: boolean;
    waterTree: () => Promise<void>;
    tendTree: () => void;
    recordAction: (action: XPAction) => Promise<void>;
    syncGrowthStage: (level: number) => Promise<boolean>;
    healthPercentage: number;
    effectiveLeafCount: number;
    effectiveBlossomCount: number;
    isWilting: boolean;
    animationTrigger: BonsaiAnimationTrigger;
    clearTrigger: () => void;
}

const ACTION_TO_TRIGGER: Partial<Record<XPAction, BonsaiAnimationTrigger>> = {
    writeReflection: 'journal',
    drawReflection: 'journal',
    completeHunt: 'hunt',
    saveCanvas: 'canvas',
    readQuote: 'quote',
};

export const useBonsaiState = (): UseBonsaiStateReturn => {
    const [bonsaiState, setBonsaiState] = useState<BonsaiState>({
        health: 100,
        growthStage: 1,
        lastTendedDate: '',
        lastActiveDate: '',
        totalWaterings: 0,
        wateredToday: false,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [animationTrigger, setAnimationTrigger] = useState<BonsaiAnimationTrigger>(null);
    const stateRef = useRef(bonsaiState);

    // Keep ref in sync
    useEffect(() => {
        stateRef.current = bonsaiState;
    }, [bonsaiState]);

    // Load and apply decay on mount
    useEffect(() => {
        const init = async () => {
            const loaded = await loadBonsaiState();
            const decayed = applyDecay(loaded);
            if (decayed.health !== loaded.health) {
                await saveBonsaiState(decayed);
            }
            setBonsaiState(decayed);
            setIsLoading(false);
        };
        init();
    }, []);

    const waterTree = useCallback(async () => {
        const updated = waterTreeStorage(stateRef.current);
        setBonsaiState(updated);
        await saveBonsaiState(updated);
        setAnimationTrigger('water');
    }, []);

    const tendTree = useCallback(() => {
        setAnimationTrigger('tend');
    }, []);

    const recordAction = useCallback(async (action: XPAction) => {
        const updated = boostHealth(stateRef.current, action);
        setBonsaiState(updated);
        await saveBonsaiState(updated);

        const trigger = ACTION_TO_TRIGGER[action];
        if (trigger) {
            setAnimationTrigger(trigger);
        }
    }, []);

    /** Sync growth stage from progression level. Returns true if leveled up. */
    const syncGrowthStage = useCallback(async (level: number): Promise<boolean> => {
        const current = stateRef.current;
        if (level === current.growthStage) return false;

        const updated = { ...current, growthStage: level };
        setBonsaiState(updated);
        await saveBonsaiState(updated);
        setAnimationTrigger('levelUp');
        return true;
    }, []);

    const clearTrigger = useCallback(() => {
        setAnimationTrigger(null);
    }, []);

    // Derived values
    const healthPercentage = bonsaiState.health / 100;
    const stage = bonsaiState.growthStage;
    const baseLeaves = BASE_LEAF_COUNT[stage] || 2;
    const baseBlossoms = BASE_BLOSSOM_COUNT[stage] || 0;

    const effectiveLeafCount = Math.max(1, Math.round(baseLeaves * healthPercentage));
    const effectiveBlossomCount = bonsaiState.health < 60
        ? 0
        : Math.round(baseBlossoms * healthPercentage);

    return {
        bonsaiState,
        isLoading,
        waterTree,
        tendTree,
        recordAction,
        syncGrowthStage,
        healthPercentage,
        effectiveLeafCount,
        effectiveBlossomCount,
        isWilting: bonsaiState.health < 50,
        animationTrigger,
        clearTrigger,
    };
};
