'use client';

import React, { useState, useCallback } from 'react';
import { Search, Film, Tv, Plus, Star, Calendar } from 'lucide-react';
import { tmdbService } from '@/services/api';
import { Movie, TVShow } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { storageService } from '@/services/storage';
import { trackingService } from '@/services/tracking';
import Image from 'next/image';

type MediaType = 'movie' | 'tv';

interface MediaCardProps {
    media: Movie | TVShow;
    mediaType: MediaType;
    onAddToList: (media: Movie | TVShow, mediaType: MediaType) => void;
}

const MediaCard: React.FC<MediaCardProps> = ({ media, mediaType, onAddToList }) => {
    const isMovie = mediaType === 'movie';
    const title = isMovie ? (media as Movie).title : (media as TVShow).name;
    const releaseDate = isMovie ? (media as Movie).release_date : (media as TVShow).first_air_date;
    const year = releaseDate ? new Date(releaseDate).getFullYear() : 'N/A';

    const posterUrl = media.poster_path
        ? `https://image.tmdb.org/t/p/w300${media.poster_path}`
        : '/placeholder-poster.jpg';

    return (
        <div className="bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors group">
            <div className="relative">
                <Image
                    src={posterUrl}
                    alt={title}
                    width={300}
                    height={450}
                    className="w-full h-80 object-cover"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder-poster.jpg';
                    }}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 flex items-center justify-center transition-all duration-200">
                    <button
                        onClick={() => onAddToList(media, mediaType)}
                        className="opacity-0 group-hover:opacity-100 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full transition-all duration-200 transform scale-90 group-hover:scale-100"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="p-4">
                <h3 className="font-semibold text-white text-sm mb-2 line-clamp-2 min-h-[2.5rem]">
                    {title}
                </h3>

                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Calendar className="w-3 h-3" />
                        <span>{year}</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Star className="w-3 h-3 text-yellow-500" />
                        <span>{media.vote_average.toFixed(1)}/10</span>
                    </div>

                    {!isMovie && (media as TVShow).number_of_seasons && (
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Tv className="w-3 h-3" />
                            <span>{(media as TVShow).number_of_seasons} seasons</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

interface SearchPageProps {
    onListsChanged?: () => Promise<void>;
}

export const SearchPage: React.FC<SearchPageProps> = ({ onListsChanged }) => {
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<MediaType>('movie');
    const [movieResults, setMovieResults] = useState<Movie[]>([]);
    const [tvResults, setTvResults] = useState<TVShow[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [hasSearched, setHasSearched] = useState(false);

    const performSearch = useCallback(async (query: string, page: number = 1, append: boolean = false) => {
        if (!query.trim()) return;

        setIsLoading(true);
        setError('');

        try {
            const [movieResponse, tvResponse] = await Promise.all([
                tmdbService.searchMovies(query, page),
                tmdbService.searchTVShows(query, page)
            ]);

            if (append) {
                setMovieResults(prev => [...prev, ...movieResponse.results]);
                setTvResults(prev => [...prev, ...tvResponse.results]);
            } else {
                setMovieResults(movieResponse.results);
                setTvResults(tvResponse.results);
                setTotalPages(activeTab === 'movie' ? movieResponse.total_pages : tvResponse.total_pages);
            }

            setCurrentPage(page);
            setHasSearched(true);
        } catch (err) {
            setError('Failed to search. Please try again.');
            console.error('Search error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [activeTab]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        // Track search query
        trackingService.trackSearch(searchQuery);

        setCurrentPage(1);
        performSearch(searchQuery, 1, false);
    };

    const handleLoadMore = () => {
        if (currentPage < totalPages) {
            performSearch(searchQuery, currentPage + 1, true);
        }
    };

    const handleAddToList = async (media: Movie | TVShow, mediaType: MediaType) => {
        if (!user) return;

        try {
            const isMovie = mediaType === 'movie';
            const title = isMovie ? (media as Movie).title : (media as TVShow).name;
            const releaseDate = isMovie ? (media as Movie).release_date : (media as TVShow).first_air_date;

            // Track movie addition
            trackingService.trackMovieAction('add', media.id, 'to-watch');

            // Add to "To Watch" list by default
            await storageService.addMediaToList(user.id, 'to-watch', {
                mediaType,
                mediaId: media.id,
                title,
                poster_path: media.poster_path,
                release_date: releaseDate,
                status: 'to_watch',
                tags: [],
                isFavorite: false,
                watchCount: 0,
                festivals: [],
                awards: [],
                customListIds: [] // Initialize empty custom list memberships
            });

            // TODO: Add success notification
            console.log(`Added ${title} to To Watch list`);
            if (onListsChanged) {
                await onListsChanged(); // Notify parent that lists have changed
            }
        } catch (error) {
            console.error('Error adding to list:', error);
            // TODO: Add error notification
        }
    };

    const currentResults = activeTab === 'movie' ? movieResults : tvResults;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-semibold text-white">Search Movies & TV Shows</h2>
                <p className="text-gray-400 mt-2">
                    Search for movies and TV shows to add to your lists
                </p>
            </div>

            {/* Search Form */}
            <form onSubmit={handleSearch} className="flex gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search for movies, TV shows, directors, actors..."
                        className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                    />
                </div>
                <button
                    type="submit"
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                    disabled={!searchQuery.trim() || isLoading}
                >
                    {isLoading ? 'Searching...' : 'Search'}
                </button>
            </form>

            {/* Tabs */}
            {hasSearched && (
                <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg w-fit">
                    <button
                        onClick={() => setActiveTab('movie')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${activeTab === 'movie'
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-400 hover:text-white hover:bg-gray-700'
                            }`}
                    >
                        <Film className="w-4 h-4" />
                        Movies ({movieResults.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('tv')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${activeTab === 'tv'
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-400 hover:text-white hover:bg-gray-700'
                            }`}
                    >
                        <Tv className="w-4 h-4" />
                        TV Shows ({tvResults.length})
                    </button>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="bg-red-900/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* Results */}
            {hasSearched ? (
                currentResults.length > 0 ? (
                    <div className="space-y-6">
                        {/* Results Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {currentResults.map((item) => (
                                <MediaCard
                                    key={item.id}
                                    media={item}
                                    mediaType={activeTab}
                                    onAddToList={handleAddToList}
                                />
                            ))}
                        </div>

                        {/* Load More */}
                        {currentPage < totalPages && (
                            <div className="text-center">
                                <button
                                    onClick={handleLoadMore}
                                    disabled={isLoading}
                                    className="px-6 py-3 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
                                >
                                    {isLoading ? 'Loading...' : 'Load More'}
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <p className="text-gray-400">No {activeTab === 'movie' ? 'movies' : 'TV shows'} found for &quot;{searchQuery}&quot;</p>
                        <p className="text-gray-500 text-sm mt-2">Try different search terms or check the other tab</p>
                    </div>
                )
            ) : (
                <div className="text-center py-16">
                    <Search className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-400">Enter a search term to find movies and TV shows</p>
                    <p className="text-gray-500 text-sm mt-2">Search by title, director, actor, or any keyword</p>
                </div>
            )}
        </div>
    );
}; 