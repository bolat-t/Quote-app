import { LevelTier, XPAction } from '../types';

// XP rewards per action
export const XP_REWARDS: Record<XPAction, number> = {
    openApp: 5,
    readQuote: 5,
    completeHunt: 25,
    drawReflection: 15,
    writeReflection: 15,
    saveCanvas: 10,
    shareReflection: 10,
    streak7Day: 50,
    streak30Day: 200,
};

export const PAPER_TYPES = {
    plain: { id: 'plain', name: 'Plain White', levelRequired: 1, color: '#FFFFFF' },
    cream: { id: 'cream', name: 'Warm Cream', levelRequired: 2, color: '#F5E6D3' },
    grid: { id: 'grid', name: 'Math Grid', levelRequired: 3, type: 'pattern', pattern: 'grid' },
    dots: { id: 'dots', name: 'Bullet Dots', levelRequired: 4, type: 'pattern', pattern: 'dots' },
    lined: { id: 'lined', name: 'Lined Paper', levelRequired: 5, type: 'pattern', pattern: 'lines' },
    dark: { id: 'dark', name: 'Midnight', levelRequired: 6, color: '#1A1D23', textColor: '#FFFFFF' },
    starry: { id: 'starry', name: 'Starry Night', levelRequired: 7, type: 'pattern', pattern: 'stars', color: '#0F172A', textColor: '#E2E8F0' },
    parchment: { id: 'parchment', name: 'Ancient Scroll', levelRequired: 8, color: '#F0E6D2', textColor: '#5C4033' },
};

// Level tiers — 10 levels from Seedling to Cosmos
export const LEVEL_TIERS: LevelTier[] = [
    { level: 1, title: 'Seedling', xpRequired: 0, unlocks: 'Base app' },
    { level: 2, title: 'Sprout', xpRequired: 100, unlocks: 'Warm Cream Paper' },
    { level: 3, title: 'Sapling', xpRequired: 300, unlocks: 'Grid Paper' },
    { level: 4, title: 'Bloom', xpRequired: 600, unlocks: 'Dot Grid' },
    { level: 5, title: 'Oak', xpRequired: 1000, unlocks: 'Lined Paper' },
    { level: 6, title: 'Sequoia', xpRequired: 1500, unlocks: 'Dark Mode Paper' },
    { level: 7, title: 'Forest', xpRequired: 2500, unlocks: 'Starry Night Theme' },
    { level: 8, title: 'Mountain', xpRequired: 4000, unlocks: 'Parchment' },
    { level: 9, title: 'Sky', xpRequired: 6000, unlocks: 'Community' },
    { level: 10, title: 'Cosmos', xpRequired: 10000, unlocks: 'Everything unlocked' },
];

// Level tier icons (used in UI) — plant/nature emoji for each level
export const LEVEL_ICONS: Record<number, string> = {
    1: '🌱',
    2: '🌿',
    3: '🌳',
    4: '🌸',
    5: '🌲',
    6: '🏔️',
    7: '🌲',
    8: '⛰️',
    9: '☁️',
    10: '✨',
};

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
