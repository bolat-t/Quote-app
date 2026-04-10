import React, { createContext, useContext, useState } from 'react';

interface HeaderHeightCtx {
    headerHeight: number;
    setHeaderHeight: (h: number) => void;
}

const HeaderHeightContext = createContext<HeaderHeightCtx>({ headerHeight: 0, setHeaderHeight: () => {} });

export const HeaderHeightProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [headerHeight, setHeaderHeight] = useState(0);
    return (
        <HeaderHeightContext.Provider value={{ headerHeight, setHeaderHeight }}>
            {children}
        </HeaderHeightContext.Provider>
    );
};

export const useHeaderHeight = () => useContext(HeaderHeightContext).headerHeight;
export const useSetHeaderHeight = () => useContext(HeaderHeightContext).setHeaderHeight;
