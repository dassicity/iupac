// App Constants
export const APP_CONFIG = {
    NAME: 'IUPAC Movie Tracker',
    VERSION: '1.0.0',
    DESCRIPTION: 'A movie tracking app for film enthusiasts',

    // Storage Keys
    STORAGE_KEYS: {
        USER_SESSION: 'iupac_user_session',
        THEME: 'iupac_theme',
        CACHE_PREFIX: 'iupac_cache_',
        SEARCH_HISTORY: 'iupac_search_history',
    },

    // Default Values
    DEFAULTS: {
        THEME: 'dark',
        LANGUAGE: 'en',
        REGION: 'IN', // India
        ITEMS_PER_PAGE: 20,
        MAX_CUSTOM_LISTS: 10,
        MAX_SEARCH_HISTORY: 50,
    },

    // UI Constants
    UI: {
        HEADER_HEIGHT: '64px',
        SIDEBAR_WIDTH: '256px',
        CARD_MAX_WIDTH: '1200px',
        MOBILE_BREAKPOINT: '768px',
        ANIMATION_DURATION: '200ms',
    },

    // Rating System
    RATING: {
        MIN: 1,
        MAX: 10,
        STEP: 0.5,
        COLORS: {
            LOW: '#ef4444', // 1-4
            MID: '#f59e0b', // 5-7
            HIGH: '#10b981', // 8-10
        },
    },

    // Default Lists
    DEFAULT_LISTS: [
        {
            id: 'to-watch',
            name: 'To Watch',
            description: 'Movies and shows you want to watch',
            isSystem: true,
            isDefault: true,
        },
        {
            id: 'watched',
            name: 'Already Watched',
            description: 'Movies and shows you have watched',
            isSystem: true,
            isDefault: false,
        },
    ],

    // Media Types
    MEDIA_TYPES: {
        MOVIE: 'movie',
        TV: 'tv',
    },

    // Status Options
    STATUS: {
        TO_WATCH: 'to_watch',
        WATCHING: 'watching',
        WATCHED: 'watched',
        DROPPED: 'dropped',
        ON_HOLD: 'on_hold',
    },

    // Filter Options
    FILTERS: {
        SORT_BY: [
            { value: 'title', label: 'Title' },
            { value: 'year', label: 'Year' },
            { value: 'rating', label: 'Rating' },
            { value: 'popularity', label: 'Popularity' },
            { value: 'date_added', label: 'Date Added' },
        ],

        SORT_ORDER: [
            { value: 'asc', label: 'Ascending' },
            { value: 'desc', label: 'Descending' },
        ],

        DECADES: [
            { value: '2020s', label: '2020s', start: 2020, end: 2029 },
            { value: '2010s', label: '2010s', start: 2010, end: 2019 },
            { value: '2000s', label: '2000s', start: 2000, end: 2009 },
            { value: '1990s', label: '1990s', start: 1990, end: 1999 },
            { value: '1980s', label: '1980s', start: 1980, end: 1989 },
            { value: '1970s', label: '1970s', start: 1970, end: 1979 },
            { value: '1960s', label: '1960s', start: 1960, end: 1969 },
            { value: '1950s', label: '1950s', start: 1950, end: 1959 },
            { value: 'earlier', label: 'Earlier', start: 1900, end: 1949 },
        ],
    },

    // Streaming Services
    STREAMING_SERVICES: {
        NETFLIX: { name: 'Netflix', color: '#e50914', id: 8 },
        AMAZON_PRIME: { name: 'Amazon Prime Video', color: '#1a98ff', id: 9 },
        DISNEY_PLUS: { name: 'Disney+', color: '#113ccf', id: 337 },
        HULU: { name: 'Hulu', color: '#1ce783', id: 15 },
        HBO_MAX: { name: 'HBO Max', color: '#8b5cf6', id: 384 },
        APPLE_TV: { name: 'Apple TV+', color: '#000000', id: 350 },
        PARAMOUNT_PLUS: { name: 'Paramount+', color: '#0066cc', id: 531 },
        PEACOCK: { name: 'Peacock', color: '#00b8d4', id: 387 },
        YOUTUBE: { name: 'YouTube', color: '#ff0000', id: 192 },
    },
}; 