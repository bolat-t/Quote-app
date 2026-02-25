import { useMemo } from 'react';
import { Quote } from '../types';
import { getDayOfYear, formatDateShort } from '../utils/dateHelpers';
import quotes from '../data/quotes.json';

export interface DailyQuoteResult {
    quote: Quote;
    dateString: string;
    quoteIndex: number;
}

/** Returns the day's quote (same for all users by date), formatted date, and index in the full quotes list. */
export const useDailyQuote = (): DailyQuoteResult => {
    return useMemo(() => {
        const today = new Date();
        const dayOfYear = getDayOfYear(today);
        const quoteIndex = dayOfYear % quotes.length;
        const quote = quotes[quoteIndex] as Quote;
        const dateString = formatDateShort(today);
        return { quote, dateString, quoteIndex };
    }, []);
};
