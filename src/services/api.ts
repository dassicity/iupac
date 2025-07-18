import axios from 'axios';
import { API_CONFIG, API_ENDPOINTS, API_LIMITS } from '@/constants/api';
import { Movie, TVShow, TMDBResponse, OMDBResponse, Genre, WatchProviderData, Credits } from '@/types';

// Create axios instances
const tmdbApi = axios.create({
    baseURL: API_CONFIG.TMDB.BASE_URL,
    timeout: 10000,
});

const omdbApi = axios.create({
    baseURL: API_CONFIG.OMDB.BASE_URL,
    timeout: 10000,
});

const rapidApiImdbApi = axios.create({
    baseURL: API_CONFIG.RAPIDAPI.IMDB.BASE_URL,
    timeout: 15000,
});

// Add request interceptors to include API keys
tmdbApi.interceptors.request.use((config) => {
    config.params = {
        ...config.params,
        api_key: API_CONFIG.TMDB.API_KEY,
        region: 'IN', // Set to India
    };
    return config;
});

omdbApi.interceptors.request.use((config) => {
    config.params = {
        ...config.params,
        apikey: API_CONFIG.OMDB.API_KEY,
    };
    return config;
});

rapidApiImdbApi.interceptors.request.use((config) => {
    config.headers['X-RapidAPI-Key'] = API_CONFIG.RAPIDAPI.KEY;
    config.headers['X-RapidAPI-Host'] = API_CONFIG.RAPIDAPI.IMDB.HOST;
    return config;
});

// TMDB API Functions
export const tmdbService = {
    // Search movies
    searchMovies: async (query: string, page: number = 1): Promise<TMDBResponse<Movie>> => {
        const response = await tmdbApi.get(API_ENDPOINTS.TMDB.SEARCH_MOVIE, {
            params: { query, page },
        });
        return response.data;
    },

    // Search TV shows
    searchTVShows: async (query: string, page: number = 1): Promise<TMDBResponse<TVShow>> => {
        const response = await tmdbApi.get(API_ENDPOINTS.TMDB.SEARCH_TV, {
            params: { query, page },
        });
        return response.data;
    },

    // Search people (actors, directors, etc.)
    searchPeople: async (query: string, page: number = 1): Promise<TMDBResponse<Record<string, unknown>>> => {
        const response = await tmdbApi.get('/search/person', {
            params: { query, page },
        });
        return response.data;
    },

    // Get person details
    getPersonDetails: async (personId: number): Promise<Record<string, unknown>> => {
        const response = await tmdbApi.get(`/person/${personId}`);
        return response.data;
    },

    // Get person movie credits
    getPersonMovieCredits: async (personId: number): Promise<Record<string, unknown>> => {
        const response = await tmdbApi.get(`/person/${personId}/movie_credits`);
        return response.data;
    },

    // Get person TV credits
    getPersonTVCredits: async (personId: number): Promise<Record<string, unknown>> => {
        const response = await tmdbApi.get(`/person/${personId}/tv_credits`);
        return response.data;
    },

    // Get movie details
    getMovieDetails: async (movieId: number): Promise<Movie> => {
        const response = await tmdbApi.get(`${API_ENDPOINTS.TMDB.MOVIE_DETAILS}/${movieId}`, {
            params: { append_to_response: 'credits,watch/providers,external_ids,keywords' },
        });
        return response.data;
    },

    // Get TV show details
    getTVShowDetails: async (tvId: number): Promise<TVShow> => {
        const response = await tmdbApi.get(`${API_ENDPOINTS.TMDB.TV_DETAILS}/${tvId}`, {
            params: { append_to_response: 'credits,watch/providers,external_ids,keywords' },
        });
        return response.data;
    },

    // Get external IDs for a movie/TV show
    getExternalIds: async (mediaType: 'movie' | 'tv', mediaId: number): Promise<{
        imdb_id?: string;
        facebook_id?: string;
        instagram_id?: string;
        twitter_id?: string;
    }> => {
        const endpoint = mediaType === 'movie'
            ? `${API_ENDPOINTS.TMDB.MOVIE_DETAILS}/${mediaId}/external_ids`
            : `${API_ENDPOINTS.TMDB.TV_DETAILS}/${mediaId}/external_ids`;

        const response = await tmdbApi.get(endpoint);
        return response.data;
    },

    // Get keywords for a movie/TV show
    getKeywords: async (mediaType: 'movie' | 'tv', mediaId: number): Promise<{
        keywords?: Array<{ id: number; name: string }>;
        results?: Array<{ id: number; name: string }>;
    }> => {
        const endpoint = mediaType === 'movie'
            ? `${API_ENDPOINTS.TMDB.MOVIE_DETAILS}/${mediaId}/keywords`
            : `${API_ENDPOINTS.TMDB.TV_DETAILS}/${mediaId}/keywords`;

        const response = await tmdbApi.get(endpoint);
        return response.data;
    },

    // Get popular movies
    getPopularMovies: async (page: number = 1): Promise<TMDBResponse<Movie>> => {
        const response = await tmdbApi.get(API_ENDPOINTS.TMDB.POPULAR_MOVIES, {
            params: { page },
        });
        return response.data;
    },

    // Get popular TV shows
    getPopularTVShows: async (page: number = 1): Promise<TMDBResponse<TVShow>> => {
        const response = await tmdbApi.get(API_ENDPOINTS.TMDB.POPULAR_TV, {
            params: { page },
        });
        return response.data;
    },

    // Get movie genres
    getMovieGenres: async (): Promise<{ genres: Genre[] }> => {
        const response = await tmdbApi.get(API_ENDPOINTS.TMDB.GENRES_MOVIE);
        return response.data;
    },

    // Get TV genres
    getTVGenres: async (): Promise<{ genres: Genre[] }> => {
        const response = await tmdbApi.get(API_ENDPOINTS.TMDB.GENRES_TV);
        return response.data;
    },

    // Get watch providers
    getWatchProviders: async (mediaType: 'movie' | 'tv', mediaId: number): Promise<WatchProviderData> => {
        const endpoint = mediaType === 'movie'
            ? `${API_ENDPOINTS.TMDB.MOVIE_DETAILS}/${mediaId}/watch/providers`
            : `${API_ENDPOINTS.TMDB.TV_DETAILS}/${mediaId}/watch/providers`;

        const response = await tmdbApi.get(endpoint);
        return response.data;
    },

    // Get credits
    getCredits: async (mediaType: 'movie' | 'tv', mediaId: number): Promise<Credits> => {
        const endpoint = mediaType === 'movie'
            ? `${API_ENDPOINTS.TMDB.MOVIE_DETAILS}/${mediaId}/credits`
            : `${API_ENDPOINTS.TMDB.TV_DETAILS}/${mediaId}/credits`;

        const response = await tmdbApi.get(endpoint);
        return response.data;
    },

    // Advanced search with filters
    discoverMovies: async (filters: {
        genre?: number[];
        year?: number;
        sort_by?: string;
        page?: number;
        with_companies?: number[];
        with_countries?: string[];
        with_original_language?: string;
        vote_average_gte?: number;
        vote_average_lte?: number;
    }): Promise<TMDBResponse<Movie>> => {
        const response = await tmdbApi.get('/discover/movie', {
            params: {
                ...filters,
                with_genres: filters.genre?.join(','),
                primary_release_year: filters.year,
                'vote_average.gte': filters.vote_average_gte,
                'vote_average.lte': filters.vote_average_lte,
                page: filters.page || 1,
            },
        });
        return response.data;
    },

    discoverTVShows: async (filters: {
        genre?: number[];
        year?: number;
        sort_by?: string;
        page?: number;
        with_companies?: number[];
        with_countries?: string[];
        with_original_language?: string;
        vote_average_gte?: number;
        vote_average_lte?: number;
    }): Promise<TMDBResponse<TVShow>> => {
        const response = await tmdbApi.get('/discover/tv', {
            params: {
                ...filters,
                with_genres: filters.genre?.join(','),
                first_air_date_year: filters.year,
                'vote_average.gte': filters.vote_average_gte,
                'vote_average.lte': filters.vote_average_lte,
                page: filters.page || 1,
            },
        });
        return response.data;
    },
};

// OMDB API Functions
export const omdbService = {
    // Search by title
    searchByTitle: async (title: string, type?: 'movie' | 'series'): Promise<OMDBResponse> => {
        const response = await omdbApi.get('/', {
            params: {
                t: title,
                type: type,
                plot: 'full',
            },
        });
        return response.data;
    },

    // Search by IMDB ID
    searchByImdbId: async (imdbId: string): Promise<OMDBResponse> => {
        const response = await omdbApi.get('/', {
            params: {
                i: imdbId,
                plot: 'full',
            },
        });
        return response.data;
    },

    // Search multiple results
    search: async (query: string, type?: 'movie' | 'series', page: number = 1): Promise<{
        Search: OMDBResponse[];
        totalResults: string;
        Response: string;
    }> => {
        const response = await omdbApi.get('/', {
            params: {
                s: query,
                type: type,
                page: page,
            },
        });
        return response.data;
    },
};

// RapidAPI IMDB Service
export const imdbService = {
    // Get title details by IMDB ID
    getTitleDetails: async (imdbId: string): Promise<unknown> => {
        const response = await rapidApiImdbApi.get(API_ENDPOINTS.RAPIDAPI_IMDB.TITLE_DETAILS, {
            params: { tconst: imdbId },
        });
        return response.data;
    },

    // Get title ratings by IMDB ID
    getTitleRatings: async (imdbId: string): Promise<unknown> => {
        const response = await rapidApiImdbApi.get(API_ENDPOINTS.RAPIDAPI_IMDB.TITLE_RATINGS, {
            params: { tconst: imdbId },
        });
        return response.data;
    },

    // Get title cast by IMDB ID
    getTitleCast: async (imdbId: string): Promise<unknown> => {
        const response = await rapidApiImdbApi.get(API_ENDPOINTS.RAPIDAPI_IMDB.TITLE_CAST, {
            params: { tconst: imdbId },
        });
        return response.data;
    },

    // Get title overview by IMDB ID
    getTitleOverview: async (imdbId: string): Promise<unknown> => {
        const response = await rapidApiImdbApi.get(API_ENDPOINTS.RAPIDAPI_IMDB.TITLE_OVERVIEW, {
            params: { tconst: imdbId },
        });
        return response.data;
    },

    // Get streaming services by IMDB ID
    getStreamingServices: async (imdbId: string): Promise<unknown> => {
        const response = await rapidApiImdbApi.get(API_ENDPOINTS.RAPIDAPI_IMDB.TITLE_WATCH_PROVIDERS, {
            params: { tconst: imdbId },
        });
        return response.data;
    },

    // Search/autocomplete
    autoComplete: async (query: string): Promise<unknown> => {
        const response = await rapidApiImdbApi.get(API_ENDPOINTS.RAPIDAPI_IMDB.SEARCH, {
            params: { q: query },
        });
        return response.data;
    },
};

// Cache management
class APICache {
    private cache = new Map<string, { data: unknown; timestamp: number }>();
    private maxAge = API_LIMITS.CACHE_DURATION_MS;

    set(key: string, data: unknown): void {
        this.cache.set(key, { data, timestamp: Date.now() });
    }

    get(key: string): unknown | null {
        const cached = this.cache.get(key);
        if (!cached) return null;

        if (Date.now() - cached.timestamp > this.maxAge) {
            this.cache.delete(key);
            return null;
        }

        return cached.data;
    }

    clear(): void {
        this.cache.clear();
    }
}

export const apiCache = new APICache();

// Rate limiting
class RateLimiter {
    private requests: number[] = [];
    private maxRequests: number;
    private timeWindow: number;

    constructor(maxRequests: number, timeWindowMs: number) {
        this.maxRequests = maxRequests;
        this.timeWindow = timeWindowMs;
    }

    async waitForSlot(): Promise<void> {
        const now = Date.now();

        // Remove old requests outside the time window
        this.requests = this.requests.filter(time => now - time < this.timeWindow);

        if (this.requests.length >= this.maxRequests) {
            // Wait until the oldest request is outside the window
            const oldestRequest = this.requests[0];
            const waitTime = this.timeWindow - (now - oldestRequest);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return this.waitForSlot();
        }

        this.requests.push(now);
    }
}

export const tmdbRateLimiter = new RateLimiter(API_LIMITS.TMDB_REQUESTS_PER_SECOND, 1000);

// Helper functions
export const getImageUrl = (path: string, size: 'w200' | 'w300' | 'w500' | 'w780' | 'original' = 'w500'): string => {
    if (!path) return '/placeholder-poster.svg';
    return `https://image.tmdb.org/t/p/${size}${path}`;
};

export const formatRuntime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
};

export const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

// Combined search function
export const searchAll = async (query: string, page: number = 1): Promise<{
    movies: Movie[];
    tvShows: TVShow[];
    totalResults: number;
}> => {
    const [movieResults, tvResults] = await Promise.all([
        tmdbService.searchMovies(query, page),
        tmdbService.searchTVShows(query, page),
    ]);

    return {
        movies: movieResults.results,
        tvShows: tvResults.results,
        totalResults: movieResults.total_results + tvResults.total_results,
    };
}; 