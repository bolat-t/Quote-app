import { getDayOfYear, formatDateShort } from './dateHelpers';

describe('dateHelpers', () => {
    describe('getDayOfYear', () => {
        it('returns 1 for Jan 1', () => {
            expect(getDayOfYear(new Date(2024, 0, 1))).toBe(1);
        });
        it('returns 32 for Feb 1', () => {
            expect(getDayOfYear(new Date(2024, 1, 1))).toBe(32);
        });
        it('returns 366 for Dec 31 in leap year', () => {
            expect(getDayOfYear(new Date(2024, 11, 31))).toBe(366);
        });
        it('returns 365 for Dec 31 in non-leap year', () => {
            expect(getDayOfYear(new Date(2023, 11, 31))).toBe(365);
        });
    });

    describe('formatDateShort', () => {
        it('formats month and day with leading zero for day', () => {
            expect(formatDateShort(new Date(2024, 0, 5))).toBe('1.05');
        });
        it('formats August 31 as 8.31', () => {
            expect(formatDateShort(new Date(2024, 7, 31))).toBe('8.31');
        });
    });
});
