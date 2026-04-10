import React, { createContext, useContext, useState } from 'react';

export interface TimerDisplay {
    text: string;
    progress: number;    // 0–1
    isRunning: boolean;
    onPress: () => void;
}

interface TimerCtx {
    timerDisplay: TimerDisplay | null;
    setTimerDisplay: (d: TimerDisplay | null) => void;
}

const TimerContext = createContext<TimerCtx>({ timerDisplay: null, setTimerDisplay: () => {} });

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [timerDisplay, setTimerDisplay] = useState<TimerDisplay | null>(null);
    return (
        <TimerContext.Provider value={{ timerDisplay, setTimerDisplay }}>
            {children}
        </TimerContext.Provider>
    );
};

export const useTimerDisplay  = () => useContext(TimerContext).timerDisplay;
export const useSetTimerDisplay = () => useContext(TimerContext).setTimerDisplay;
