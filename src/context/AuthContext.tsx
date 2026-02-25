
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Alert } from 'react-native';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    isLoading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check for existing session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                setSession(session);
                setUser(session.user);
                setIsLoading(false);
            } else {
                // No session? Try anonymous sign in for "Open Gates" access
                console.log("[Auth] No session, attempting anonymous sign-in...");
                supabase.auth.signInAnonymously()
                    .then(({ data, error }) => {
                        if (error) {
                            console.warn("[Auth] Anon sign-in failed (likely disabled in Supabase):", error.message);
                            // Fallback: stay unauthenticated (features requiring auth will fail)
                        } else if (data.session) {
                            console.log("[Auth] Anon sign-in success:", data.user?.id);
                            setSession(data.session);
                            setUser(data.user);

                            // Optional: Create profile for anon user
                            if (data.user) {
                                supabase.from('profiles').insert([{
                                    id: data.user.id,
                                    username: `guest_${data.user.id.slice(0, 6)}`,
                                    updated_at: new Date(),
                                }]).then(({ error }) => {
                                    if (error) console.log("Profile creation skipped/failed:", error.message);
                                });
                            }
                        }
                    })
                    .catch(err => console.error("Auth init error:", err))
                    .finally(() => setIsLoading(false));
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setIsLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signIn = async (email: string, password: string) => {
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) throw error;
        } catch (error: any) {
            Alert.alert('Login Error', error.message);
            throw error;
        }
    };

    const signUp = async (email: string, password: string) => {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
            });
            if (error) throw error;

            // Create profile
            if (data.user) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert([
                        {
                            id: data.user.id,
                            username: email.split('@')[0], // Default username
                            avatar_url: '',
                            updated_at: new Date(),
                        },
                    ]);
                if (profileError) {
                    console.error('Error creating profile:', profileError);
                    // Non-blocking, but good to know
                }
            }

            if (data.user && !data.session) {
                Alert.alert('Check your inbox!', 'Please check your email for the confirmation link.');
            }
        } catch (error: any) {
            Alert.alert('Sign Up Error', error.message);
            throw error;
        }
    };

    const signOut = async () => {
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    return (
        <AuthContext.Provider value={{
            session,
            user,
            isLoading,
            signIn,
            signUp,
            signOut
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
