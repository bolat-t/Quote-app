
import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const supabaseUrl     = Constants.expoConfig?.extra?.supabaseUrl     as string;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey as string;

// SecureStore has a 2048-byte limit per key — Supabase session tokens are larger,
// so we chunk them transparently.
const CHUNK_SIZE = 1800;

const SecureStoreAdapter = {
    getItem: async (key: string): Promise<string | null> => {
        try {
            const single = await SecureStore.getItemAsync(key);
            if (single !== null) return single;

            const numChunks = parseInt(await SecureStore.getItemAsync(`${key}_chunks`) ?? '0');
            if (numChunks === 0) return null;

            let value = '';
            for (let i = 0; i < numChunks; i++) {
                value += (await SecureStore.getItemAsync(`${key}_chunk_${i}`)) ?? '';
            }
            return value;
        } catch {
            return null;
        }
    },
    setItem: async (key: string, value: string): Promise<void> => {
        if (value.length <= CHUNK_SIZE) {
            await SecureStore.setItemAsync(key, value);
            return;
        }
        const numChunks = Math.ceil(value.length / CHUNK_SIZE);
        await SecureStore.setItemAsync(`${key}_chunks`, String(numChunks));
        for (let i = 0; i < numChunks; i++) {
            await SecureStore.setItemAsync(
                `${key}_chunk_${i}`,
                value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
            );
        }
    },
    removeItem: async (key: string): Promise<void> => {
        try {
            await SecureStore.deleteItemAsync(key);
            const numChunks = parseInt(await SecureStore.getItemAsync(`${key}_chunks`) ?? '0');
            await SecureStore.deleteItemAsync(`${key}_chunks`);
            for (let i = 0; i < numChunks; i++) {
                await SecureStore.deleteItemAsync(`${key}_chunk_${i}`);
            }
        } catch { /* ignore cleanup errors */ }
    },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: SecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
