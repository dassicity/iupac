'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface AuthFormProps {
    mode: 'login' | 'signup';
    onModeChange: (mode: 'login' | 'signup') => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ mode, onModeChange }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { login, signup } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            if (mode === 'login') {
                await login(username, password);
            } else {
                await signup(username, password);
            }
        } catch (error) {
            setError(error instanceof Error ? error.message : 'An error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleModeSwitch = () => {
        setUsername('');
        setPassword('');
        setError('');
        onModeChange(mode === 'login' ? 'signup' : 'login');
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center px-4">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-white">IUPAC</h1>
                    <p className="mt-2 text-gray-400">Movie Tracker for Film Enthusiasts</p>
                    <h2 className="mt-6 text-2xl font-semibold text-white">
                        {mode === 'login' ? 'Sign in to your account' : 'Create new account'}
                    </h2>
                </div>

                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                    {error && (
                        <div className="bg-red-900/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-md">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                                Username
                            </label>
                            <input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                                placeholder="Enter your username"
                                disabled={isSubmitting}
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                                placeholder="Enter your password"
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={isSubmitting || !username.trim() || !password.trim()}
                            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors"
                        >
                            {isSubmitting ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-gray-300 border-t-white rounded-full animate-spin" />
                                    <span>{mode === 'login' ? 'Signing in...' : 'Creating account...'}</span>
                                </div>
                            ) : (
                                mode === 'login' ? 'Sign in' : 'Create account'
                            )}
                        </button>
                    </div>

                    <div className="text-center">
                        <button
                            type="button"
                            onClick={handleModeSwitch}
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                            disabled={isSubmitting}
                        >
                            {mode === 'login'
                                ? "Don't have an account? Sign up"
                                : "Already have an account? Sign in"
                            }
                        </button>
                    </div>
                </form>

                <div className="text-center text-gray-400 text-sm">
                    <p>Built for movie enthusiasts who appreciate cinema</p>
                    <p className="mt-1">Festival films • Arthouse cinema • World cinema</p>
                </div>
            </div>
        </div>
    );
}; 