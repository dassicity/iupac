'use client';

import React, { useState, useEffect } from 'react';
import { Play, Check, X } from 'lucide-react';
import { UserMediaItem, Season, Episode, EpisodeProgress, WatchedEpisode } from '@/types';
import { tmdbService } from '@/services/api';

interface EpisodeTrackerProps {
    item: UserMediaItem;
    onUpdateProgress: (itemId: string, progress: EpisodeProgress) => void;
    onChangeStatus: (itemId: string, newStatus: 'to_watch' | 'watched') => void;
    onClose: () => void;
}

export const EpisodeTracker: React.FC<EpisodeTrackerProps> = ({ item, onUpdateProgress, onChangeStatus, onClose }) => {
    const [seasons, setSeasons] = useState<Season[]>([]);
    const [selectedSeason, setSelectedSeason] = useState(1);
    const [episodes, setEpisodes] = useState<Episode[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCompletedMessage, setShowCompletedMessage] = useState(false);
    const [progress, setProgress] = useState<EpisodeProgress>(
        item.episodeProgress || {
            totalSeasons: 0,
            totalEpisodes: 0,
            watchedEpisodes: [],
            currentSeason: 1,
            currentEpisode: 1,
            isCompleted: false,
        }
    );

    // Load TV show details and seasons
    useEffect(() => {
        const loadTVShowDetails = async () => {
            if (item.mediaType !== 'tv') return;

            try {
                setIsLoading(true);
                const tvDetails = await tmdbService.getTVShowDetails(item.mediaId);

                if (tvDetails.seasons) {
                    // Filter out season 0 (specials) for simplicity
                    const regularSeasons = tvDetails.seasons.filter(season => season.season_number > 0);
                    setSeasons(regularSeasons);

                    // Initialize progress if not exists
                    if (!item.episodeProgress) {
                        const totalEpisodes = regularSeasons.reduce((total, season) => total + season.episode_count, 0);
                        setProgress(prev => ({
                            ...prev,
                            totalSeasons: regularSeasons.length,
                            totalEpisodes,
                        }));
                    }
                }
            } catch (error) {
                console.error('Error loading TV show details:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadTVShowDetails();
    }, [item.mediaId, item.mediaType, item.episodeProgress]);

    // Load episodes for selected season
    useEffect(() => {
        const loadEpisodes = async () => {
            if (item.mediaType !== 'tv' || !selectedSeason) return;

            try {
                // Note: This would require a new TMDB API endpoint for season details
                // For now, we'll create mock episodes based on season data
                const season = seasons.find(s => s.season_number === selectedSeason);
                if (season) {
                    const mockEpisodes: Episode[] = Array.from({ length: season.episode_count }, (_, index) => ({
                        id: index + 1,
                        name: `Episode ${index + 1}`,
                        overview: `Episode ${index + 1} of Season ${selectedSeason}`,
                        air_date: season.air_date,
                        episode_number: index + 1,
                        season_number: selectedSeason,
                        vote_average: 0,
                        vote_count: 0,
                    }));
                    setEpisodes(mockEpisodes);
                }
            } catch (error) {
                console.error('Error loading episodes:', error);
            }
        };

        if (seasons.length > 0) {
            loadEpisodes();
        }
    }, [selectedSeason, seasons, item.mediaType]);

    const isEpisodeWatched = (seasonNum: number, episodeNum: number): boolean => {
        return progress.watchedEpisodes.some(
            ep => ep.seasonNumber === seasonNum && ep.episodeNumber === episodeNum
        );
    };

    const toggleEpisodeWatched = (seasonNum: number, episodeNum: number) => {
        const isWatched = isEpisodeWatched(seasonNum, episodeNum);

        let newWatchedEpisodes: WatchedEpisode[];

        if (isWatched) {
            // Remove episode from watched list
            newWatchedEpisodes = progress.watchedEpisodes.filter(
                ep => !(ep.seasonNumber === seasonNum && ep.episodeNumber === episodeNum)
            );
        } else {
            // Add episode to watched list
            const newWatchedEpisode: WatchedEpisode = {
                seasonNumber: seasonNum,
                episodeNumber: episodeNum,
                watchedDate: new Date().toISOString(),
            };
            newWatchedEpisodes = [...progress.watchedEpisodes, newWatchedEpisode];
        }

        // Update current position and completion status
        const sortedWatched = newWatchedEpisodes.sort((a, b) => {
            if (a.seasonNumber !== b.seasonNumber) return a.seasonNumber - b.seasonNumber;
            return a.episodeNumber - b.episodeNumber;
        });

        const lastWatched = sortedWatched[sortedWatched.length - 1];
        const isCompleted = newWatchedEpisodes.length === progress.totalEpisodes;

        const newProgress: EpisodeProgress = {
            ...progress,
            watchedEpisodes: newWatchedEpisodes,
            currentSeason: lastWatched?.seasonNumber || 1,
            currentEpisode: lastWatched?.episodeNumber || 1,
            isCompleted,
            lastWatchedDate: lastWatched?.watchedDate,
        };

        setProgress(newProgress);
        onUpdateProgress(item.id, newProgress);

        // Auto-move to "watched" list if all episodes are completed and currently in "to-watch"
        if (isCompleted && item.status === 'to_watch') {
            setShowCompletedMessage(true);
            // Hide message after 3 seconds
            setTimeout(() => setShowCompletedMessage(false), 3000);
            // Delay the status change to allow the user to see the completion message
            // and prevent the modal from closing immediately
            setTimeout(() => {
                onChangeStatus(item.id, 'watched');
            }, 100);
        }
    };

    const markSeasonWatched = (seasonNum: number) => {
        const season = seasons.find(s => s.season_number === seasonNum);
        if (!season) return;

        const seasonEpisodes: WatchedEpisode[] = Array.from({ length: season.episode_count }, (_, index) => ({
            seasonNumber: seasonNum,
            episodeNumber: index + 1,
            watchedDate: new Date().toISOString(),
        }));

        // Remove existing episodes from this season and add new ones
        const otherSeasonEpisodes = progress.watchedEpisodes.filter(ep => ep.seasonNumber !== seasonNum);
        const newWatchedEpisodes = [...otherSeasonEpisodes, ...seasonEpisodes];

        const isCompleted = newWatchedEpisodes.length === progress.totalEpisodes;

        const newProgress: EpisodeProgress = {
            ...progress,
            watchedEpisodes: newWatchedEpisodes,
            currentSeason: seasonNum,
            currentEpisode: season.episode_count,
            isCompleted,
            lastWatchedDate: new Date().toISOString(),
        };

        setProgress(newProgress);
        onUpdateProgress(item.id, newProgress);

        // Auto-move to "watched" list if all episodes are completed and currently in "to-watch"
        if (isCompleted && item.status === 'to_watch') {
            setShowCompletedMessage(true);
            // Hide message after 3 seconds
            setTimeout(() => setShowCompletedMessage(false), 3000);
            // Delay the status change to allow the user to see the completion message
            // and prevent the modal from closing immediately
            setTimeout(() => {
                onChangeStatus(item.id, 'watched');
            }, 100);
        }
    };

    const getWatchedCount = (seasonNum: number): number => {
        return progress.watchedEpisodes.filter(ep => ep.seasonNumber === seasonNum).length;
    };

    const getOverallProgress = (): number => {
        if (progress.totalEpisodes === 0) return 0;
        return Math.round((progress.watchedEpisodes.length / progress.totalEpisodes) * 100);
    };

    if (item.mediaType !== 'tv') {
        return null;
    }

    if (isLoading) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-gray-800 rounded-lg p-8">
                    <div className="w-8 h-8 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
                    <p className="text-gray-400 mt-4 text-center">Loading episodes...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
            <div className="bg-gray-800 rounded-lg w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="p-4 sm:p-6 border-b border-gray-700 flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-lg sm:text-xl font-bold text-white truncate">{item.title} - Episode Tracker</h2>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2">
                            <span className="text-xs sm:text-sm text-gray-400">
                                {progress.watchedEpisodes.length} of {progress.totalEpisodes} episodes watched
                            </span>
                            <div className="flex items-center gap-2">
                                <div className="w-24 sm:w-32 bg-gray-700 rounded-full h-2">
                                    <div
                                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${getOverallProgress()}%` }}
                                    ></div>
                                </div>
                                <span className="text-xs sm:text-sm text-blue-400">{getOverallProgress()}%</span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors ml-2 flex-shrink-0"
                    >
                        <X className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                </div>

                {/* Completion Message */}
                {showCompletedMessage && (
                    <div className="bg-green-600 text-white px-4 py-2 text-sm text-center">
                        🎉 Congratulations! Show completed and moved to &quot;Watched&quot; list!
                    </div>
                )}

                <div className="flex flex-col lg:flex-row h-[calc(95vh-100px)] sm:h-[calc(90vh-120px)]">
                    {/* Season Selector */}
                    <div className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-gray-700 p-3 sm:p-4 overflow-y-auto max-h-48 lg:max-h-none">
                        <h3 className="text-base sm:text-lg font-semibold text-white mb-3">Seasons</h3>
                        <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible">
                            {seasons.map((season) => {
                                const watchedCount = getWatchedCount(season.season_number);
                                const seasonProgress = Math.round((watchedCount / season.episode_count) * 100);

                                return (
                                    <div key={season.id} className="flex-shrink-0 lg:flex-shrink lg:space-y-2">
                                        <button
                                            onClick={() => setSelectedSeason(season.season_number)}
                                            className={`w-32 lg:w-full text-left p-2 sm:p-3 rounded-lg transition-colors ${selectedSeason === season.season_number
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                }`}
                                        >
                                            <div className="font-medium text-sm lg:text-base">{season.name}</div>
                                            <div className="text-xs lg:text-sm opacity-75">
                                                {watchedCount}/{season.episode_count} ({seasonProgress}%)
                                            </div>
                                            <div className="w-full bg-gray-600 rounded-full h-1 mt-1 lg:mt-2">
                                                <div
                                                    className="bg-blue-400 h-1 rounded-full transition-all duration-300"
                                                    style={{ width: `${seasonProgress}%` }}
                                                ></div>
                                            </div>
                                        </button>

                                        {selectedSeason === season.season_number && (
                                            <button
                                                onClick={() => markSeasonWatched(season.season_number)}
                                                className="w-32 lg:w-full px-2 lg:px-3 py-1 lg:py-2 text-xs lg:text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors mt-1 lg:mt-0"
                                            >
                                                Mark Season Watched
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Episode List */}
                    <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto">
                        <div className="flex justify-between items-center mb-4 lg:mb-6">
                            <h3 className="text-base sm:text-lg font-semibold text-white">
                                Season {selectedSeason} Episodes
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                            {episodes.map((episode) => {
                                const isWatched = isEpisodeWatched(episode.season_number, episode.episode_number);

                                return (
                                    <div
                                        key={episode.id}
                                        className={`p-3 sm:p-4 rounded-lg border transition-all duration-200 ${isWatched
                                            ? 'bg-green-900/20 border-green-500/30'
                                            : 'bg-gray-700/50 border-gray-600 hover:border-gray-500'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="font-medium text-white text-sm sm:text-base">
                                                Episode {episode.episode_number}
                                            </h4>
                                            <button
                                                onClick={() => toggleEpisodeWatched(episode.season_number, episode.episode_number)}
                                                className={`p-1.5 sm:p-2 rounded-full transition-colors ${isWatched
                                                    ? 'bg-green-600 hover:bg-green-700 text-white'
                                                    : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                                                    }`}
                                            >
                                                {isWatched ? <Check className="w-3 h-3 sm:w-4 sm:h-4" /> : <Play className="w-3 h-3 sm:w-4 sm:h-4" />}
                                            </button>
                                        </div>

                                        <p className="text-xs sm:text-sm text-gray-400 mb-2 sm:mb-3">{episode.name}</p>

                                        {episode.overview && (
                                            <p className="text-xs text-gray-500 line-clamp-2">
                                                {episode.overview}
                                            </p>
                                        )}

                                        {isWatched && (
                                            <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-600">
                                                <div className="flex items-center gap-2 text-xs text-green-400">
                                                    <Check className="w-3 h-3" />
                                                    <span>Watched</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}; 