import { getLevelForXP, getXPProgress } from './progressionConfig';

describe('progressionConfig', () => {
    describe('getLevelForXP', () => {
        it('returns Seedling (level 1) for 0 XP', () => {
            const tier = getLevelForXP(0);
            expect(tier.level).toBe(1);
            expect(tier.title).toBe('Seedling');
        });
        it('returns Sprout (level 2) for 100 XP', () => {
            const tier = getLevelForXP(100);
            expect(tier.level).toBe(2);
            expect(tier.title).toBe('Sprout');
        });
        it('returns Cosmos (level 10) for 10000+ XP', () => {
            const tier = getLevelForXP(10000);
            expect(tier.level).toBe(10);
            expect(tier.title).toBe('Cosmos');
        });
    });

    describe('getXPProgress', () => {
        it('returns correct progress at start of level 1', () => {
            const progress = getXPProgress(0);
            expect(progress.currentLevel.level).toBe(1);
            expect(progress.nextLevel?.level).toBe(2);
            expect(progress.xpInCurrentLevel).toBe(0);
            expect(progress.xpNeededForNext).toBe(100);
            expect(progress.percentage).toBe(0);
        });
        it('returns 50% at 50 XP (halfway to level 2)', () => {
            const progress = getXPProgress(50);
            expect(progress.percentage).toBe(0.5);
        });
        it('returns percentage 1 and no nextLevel at max level', () => {
            const progress = getXPProgress(15000);
            expect(progress.currentLevel.level).toBe(10);
            expect(progress.nextLevel).toBeNull();
            expect(progress.percentage).toBe(1);
        });
    });
});
