// User and Authentication Types
export interface User {
    id: string;
    username: string;
    password: string; // Note: In production, this should be hashed
    createdAt: string;
    lastLogin?: string;
    preferences: UserPreferences;
}

export interface UserPreferences {
    theme: 'dark' | 'light';
    language: string;
    region: string;
    defaultView: 'grid' | 'list';
    itemsPerPage: number;
}

export interface UserSession {
    userId: string;
    username: string;
    isAuthenticated: boolean;
    loginTime: string;
}

// Movie and TV Show Types
export interface Movie {
    id: number;
    title: string;
    original_title: string;
    overview: string;
    release_date: string;
    poster_path: string;
    backdrop_path: string;
    vote_average: number;
    vote_count: number;
    popularity: number;
    genre_ids: number[];
    genres?: Genre[];
    adult: boolean;
    video: boolean;
    original_language: string;
    // Additional details from detailed API calls
    runtime?: number;
    budget?: number;
    revenue?: number;
    production_companies?: ProductionCompany[];
    production_countries?: ProductionCountry[];
    spoken_languages?: SpokenLanguage[];
    tagline?: string;
    imdb_id?: string;
    homepage?: string;
    status?: string;
    credits?: Credits;
    watch_providers?: WatchProvider[];
}

export interface TVShow {
    id: number;
    name: string;
    original_name: string;
    overview: string;
    first_air_date: string;
    last_air_date?: string;
    poster_path: string;
    backdrop_path: string;
    vote_average: number;
    vote_count: number;
    popularity: number;
    genre_ids: number[];
    genres?: Genre[];
    origin_country: string[];
    original_language: string;
    adult: boolean;
    // Additional details
    number_of_episodes?: number;
    number_of_seasons?: number;
    seasons?: Season[];
    created_by?: Creator[];
    episode_run_time?: number[];
    in_production?: boolean;
    languages?: string[];
    last_episode_to_air?: Episode;
    next_episode_to_air?: Episode;
    networks?: Network[];
    production_companies?: ProductionCompany[];
    production_countries?: ProductionCountry[];
    spoken_languages?: SpokenLanguage[];
    status?: string;
    tagline?: string;
    type?: string;
    credits?: Credits;
    watch_providers?: WatchProvider[];
}

export interface Genre {
    id: number;
    name: string;
}

export interface ProductionCompany {
    id: number;
    name: string;
    logo_path?: string;
    origin_country: string;
}

export interface ProductionCountry {
    iso_3166_1: string;
    name: string;
}

export interface SpokenLanguage {
    iso_639_1: string;
    name: string;
}

export interface Credits {
    cast: CastMember[];
    crew: CrewMember[];
}

export interface CastMember {
    id: number;
    name: string;
    character: string;
    credit_id: string;
    order: number;
    profile_path?: string;
}

export interface CrewMember {
    id: number;
    name: string;
    job: string;
    department: string;
    credit_id: string;
    profile_path?: string;
}

export interface Season {
    id: number;
    name: string;
    overview: string;
    air_date: string;
    episode_count: number;
    poster_path?: string;
    season_number: number;
}

export interface Episode {
    id: number;
    name: string;
    overview: string;
    air_date: string;
    episode_number: number;
    season_number: number;
    still_path?: string;
    vote_average: number;
    vote_count: number;
}

export interface Creator {
    id: number;
    name: string;
    credit_id: string;
    profile_path?: string;
}

export interface Network {
    id: number;
    name: string;
    logo_path?: string;
    origin_country: string;
}

// User Lists and Tracking
export interface UserList {
    id: string;
    name: string;
    description: string;
    isSystem: boolean;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
    items: UserMediaItem[];
}

export interface UserMediaItem {
    id: string;
    mediaType: 'movie' | 'tv';
    mediaId: number;
    title: string;
    poster_path?: string;
    release_date?: string;
    first_air_date?: string;
    status: 'to_watch' | 'watched'; // Base status - simplified to only these two
    rating?: number;
    notes?: string;
    dateAdded: string;
    dateWatched?: string;
    tags: string[];
    isFavorite: boolean;
    watchCount: number;
    customListIds: string[]; // Array of custom list IDs this item belongs to
    // Festival and awards data
    festivals: FestivalAward[];
    awards: Award[];
    // TV Show episode tracking
    episodeProgress?: EpisodeProgress;
}

export interface EpisodeProgress {
    totalSeasons: number;
    totalEpisodes: number;
    watchedEpisodes: WatchedEpisode[];
    currentSeason: number;
    currentEpisode: number;
    isCompleted: boolean;
    lastWatchedDate?: string;
}

export interface WatchedEpisode {
    seasonNumber: number;
    episodeNumber: number;
    watchedDate: string;
    rating?: number;
    notes?: string;
}

export interface FestivalAward {
    festival: string;
    year: number;
    award: string;
    category?: string;
    won: boolean;
    nominated: boolean;
}

export interface Award {
    name: string;
    category: string;
    year: number;
    won: boolean;
    nominated: boolean;
}

// Journal and Notes
export interface JournalEntry {
    id: string;
    title: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    mediaItems: string[]; // Array of UserMediaItem IDs
    tags: string[];
    isPublic: boolean;
}

// Search and Filters
export interface SearchFilters {
    query: string;
    mediaType: 'movie' | 'tv' | 'both';
    genre?: number[];
    year?: {
        min: number;
        max: number;
    };
    rating?: {
        min: number;
        max: number;
    };
    country?: string[];
    language?: string[];
    sortBy: 'title' | 'year' | 'rating' | 'popularity';
    sortOrder: 'asc' | 'desc';
    page: number;
    includeAdult: boolean;
}

export interface SearchResult {
    results: (Movie | TVShow)[];
    page: number;
    total_pages: number;
    total_results: number;
}

// Streaming and Watch Providers
export interface WatchProvider {
    display_priority: number;
    logo_path: string;
    provider_id: number;
    provider_name: string;
}

export interface WatchProviderData {
    id: number;
    results: {
        [countryCode: string]: {
            link: string;
            flatrate?: WatchProvider[];
            rent?: WatchProvider[];
            buy?: WatchProvider[];
        };
    };
}

// Statistics
export interface UserStats {
    totalMovies: number;
    totalTVShows: number;
    totalWatched: number;
    totalToWatch: number;
    totalRated: number;
    averageRating: number;
    topGenres: GenreStats[];
    topDirectors: PersonStats[];
    topActors: PersonStats[];
    watchingTrends: WatchingTrend[];
    festivalStats: FestivalStats[];
}

export interface GenreStats {
    genre: string;
    count: number;
    percentage: number;
}

export interface PersonStats {
    name: string;
    count: number;
    averageRating: number;
}

export interface WatchingTrend {
    period: string;
    count: number;
    avgRating: number;
}

export interface FestivalStats {
    festival: string;
    count: number;
    avgRating: number;
}

// API Response Types
export interface TMDBResponse<T> {
    page: number;
    results: T[];
    total_pages: number;
    total_results: number;
}

export interface OMDBResponse {
    Title: string;
    Year: string;
    Rated: string;
    Released: string;
    Runtime: string;
    Genre: string;
    Director: string;
    Writer: string;
    Actors: string;
    Plot: string;
    Language: string;
    Country: string;
    Awards: string;
    Poster: string;
    Ratings: OMDBRating[];
    Metascore: string;
    imdbRating: string;
    imdbVotes: string;
    imdbID: string;
    Type: string;
    DVD?: string;
    BoxOffice?: string;
    Production?: string;
    Website?: string;
    Response: string;
    Error?: string;
}

export interface OMDBRating {
    Source: string;
    Value: string;
}

// Error Types
export interface APIError {
    message: string;
    code?: string;
    status?: number;
}

// Component Props Types
export interface BaseComponentProps {
    className?: string;
    children?: React.ReactNode;
}

export interface MediaCardProps extends BaseComponentProps {
    media: Movie | TVShow;
    userItem?: UserMediaItem;
    onAddToList?: (listId: string) => void;
    onUpdateRating?: (rating: number) => void;
    onUpdateStatus?: (status: string) => void;
    showActions?: boolean;
} 