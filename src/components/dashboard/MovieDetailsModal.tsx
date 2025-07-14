/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import { X, Star, Calendar, Clock, ExternalLink } from 'lucide-react';
import { UserMediaItem } from '@/types';
import { tmdbService, omdbService } from '@/services/api';
import Image from 'next/image';

interface MovieDetailsModalProps {
    item: UserMediaItem;
    onClose: () => void;
}

interface DetailedInfo {
    tmdbData: unknown;
    omdbData: unknown;
    imdbData: unknown;
    credits: unknown;
    watchProviders: unknown;
    isLoading: boolean;
    error: string | null;
}

export const MovieDetailsModal: React.FC<MovieDetailsModalProps> = ({ item, onClose }) => {
    const [details, setDetails] = useState<DetailedInfo>({
        tmdbData: null,
        omdbData: null,
        imdbData: null,
        credits: null,
        watchProviders: null,
        isLoading: true,
        error: null
    });

    useEffect(() => {
        const fetchDetailedInfo = async () => {
            try {
                setDetails(prev => ({ ...prev, isLoading: true, error: null }));

                // Fetch TMDB data
                const tmdbData = item.mediaType === 'movie'
                    ? await tmdbService.getMovieDetails(item.mediaId)
                    : await tmdbService.getTVShowDetails(item.mediaId);

                // Get IMDB ID from TMDB data
                const imdbId = (tmdbData as any).external_ids?.imdb_id;

                // Fetch OMDB data using IMDB ID or title
                let omdbData = null;
                if (imdbId) {
                    try {
                        omdbData = await omdbService.searchByImdbId(imdbId);
                    } catch (error) {
                        console.log('OMDB by IMDB ID failed, trying by title:', error);
                        omdbData = await omdbService.searchByTitle(item.title, item.mediaType === 'movie' ? 'movie' : 'series');
                    }
                } else {
                    omdbData = await omdbService.searchByTitle(item.title, item.mediaType === 'movie' ? 'movie' : 'series');
                }

                // Fetch IMDB data if we have IMDB ID
                // Note: IMDB API calls are temporarily disabled for simplicity
                // Could be re-enabled in the future if needed

                // Fetch credits and watch providers
                const [credits, watchProviders] = await Promise.all([
                    tmdbService.getCredits(item.mediaType, item.mediaId),
                    tmdbService.getWatchProviders(item.mediaType, item.mediaId)
                ]);

                setDetails({
                    tmdbData,
                    omdbData,
                    imdbData: null,
                    credits,
                    watchProviders,
                    isLoading: false,
                    error: null
                });
            } catch (error) {
                console.error('Error fetching detailed info:', error);
                setDetails(prev => ({
                    ...prev,
                    isLoading: false,
                    error: 'Failed to load detailed information'
                }));
            }
        };

        fetchDetailedInfo();
    }, [item]);

    const formatRuntime = (runtime: number) => {
        const hours = Math.floor(runtime / 60);
        const minutes = runtime % 60;
        return `${hours}h ${minutes}m`;
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const getRatingColor = (rating: number) => {
        if (rating >= 8) return 'text-green-400';
        if (rating >= 6) return 'text-yellow-400';
        return 'text-red-400';
    };

    const { tmdbData, omdbData, credits, watchProviders, isLoading, error } = details;

    if (isLoading) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-gray-800 rounded-lg p-8 w-full max-w-4xl">
                    <div className="flex items-center justify-center space-x-4">
                        <div className="w-8 h-8 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
                        <p className="text-gray-400">Loading detailed information...</p>
                    </div>
                </div>
            </div>
        );
    }

    const backdropUrl = (tmdbData as any)?.backdrop_path
        ? `https://image.tmdb.org/t/p/w1280${(tmdbData as any).backdrop_path}`
        : null;

    const posterUrl = item.poster_path
        ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
        : '/placeholder-poster.svg';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
            <div className="bg-gray-900 rounded-lg w-full max-w-6xl max-h-[95vh] overflow-hidden">
                {/* Header with backdrop */}
                <div className="relative h-64 sm:h-80 md:h-96">
                    {backdropUrl && (
                        <Image
                            src={backdropUrl}
                            alt={item.title}
                            fill
                            className="object-cover"
                            priority
                        />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent"></div>

                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors bg-black bg-opacity-50 rounded-full p-2"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    {/* Title and basic info overlay */}
                    <div className="absolute bottom-4 left-4 right-4 text-white">
                        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                            <div className="flex-shrink-0">
                                <Image
                                    src={posterUrl}
                                    alt={item.title}
                                    width={120}
                                    height={180}
                                    className="rounded-lg shadow-lg hidden sm:block"
                                />
                            </div>
                            <div className="flex-1">
                                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">
                                    {item.title}
                                </h1>
                                {((tmdbData as any)?.tagline) && (
                                    <p className="text-gray-300 text-sm sm:text-base mb-2 italic">
                                        {((tmdbData as any).tagline)}
                                    </p>
                                )}
                                <div className="flex flex-wrap items-center gap-4 text-sm">
                                    {((tmdbData as any)?.release_date) && (
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-4 h-4" />
                                            <span>{new Date((tmdbData as any).release_date).getFullYear()}</span>
                                        </div>
                                    )}
                                    {((tmdbData as any)?.runtime) && (
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            <span>{formatRuntime((tmdbData as any).runtime)}</span>
                                        </div>
                                    )}
                                    {((tmdbData as any)?.vote_average) && (
                                        <div className="flex items-center gap-1">
                                            <Star className="w-4 h-4 fill-current text-yellow-400" />
                                            <span className={getRatingColor((tmdbData as any).vote_average)}>
                                                {(tmdbData as any).vote_average.toFixed(1)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6 max-h-[calc(95vh-16rem)] sm:max-h-[calc(95vh-20rem)] md:max-h-[calc(95vh-24rem)] overflow-y-auto">
                    {error && (
                        <div className="text-red-400 mb-4 p-3 bg-red-900/20 rounded-lg">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left column - Main details */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Overview */}
                            <div>
                                <h2 className="text-xl font-semibold text-white mb-3">Overview</h2>
                                <p className="text-gray-300 leading-relaxed">
                                    {((tmdbData as any)?.overview) || ((omdbData as any)?.Plot) || 'No overview available.'}
                                </p>
                            </div>

                            {/* Genres */}
                            {((tmdbData as any)?.genres) && ((tmdbData as any).genres.length > 0) && (
                                <div>
                                    <h3 className="text-lg font-semibold text-white mb-2">Genres</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {((tmdbData as any).genres).map((genre: any) => (
                                            <span
                                                key={genre.id}
                                                className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full text-sm"
                                            >
                                                {genre.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Cast */}
                            {((credits as any)?.cast) && ((credits as any).cast.length > 0) && (
                                <div>
                                    <h3 className="text-lg font-semibold text-white mb-3">Cast</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                        {((credits as any).cast).slice(0, 8).map((actor: any) => (
                                            <div key={actor.id} className="text-center">
                                                <div className="w-16 h-16 mx-auto mb-2 bg-gray-700 rounded-full overflow-hidden">
                                                    {actor.profile_path && (
                                                        <Image
                                                            src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`}
                                                            alt={actor.name}
                                                            width={64}
                                                            height={64}
                                                            className="object-cover w-full h-full"
                                                        />
                                                    )}
                                                </div>
                                                <p className="text-white text-sm font-medium truncate">
                                                    {actor.name}
                                                </p>
                                                <p className="text-gray-400 text-xs truncate">
                                                    {actor.character}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Where to Watch in India */}
                            {((watchProviders as any)?.results?.IN) && (
                                <div>
                                    <h3 className="text-lg font-semibold text-white mb-3">Where to Watch in India</h3>
                                    <div className="space-y-3">
                                        {((watchProviders as any).results.IN.flatrate) && (
                                            <div>
                                                <p className="text-sm text-gray-400 mb-2">Streaming</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {((watchProviders as any).results.IN.flatrate).map((provider: any) => (
                                                        <div key={provider.provider_id} className="flex items-center gap-2 bg-gray-800 rounded-lg p-2">
                                                            <Image
                                                                src={`https://image.tmdb.org/t/p/w92${provider.logo_path}`}
                                                                alt={provider.provider_name}
                                                                width={24}
                                                                height={24}
                                                                className="rounded"
                                                            />
                                                            <span className="text-sm text-white">{provider.provider_name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {((watchProviders as any).results.IN.rent) && (
                                            <div>
                                                <p className="text-sm text-gray-400 mb-2">Rent</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {((watchProviders as any).results.IN.rent).map((provider: any) => (
                                                        <div key={provider.provider_id} className="flex items-center gap-2 bg-gray-800 rounded-lg p-2">
                                                            <Image
                                                                src={`https://image.tmdb.org/t/p/w92${provider.logo_path}`}
                                                                alt={provider.provider_name}
                                                                width={24}
                                                                height={24}
                                                                className="rounded"
                                                            />
                                                            <span className="text-sm text-white">{provider.provider_name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {((watchProviders as any).results.IN.buy) && (
                                            <div>
                                                <p className="text-sm text-gray-400 mb-2">Buy</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {((watchProviders as any).results.IN.buy).map((provider: any) => (
                                                        <div key={provider.provider_id} className="flex items-center gap-2 bg-gray-800 rounded-lg p-2">
                                                            <Image
                                                                src={`https://image.tmdb.org/t/p/w92${provider.logo_path}`}
                                                                alt={provider.provider_name}
                                                                width={24}
                                                                height={24}
                                                                className="rounded"
                                                            />
                                                            <span className="text-sm text-white">{provider.provider_name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right column - Additional info */}
                        <div className="space-y-4">
                            {/* Ratings */}
                            <div className="bg-gray-800 rounded-lg p-4">
                                <h3 className="text-lg font-semibold text-white mb-3">Ratings</h3>
                                <div className="space-y-2">
                                    {((tmdbData as any)?.vote_average) && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-400">TMDB</span>
                                            <div className="flex items-center gap-1">
                                                <Star className="w-4 h-4 fill-current text-yellow-400" />
                                                <span className={getRatingColor((tmdbData as any).vote_average)}>
                                                    {(tmdbData as any).vote_average.toFixed(1)}/10
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                    {((omdbData as any)?.imdbRating) && ((omdbData as any).imdbRating !== 'N/A') && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-400">IMDB</span>
                                            <div className="flex items-center gap-1">
                                                <Star className="w-4 h-4 fill-current text-yellow-400" />
                                                <span className={getRatingColor(parseFloat((omdbData as any).imdbRating))}>
                                                    {(omdbData as any).imdbRating}/10
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                    {((omdbData as any)?.Ratings) && ((omdbData as any).Ratings.length > 0) && (
                                        <>
                                            {((omdbData as any).Ratings).map((rating: any, index: number) => (
                                                <div key={index} className="flex justify-between items-center">
                                                    <span className="text-gray-400">{rating.Source}</span>
                                                    <span className="text-white">{rating.Value}</span>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Details */}
                            <div className="bg-gray-800 rounded-lg p-4">
                                <h3 className="text-lg font-semibold text-white mb-3">Details</h3>
                                <div className="space-y-2 text-sm">
                                    {((tmdbData as any)?.original_language) && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Language</span>
                                            <span className="text-white">{((tmdbData as any).original_language).toUpperCase()}</span>
                                        </div>
                                    )}
                                    {((tmdbData as any)?.production_countries) && ((tmdbData as any).production_countries.length > 0) && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Country</span>
                                            <span className="text-white">
                                                {((tmdbData as any).production_countries).map((country: any) => country.name).join(', ')}
                                            </span>
                                        </div>
                                    )}
                                    {((omdbData as any)?.BoxOffice) && ((omdbData as any).BoxOffice !== 'N/A') && ((omdbData as any).BoxOffice !== '') && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Box Office</span>
                                            <span className="text-white">{((omdbData as any).BoxOffice)}</span>
                                        </div>
                                    )}
                                    {((omdbData as any)?.Production) && ((omdbData as any).Production !== 'N/A') && ((omdbData as any).Production !== '') && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Production</span>
                                            <span className="text-white">{((omdbData as any).Production)}</span>
                                        </div>
                                    )}
                                    {((omdbData as any)?.Director) && ((omdbData as any).Director !== 'N/A') && ((omdbData as any).Director !== '') && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Director</span>
                                            <span className="text-white">{((omdbData as any).Director)}</span>
                                        </div>
                                    )}
                                    {((omdbData as any)?.Writer) && ((omdbData as any).Writer !== 'N/A') && ((omdbData as any).Writer !== '') && (
                                        <div>
                                            <span className="text-gray-400">Writer</span>
                                            <p className="text-white mt-1 leading-relaxed">{((omdbData as any).Writer)}</p>
                                        </div>
                                    )}
                                    {/* {((tmdbData as any)?.budget) && ((tmdbData as any).budget > 0) && (
                                        // console.log((tmdbData as any).budget),
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Budget</span>
                                            <span className="text-white">{formatCurrency((tmdbData as any).budget)}</span>
                                        </div>
                                    )} */}
                                    {((tmdbData as any)?.revenue) && ((tmdbData as any).revenue > 0) && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Revenue</span>
                                            <span className="text-white">{formatCurrency((tmdbData as any).revenue)}</span>
                                        </div>
                                    )}
                                    {((omdbData as any)?.Awards) && ((omdbData as any).Awards !== 'N/A') && ((omdbData as any).Awards !== '') && (
                                        <div>
                                            <span className="text-gray-400">Awards</span>
                                            <p className="text-white mt-1 leading-relaxed">{((omdbData as any).Awards)}</p>
                                        </div>
                                    )}

                                    {/* DEBUG: Remove this section after identifying the issue */}
                                    {/* {process.env.NODE_ENV === 'development' && tmdbData && (
                                        <div className="border-t border-gray-600 pt-2 mt-2">
                                            <p className="text-xs text-gray-500">DEBUG - TMDB Fields:</p>
                                            <pre className="text-xs text-gray-300 max-h-32 overflow-auto">
                                                {JSON.stringify(tmdbData, null, 2)}
                                            </pre>
                                        </div>
                                    )} */}
                                </div>
                            </div>

                            {/* External Links */}
                            <div className="bg-gray-800 rounded-lg p-4">
                                <h3 className="text-lg font-semibold text-white mb-3">Links</h3>
                                <div className="space-y-2">
                                    {((tmdbData as any)?.external_ids?.imdb_id) && (
                                        <a
                                            href={`https://www.imdb.com/title/${((tmdbData as any).external_ids.imdb_id)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            <span>IMDb</span>
                                        </a>
                                    )}
                                    <a
                                        href={`https://www.themoviedb.org/${item.mediaType}/${item.mediaId}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        <span>TMDB</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}; 