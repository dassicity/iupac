'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserSession } from '@/types';
import { storageService } from '@/services/storage';
import { trackingService } from '@/services/tracking';

interface AuthContextType {
    user: User | null;
    session: UserSession | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (username: string, password: string) => Promise<void>;
    signup: (username: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    updateUser: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<UserSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Initialize auth state
    useEffect(() => {
        const initializeAuth = async () => {
            try {
                setIsLoading(true);

                // Check for existing session
                const existingSession = await storageService.getSession();
                if (existingSession && existingSession.isAuthenticated) {
                    // Get user data from localStorage (stored during login)
                    const userData = localStorage.getItem('current_user');
                    if (userData) {
                        const parsedUser = JSON.parse(userData);
                        setUser(parsedUser);
                        setSession(existingSession);
                    } else {
                        // Session exists but no user data, clear invalid session
                        await storageService.clearSession();
                    }
                }
            } catch (error) {
                console.error('Auth initialization error:', error);
                await storageService.clearSession();
            } finally {
                setIsLoading(false);
            }
        };

        initializeAuth();
    }, []);

    const login = async (username: string, password: string): Promise<void> => {
        try {
            setIsLoading(true);

            // Get client tracking data
            const clientTrackingData = trackingService.getClientTrackingData();

            // Authenticate with server
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username,
                    password,
                    trackingData: clientTrackingData
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Login failed');
            }

            const data = await response.json();
            const authenticatedUser = data.user;

            // Store user data and create session
            localStorage.setItem('current_user', JSON.stringify(authenticatedUser));

            const newSession: UserSession = {
                userId: authenticatedUser.id,
                username: authenticatedUser.username,
                isAuthenticated: true,
                loginTime: new Date().toISOString(),
            };

            localStorage.setItem('iupac_user_session', JSON.stringify(newSession));

            // Initialize tracking service with the session ID from server
            if (data.sessionId) {
                trackingService.setSessionId(data.sessionId);
            }

            setUser(authenticatedUser);
            setSession(newSession);
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const signup = async (username: string, password: string): Promise<void> => {
        try {
            setIsLoading(true);

            // Get client tracking data
            const clientTrackingData = trackingService.getClientTrackingData();

            // Create new user with tracking data
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username,
                    password,
                    trackingData: clientTrackingData
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Signup failed');
            }

            const data = await response.json();
            const newUser = data.user;

            // Store user data and create session
            localStorage.setItem('current_user', JSON.stringify(newUser));

            const newSession: UserSession = {
                userId: newUser.id,
                username: newUser.username,
                isAuthenticated: true,
                loginTime: new Date().toISOString(),
            };

            localStorage.setItem('iupac_user_session', JSON.stringify(newSession));

            // Initialize tracking service with the session ID from server
            if (data.sessionId) {
                trackingService.setSessionId(data.sessionId);
            }

            setUser(newUser);
            setSession(newSession);
        } catch (error) {
            console.error('Signup error:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async (): Promise<void> => {
        try {
            setIsLoading(true);

            // Clear session
            await storageService.clearSession();

            setUser(null);
            setSession(null);
        } catch (error) {
            console.error('Logout error:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const updateUser = async (updates: Partial<User>): Promise<void> => {
        if (!user) {
            throw new Error('No user logged in');
        }

        try {
            setIsLoading(true);

            // Update user data
            const updatedUser = await storageService.updateUser(user.id, updates);

            setUser(updatedUser);
        } catch (error) {
            console.error('Update user error:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const value: AuthContextType = {
        user,
        session,
        isLoading,
        isAuthenticated: !!user && !!session?.isAuthenticated,
        login,
        signup,
        logout,
        updateUser,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}; 