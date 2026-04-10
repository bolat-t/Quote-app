import React, { createContext, useContext, useState } from 'react';

export interface JournalStepInfo {
    labels: string[];
    activeStep: number;
    onStepPress: (i: number) => void;
}

interface JournalStepsCtx {
    journalSteps: JournalStepInfo | null;
    setJournalSteps: (info: JournalStepInfo | null) => void;
}

const JournalStepsContext = createContext<JournalStepsCtx>({
    journalSteps: null,
    setJournalSteps: () => {},
});

export const JournalStepsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [journalSteps, setJournalSteps] = useState<JournalStepInfo | null>(null);
    return (
        <JournalStepsContext.Provider value={{ journalSteps, setJournalSteps }}>
            {children}
        </JournalStepsContext.Provider>
    );
};

export const useJournalSteps = () => useContext(JournalStepsContext).journalSteps;
export const useSetJournalSteps = () => useContext(JournalStepsContext).setJournalSteps;
