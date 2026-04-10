import { LevelTier, XPAction } from '../types';

// XP rewards per action
export const XP_REWARDS: Record<XPAction, number> = {
    openApp: 10,
    readQuote: 15,
    completeHunt: 25,
    drawReflection: 20,
    writeReflection: 30,
    saveCanvas: 20,
    shareReflection: 10,
    streak7Day: 50,
    streak30Day: 200,
};

export const PAPER_TYPES = {
    plain:     { id: 'plain',     name: 'Plain White',    levelRequired: 1, color: '#FFFFFF' },
    cream:     { id: 'cream',     name: 'Warm Cream',     levelRequired: 2, color: '#F5E6D3' },
    grid:      { id: 'grid',      name: 'Math Grid',      levelRequired: 3, type: 'pattern', pattern: 'grid' },
    dots:      { id: 'dots',      name: 'Bullet Dots',    levelRequired: 3, type: 'pattern', pattern: 'dots' },
    lined:     { id: 'lined',     name: 'Lined Paper',    levelRequired: 4, type: 'pattern', pattern: 'lines' },
    dark:      { id: 'dark',      name: 'Midnight',       levelRequired: 4, color: '#1A1D23', textColor: '#FFFFFF' },
    starry:    { id: 'starry',    name: 'Starry Night',   levelRequired: 5, type: 'pattern', pattern: 'stars', color: '#0F172A', textColor: '#E2E8F0' },
    parchment: { id: 'parchment', name: 'Ancient Scroll', levelRequired: 5, color: '#F0E6D2', textColor: '#5C4033' },
};

// Level tiers — 9 levels
export const LEVEL_TIERS: LevelTier[] = [
    { level: 1, title: 'Raw Spud',        xpRequired: 0    },
    { level: 2, title: 'Muddy Potato',    xpRequired: 100  },
    { level: 3, title: 'Sprouting Spud',  xpRequired: 300  },
    { level: 4, title: 'Speaking Potato', xpRequired: 600  },
    { level: 5, title: 'Happy Potato',    xpRequired: 1000 },
    { level: 6, title: 'Glowing Spud',    xpRequired: 1500 },
    { level: 7, title: 'Wise Potato',     xpRequired: 2200 },
    { level: 8, title: 'Radiant Spud',    xpRequired: 3000 },
    { level: 9, title: 'Enlightened Potato', xpRequired: 4000 },
];

// Get level tier for a given XP amount
export const getLevelForXP = (xp: number): LevelTier => {
    let currentTier = LEVEL_TIERS[0];
    for (const tier of LEVEL_TIERS) {
        if (xp >= tier.xpRequired) {
            currentTier = tier;
        } else {
            break;
        }
    }
    return currentTier;
};

// Get XP progress towards next level
export const getXPProgress = (xp: number): {
    currentLevel: LevelTier;
    nextLevel: LevelTier | null;
    xpInCurrentLevel: number;
    xpNeededForNext: number;
    percentage: number;
} => {
    const currentLevel = getLevelForXP(xp);
    const currentIndex = LEVEL_TIERS.findIndex(t => t.level === currentLevel.level);
    const nextLevel = currentIndex < LEVEL_TIERS.length - 1 ? LEVEL_TIERS[currentIndex + 1] : null;

    if (!nextLevel) {
        return { currentLevel, nextLevel: null, xpInCurrentLevel: 0, xpNeededForNext: 0, percentage: 1 };
    }

    const xpInCurrentLevel = xp - currentLevel.xpRequired;
    const xpNeededForNext = nextLevel.xpRequired - currentLevel.xpRequired;
    const percentage = xpInCurrentLevel / xpNeededForNext;

    return { currentLevel, nextLevel, xpInCurrentLevel, xpNeededForNext, percentage };
};
