import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import Purchases, { PurchasesPackage as RCPackage, LOG_LEVEL } from 'react-native-purchases';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { PLANS } from '../config/pricing';

// Heuristic to check if we are in Expo Go
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const API_KEYS = {
    apple: 'appl_placeholder_key',
    google: 'test_uysejRBEurGovbblNlVjjXXdvtD', // User provided key
};

// Mock types matching RevenueCat structure partially
export interface PurchasesPackage {
    identifier: string;
    product: {
        identifier: string;
        priceString: string;
        title: string;
        description: string;
    };
    packageType: 'MONTHLY' | 'ANNUAL' | 'LIFETIME' | 'CUSTOM';
}

interface PurchaseContextType {
    isPremium: boolean;
    packages: PurchasesPackage[];
    purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
    restorePurchases: () => Promise<boolean>;
    isLoading: boolean;
    isMock: boolean;
}

const PurchaseContext = createContext<PurchaseContextType>({
    isPremium: false,
    packages: [],
    purchasePackage: async () => false,
    restorePurchases: async () => false,
    isLoading: true,
    isMock: false,
});

export const usePurchase = () => useContext(PurchaseContext);

export const PurchaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isPremium, setIsPremium] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isMock, setIsMock] = useState(isExpoGo);
    const [rcPackages, setRcPackages] = useState<PurchasesPackage[]>([]);

    // Mock packages — derived from pricing config so prices/SKUs stay in lockstep.
    // Real RevenueCat offerings replace these in production (see init() below).
    const packages: PurchasesPackage[] = PLANS.map(plan => ({
        identifier:  plan.rcProductId,
        packageType: plan.rcPackageType,
        product: {
            identifier:  plan.rcProductId,
            priceString: plan.priceString,
            title:       plan.displayName,
            description: '',
        },
    }));

    useEffect(() => {
        const init = async () => {
            // FORCE MOCK IN EXPO GO ALWAYS
            if (isExpoGo) {
                // console.log('[PurchaseContext] Running in Expo Go - Using MOCK mode');
                setIsMock(true);
                checkMockPremiumStatus();
                return;
            }

            try {
                if (Platform.OS === 'ios') {
                    Purchases.configure({ apiKey: API_KEYS.apple });
                } else if (Platform.OS === 'android') {
                    Purchases.configure({ apiKey: API_KEYS.google });
                }


                if (__DEV__) {
                    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
                }

                const info = await Purchases.getCustomerInfo();
                const isPro = typeof info.entitlements.active['pro'] !== "undefined";
                setIsPremium(isPro);
                setIsMock(false);

                // Load offerings
                try {
                    const offerings = await Purchases.getOfferings();
                    if (offerings.current && offerings.current.availablePackages.length !== 0) {
                        setRcPackages(offerings.current.availablePackages as any);
                    }
                } catch (e) {
                    console.error('Error fetching offerings', e);
                }

            } catch (e) {
                console.error('[PurchaseContext] Failed to init RevenueCat, falling back to mock', e);
                setIsMock(true);
                checkMockPremiumStatus();
            } finally {
                setIsLoading(false);
            }
        };

        const checkMockPremiumStatus = async () => {
            try {
                const status = await AsyncStorage.getItem(STORAGE_KEYS.IS_PREMIUM);
                setIsPremium(status === 'true');
            } catch (e) {
                console.error('Error checking premium status', e);
            } finally {
                setIsLoading(false);
            }
        }

        init();
    }, []);

    const purchasePackage = async (pkg: PurchasesPackage): Promise<boolean> => {
        if (isMock) {
            // Simulate network request
            await new Promise(resolve => setTimeout(resolve, 1500));
            await AsyncStorage.setItem(STORAGE_KEYS.IS_PREMIUM, 'true');
            setIsPremium(true);
            Alert.alert('Success (Mock)', 'Welcome to Ulbo Premium!');
            return true;
        }

        try {
            // Real Purchase
            const { customerInfo } = await Purchases.purchasePackage(pkg as any);
            if (typeof customerInfo.entitlements.active['pro'] !== "undefined") {
                setIsPremium(true);
                return true;
            }
        } catch (e: any) {
            if (!e.userCancelled) {
                Alert.alert('Error', e.message);
            }
        }
        return false;
    };

    const restorePurchases = async (): Promise<boolean> => {
        if (isMock) {
            await new Promise(resolve => setTimeout(resolve, 1500));
            const status = await AsyncStorage.getItem(STORAGE_KEYS.IS_PREMIUM);
            if (status === 'true') {
                setIsPremium(true);
                Alert.alert('Restored (Mock)', 'Your purchases have been restored.');
                return true;
            } else {
                Alert.alert('No Purchases', 'No previous purchases found.');
                return false;
            }
        }

        try {
            const customerInfo = await Purchases.restorePurchases();
            if (typeof customerInfo.entitlements.active['pro'] !== "undefined") {
                setIsPremium(true);
                Alert.alert('Restored', 'Your purchases have been restored.');
                return true;
            } else {
                Alert.alert('No Purchases', 'No previous purchases found.');
            }
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
        return false;
    };

    return (
        <PurchaseContext.Provider value={{
            isPremium,
            packages: isMock ? packages : (rcPackages.length > 0 ? rcPackages : packages),
            purchasePackage,
            restorePurchases,
            isLoading,
            isMock
        }}>
            {children}
        </PurchaseContext.Provider>
    );
};
