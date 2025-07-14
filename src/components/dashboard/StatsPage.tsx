'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    BarChart3,
    TrendingUp,
    Clock,
    Star,
    Eye,
    Award,
    Film,
    Tv,
    ThumbsUp,
    Target,
    RefreshCw
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { storageService } from '@/services/storage';
import { UserStats } from '@/types';

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    subtitle?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon: Icon, color, subtitle }) => (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-gray-400 text-sm font-medium">{title}</p>
                <p className="text-2xl font-bold text-white mt-1">{value}</p>
                {subtitle && <p className="text-gray-500 text-xs mt-1">{subtitle}</p>}
            </div>
            <div className={`p-3 rounded-lg ${color.includes('blue') ? 'bg-blue-600/20' :
                color.includes('green') ? 'bg-green-600/20' :
                    color.includes('purple') ? 'bg-purple-600/20' :
                        color.includes('yellow') ? 'bg-yellow-600/20' :
                            color.includes('red') ? 'bg-red-600/20' : 'bg-gray-600/20'}`}>
                <Icon className={`w-6 h-6 ${color}`} />
            </div>
        </div>
    </div>
);

interface ProgressBarProps {
    label: string;
    value: number;
    maxValue: number;
    color: string;
    showValue?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ label, value, maxValue, color, showValue = true }) => {
    const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

    return (
        <div className="space-y-2">
            <div className="flex justify-between text-sm">
                <span className="text-gray-300">{label}</span>
                {showValue && <span className="text-gray-400">{value}</span>}
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                    className={`h-2 rounded-full transition-all duration-300 ${color}`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                />
            </div>
        </div>
    );
};

interface RatingDistributionProps {
    ratings: { [key: number]: number };
}

const RatingDistribution: React.FC<RatingDistributionProps> = ({ ratings }) => {
    const maxCount = Math.max(...Object.values(ratings));

    return (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-400" />
                Rating Distribution
            </h3>
            <div className="space-y-3">
                {Array.from({ length: 10 }, (_, i) => i + 1).reverse().map((rating) => (
                    <ProgressBar
                        key={rating}
                        label={`${rating} Star${rating !== 1 ? 's' : ''}`}
                        value={ratings[rating] || 0}
                        maxValue={maxCount}
                        color="bg-yellow-500"
                    />
                ))}
            </div>
        </div>
    );
};

interface GenreChartProps {
    genres: Array<{ genre: string; count: number; percentage: number }>;
}

const GenreChart: React.FC<GenreChartProps> = ({ genres }) => {
    const topGenres = genres.slice(0, 8);

    return (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Film className="w-5 h-5 text-blue-400" />
                Top Genres
            </h3>
            <div className="space-y-3">
                {topGenres.map((genre) => (
                    <div key={genre.genre} className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-300">{genre.genre}</span>
                            <span className="text-gray-400">{genre.count} ({genre.percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                            <div
                                className="h-2 rounded-full bg-blue-500 transition-all duration-300"
                                style={{ width: `${genre.percentage}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

interface WatchingTrendsProps {
    trends: Array<{ period: string; count: number; avgRating: number }>;
}

const WatchingTrends: React.FC<WatchingTrendsProps> = ({ trends }) => {
    const maxCount = Math.max(...trends.map(t => t.count));

    return (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                Monthly Trends
            </h3>
            <div className="space-y-4">
                {trends.slice(0, 6).map((trend) => (
                    <div key={trend.period} className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-300">{trend.period}</span>
                            <div className="flex gap-4">
                                <span className="text-gray-400">{trend.count} items</span>
                                <span className="text-yellow-400">★ {trend.avgRating.toFixed(1)}</span>
                            </div>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                            <div
                                className="h-2 rounded-full bg-green-500 transition-all duration-300"
                                style={{ width: `${maxCount > 0 ? (trend.count / maxCount) * 100 : 0}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Enhanced Analytics Components
// Commented out components for future implementation
// interface ViewingPatternsProps {
//     patterns: {
//         avgSessionLength: number;
//         mostActiveDay: string;
//         mostActiveTime: string;
//         bingeSessions: number;
//         completionRate: number;
//     };
// }

// const ViewingPatterns: React.FC<ViewingPatternsProps> = ({ patterns }) => (
//     <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
//         <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
//             <Activity className="w-5 h-5 text-blue-400" />
//             Viewing Patterns
//         </h3>
//         {/* Component implementation */}
//     </div>
// );

// interface EpisodeStatsProps {
//     episodeStats: {
//         totalEpisodes: number;
//         watchedEpisodes: number;
//         averageEpisodesPerShow: number;
//         longestBinge: number;
//         showsCompleted: number;
//         showsInProgress: number;
//     };
// }

// const EpisodeStats: React.FC<EpisodeStatsProps> = ({ episodeStats }) => (
//     <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
//         <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
//             <PlayCircle className="w-5 h-5 text-green-400" />
//             Episode Tracking
//         </h3>
//         {/* Component implementation */}
//     </div>
// );

// interface RatingInsightsProps {
//     insights: {
//         ratingTrend: 'increasing' | 'decreasing' | 'stable';
//         harshestRated: string;
//         mostGenerous: string;
//         ratingConsistency: number;
//         perfectRatings: number;
//         worstRatings: number;
//     };
// }

// const RatingInsights: React.FC<RatingInsightsProps> = ({ insights }) => (
//     <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
//         <h3 className="text-lg font-semibent text-white mb-4 flex items-center gap-2">
//             <Star className="w-5 h-5 text-yellow-400" />
//             Rating Insights
//         </h3>
//         {/* Component implementation */}
//     </div>
// );

// interface TimeAnalyticsProps {
//     timeData: {
//         totalWatchTime: number;
//         averageMovieLength: number;
//         longestMovie: string;
//         shortestMovie: string;
//         weekdayHours: number;
//         weekendHours: number;
//         monthlyHours: number[];
//     };
// }

// const TimeAnalytics: React.FC<TimeAnalyticsProps> = ({ timeData }) => (
//     <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
//         <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
//             <Clock className="w-5 h-5 text-purple-400" />
//             Time Analytics
//         </h3>
//         {/* Component implementation */}
//     </div>
// );

export const StatsPage: React.FC = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState<UserStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string>('');

    // Enhanced analytics state (commented out for future implementation)
    // const [viewingPatterns, setViewingPatterns] = useState<ViewingPatternsProps['patterns'] | null>(null);
    // const [episodeStats, setEpisodeStats] = useState<EpisodeStatsProps['episodeStats'] | null>(null);
    // const [ratingInsights, setRatingInsights] = useState<RatingInsightsProps['insights'] | null>(null);
    // const [timeAnalytics, setTimeAnalytics] = useState<TimeAnalyticsProps['timeData'] | null>(null);

    const calculateStats = useCallback(async (): Promise<UserStats> => {
        if (!user) throw new Error('User not found');

        // Get all user data
        const lists = await storageService.getUserLists(user.id);
        // Note: journalEntries could be used for future stats like writing frequency
        // const journalEntries = await storageService.getJournalEntries(user.id);

        // Get all media items
        const allItems = lists.flatMap(list => list.items);
        const movies = allItems.filter(item => item.mediaType === 'movie');
        const tvShows = allItems.filter(item => item.mediaType === 'tv');
        const watchedItems = allItems.filter(item => item.status === 'watched');
        const toWatchItems = allItems.filter(item => item.status === 'to_watch');
        const ratedItems = allItems.filter(item => item.rating && item.rating > 0);

        // Calculate basic stats
        const totalMovies = movies.length;
        const totalTVShows = tvShows.length;
        const totalWatched = watchedItems.length;
        const totalToWatch = toWatchItems.length;
        const totalRated = ratedItems.length;
        const averageRating = ratedItems.length > 0
            ? ratedItems.reduce((sum, item) => sum + (item.rating || 0), 0) / ratedItems.length
            : 0;

        // Calculate genre stats (simplified - using basic genre extraction)
        const genreCount: { [key: string]: number } = {};
        allItems.forEach(item => {
            // For now, we'll use basic genre extraction from tags or create dummy data
            // In a real implementation, you'd extract this from TMDB data
            item.tags.forEach(tag => {
                genreCount[tag] = (genreCount[tag] || 0) + 1;
            });
        });

        const topGenres = Object.entries(genreCount)
            .map(([genre, count]) => ({
                genre,
                count,
                percentage: allItems.length > 0 ? (count / allItems.length) * 100 : 0
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // Calculate watching trends by month
        const monthlyTrends: { [key: string]: { count: number; ratings: number[] } } = {};
        allItems.forEach(item => {
            const date = new Date(item.dateAdded);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (!monthlyTrends[monthKey]) {
                monthlyTrends[monthKey] = { count: 0, ratings: [] };
            }
            monthlyTrends[monthKey].count++;
            if (item.rating) {
                monthlyTrends[monthKey].ratings.push(item.rating);
            }
        });

        const watchingTrends = Object.entries(monthlyTrends)
            .map(([period, data]) => ({
                period: new Date(period + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
                count: data.count,
                avgRating: data.ratings.length > 0
                    ? data.ratings.reduce((sum, rating) => sum + rating, 0) / data.ratings.length
                    : 0
            }))
            .sort((a, b) => new Date(b.period).getTime() - new Date(a.period).getTime())
            .slice(0, 12);

        // Placeholder for other complex stats
        const topDirectors: Array<{ name: string; count: number; averageRating: number }> = [];
        const topActors: Array<{ name: string; count: number; averageRating: number }> = [];
        const festivalStats: Array<{ festival: string; count: number; avgRating: number }> = [];

        return {
            totalMovies,
            totalTVShows,
            totalWatched,
            totalToWatch,
            totalRated,
            averageRating,
            topGenres,
            topDirectors,
            topActors,
            watchingTrends,
            festivalStats
        };
    }, [user]);

    const loadStats = useCallback(async () => {
        if (!user) return;

        try {
            setIsLoading(true);
            setError('');
            const calculatedStats = await calculateStats();
            setStats(calculatedStats);
        } catch (err) {
            setError('Failed to load statistics');
            console.error('Error loading stats:', err);
        } finally {
            setIsLoading(false);
        }
    }, [user, calculateStats]);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    // Auto-refresh when the user returns to the page
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden && user) {
                loadStats();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [loadStats, user]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-20">
                <div className="p-4 bg-red-600/20 rounded-full mb-4 mx-auto w-fit">
                    <BarChart3 className="w-8 h-8 text-red-400" />
                </div>
                <h2 className="text-lg font-semibold text-red-400 mb-2">Error loading statistics</h2>
                <p className="text-gray-400">{error}</p>
                <button
                    onClick={loadStats}
                    className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                    Try Again
                </button>
            </div>
        );
    }

    if (!stats || (stats.totalMovies === 0 && stats.totalTVShows === 0)) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Statistics</h1>
                    <p className="text-gray-400 text-sm">
                        Track your viewing habits and preferences
                    </p>
                </div>

                <div className="text-center py-20">
                    <div className="p-4 bg-gray-800 rounded-full mb-4 mx-auto w-fit">
                        <BarChart3 className="w-8 h-8 text-gray-400" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-300 mb-2">No statistics available yet</h2>
                    <p className="text-gray-400 mb-2">
                        Start adding movies and TV shows to see your viewing statistics
                    </p>
                    <p className="text-gray-500 text-sm">
                        Use the search feature to discover and add content to your lists
                    </p>
                </div>
            </div>
        );
    }

    // Calculate rating distribution from current stats
    const ratingDistribution: { [key: number]: number } = {};

    // Initialize all ratings to 0
    for (let i = 1; i <= 10; i++) {
        ratingDistribution[i] = 0;
    }

    // For now, create a simple distribution based on available data
    // In a real implementation, this would be calculated in the calculateStats function
    if (stats && stats.totalRated > 0) {
        // Simple distribution for demonstration
        ratingDistribution[Math.floor(stats.averageRating)] = stats.totalRated;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Statistics</h1>
                    <p className="text-gray-400 text-sm">
                        Track your viewing habits and preferences
                    </p>
                </div>
                <button
                    onClick={loadStats}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                    title="Refresh statistics"
                >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Main Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    title="Total Movies"
                    value={stats.totalMovies}
                    icon={Film}
                    color="text-blue-400"
                    subtitle={`${stats.totalWatched} watched`}
                />
                <StatsCard
                    title="Total TV Shows"
                    value={stats.totalTVShows}
                    icon={Tv}
                    color="text-green-400"
                    subtitle={`${stats.totalToWatch} to watch`}
                />
                <StatsCard
                    title="Average Rating"
                    value={stats.averageRating.toFixed(1)}
                    icon={Star}
                    color="text-yellow-400"
                    subtitle={`${stats.totalRated} rated`}
                />
                <StatsCard
                    title="Total Items"
                    value={stats.totalMovies + stats.totalTVShows}
                    icon={Target}
                    color="text-purple-400"
                    subtitle="in your collection"
                />
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    title="Watched"
                    value={stats.totalWatched}
                    icon={Eye}
                    color="text-green-400"
                />
                <StatsCard
                    title="To Watch"
                    value={stats.totalToWatch}
                    icon={Clock}
                    color="text-blue-400"
                />
                <StatsCard
                    title="Rated Items"
                    value={stats.totalRated}
                    icon={ThumbsUp}
                    color="text-yellow-400"
                />
                <StatsCard
                    title="Completion Rate"
                    value={`${stats.totalMovies + stats.totalTVShows > 0 ? Math.round((stats.totalWatched / (stats.totalMovies + stats.totalTVShows)) * 100) : 0}%`}
                    icon={Award}
                    color="text-purple-400"
                />
            </div>

            {/* Charts and Detailed Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Rating Distribution */}
                <RatingDistribution ratings={ratingDistribution} />

                {/* Top Genres */}
                {stats.topGenres.length > 0 && (
                    <GenreChart genres={stats.topGenres} />
                )}
            </div>

            {/* Watching Trends */}
            {stats.watchingTrends.length > 0 && (
                <WatchingTrends trends={stats.watchingTrends} />
            )}

            {/* Progress Overview */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    Quick Overview
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <ProgressBar
                            label="Movies vs TV Shows"
                            value={stats.totalMovies}
                            maxValue={stats.totalMovies + stats.totalTVShows}
                            color="bg-blue-500"
                            showValue={false}
                        />
                        <div className="flex justify-between text-xs text-gray-400">
                            <span>Movies: {stats.totalMovies}</span>
                            <span>TV Shows: {stats.totalTVShows}</span>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <ProgressBar
                            label="Watched vs To Watch"
                            value={stats.totalWatched}
                            maxValue={stats.totalWatched + stats.totalToWatch}
                            color="bg-green-500"
                            showValue={false}
                        />
                        <div className="flex justify-between text-xs text-gray-400">
                            <span>Watched: {stats.totalWatched}</span>
                            <span>To Watch: {stats.totalToWatch}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
