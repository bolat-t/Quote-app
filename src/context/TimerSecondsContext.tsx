import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';

interface TimerSecondsCtx {
    timerSecs: number;
    setTimerSecs: (s: number) => void;
}

const TimerSecondsContext = createContext<TimerSecondsCtx>({
    timerSecs: 600,
    setTimerSecs: () => {},
});

export const TimerSecondsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [timerSecs, setTimerSecs] = useState(600);

    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEYS.FOCUS_DURATION_SECONDS).then(val => {
            if (val) setTimerSecs(Number(val));
        });
    }, []);

    return (
        <TimerSecondsContext.Provider value={{ timerSecs, setTimerSecs }}>
            {children}
        </TimerSecondsContext.Provider>
    );
};

export const useTimerSecs    = () => useContext(TimerSecondsContext).timerSecs;
export const useSetTimerSecs = () => useContext(TimerSecondsContext).setTimerSecs;
