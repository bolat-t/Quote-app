import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Quote } from '../types';
import { getDayOfYear, formatDateShort } from '../utils/dateHelpers';
import quotes from '../data/quotes.json';

export interface DailyQuoteResult {
    quote: Quote;
    /** Locale-aware display text (Korean when language is 'ko', English otherwise). */
    quoteText: string;
    dateString: string;
    quoteIndex: number;
}

/** Returns the day's quote (same for all users by date), formatted date, and index in the full quotes list. */
export const useDailyQuote = (): DailyQuoteResult => {
    const { i18n } = useTranslation();
    const isKorean = i18n.language.startsWith('ko');

    return useMemo(() => {
        const today = new Date();
        const dayOfYear = getDayOfYear(today);
        const quoteIndex = dayOfYear % quotes.length;
        const quote = quotes[quoteIndex] as Quote;
        const quoteText = (isKorean && quote.ko) ? quote.ko : quote.text;
        const dateString = formatDateShort(today);
        return { quote, quoteText, dateString, quoteIndex };
    }, [isKorean]);
};
