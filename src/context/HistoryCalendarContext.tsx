import React, { createContext, useContext, useState } from 'react';

/**
 * Shared state between AppHeader and JournalScreen for the History tab.
 * When the user taps the calendar icon in the header, `expanded` toggles
 * and the JournalScreen swaps the weekly DayStrip for a MonthCalendar.
 */
interface HistoryCalendarCtx {
    expanded: boolean;
    setExpanded: (v: boolean) => void;
    toggle: () => void;
}

const HistoryCalendarContext = createContext<HistoryCalendarCtx>({
    expanded: false,
    setExpanded: () => {},
    toggle: () => {},
});

export const HistoryCalendarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [expanded, setExpanded] = useState(false);
    const toggle = () => setExpanded(e => !e);
    return (
        <HistoryCalendarContext.Provider value={{ expanded, setExpanded, toggle }}>
            {children}
        </HistoryCalendarContext.Provider>
    );
};

export const useHistoryCalendar = () => useContext(HistoryCalendarContext);
