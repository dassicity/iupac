# IUPAC Movie Tracker

A movie tracking application built with Next.js for film enthusiasts.

## Features

- **Search Movies & TV Shows**: Search using TMDB API
- **Personal Lists**: To Watch, Already Watched, and custom lists
- **Rating System**: Rate movies/shows on a 1-10 scale
- **Journal**: Write detailed thoughts and reviews
- **Statistics**: Track your viewing habits
- **Server-side Storage**: User data stored in JSON files

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set up API Keys

Create a `.env.local` file in the root directory:

```env
# TMDB API (Required for search functionality)
# Get your API key from: https://www.themoviedb.org/settings/api
NEXT_PUBLIC_TMDB_API_KEY=your_tmdb_api_key_here
NEXT_PUBLIC_TMDB_BASE_URL=https://api.themoviedb.org/3
NEXT_PUBLIC_TMDB_IMAGE_BASE_URL=https://image.tmdb.org/t/p/w500

# OMDB API (Optional)
# Get your API key from: http://www.omdbapi.com/apikey.aspx
NEXT_PUBLIC_OMDB_API_KEY=your_omdb_api_key_here
NEXT_PUBLIC_OMDB_BASE_URL=http://www.omdbapi.com

# WatchMode API (Optional)
NEXT_PUBLIC_WATCHMODE_API_KEY=your_watchmode_api_key_here
NEXT_PUBLIC_WATCHMODE_BASE_URL=https://api.watchmode.com/v1

# RapidAPI Key (Optional)
NEXT_PUBLIC_RAPIDAPI_KEY=your_rapidapi_key_here
```

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How to Get API Keys

### TMDB (The Movie Database) - Required
1. Go to [https://www.themoviedb.org/](https://www.themoviedb.org/)
2. Create a free account
3. Go to Settings > API
4. Request an API key (it's free for personal use)
5. Copy the API key to your `.env.local` file

### OMDB (Optional)
1. Go to [http://www.omdbapi.com/apikey.aspx](http://www.omdbapi.com/apikey.aspx)
2. Choose the free tier
3. Verify your email
4. Use the API key in your `.env.local` file

## Data Storage

- **User accounts**: Stored in `data/users.json`
- **User data**: Individual files in `data/user_[userId].json`
- **Sessions**: Temporary localStorage for current user state

The `data/` directory is created automatically and ignored by git.

## Tech Stack

- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **APIs**: TMDB, OMDB
- **Storage**: Server-side JSON files + localStorage for sessions

## Project Structure

```
src/
├── app/                 # Next.js app directory
├── components/          # React components
│   ├── auth/           # Authentication components
│   └── dashboard/      # Dashboard components
├── constants/          # App constants and API config
├── contexts/           # React contexts
├── services/           # API and storage services
└── types/              # TypeScript type definitions
```

## Features Status

- ✅ **Authentication system**
- ✅ **Server-side user data storage**  
- ✅ **Responsive UI with sidebar navigation**
- ✅ **Search functionality with TMDB API**
- ✅ **Movie lists (To Watch, Already Watched)**
- ✅ **Add/remove movies from lists**
- ✅ **1-10 rating system**
- ✅ **Custom lists management (up to 10 lists)**
- ✅ **Create, edit, delete custom lists**
- ✅ **Move movies between lists**
- ✅ **Journal entries with movie linking**
- ✅ **Rich journal editor with tags**
- ✅ **Journal search and organization**
- ✅ **Statistics dashboard with analytics**
- ✅ **Rating distribution charts**
- ✅ **Genre preferences and trends**
- ✅ **Viewing progress tracking**
- ✅ **Festival film tracking**

## License

This project is for educational and personal use.
