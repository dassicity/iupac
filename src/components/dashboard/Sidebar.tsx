'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { storageService } from '@/services/storage';
import { UserList } from '@/types';
import { ActiveView } from './Dashboard';
import {
    Eye,
    EyeOff,
    Search,
    PenTool,
    BarChart3,
    Plus,
    List,
    Edit2,
    Trash2,
    Check,
    X
} from 'lucide-react';

interface SidebarProps {
    activeView: ActiveView;
    onViewChange: (view: ActiveView) => void;
    onListSelect: (listId: string) => void;
    isOpen: boolean;
    onClose: () => void;
    onRefreshLists?: (refreshCallback: () => Promise<void>) => void; // Expose refresh function to parent
}

export const Sidebar: React.FC<SidebarProps> = ({
    activeView,
    onViewChange,
    onListSelect,
    isOpen,
    onClose,
    onRefreshLists
}) => {
    const { user } = useAuth();
    const [userLists, setUserLists] = useState<UserList[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateList, setShowCreateList] = useState(false);
    const [newListName, setNewListName] = useState('');
    const [newListDescription, setNewListDescription] = useState('');
    const [editingListId, setEditingListId] = useState<string | null>(null);
    const [editListName, setEditListName] = useState('');
    const [editListDescription, setEditListDescription] = useState('');

    const loadUserLists = useCallback(async () => {
        if (!user) return;

        try {
            setIsLoading(true);
            const lists = await storageService.getUserLists(user.id);
            setUserLists(lists);
        } catch (error) {
            console.error('Error loading user lists:', error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            loadUserLists();
        }
    }, [user, loadUserLists]);

    // Expose refresh function to parent
    useEffect(() => {
        if (onRefreshLists) {
            onRefreshLists(loadUserLists);
        }
    }, [onRefreshLists, loadUserLists]);

    const handleCreateList = async () => {
        if (!user || !newListName.trim()) return;

        try {
            await storageService.createUserList(user.id, newListName.trim(), newListDescription.trim());
            setNewListName('');
            setNewListDescription('');
            setShowCreateList(false);
            await loadUserLists();
        } catch (error) {
            console.error('Error creating list:', error);
        }
    };

    const handleEditList = (list: UserList) => {
        setEditingListId(list.id);
        setEditListName(list.name);
        setEditListDescription(list.description);
    };

    const handleSaveEdit = async () => {
        if (!user || !editingListId || !editListName.trim()) return;

        try {
            await storageService.updateUserList(user.id, editingListId, {
                name: editListName.trim(),
                description: editListDescription.trim(),
            });
            setEditingListId(null);
            setEditListName('');
            setEditListDescription('');
            await loadUserLists();
        } catch (error) {
            console.error('Error updating list:', error);
        }
    };

    const handleCancelEdit = () => {
        setEditingListId(null);
        setEditListName('');
        setEditListDescription('');
    };

    const handleDeleteList = async (listId: string) => {
        if (!user) return;

        if (confirm('Are you sure you want to delete this list? This action cannot be undone.')) {
            try {
                await storageService.deleteUserList(user.id, listId);
                await loadUserLists();
                // If we're currently viewing the deleted list, switch to default view
                if (activeView === 'custom-list') {
                    onViewChange('to-watch');
                }
            } catch (error) {
                console.error('Error deleting list:', error);
            }
        }
    };

    const handleViewChange = (view: ActiveView, listId?: string) => {
        onViewChange(view);
        if (listId) {
            onListSelect(listId);
        }
        // Only close sidebar on mobile after selection
        if (window.innerWidth < 1024) {
            onClose();
        }
    };

    const mainNavItems = [
        {
            id: 'to-watch' as ActiveView,
            label: 'To Watch',
            icon: Eye,
            description: 'Movies and shows you want to watch'
        },
        {
            id: 'watched' as ActiveView,
            label: 'Already Watched',
            icon: EyeOff,
            description: 'Movies and shows you have watched'
        },
        {
            id: 'search' as ActiveView,
            label: 'Search',
            icon: Search,
            description: 'Search for movies and TV shows'
        },
        {
            id: 'journal' as ActiveView,
            label: 'Journal',
            icon: PenTool,
            description: 'Your movie thoughts and reviews'
        },
        {
            id: 'stats' as ActiveView,
            label: 'Statistics',
            icon: BarChart3,
            description: 'Your viewing statistics'
        }
    ];

    const customLists = userLists.filter(list => !list.isSystem);

    return (
        <>
            {/* Backdrop for mobile only */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar - Always visible on desktop, toggleable on mobile */}
            <aside className={`
                fixed top-0 left-0 h-screen w-64 bg-gray-900 border-r border-gray-700 z-50 
                transform transition-transform duration-300 ease-in-out
                lg:static lg:block lg:transform-none
                ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="h-full flex flex-col">
                    {/* Header padding to account for fixed header */}
                    <div className="h-16 flex-shrink-0 border-b border-gray-700 bg-gray-900">
                        <div className="h-full flex items-center px-4">
                            <h2 className="text-lg font-semibold text-white">Navigation</h2>
                        </div>
                    </div>

                    {/* Scrollable content */}
                    <div className="flex-1 p-4 overflow-y-auto">
                        {/* Main Navigation */}
                        <nav className="space-y-2">
                            {mainNavItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => handleViewChange(item.id)}
                                    className={`
                                        w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors
                                        ${activeView === item.id
                                            ? 'bg-blue-600 text-white'
                                            : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                                        }
                                    `}
                                >
                                    <item.icon className="w-5 h-5" />
                                    <div>
                                        <div className="font-medium">{item.label}</div>
                                        <div className="text-xs opacity-70">{item.description}</div>
                                    </div>
                                </button>
                            ))}
                        </nav>

                        {/* Custom Lists */}
                        <div className="mt-8">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-medium text-gray-400">Custom Lists</h3>
                                <button
                                    onClick={() => setShowCreateList(!showCreateList)}
                                    className="p-1 hover:bg-gray-800 rounded-md transition-colors text-gray-400 hover:text-white"
                                    title="Create new list"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Create List Form */}
                            {showCreateList && (
                                <div className="mb-4 p-3 bg-gray-800 rounded-md space-y-3">
                                    <input
                                        type="text"
                                        placeholder="List name"
                                        value={newListName}
                                        onChange={(e) => setNewListName(e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none text-sm"
                                    />
                                    <textarea
                                        placeholder="Description (optional)"
                                        value={newListDescription}
                                        onChange={(e) => setNewListDescription(e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none text-sm h-20 resize-none"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleCreateList}
                                            disabled={!newListName.trim()}
                                            className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors text-xs"
                                        >
                                            Create
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowCreateList(false);
                                                setNewListName('');
                                                setNewListDescription('');
                                            }}
                                            className="py-2 px-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-md transition-colors text-xs"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Custom Lists */}
                            <div className="space-y-1">
                                {isLoading ? (
                                    <div className="text-center py-4">
                                        <div className="w-4 h-4 mx-auto border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
                                    </div>
                                ) : customLists.length > 0 ? (
                                    customLists.map((list) => (
                                        <div key={list.id} className="space-y-2">
                                            {editingListId === list.id ? (
                                                /* Edit Mode */
                                                <div className="p-3 bg-gray-800 rounded-md space-y-3">
                                                    <input
                                                        type="text"
                                                        value={editListName}
                                                        onChange={(e) => setEditListName(e.target.value)}
                                                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none text-sm"
                                                        placeholder="List name"
                                                    />
                                                    <textarea
                                                        value={editListDescription}
                                                        onChange={(e) => setEditListDescription(e.target.value)}
                                                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none text-sm h-16 resize-none"
                                                        placeholder="Description (optional)"
                                                    />
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={handleSaveEdit}
                                                            disabled={!editListName.trim()}
                                                            className="flex items-center gap-1 py-1 px-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md transition-colors text-xs"
                                                        >
                                                            <Check className="w-3 h-3" />
                                                            Save
                                                        </button>
                                                        <button
                                                            onClick={handleCancelEdit}
                                                            className="flex items-center gap-1 py-1 px-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors text-xs"
                                                        >
                                                            <X className="w-3 h-3" />
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                /* View Mode */
                                                <div className="group flex items-center">
                                                    <button
                                                        onClick={() => handleViewChange('custom-list', list.id)}
                                                        className={`
                                                            flex-1 flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors
                                                            ${activeView === 'custom-list'
                                                                ? 'bg-blue-600 text-white'
                                                                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                                                            }
                                                        `}
                                                    >
                                                        <List className="w-4 h-4" />
                                                        <div className="flex-1">
                                                            <div className="font-medium text-sm">{list.name}</div>
                                                            <div className="text-xs opacity-70">{list.items.length} items</div>
                                                        </div>
                                                    </button>

                                                    {/* Edit/Delete buttons - visible on hover */}
                                                    <div className="opacity-0 group-hover:opacity-100 flex gap-1 ml-1 transition-opacity">
                                                        <button
                                                            onClick={() => handleEditList(list)}
                                                            className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
                                                            title="Edit list"
                                                        >
                                                            <Edit2 className="w-3 h-3" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteList(list.id)}
                                                            className="p-1 hover:bg-red-600 rounded text-gray-400 hover:text-white transition-colors"
                                                            title="Delete list"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-4">
                                        <p className="text-gray-400 text-sm">No custom lists</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}; 