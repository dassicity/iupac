'use client';

import React, { useState, useCallback } from 'react';
import { Search, Film, Tv, Plus, Star, Calendar, Info, User, Users, X } from 'lucide-react';
import { tmdbService } from '@/services/api';
import { Movie, TVShow } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { storageService } from '@/services/storage';
import { trackingService } from '@/services/tracking';
import { MovieDetailsModal } from './MovieDetailsModal';
import Image from 'next/image';

type SearchType = 'movie' | 'tv' | 'person';

interface Person {
    id: number;
    name: string;
    profile_path: string | null;
    known_for_department: string;
    known_for: (Movie | TVShow)[];
    popularity: number;
    birthday?: string;
    place_of_birth?: string;
    biography?: string;
    also_known_as?: string[];
}

interface MovieCast extends Movie {
    character?: string;
    credit_id?: string;
    order?: number;
}

interface MovieCrew extends Movie {
    job?: string;
    department?: string;
    credit_id?: string;
}

interface TVCast extends TVShow {
    character?: string;
    credit_id?: string;
    episode_count?: number;
}

interface TVCrew extends TVShow {
    job?: string;
    department?: string;
    credit_id?: string;
    episode_count?: number;
}

interface PersonDetails {
    id: number;
    name: string;
    profile_path: string | null;
    known_for_department: string;
    popularity: number;
    birthday?: string;
    place_of_birth?: string;
    biography?: string;
    also_known_as?: string[];
    movie_credits?: {
        cast: MovieCast[];
        crew: MovieCrew[];
    };
    tv_credits?: {
        cast: TVCast[];
        crew: TVCrew[];
    };
}

interface MediaCardProps {
    media: Movie | TVShow;
    mediaType: 'movie' | 'tv';
    onAddToList: (media: Movie | TVShow, mediaType: 'movie' | 'tv') => void;
    onShowDetails: (media: Movie | TVShow, mediaType: 'movie' | 'tv') => void;
}

interface PersonCardProps {
    person: Person;
    onShowDetails: (person: Person) => void;
}

const MediaCard: React.FC<MediaCardProps> = ({ media, mediaType, onAddToList, onShowDetails }) => {
    const isMovie = mediaType === 'movie';
    const title = isMovie ? (media as Movie).title : (media as TVShow).name;
    const releaseDate = isMovie ? (media as Movie).release_date : (media as TVShow).first_air_date;
    const year = releaseDate ? new Date(releaseDate).getFullYear() : 'N/A';

    const posterUrl = media.poster_path
        ? `https://image.tmdb.org/t/p/w300${media.poster_path}`
        : '/placeholder-poster.svg';

    return (
        <div className="bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors group">
            <div className="relative">
                <Image
                    src={posterUrl}
                    alt={title}
                    width={300}
                    height={450}
                    className="w-full h-80 object-cover rounded-t-lg"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder-poster.svg';
                    }}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 flex items-center justify-center gap-3 transition-all duration-200 rounded-t-lg">
                    <button
                        onClick={() => onShowDetails(media, mediaType)}
                        className="opacity-0 group-hover:opacity-100 bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-full transition-all duration-200 transform scale-90 group-hover:scale-100"
                        title="View Details"
                    >
                        <Info className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => onAddToList(media, mediaType)}
                        className="opacity-0 group-hover:opacity-100 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full transition-all duration-200 transform scale-90 group-hover:scale-100"
                        title="Add to List"
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

const PersonCard: React.FC<PersonCardProps> = ({ person, onShowDetails }) => {
    const profileUrl = person.profile_path
        ? `https://image.tmdb.org/t/p/w300${person.profile_path}`
        : '/placeholder-poster.svg';

    return (
        <div className="bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors group">
            <div className="relative">
                <Image
                    src={profileUrl}
                    alt={person.name}
                    width={300}
                    height={450}
                    className="w-full h-80 object-cover rounded-t-lg"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder-poster.svg';
                    }}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 flex items-center justify-center transition-all duration-200 rounded-t-lg">
                    <button
                        onClick={() => onShowDetails(person)}
                        className="opacity-0 group-hover:opacity-100 bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-full transition-all duration-200 transform scale-90 group-hover:scale-100"
                        title="View Details"
                    >
                        <Info className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="p-4">
                <h3 className="font-semibold text-white text-sm mb-2 line-clamp-2 min-h-[2.5rem]">
                    {person.name}
                </h3>

                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <User className="w-3 h-3" />
                        <span>{person.known_for_department}</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Star className="w-3 h-3 text-yellow-500" />
                        <span>Popularity: {person.popularity.toFixed(1)}</span>
                    </div>

                    {person.known_for && person.known_for.length > 0 && (
                        <div className="text-xs text-gray-400">
                            <span className="font-medium">Known for:</span>
                            <div className="line-clamp-2 mt-1">
                                {person.known_for.slice(0, 3).map((item, index) => (
                                    <span key={item.id}>
                                        {'title' in item ? item.title : item.name}
                                        {index < Math.min(person.known_for.length - 1, 2) && ', '}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

interface PersonDetailsModalProps {
    person: Person;
    isOpen: boolean;
    onClose: () => void;
}

const PersonDetailsModal: React.FC<PersonDetailsModalProps> = ({ person, isOpen, onClose }) => {
    const [details, setDetails] = useState<PersonDetails | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedJobFilter, setSelectedJobFilter] = useState<string>('all');

    React.useEffect(() => {
        if (isOpen && person) {
            fetchPersonDetails();
        }
    }, [isOpen, person]);

    const fetchPersonDetails = async () => {
        setIsLoading(true);
        try {
            const [personData, movieCredits, tvCredits] = await Promise.all([
                tmdbService.getPersonDetails(person.id),
                tmdbService.getPersonMovieCredits(person.id),
                tmdbService.getPersonTVCredits(person.id)
            ]);

            setDetails({
                ...personData,
                movie_credits: movieCredits as { cast: MovieCast[]; crew: MovieCrew[] },
                tv_credits: tvCredits as { cast: TVCast[]; crew: TVCrew[] }
            } as PersonDetails);
        } catch (error) {
            console.error('Error fetching person details:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Get all available jobs for filter tabs
    const getAvailableJobs = () => {
        if (!details) return [];

        const jobs = new Set<string>();

        // Add acting if person has cast credits
        if ((details.movie_credits?.cast?.length || 0) > 0 || (details.tv_credits?.cast?.length || 0) > 0) {
            jobs.add('Acting');
        }

        // Add crew jobs
        details.movie_credits?.crew?.forEach(credit => {
            if (credit.job) jobs.add(credit.job);
        });
        details.tv_credits?.crew?.forEach(credit => {
            if (credit.job) jobs.add(credit.job);
        });

        return Array.from(jobs).sort((a, b) => {
            // Prioritize common jobs
            const priority = ['Acting', 'Director', 'Producer', 'Executive Producer', 'Writer', 'Screenplay', 'Editor', 'Music', 'Cinematography'];
            const aIndex = priority.indexOf(a);
            const bIndex = priority.indexOf(b);
            if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
            if (aIndex !== -1) return -1;
            if (bIndex !== -1) return 1;
            return a.localeCompare(b);
        });
    };

    // Filter credits based on selected job
    const getFilteredCredits = () => {
        if (!details || selectedJobFilter === 'all') return details;

        const filteredDetails = { ...details };

        if (selectedJobFilter === 'Acting') {
            // Show only acting credits
            filteredDetails.movie_credits = {
                cast: details.movie_credits?.cast || [],
                crew: []
            };
            filteredDetails.tv_credits = {
                cast: details.tv_credits?.cast || [],
                crew: []
            };
        } else {
            // Show only specific crew job
            filteredDetails.movie_credits = {
                cast: [],
                crew: details.movie_credits?.crew?.filter(credit => credit.job === selectedJobFilter) || []
            };
            filteredDetails.tv_credits = {
                cast: [],
                crew: details.tv_credits?.crew?.filter(credit => credit.job === selectedJobFilter) || []
            };
        }

        return filteredDetails;
    };

    if (!isOpen) return null;

    const profileUrl = person.profile_path
        ? `https://image.tmdb.org/t/p/w500${person.profile_path}`
        : '/placeholder-poster.svg';

    const availableJobs = getAvailableJobs();
    const filteredDetails = getFilteredCredits();

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-gray-700">
                    <h2 className="text-2xl font-bold text-white">{person.name}</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
                    {isLoading ? (
                        <div className="flex items-center justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : (
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Profile Image and Basic Info */}
                                <div className="md:col-span-1">
                                    <Image
                                        src={profileUrl}
                                        alt={person.name}
                                        width={500}
                                        height={750}
                                        className="w-full rounded-lg"
                                    />

                                    <div className="mt-4 space-y-3">
                                        <div>
                                            <h3 className="text-sm font-semibold text-gray-300 mb-1">Department</h3>
                                            <p className="text-white">{person.known_for_department}</p>
                                        </div>

                                        {details?.birthday && (
                                            <div>
                                                <h3 className="text-sm font-semibold text-gray-300 mb-1">Birthday</h3>
                                                <p className="text-white">{new Date(details.birthday).toLocaleDateString()}</p>
                                            </div>
                                        )}

                                        {details?.place_of_birth && (
                                            <div>
                                                <h3 className="text-sm font-semibold text-gray-300 mb-1">Place of Birth</h3>
                                                <p className="text-white">{details.place_of_birth}</p>
                                            </div>
                                        )}

                                        <div>
                                            <h3 className="text-sm font-semibold text-gray-300 mb-1">Popularity</h3>
                                            <p className="text-white">{person.popularity.toFixed(1)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Biography and Credits */}
                                <div className="md:col-span-2 space-y-6">
                                    {details?.biography && (
                                        <div>
                                            <h3 className="text-lg font-semibold text-white mb-3">Biography</h3>
                                            <p className="text-gray-300 leading-relaxed">{details.biography}</p>
                                        </div>
                                    )}

                                    {details?.also_known_as && details.also_known_as.length > 0 && (
                                        <div>
                                            <h3 className="text-lg font-semibold text-white mb-3">Also Known As</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {details.also_known_as.map((name, index) => (
                                                    <span key={index} className="bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-sm">
                                                        {name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Job Filter Tabs */}
                                    {availableJobs.length > 0 && (
                                        <div>
                                            <h3 className="text-lg font-semibold text-white mb-3">Filmography</h3>
                                            <div className="flex flex-wrap gap-2 mb-4">
                                                <button
                                                    onClick={() => setSelectedJobFilter('all')}
                                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedJobFilter === 'all'
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                        }`}
                                                >
                                                    All ({(details?.movie_credits?.cast?.length || 0) + (details?.movie_credits?.crew?.length || 0) + (details?.tv_credits?.cast?.length || 0) + (details?.tv_credits?.crew?.length || 0)})
                                                </button>
                                                {availableJobs.map((job) => {
                                                    let count = 0;
                                                    if (job === 'Acting') {
                                                        count = (details?.movie_credits?.cast?.length || 0) + (details?.tv_credits?.cast?.length || 0);
                                                    } else {
                                                        count = (details?.movie_credits?.crew?.filter(c => c.job === job)?.length || 0) +
                                                            (details?.tv_credits?.crew?.filter(c => c.job === job)?.length || 0);
                                                    }

                                                    return (
                                                        <button
                                                            key={job}
                                                            onClick={() => setSelectedJobFilter(job)}
                                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedJobFilter === job
                                                                ? 'bg-blue-600 text-white'
                                                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                                }`}
                                                        >
                                                            {job} ({count})
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Movie Credits */}
                                    {filteredDetails?.movie_credits && (
                                        <div>
                                            <h3 className="text-lg font-semibold text-white mb-3">
                                                Movies ({(filteredDetails.movie_credits.cast?.length || 0) + (filteredDetails.movie_credits.crew?.length || 0)} total)
                                            </h3>
                                            <div className="max-h-80 overflow-y-auto bg-gray-800 rounded-lg p-4">
                                                <div className="space-y-6">
                                                    {/* Acting Credits */}
                                                    {filteredDetails.movie_credits.cast && filteredDetails.movie_credits.cast.length > 0 && (
                                                        <div>
                                                            <h4 className="text-md font-semibold text-blue-400 mb-3 border-b border-gray-600 pb-1">
                                                                Acting ({filteredDetails.movie_credits.cast.length})
                                                            </h4>
                                                            <div className="space-y-2">
                                                                {filteredDetails.movie_credits.cast.map((movie) => (
                                                                    <div key={`cast-${movie.id}`} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-b-0">
                                                                        <div className="flex items-center space-x-3 flex-1">
                                                                            <Image
                                                                                src={movie.poster_path ? `https://image.tmdb.org/t/p/w92${movie.poster_path}` : '/placeholder-poster.svg'}
                                                                                alt={movie.title}
                                                                                width={30}
                                                                                height={45}
                                                                                className="rounded flex-shrink-0"
                                                                            />
                                                                            <div className="flex-1 min-w-0">
                                                                                <p className="text-white font-medium truncate">{movie.title}</p>
                                                                                <p className="text-gray-400 text-sm">
                                                                                    {movie.character && `as ${movie.character}`}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-right flex-shrink-0 ml-4">
                                                                            <p className="text-gray-400 text-xs">
                                                                                {movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A'}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Group Crew Credits by Job */}
                                                    {filteredDetails.movie_credits.crew && filteredDetails.movie_credits.crew.length > 0 && (() => {
                                                        const groupedByJob = filteredDetails.movie_credits.crew.reduce((acc, movie) => {
                                                            const job = movie.job || 'Other';
                                                            if (!acc[job]) acc[job] = [];
                                                            acc[job].push(movie);
                                                            return acc;
                                                        }, {} as Record<string, MovieCrew[]>);

                                                        return Object.entries(groupedByJob)
                                                            .sort(([a], [b]) => {
                                                                // Prioritize common jobs
                                                                const priority = ['Director', 'Producer', 'Executive Producer', 'Writer', 'Screenplay'];
                                                                const aIndex = priority.indexOf(a);
                                                                const bIndex = priority.indexOf(b);
                                                                if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                                                                if (aIndex !== -1) return -1;
                                                                if (bIndex !== -1) return 1;
                                                                return a.localeCompare(b);
                                                            })
                                                            .map(([job, movies]) => (
                                                                <div key={job}>
                                                                    <h4 className="text-md font-semibold text-green-400 mb-3 border-b border-gray-600 pb-1">
                                                                        {job} ({movies.length})
                                                                    </h4>
                                                                    <div className="space-y-2">
                                                                        {movies.map((movie) => (
                                                                            <div key={`crew-${movie.id}-${movie.job}`} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-b-0">
                                                                                <div className="flex items-center space-x-3 flex-1">
                                                                                    <Image
                                                                                        src={movie.poster_path ? `https://image.tmdb.org/t/p/w92${movie.poster_path}` : '/placeholder-poster.svg'}
                                                                                        alt={movie.title}
                                                                                        width={30}
                                                                                        height={45}
                                                                                        className="rounded flex-shrink-0"
                                                                                    />
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <p className="text-white font-medium truncate">{movie.title}</p>
                                                                                        {movie.department && (
                                                                                            <p className="text-gray-400 text-sm">
                                                                                                {movie.department}
                                                                                            </p>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                                <div className="text-right flex-shrink-0 ml-4">
                                                                                    <p className="text-gray-400 text-xs">
                                                                                        {movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A'}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ));
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* TV Credits */}
                                    {filteredDetails?.tv_credits && (
                                        <div>
                                            <h3 className="text-lg font-semibold text-white mb-3">
                                                TV Shows ({(filteredDetails.tv_credits.cast?.length || 0) + (filteredDetails.tv_credits.crew?.length || 0)} total)
                                            </h3>
                                            <div className="max-h-80 overflow-y-auto bg-gray-800 rounded-lg p-4">
                                                <div className="space-y-6">
                                                    {/* Acting Credits */}
                                                    {filteredDetails.tv_credits.cast && filteredDetails.tv_credits.cast.length > 0 && (
                                                        <div>
                                                            <h4 className="text-md font-semibold text-blue-400 mb-3 border-b border-gray-600 pb-1">
                                                                Acting ({filteredDetails.tv_credits.cast.length})
                                                            </h4>
                                                            <div className="space-y-2">
                                                                {filteredDetails.tv_credits.cast.map((show) => (
                                                                    <div key={`tv-cast-${show.id}`} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-b-0">
                                                                        <div className="flex items-center space-x-3 flex-1">
                                                                            <Image
                                                                                src={show.poster_path ? `https://image.tmdb.org/t/p/w92${show.poster_path}` : '/placeholder-poster.svg'}
                                                                                alt={show.name}
                                                                                width={30}
                                                                                height={45}
                                                                                className="rounded flex-shrink-0"
                                                                            />
                                                                            <div className="flex-1 min-w-0">
                                                                                <p className="text-white font-medium truncate">{show.name}</p>
                                                                                <p className="text-gray-400 text-sm">
                                                                                    {show.character && `as ${show.character}`}
                                                                                    {show.episode_count && ` • ${show.episode_count} episodes`}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-right flex-shrink-0 ml-4">
                                                                            <p className="text-gray-400 text-xs">
                                                                                {show.first_air_date ? new Date(show.first_air_date).getFullYear() : 'N/A'}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Group TV Crew Credits by Job */}
                                                    {filteredDetails.tv_credits.crew && filteredDetails.tv_credits.crew.length > 0 && (() => {
                                                        const groupedByJob = filteredDetails.tv_credits.crew.reduce((acc, show) => {
                                                            const job = show.job || 'Other';
                                                            if (!acc[job]) acc[job] = [];
                                                            acc[job].push(show);
                                                            return acc;
                                                        }, {} as Record<string, TVCrew[]>);

                                                        return Object.entries(groupedByJob)
                                                            .sort(([a], [b]) => {
                                                                // Prioritize common jobs
                                                                const priority = ['Creator', 'Executive Producer', 'Producer', 'Director', 'Writer'];
                                                                const aIndex = priority.indexOf(a);
                                                                const bIndex = priority.indexOf(b);
                                                                if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                                                                if (aIndex !== -1) return -1;
                                                                if (bIndex !== -1) return 1;
                                                                return a.localeCompare(b);
                                                            })
                                                            .map(([job, shows]) => (
                                                                <div key={job}>
                                                                    <h4 className="text-md font-semibold text-green-400 mb-3 border-b border-gray-600 pb-1">
                                                                        {job} ({shows.length})
                                                                    </h4>
                                                                    <div className="space-y-2">
                                                                        {shows.map((show) => (
                                                                            <div key={`tv-crew-${show.id}-${show.job}`} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-b-0">
                                                                                <div className="flex items-center space-x-3 flex-1">
                                                                                    <Image
                                                                                        src={show.poster_path ? `https://image.tmdb.org/t/p/w92${show.poster_path}` : '/placeholder-poster.svg'}
                                                                                        alt={show.name}
                                                                                        width={30}
                                                                                        height={45}
                                                                                        className="rounded flex-shrink-0"
                                                                                    />
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <p className="text-white font-medium truncate">{show.name}</p>
                                                                                        <p className="text-gray-400 text-sm">
                                                                                            {show.department && `${show.department}`}
                                                                                            {show.episode_count && ` • ${show.episode_count} episodes`}
                                                                                        </p>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="text-right flex-shrink-0 ml-4">
                                                                                    <p className="text-gray-400 text-xs">
                                                                                        {show.first_air_date ? new Date(show.first_air_date).getFullYear() : 'N/A'}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ));
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
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
    const [activeTab, setActiveTab] = useState<SearchType>('movie');
    const [movieResults, setMovieResults] = useState<Movie[]>([]);
    const [tvResults, setTvResults] = useState<TVShow[]>([]);
    const [personResults, setPersonResults] = useState<Person[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [hasSearched, setHasSearched] = useState(false);
    const [selectedMedia, setSelectedMedia] = useState<{
        media: Movie | TVShow;
        mediaType: 'movie' | 'tv';
    } | null>(null);
    const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

    const performSearch = useCallback(async (query: string, page: number = 1, append: boolean = false) => {
        if (!query.trim()) return;

        setIsLoading(true);
        setError('');

        try {
            // Always search all types simultaneously
            const [movieResponse, tvResponse, personResponse] = await Promise.all([
                tmdbService.searchMovies(query, page),
                tmdbService.searchTVShows(query, page),
                tmdbService.searchPeople(query, page)
            ]);

            const personData = personResponse.results as unknown as Person[];

            if (append) {
                setMovieResults(prev => [...prev, ...movieResponse.results]);
                setTvResults(prev => [...prev, ...tvResponse.results]);
                setPersonResults(prev => [...prev, ...personData]);
            } else {
                setMovieResults(movieResponse.results);
                setTvResults(tvResponse.results);
                setPersonResults(personData);
            }

            // Set total pages based on active tab
            const currentTotalPages = activeTab === 'movie'
                ? movieResponse.total_pages
                : activeTab === 'tv'
                    ? tvResponse.total_pages
                    : personResponse.total_pages;

            setTotalPages(currentTotalPages);
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

    const handleAddToList = async (media: Movie | TVShow, mediaType: 'movie' | 'tv') => {
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
                customListIds: []
            });

            console.log(`Added ${title} to To Watch list`);
            if (onListsChanged) {
                await onListsChanged();
            }
        } catch (error) {
            console.error('Error adding to list:', error);
        }
    };

    const handleShowDetails = (media: Movie | TVShow, mediaType: 'movie' | 'tv') => {
        setSelectedMedia({ media, mediaType });
    };

    const handleShowPersonDetails = (person: Person) => {
        setSelectedPerson(person);
    };

    const getCurrentResults = () => {
        switch (activeTab) {
            case 'movie':
                return movieResults;
            case 'tv':
                return tvResults;
            case 'person':
                return personResults;
            default:
                return [];
        }
    };

    const getCurrentResultsCount = () => {
        switch (activeTab) {
            case 'movie':
                return movieResults.length;
            case 'tv':
                return tvResults.length;
            case 'person':
                return personResults.length;
            default:
                return 0;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-semibold text-white">Search Movies, TV Shows & People</h2>
                <p className="text-gray-400 mt-2">
                    Search for movies, TV shows, actors, and directors
                </p>
            </div>

            {/* Search Form */}
            <form onSubmit={handleSearch} className="space-y-4">
                {/* Search Input */}
                <div className="flex gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search for movies, TV shows, actors, directors..."
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
                </div>
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
                    <button
                        onClick={() => setActiveTab('person')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${activeTab === 'person'
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-400 hover:text-white hover:bg-gray-700'
                            }`}
                    >
                        <Users className="w-4 h-4" />
                        People ({personResults.length})
                    </button>
                </div>
            )}

            {/* Results Count */}
            {hasSearched && (
                <div className="flex items-center gap-2 text-gray-400">
                    <span>Found {getCurrentResultsCount()} {activeTab === 'person' ? 'people' : activeTab === 'movie' ? 'movies' : 'TV shows'}</span>
                    {searchQuery && <span>for &ldquo;{searchQuery}&rdquo;</span>}
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
                getCurrentResults().length > 0 ? (
                    <div className="space-y-6">
                        {/* Results Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {activeTab === 'person'
                                ? personResults.map((person) => (
                                    <PersonCard
                                        key={person.id}
                                        person={person}
                                        onShowDetails={handleShowPersonDetails}
                                    />
                                ))
                                : getCurrentResults().map((item) => (
                                    <MediaCard
                                        key={item.id}
                                        media={item as Movie | TVShow}
                                        mediaType={activeTab as 'movie' | 'tv'}
                                        onAddToList={handleAddToList}
                                        onShowDetails={handleShowDetails}
                                    />
                                ))
                            }
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
                        <p className="text-gray-400">
                            No {activeTab === 'person' ? 'people' : activeTab === 'movie' ? 'movies' : 'TV shows'} found for &ldquo;{searchQuery}&rdquo;
                        </p>
                        <p className="text-gray-500 text-sm mt-2">Try different search terms</p>
                    </div>
                )
            ) : (
                <div className="text-center py-16">
                    <Search className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-400">Enter a search term to find movies, TV shows, and people</p>
                    <p className="text-gray-500 text-sm mt-2">Search by title, name, or any keyword</p>
                </div>
            )}

            {/* Movie Details Modal */}
            {selectedMedia && (
                <MovieDetailsModal
                    item={{
                        id: selectedMedia.media.id.toString(),
                        mediaType: selectedMedia.mediaType,
                        mediaId: selectedMedia.media.id,
                        title: selectedMedia.mediaType === 'movie'
                            ? (selectedMedia.media as Movie).title
                            : (selectedMedia.media as TVShow).name,
                        poster_path: selectedMedia.media.poster_path,
                        release_date: selectedMedia.mediaType === 'movie'
                            ? (selectedMedia.media as Movie).release_date
                            : (selectedMedia.media as TVShow).first_air_date,
                        status: 'to_watch',
                        tags: [],
                        isFavorite: false,
                        watchCount: 0,
                        festivals: [],
                        awards: [],
                        customListIds: [],
                        dateAdded: new Date().toISOString()
                    }}
                    onClose={() => setSelectedMedia(null)}
                />
            )}

            {/* Person Details Modal */}
            {selectedPerson && (
                <PersonDetailsModal
                    person={selectedPerson}
                    isOpen={!!selectedPerson}
                    onClose={() => setSelectedPerson(null)}
                />
            )}
        </div>
    );
}; 