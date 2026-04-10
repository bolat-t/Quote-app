import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CommitmentCtx {
    commitmentMins: number;
    setCommitmentMins: (m: number) => void;
}

const CommitmentContext = createContext<CommitmentCtx>({
    commitmentMins: 20,
    setCommitmentMins: () => {},
});

export const CommitmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [commitmentMins, setCommitmentMins] = useState(20);

    useEffect(() => {
        AsyncStorage.getItem('@ulbo_commitment_minutes').then(val => {
            if (!val) return;
            const n = parseInt(val, 10);
            if ([5, 10, 20].includes(n)) setCommitmentMins(n);
        });
    }, []);

    return (
        <CommitmentContext.Provider value={{ commitmentMins, setCommitmentMins }}>
            {children}
        </CommitmentContext.Provider>
    );
};

export const useCommitmentMins    = () => useContext(CommitmentContext).commitmentMins;
export const useSetCommitmentMins = () => useContext(CommitmentContext).setCommitmentMins;
