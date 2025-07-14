'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MovieList } from './MovieList';
import { SearchPage } from './SearchPage';
import { JournalPage } from './JournalPage';
import { StatsPage } from './StatsPage';

export type ActiveView = 'to-watch' | 'watched' | 'search' | 'journal' | 'stats' | 'custom-list';

export const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const [activeView, setActiveView] = useState<ActiveView>('to-watch');
    const [selectedListId, setSelectedListId] = useState<string | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false); // Only for mobile
    const [sidebarRefresh, setSidebarRefresh] = useState<(() => Promise<void>) | null>(null);

    // Handle mobile sidebar toggle only
    const handleMenuClick = () => {
        // Only toggle on mobile
        if (window.innerWidth < 1024) {
            setSidebarOpen(!sidebarOpen);
        }
    };

    // Callback for when lists are modified (items moved, added, removed)
    const handleListsChanged = async () => {
        if (sidebarRefresh) {
            await sidebarRefresh();
        }
    };

    // Callback to store the sidebar refresh function
    const handleSidebarRefresh = (refreshCallback: () => Promise<void>) => {
        setSidebarRefresh(() => refreshCallback);
    };

    // Set initial sidebar state based on screen size
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) {
                setSidebarOpen(true); // Always open on desktop
            } else {
                setSidebarOpen(false); // Closed by default on mobile
            }
        };

        // Set initial state
        handleResize();

        // Listen for window resize
        window.addEventListener('resize', handleResize);

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const renderContent = () => {
        switch (activeView) {
            case 'to-watch':
                return <MovieList listId="to-watch" onListsChanged={handleListsChanged} />;
            case 'watched':
                return <MovieList listId="watched" onListsChanged={handleListsChanged} />;
            case 'search':
                return <SearchPage onListsChanged={handleListsChanged} />;
            case 'journal':
                return <JournalPage />;
            case 'stats':
                return <StatsPage />;
            case 'custom-list':
                return selectedListId ? <MovieList listId={selectedListId} onListsChanged={handleListsChanged} /> : null;
            default:
                return <MovieList listId="to-watch" />;
        }
    };

    if (!user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-black flex flex-col">
            <Header
                onMenuClick={handleMenuClick}
                sidebarOpen={sidebarOpen}
            />

            <div className="flex flex-1">
                <Sidebar
                    activeView={activeView}
                    onViewChange={setActiveView}
                    onListSelect={setSelectedListId}
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                    onRefreshLists={handleSidebarRefresh}
                />

                {/* Main content - fill full width from sidebar to screen edge */}
                <main className="flex-1 min-h-full">
                    <div className="p-6 lg:p-8 min-h-full w-full">
                        {renderContent()}
                    </div>
                </main>
            </div>
        </div>
    );
}; 