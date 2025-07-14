// API Configuration Constants
export const API_CONFIG = {
    // TMDB Configuration
    TMDB: {
        BASE_URL: process.env.NEXT_PUBLIC_TMDB_BASE_URL || 'https://api.themoviedb.org/3',
        IMAGE_BASE_URL: process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE_URL || 'https://image.tmdb.org/t/p/w500',
        API_KEY: process.env.NEXT_PUBLIC_TMDB_API_KEY || '',
    },

    // OMDB Configuration
    OMDB: {
        BASE_URL: process.env.NEXT_PUBLIC_OMDB_BASE_URL || 'http://www.omdbapi.com',
        API_KEY: process.env.NEXT_PUBLIC_OMDB_API_KEY || '',
    },

    // WatchMode Configuration
    WATCHMODE: {
        BASE_URL: process.env.NEXT_PUBLIC_WATCHMODE_BASE_URL || 'https://api.watchmode.com/v1',
        API_KEY: process.env.NEXT_PUBLIC_WATCHMODE_API_KEY || '',
    },

    // RapidAPI Configuration
    RAPIDAPI: {
        KEY: process.env.NEXT_PUBLIC_RAPIDAPI_KEY || '',
    },
};

// API Endpoints
export const API_ENDPOINTS = {
    TMDB: {
        SEARCH_MOVIE: '/search/movie',
        SEARCH_TV: '/search/tv',
        MOVIE_DETAILS: '/movie',
        TV_DETAILS: '/tv',
        WATCH_PROVIDERS: '/watch/providers',
        POPULAR_MOVIES: '/movie/popular',
        POPULAR_TV: '/tv/popular',
        GENRES_MOVIE: '/genre/movie/list',
        GENRES_TV: '/genre/tv/list',
    },

    OMDB: {
        SEARCH: '/',
    },

    WATCHMODE: {
        SEARCH: '/search',
        TITLE_DETAILS: '/title',
        SOURCES: '/sources',
    },
};

// Rate limiting and performance constants
export const API_LIMITS = {
    TMDB_REQUESTS_PER_SECOND: 40,
    SEARCH_DEBOUNCE_MS: 300,
    CACHE_DURATION_MS: 5 * 60 * 1000, // 5 minutes
    PAGINATION_SIZE: 20,
}; 