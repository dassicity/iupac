'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, X } from 'lucide-react';

interface HeaderProps {
    onMenuClick: () => void;
    sidebarOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick, sidebarOpen }) => {
    const { user, logout } = useAuth();

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <header className="bg-gray-900 border-b border-gray-700 h-16 flex items-center justify-between px-4 lg:px-6 relative z-50">
            <div className="flex items-center gap-4">
                {/* Mobile hamburger menu only */}
                <button
                    onClick={onMenuClick}
                    className="lg:hidden p-2 hover:bg-gray-800 rounded-md transition-colors text-white"
                    aria-label="Toggle menu"
                >
                    {sidebarOpen ? (
                        <X className="w-5 h-5" />
                    ) : (
                        <Menu className="w-5 h-5" />
                    )}
                </button>

                <h1 className="text-xl font-bold text-white">IUPAC</h1>
            </div>

            <div className="flex items-center gap-4">
                <div className="text-sm text-gray-300">
                    Welcome, {user?.username}
                </div>

                <button
                    onClick={handleLogout}
                    className="px-3 py-1 text-sm bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-md transition-colors text-white"
                >
                    Logout
                </button>
            </div>
        </header>
    );
}; 