'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Star, Calendar, Trash2, Eye, CheckCircle, ArrowRight, Plus, List, Search, Filter, X, SlidersHorizontal, Play, Award as AwardIcon, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { storageService } from '@/services/storage';
import { trackingService } from '@/services/tracking';
import { UserMediaItem, UserList, EpisodeProgress, FestivalAward, Award } from '@/types';
import Image from 'next/image';
import { EpisodeTracker } from './EpisodeTracker';
import { FestivalTracker } from './FestivalTracker';
import { MovieDetailsModal } from './MovieDetailsModal';

interface MovieListProps {
    listId: string;
    onListsChanged?: () => Promise<void>;
}

interface FilterState {
    search: string;
    mediaType: 'all' | 'movie' | 'tv';
    minRating: number;
    maxRating: number;
    yearRange: { start: number; end: number };
    sortBy: 'title' | 'year' | 'rating' | 'dateAdded';
    sortOrder: 'asc' | 'desc';
}

interface MovieCardProps {
    item: UserMediaItem;
    onRemove: (itemId: string) => void;
    onUpdateRating: (itemId: string, rating: number) => void;
    onChangeStatus: (itemId: string, newStatus: 'to_watch' | 'watched') => void;
    onAddToCustomList: (itemId: string, customListId: string) => void;
    onRemoveFromCustomList: (itemId: string, customListId: string) => void;
    onUpdateFestivalData: (itemId: string, festivals: FestivalAward[], awards: Award[]) => void;
    onOpenEpisodeTracker: (itemId: string) => void;
    onOpenDetailsModal: (item: UserMediaItem) => void;
    availableLists: UserList[];
    currentListId: string;
    isCustomList: boolean;
}

const MovieCard: React.FC<MovieCardProps> = ({
    item,
    onRemove,
    onUpdateRating,
    onChangeStatus,
    onAddToCustomList,
    onRemoveFromCustomList,
    onUpdateFestivalData,
    onOpenEpisodeTracker,
    onOpenDetailsModal,
    availableLists,
    currentListId,
    isCustomList
}) => {
    const [showRating, setShowRating] = useState(false);
    const [selectedRating, setSelectedRating] = useState(item.rating || 0);
    const [showActionDropdown, setShowActionDropdown] = useState(false);
    const [showFestivalTracker, setShowFestivalTracker] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState<'left' | 'right'>('right');
    const dropdownButtonRef = useRef<HTMLDivElement>(null);

    // Calculate dropdown position when opening
    useEffect(() => {
        if (showActionDropdown && dropdownButtonRef.current) {
            const calculatePosition = () => {
                const buttonRect = dropdownButtonRef.current!.getBoundingClientRect();
                const viewportWidth = window.innerWidth;
                const isMobile = viewportWidth < 768; // md breakpoint
                const dropdownWidth = isMobile ? Math.min(80, viewportWidth - 32) : 72;
                console.log("dropdownWidth", dropdownWidth);
                const padding = 16;

                // For mobile, use full viewport. For desktop, try to find main content area
                let contentRect;
                if (isMobile) {
                    contentRect = { left: 0, right: viewportWidth };
                } else {
                    // Try to find the main content area (right side of sidebar)
                    const sidebar = document.querySelector('nav') || document.querySelector('.sidebar') || document.querySelector('[role="navigation"]');
                    const sidebarWidth = sidebar ? sidebar.getBoundingClientRect().width : 0;
                    contentRect = {
                        left: sidebarWidth,
                        right: viewportWidth
                    };
                }

                // Calculate available space
                const spaceToRight = contentRect.right - buttonRect.right - padding;
                console.log("spaceToRight", spaceToRight);
                const spaceToLeft = buttonRect.left - contentRect.left - padding;
                console.log("spaceToLeft", spaceToLeft);

                // Position logic: prefer right, use left if not enough space
                const shouldPositionLeft = spaceToRight < spaceToLeft && spaceToLeft > dropdownWidth;
                console.log("shouldPositionLeft", shouldPositionLeft);
                setDropdownPosition(shouldPositionLeft ? 'left' : 'right');
            };

            // Small delay to ensure DOM is ready
            const timeoutId = setTimeout(calculatePosition, 10);
            return () => clearTimeout(timeoutId);
        }
    }, [showActionDropdown]);

    // Close dropdown when clicking outside or pressing Escape
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (showActionDropdown) {
                const target = event.target as HTMLElement;
                if (!target.closest('.action-dropdown-container')) {
                    setShowActionDropdown(false);
                }
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && showActionDropdown) {
                setShowActionDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [showActionDropdown]);

    const posterUrl = item.poster_path
        ? `https://image.tmdb.org/t/p/w300${item.poster_path}`
        : '/placeholder-poster.jpg';

    const year = item.release_date || item.first_air_date
        ? new Date(item.release_date || item.first_air_date!).getFullYear()
        : 'N/A';

    const statusColors = {
        to_watch: 'bg-blue-600',
        watched: 'bg-green-600'
    };

    const statusLabels = {
        to_watch: 'To Watch',
        watched: 'Watched'
    };

    const handleRatingSubmit = () => {
        onUpdateRating(item.id, selectedRating);
        setShowRating(false);
    };

    // Dynamic positioning classes
    const getDropdownPositionClasses = () => {
        const isMobile = window.innerWidth < 768;
        const baseClasses = 'absolute top-full mt-2 z-[10001]';

        if (isMobile) {
            // On mobile: always anchor to right, use conservative sizing, add margin
            const positionClasses = dropdownPosition === 'left' ? 'right-0' : 'left-0';
            return `${baseClasses} ${positionClasses} w-72 max-w-[calc(100vw-2rem)] mr-4`;
        } else {
            // On desktop: use calculated positioning
            const positionClasses = dropdownPosition === 'left' ? 'right-0' : 'left-0';
            return `${baseClasses} ${positionClasses} w-80 max-w-80`;
        }
    };

    const renderActionDropdown = () => {
        if (isCustomList) {
            // For custom lists, show other custom lists to add to and option to remove from current list
            const otherCustomLists = availableLists.filter(list =>
                !list.isSystem &&
                list.id !== currentListId &&
                !item.customListIds.includes(list.id)
            );

            return (
                <div className={`${getDropdownPositionClasses()} bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl`}>
                    {/* Header */}
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <List className="w-4 h-4" />
                            List Actions
                        </h3>
                    </div>

                    <div className="py-2">
                        {/* Remove from current custom list */}
                        <button
                            onClick={() => {
                                onRemoveFromCustomList(item.id, currentListId);
                                setShowActionDropdown(false);
                            }}
                            className="w-full text-left px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 flex items-center gap-3 group"
                        >
                            <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            <div>
                                <div className="font-medium text-sm">Remove from current list</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Remove this item from the current custom list</div>
                            </div>
                        </button>

                        {/* Divider */}
                        {otherCustomLists.length > 0 && (
                            <div className="mx-4 my-2 border-t border-gray-200 dark:border-gray-700"></div>
                        )}

                        {/* Add to other custom lists */}
                        {otherCustomLists.length > 0 ? (
                            <>
                                <div className="px-4 py-2">
                                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Add to Other Lists</div>
                                </div>
                                <div className="max-h-48 overflow-y-auto">
                                    {otherCustomLists.map((list) => (
                                        <button
                                            key={list.id}
                                            onClick={() => {
                                                onAddToCustomList(item.id, list.id);
                                                setShowActionDropdown(false);
                                            }}
                                            className="w-full text-left px-4 py-3 text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 flex items-center gap-3 group"
                                        >
                                            <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                                            <div className="flex-1">
                                                <div className="font-medium text-sm">{list.name}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">{list.items.length} items</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="px-4 py-6 text-center">
                                <div className="text-gray-400 dark:text-gray-500">
                                    <div className="text-2xl mb-2">📝</div>
                                    <div className="font-medium text-sm">No other lists available</div>
                                    <div className="text-xs mt-1">Create custom lists to organize your movies</div>
                                </div>
                            </div>
                        )}

                        {/* Show currently in lists */}
                        {item.customListIds.length > 1 && (
                            <>
                                <div className="mx-4 my-2 border-t border-gray-200 dark:border-gray-700"></div>
                                <div className="px-4 py-2">
                                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Also In</div>
                                </div>
                                {availableLists
                                    .filter(list => !list.isSystem && item.customListIds.includes(list.id) && list.id !== currentListId)
                                    .map((list) => (
                                        <div
                                            key={list.id}
                                            className="px-4 py-2 text-gray-600 dark:text-gray-400 flex items-center gap-3 text-sm"
                                        >
                                            <CheckCircle className="w-4 h-4 text-green-500" />
                                            <div className="flex-1">
                                                <div className="font-medium">{list.name}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-500">{list.items.length} items</div>
                                            </div>
                                        </div>
                                    ))}
                            </>
                        )}
                    </div>
                </div>
            );
        } else {
            // For system lists, show status change and custom list options
            const customLists = availableLists.filter(list =>
                !list.isSystem &&
                !item.customListIds.includes(list.id)
            );

            return (
                <div className={`${getDropdownPositionClasses()} bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl`}>
                    {/* Header */}
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <ArrowRight className="w-4 h-4" />
                            Quick Actions
                        </h3>
                    </div>

                    <div className="py-2">
                        {/* Episode Tracker for TV Shows */}
                        {item.mediaType === 'tv' && (
                            <>
                                <button
                                    onClick={() => {
                                        onOpenEpisodeTracker(item.id);
                                        setShowActionDropdown(false);
                                    }}
                                    className="w-full text-left px-4 py-3 text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-200 flex items-center gap-3 group"
                                >
                                    <Play className="w-5 h-5 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform" />
                                    <div>
                                        <div className="font-medium text-sm">Track Episodes</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {item.episodeProgress
                                                ? `${item.episodeProgress.watchedEpisodes.length}/${item.episodeProgress.totalEpisodes} episodes`
                                                : 'Track your episode progress'
                                            }
                                        </div>
                                    </div>
                                </button>
                                <div className="mx-4 my-2 border-t border-gray-200 dark:border-gray-700"></div>
                            </>
                        )}

                        {/* Festival Tracker */}
                        <button
                            onClick={() => {
                                setShowFestivalTracker(true);
                                setShowActionDropdown(false);
                            }}
                            className="w-full text-left px-4 py-3 text-gray-700 dark:text-gray-200 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-all duration-200 flex items-center gap-3 group"
                        >
                            <AwardIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 group-hover:scale-110 transition-transform" />
                            <div>
                                <div className="font-medium text-sm">Festival Tracker</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {item.festivals.length > 0 || item.awards.length > 0
                                        ? `${item.festivals.length} festivals, ${item.awards.length} awards`
                                        : 'Track awards and festival recognition'
                                    }
                                </div>
                            </div>
                        </button>

                        {/* Divider */}
                        <div className="mx-4 my-2 border-t border-gray-200 dark:border-gray-700"></div>

                        {/* Status change */}
                        <button
                            onClick={() => {
                                const newStatus = item.status === 'to_watch' ? 'watched' : 'to_watch';
                                onChangeStatus(item.id, newStatus);
                                setShowActionDropdown(false);
                            }}
                            className="w-full text-left px-4 py-3 text-gray-700 dark:text-gray-200 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-200 flex items-center gap-3 group"
                        >
                            {item.status === 'to_watch' ? (
                                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform" />
                            ) : (
                                <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                            )}
                            <div>
                                <div className="font-medium text-sm">
                                    Mark as {item.status === 'to_watch' ? 'Watched' : 'To Watch'}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    Change the watch status of this item
                                </div>
                            </div>
                        </button>

                        {/* Divider */}
                        {customLists.length > 0 && (
                            <div className="mx-4 my-2 border-t border-gray-200 dark:border-gray-700"></div>
                        )}

                        {/* Add to custom lists */}
                        {customLists.length > 0 ? (
                            <>
                                <div className="px-4 py-2">
                                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Add to Custom Lists</div>
                                </div>
                                <div className="max-h-48 overflow-y-auto">
                                    {customLists.map((list) => (
                                        <button
                                            key={list.id}
                                            onClick={() => {
                                                onAddToCustomList(item.id, list.id);
                                                setShowActionDropdown(false);
                                            }}
                                            className="w-full text-left px-4 py-3 text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 flex items-center gap-3 group"
                                        >
                                            <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                                            <div className="flex-1">
                                                <div className="font-medium text-sm">{list.name}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">{list.items.length} items</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="px-4 py-6 text-center">
                                <div className="text-gray-400 dark:text-gray-500">
                                    <div className="text-2xl mb-2">📂</div>
                                    <div className="font-medium text-sm">No custom lists available</div>
                                    <div className="text-xs mt-1">Create custom lists to organize your movies</div>
                                </div>
                            </div>
                        )}

                        {/* Show currently in lists */}
                        {item.customListIds.length > 0 && (
                            <>
                                <div className="mx-4 my-2 border-t border-gray-200 dark:border-gray-700"></div>
                                <div className="px-4 py-2">
                                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Currently In</div>
                                </div>
                                {availableLists
                                    .filter(list => !list.isSystem && item.customListIds.includes(list.id))
                                    .map((list) => (
                                        <div
                                            key={list.id}
                                            className="px-4 py-2 text-gray-600 dark:text-gray-400 flex items-center gap-3 text-sm"
                                        >
                                            <CheckCircle className="w-4 h-4 text-green-500" />
                                            <div className="flex-1">
                                                <div className="font-medium">{list.name}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-500">{list.items.length} items</div>
                                            </div>
                                        </div>
                                    ))}
                            </>
                        )}
                    </div>
                </div>
            );
        }
    };

    return (
        <div className="relative bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors group">
            <div className="relative rounded-t-lg">
                <Image
                    src={posterUrl}
                    alt={item.title}
                    width={300}
                    height={450}
                    className="w-full h-80 object-cover"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder-poster.jpg';
                    }}
                />

                {/* Status Badge */}
                <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium text-white ${statusColors[item.status]}`}>
                    {statusLabels[item.status]}
                </div>

                {/* Actions Overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 flex items-center justify-center transition-all duration-200">
                    <div className="opacity-0 group-hover:opacity-100 flex gap-2 transition-all duration-200">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowRating(!showRating);
                            }}
                            className="bg-yellow-600 hover:bg-yellow-700 text-white p-2 rounded-full transition-colors"
                            title="Rate"
                        >
                            <Star className="w-4 h-4" />
                        </button>
                        <div ref={dropdownButtonRef} className="relative action-dropdown-container">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowActionDropdown(!showActionDropdown);
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full transition-colors"
                                title="List actions"
                            >
                                <ArrowRight className="w-4 h-4" />
                            </button>
                            {showActionDropdown && renderActionDropdown()}
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onOpenDetailsModal(item);
                            }}
                            className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-full transition-colors"
                            title="View Details"
                        >
                            <Info className="w-4 h-4" />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemove(item.id);
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transition-colors"
                            title="Remove"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-4">
                <h3 className="font-semibold text-white text-sm mb-2 line-clamp-2 min-h-[2.5rem]">
                    {item.title}
                </h3>

                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Calendar className="w-3 h-3" />
                        <span>{year}</span>
                        {item.mediaType === 'tv' && <span>• TV Show</span>}
                    </div>

                    {item.rating && (
                        <div className="flex items-center gap-2 text-xs text-yellow-500">
                            <Star className="w-3 h-3 fill-current" />
                            <span>{item.rating}/10</span>
                        </div>
                    )}
                </div>

                {/* Rating Input */}
                {showRating && (
                    <div className="mt-3 p-2 bg-gray-700 rounded" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1 mb-2">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                                <button
                                    key={rating}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedRating(rating);
                                    }}
                                    className={`w-6 h-6 text-xs rounded ${rating <= selectedRating
                                        ? 'bg-yellow-500 text-black'
                                        : 'bg-gray-600 text-gray-300'
                                        } hover:bg-yellow-400 transition-colors`}
                                >
                                    {rating}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRatingSubmit();
                                }}
                                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
                            >
                                Save
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowRating(false);
                                }}
                                className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}



                {/* Festival Tracker Modal */}
                {showFestivalTracker && (
                    <FestivalTracker
                        item={item}
                        onUpdateFestivalData={onUpdateFestivalData}
                        onClose={() => setShowFestivalTracker(false)}
                    />
                )}
            </div>
        </div>
    );
};

export const MovieList: React.FC<MovieListProps> = ({ listId, onListsChanged }) => {
    const { user } = useAuth();
    const [list, setList] = useState<UserList | null>(null);
    const [availableLists, setAvailableLists] = useState<UserList[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [showFilters, setShowFilters] = useState(false);
    const [episodeTrackerState, setEpisodeTrackerState] = useState<{
        isOpen: boolean;
        itemId: string | null;
    }>({ isOpen: false, itemId: null });

    const [detailsModalState, setDetailsModalState] = useState<{
        isOpen: boolean;
        item: UserMediaItem | null;
    }>({ isOpen: false, item: null });
    const [filters, setFilters] = useState<FilterState>({
        search: '',
        mediaType: 'all',
        minRating: 0,
        maxRating: 10,
        yearRange: { start: 1900, end: new Date().getFullYear() },
        sortBy: 'dateAdded',
        sortOrder: 'desc'
    });

    // Filter and sort items based on current filters
    const getFilteredItems = useCallback((items: UserMediaItem[]): UserMediaItem[] => {
        let filtered = [...items];

        // Search filter
        if (filters.search) {
            filtered = filtered.filter(item =>
                item.title.toLowerCase().includes(filters.search.toLowerCase())
            );
        }

        // Media type filter
        if (filters.mediaType !== 'all') {
            filtered = filtered.filter(item => item.mediaType === filters.mediaType);
        }

        // Rating filter
        filtered = filtered.filter(item => {
            if (!item.rating) return filters.minRating === 0; // Include unrated if min is 0
            return item.rating >= filters.minRating && item.rating <= filters.maxRating;
        });

        // Year filter
        filtered = filtered.filter(item => {
            const year = new Date(item.release_date || item.first_air_date || '').getFullYear();
            return year >= filters.yearRange.start && year <= filters.yearRange.end;
        });

        // Sort items
        filtered.sort((a, b) => {
            let comparison = 0;

            switch (filters.sortBy) {
                case 'title':
                    comparison = a.title.localeCompare(b.title);
                    break;
                case 'year':
                    const yearA = new Date(a.release_date || a.first_air_date || '').getFullYear();
                    const yearB = new Date(b.release_date || b.first_air_date || '').getFullYear();
                    comparison = yearA - yearB;
                    break;
                case 'rating':
                    comparison = (a.rating || 0) - (b.rating || 0);
                    break;
                case 'dateAdded':
                    comparison = new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime();
                    break;
            }

            return filters.sortOrder === 'desc' ? -comparison : comparison;
        });

        return filtered;
    }, [filters]);

    const loadList = useCallback(async () => {
        if (!user) return;

        try {
            setIsLoading(true);
            setError('');

            const lists = await storageService.getUserLists(user.id);
            const targetList = lists.find(l => l.id === listId);

            if (targetList) {
                setList(targetList);
                setAvailableLists(lists);
            } else {
                setError('List not found');
            }
        } catch (err) {
            setError('Failed to load list');
            console.error('Error loading list:', err);
        } finally {
            setIsLoading(false);
        }
    }, [listId, user]);

    useEffect(() => {
        loadList();
    }, [loadList]);

    const handleRemoveItem = async (itemId: string) => {
        if (!user || !list) return;

        try {
            if (list.isSystem) {
                // For system lists, remove the item entirely
                await storageService.removeMediaFromList(user.id, listId, itemId);
            } else {
                // For custom lists, just remove from custom list membership
                await storageService.removeItemFromCustomList(user.id, listId, itemId);
            }

            await loadList(); // Reload the list
            if (onListsChanged) {
                await onListsChanged(); // Notify parent that lists changed
            }
        } catch (error) {
            console.error('Error removing item:', error);
        }
    };

    const handleUpdateRating = async (itemId: string, rating: number) => {
        if (!user || !list) return;

        try {
            const item = list.items.find(item => item.id === itemId);
            if (!item) return;

            // Track rating interaction
            trackingService.trackRating(item.mediaId, rating);

            // Find the system list containing this item
            const systemListId = item.status === 'to_watch' ? 'to-watch' : 'watched';
            await storageService.updateMediaItem(user.id, systemListId, itemId, { rating });
            await loadList(); // Reload the list
        } catch (error) {
            console.error('Error updating rating:', error);
        }
    };

    const handleChangeStatus = async (itemId: string, newStatus: 'to_watch' | 'watched') => {
        if (!user) return;

        try {
            await storageService.changeItemStatus(user.id, itemId, newStatus);

            // Force a complete reload of all lists to ensure UI is updated
            await loadList();

            // Notify parent that lists changed - this ensures other components update
            if (onListsChanged) {
                await onListsChanged();
            }

            // If this is an auto-completion from episode tracker, ensure we close the modal
            // if the item is no longer in the current list
            const updatedLists = await storageService.getUserLists(user.id);
            const currentList = updatedLists.find(l => l.id === listId);
            if (currentList && !currentList.items.find(item => item.id === itemId)) {
                // Item was moved to a different list, close the episode tracker
                setEpisodeTrackerState({ isOpen: false, itemId: null });
            }
        } catch (error) {
            console.error('Error changing status:', error);
        }
    };

    const handleAddToCustomList = async (itemId: string, customListId: string) => {
        if (!user) return;

        try {
            await storageService.addItemToCustomList(user.id, customListId, itemId);
            await loadList(); // Reload the list
            if (onListsChanged) {
                await onListsChanged(); // Notify parent that lists changed
            }
        } catch (error) {
            console.error('Error adding to custom list:', error);
        }
    };

    const handleRemoveFromCustomList = async (itemId: string, customListId: string) => {
        if (!user) return;

        try {
            await storageService.removeItemFromCustomList(user.id, customListId, itemId);
            await loadList(); // Reload the list
            if (onListsChanged) {
                await onListsChanged(); // Notify parent that lists changed
            }
        } catch (error) {
            console.error('Error removing from custom list:', error);
        }
    };

    const handleUpdateEpisodeProgress = async (itemId: string, progress: EpisodeProgress) => {
        if (!user) return;

        try {
            await storageService.updateEpisodeProgress(user.id, itemId, progress);
            await loadList(); // Reload the list to show updated progress
            if (onListsChanged) {
                await onListsChanged(); // Notify parent that lists changed
            }
        } catch (error) {
            console.error('Error updating episode progress:', error);
        }
    };

    const handleUpdateFestivalData = async (itemId: string, festivals: FestivalAward[], awards: Award[]) => {
        if (!user) return;

        try {
            await storageService.updateFestivalData(user.id, itemId, festivals, awards);
            await loadList(); // Reload the list to show updated festival data
            if (onListsChanged) {
                await onListsChanged(); // Notify parent that lists changed
            }
        } catch (error) {
            console.error('Error updating festival data:', error);
        }
    };


    const getListTitle = () => {
        if (list) return list.name;

        switch (listId) {
            case 'to-watch': return 'To Watch';
            case 'watched': return 'Already Watched';
            default: return 'Custom List';
        }
    };

    const getListDescription = () => {
        if (list?.description) return list.description;

        switch (listId) {
            case 'to-watch': return 'Movies and shows you want to watch';
            case 'watched': return 'Movies and shows you have watched';
            default: return 'Your custom list';
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-16">
                <p className="text-red-400">{error}</p>
            </div>
        );
    }

    // Get filtered items
    const filteredItems = list ? getFilteredItems(list.items) : [];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-semibold text-white">{getListTitle()}</h2>
                    <p className="text-gray-400 mt-1">{getListDescription()}</p>
                    {list && (
                        <p className="text-sm text-gray-500 mt-1">
                            {filteredItems.length} of {list.items.length} {list.items.length === 1 ? 'item' : 'items'}
                        </p>
                    )}
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-4 py-2 font-medium rounded-lg transition-colors flex items-center gap-2 ${showFilters
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                            }`}
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                        Filters
                    </button>
                    {/* <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
                        Add Movie
                    </button> */}
                </div>
            </div>

            {/* Search and Filter Bar */}
            <div className="space-y-4">
                {/* Quick Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search in this list..."
                        value={filters.search}
                        onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                        className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                {/* Advanced Filters */}
                {showFilters && (
                    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-white">Advanced Filters</h3>
                            <button
                                onClick={() => setShowFilters(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Media Type Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Media Type</label>
                                <select
                                    value={filters.mediaType}
                                    onChange={(e) => setFilters(prev => ({ ...prev, mediaType: e.target.value as 'all' | 'movie' | 'tv' }))}
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="all">All Types</option>
                                    <option value="movie">Movies</option>
                                    <option value="tv">TV Shows</option>
                                </select>
                            </div>

                            {/* Rating Range */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Rating Range</label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        min="0"
                                        max="10"
                                        value={filters.minRating}
                                        onChange={(e) => setFilters(prev => ({ ...prev, minRating: Number(e.target.value) }))}
                                        className="w-full px-2 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Min"
                                    />
                                    <span className="text-gray-400 self-center">to</span>
                                    <input
                                        type="number"
                                        min="0"
                                        max="10"
                                        value={filters.maxRating}
                                        onChange={(e) => setFilters(prev => ({ ...prev, maxRating: Number(e.target.value) }))}
                                        className="w-full px-2 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Max"
                                    />
                                </div>
                            </div>

                            {/* Sort Options */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Sort By</label>
                                <select
                                    value={filters.sortBy}
                                    onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as FilterState['sortBy'] }))}
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="title">Title</option>
                                    <option value="year">Year</option>
                                    <option value="rating">Rating</option>
                                    <option value="dateAdded">Date Added</option>
                                </select>
                            </div>

                            {/* Sort Order */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Sort Order</label>
                                <select
                                    value={filters.sortOrder}
                                    onChange={(e) => setFilters(prev => ({ ...prev, sortOrder: e.target.value as 'asc' | 'desc' }))}
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="desc">Descending</option>
                                    <option value="asc">Ascending</option>
                                </select>
                            </div>
                        </div>

                        {/* Reset Filters Button */}
                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={() => setFilters({
                                    search: '',
                                    mediaType: 'all',
                                    minRating: 0,
                                    maxRating: 10,
                                    yearRange: { start: 1900, end: new Date().getFullYear() },
                                    sortBy: 'dateAdded',
                                    sortOrder: 'desc'
                                })}
                                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                            >
                                Reset Filters
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {list && filteredItems.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 overflow-visible">
                    {filteredItems.map((item) => (
                        <MovieCard
                            key={item.id}
                            item={item}
                            onRemove={handleRemoveItem}
                            onUpdateRating={handleUpdateRating}
                            onChangeStatus={handleChangeStatus}
                            onAddToCustomList={handleAddToCustomList}
                            onRemoveFromCustomList={handleRemoveFromCustomList}
                            onUpdateFestivalData={handleUpdateFestivalData}
                            onOpenEpisodeTracker={(itemId) => setEpisodeTrackerState({ isOpen: true, itemId })}
                            onOpenDetailsModal={(item) => setDetailsModalState({ isOpen: true, item })}
                            availableLists={availableLists}
                            currentListId={listId}
                            isCustomList={!list.isSystem}
                        />
                    ))}
                </div>
            ) : list && list.items.length > 0 ? (
                <div className="text-center py-16">
                    <div className="flex flex-col items-center">
                        <div className="p-4 bg-gray-800 rounded-full mb-4">
                            <Filter className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-400 mb-2">No items match your current filters.</p>
                        <p className="text-gray-500 text-sm mb-6">
                            Try adjusting your search terms or filter criteria.
                        </p>
                        <button
                            onClick={() => {
                                setFilters({
                                    search: '',
                                    mediaType: 'all',
                                    minRating: 0,
                                    maxRating: 10,
                                    yearRange: { start: 1900, end: new Date().getFullYear() },
                                    sortBy: 'dateAdded',
                                    sortOrder: 'desc'
                                });
                                setShowFilters(false);
                            }}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                        >
                            Clear Filters
                        </button>
                    </div>
                </div>
            ) : (
                <div className="text-center py-16">
                    <div className="flex flex-col items-center">
                        <div className="p-4 bg-gray-800 rounded-full mb-4">
                            {listId === 'to-watch' ? (
                                <Eye className="w-8 h-8 text-gray-400" />
                            ) : (
                                <CheckCircle className="w-8 h-8 text-gray-400" />
                            )}
                        </div>
                        <p className="text-gray-400 mb-2">No movies in this list yet.</p>
                        <p className="text-gray-500 text-sm mb-6">
                            Use the search feature to find and add movies to your list.
                        </p>
                        <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
                            Search Movies
                        </button>
                    </div>
                </div>
            )}

            {/* Episode Tracker Modal */}
            {episodeTrackerState.isOpen && episodeTrackerState.itemId && (() => {
                const currentItem = list?.items.find(item => item.id === episodeTrackerState.itemId);
                return currentItem && currentItem.mediaType === 'tv' && (
                    <EpisodeTracker
                        item={currentItem}
                        onUpdateProgress={handleUpdateEpisodeProgress}
                        onChangeStatus={handleChangeStatus}
                        onClose={() => setEpisodeTrackerState({ isOpen: false, itemId: null })}
                    />
                );
            })()}

            {/* Movie Details Modal */}
            {detailsModalState.isOpen && detailsModalState.item && (
                <MovieDetailsModal
                    item={detailsModalState.item}
                    onClose={() => setDetailsModalState({ isOpen: false, item: null })}
                />
            )}
        </div>
    );
}; 