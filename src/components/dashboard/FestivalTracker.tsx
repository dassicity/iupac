'use client';

import React, { useState, useEffect } from 'react';
import { Plus, X, Star, Trophy, Medal, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { UserMediaItem, FestivalAward, Award as AwardType } from '@/types';
import { omdbService, tmdbService } from '@/services/api';

interface FestivalTrackerProps {
    item: UserMediaItem;
    onUpdateFestivalData: (itemId: string, festivals: FestivalAward[], awards: AwardType[]) => void;
    onClose: () => void;
}

export const FestivalTracker: React.FC<FestivalTrackerProps> = ({ item, onUpdateFestivalData, onClose }) => {
    const [festivals, setFestivals] = useState<FestivalAward[]>(item.festivals || []);
    const [awards, setAwards] = useState<AwardType[]>(item.awards || []);
    const [showAddFestival, setShowAddFestival] = useState(false);
    const [showAddAward, setShowAddAward] = useState(false);
    const [isLoadingAwards, setIsLoadingAwards] = useState(false);
    const [rawAwardsData, setRawAwardsData] = useState<string>('');
    const [showRawData, setShowRawData] = useState(false);
    const [autoFetchComplete, setAutoFetchComplete] = useState(false);

    // Festival form state
    const [newFestival, setNewFestival] = useState({
        festival: '',
        year: new Date().getFullYear(),
        award: '',
        category: '',
        won: false,
        nominated: false
    });

    // Award form state
    const [newAward, setNewAward] = useState({
        name: '',
        category: '',
        year: new Date().getFullYear(),
        won: false,
        nominated: false
    });

    // Auto-fetch awards data when component mounts
    useEffect(() => {
        const fetchAwardsData = async () => {
            // Skip if we already have awards data or already tried fetching
            if (autoFetchComplete || (awards.length > 0 && festivals.length > 0)) {
                setAutoFetchComplete(true);
                return;
            }

            setIsLoadingAwards(true);
            try {
                let rawAwardsData = '';
                let foundAwards: AwardType[] = [];

                // Step 1: Try to get IMDB ID from TMDB for more accurate OMDB search
                try {
                    const tmdbDetails = item.mediaType === 'movie'
                        ? await tmdbService.getMovieDetails(item.mediaId)
                        : await tmdbService.getTVShowDetails(item.mediaId);

                    const tmdbData = tmdbDetails as { external_ids?: { imdb_id?: string } };
                    const externalIds = tmdbData.external_ids;
                    let omdbResponse = null;

                    // Step 2: Use TMDB's IMDB ID for more accurate OMDB search
                    if (externalIds?.imdb_id) {
                        try {
                            omdbResponse = await omdbService.searchByImdbId(externalIds.imdb_id);
                            rawAwardsData = `OMDB (via IMDB ID): ${omdbResponse.Awards || 'N/A'}`;
                        } catch {
                            console.log('OMDB search by IMDB ID failed, trying title search');
                        }
                    }

                    // Step 3: Fallback to title-based OMDB search if IMDB ID search failed
                    if (!omdbResponse || omdbResponse.Response !== 'True') {
                        try {
                            omdbResponse = await omdbService.searchByTitle(
                                item.title,
                                item.mediaType === 'movie' ? 'movie' : 'series'
                            );
                            rawAwardsData = `OMDB (via title): ${omdbResponse.Awards || 'N/A'}`;
                        } catch {
                            console.log('OMDB title search also failed');
                        }
                    }

                    // Parse OMDB awards data
                    if (omdbResponse?.Response === 'True' && omdbResponse.Awards && omdbResponse.Awards !== 'N/A') {
                        foundAwards = parseAwardsString(omdbResponse.Awards);
                    }

                } catch (error) {
                    console.error('Error fetching TMDB external IDs:', error);

                    // Step 4: Fallback to OMDB-only search if TMDB fails
                    try {
                        const omdbResponse = await omdbService.searchByTitle(
                            item.title,
                            item.mediaType === 'movie' ? 'movie' : 'series'
                        );

                        if (omdbResponse.Response === 'True' && omdbResponse.Awards && omdbResponse.Awards !== 'N/A') {
                            rawAwardsData = `OMDB (fallback): ${omdbResponse.Awards}`;
                            foundAwards = parseAwardsString(omdbResponse.Awards);
                        }
                    } catch (omdbError) {
                        console.error('OMDB search failed:', omdbError);
                    }
                }

                // Update state with found data
                if (rawAwardsData) {
                    setRawAwardsData(rawAwardsData);
                }

                if (foundAwards.length > 0) {
                    setAwards(prev => {
                        const existingTitles = prev.map(a => a.name.toLowerCase());
                        const newAwards = foundAwards.filter(a =>
                            !existingTitles.includes(a.name.toLowerCase())
                        );
                        return [...prev, ...newAwards];
                    });
                }

            } catch (error) {
                console.error('Error fetching awards data:', error);
            } finally {
                setIsLoadingAwards(false);
                setAutoFetchComplete(true);
            }
        };

        fetchAwardsData();
    }, [item.title, item.mediaType, item.mediaId, autoFetchComplete, awards.length, festivals.length]);

    // Parse OMDB Awards string into structured data
    const parseAwardsString = (awardsString: string): AwardType[] => {
        const parsedAwards: AwardType[] = [];
        const festivals: FestivalAward[] = [];

        // Extract year from the string (usually at the end)
        const yearMatch = awardsString.match(/\b(19|20)\d{2}\b/g);
        const detectedYear = yearMatch ? parseInt(yearMatch[yearMatch.length - 1]) : new Date().getFullYear();

        // Track what we've already added to prevent duplicates
        const addedAwards = new Set<string>();

        // Helper function to add award without duplicates
        const addAward = (name: string, category: string, year: number, won: boolean) => {
            const key = `${name.toLowerCase()}-${year}`;
            if (!addedAwards.has(key)) {
                addedAwards.add(key);
                parsedAwards.push({
                    name,
                    category,
                    year,
                    won,
                    nominated: true
                });
            }
        };

        // Helper function to add festival award
        const addFestival = (festival: string, award: string, year: number, won: boolean, category?: string) => {
            festivals.push({
                festival,
                year,
                award,
                category,
                won,
                nominated: true
            });
        };

        // Academy Awards / Oscars (avoid duplicates)
        if (awardsString.toLowerCase().includes('oscar') || awardsString.toLowerCase().includes('academy award')) {
            const isWinner = /won.*oscar|oscar.*winner|academy award winner/i.test(awardsString);
            addAward('Academy Awards (Oscars)', 'Various Categories', detectedYear, isWinner);
        }

        // Golden Globe Awards
        if (awardsString.toLowerCase().includes('golden globe')) {
            const isWinner = /won.*golden globe|golden globe.*winner/i.test(awardsString);
            addAward('Golden Globe Awards', 'Various Categories', detectedYear, isWinner);
        }

        // Emmy Awards
        if (awardsString.toLowerCase().includes('emmy')) {
            const isWinner = /won.*emmy|emmy.*winner/i.test(awardsString);
            addAward('Emmy Awards', 'Various Categories', detectedYear, isWinner);
        }

        // BAFTA Awards
        if (awardsString.toLowerCase().includes('bafta')) {
            const isWinner = /won.*bafta|bafta.*winner/i.test(awardsString);
            addAward('BAFTA Awards', 'Various Categories', detectedYear, isWinner);
        }

        // Screen Actors Guild
        if (awardsString.toLowerCase().includes('screen actors guild') || awardsString.toLowerCase().includes('sag award')) {
            const isWinner = /won.*screen actors guild|sag.*winner/i.test(awardsString);
            addAward('Screen Actors Guild Awards', 'Various Categories', detectedYear, isWinner);
        }

        // Critics Choice Awards
        if (awardsString.toLowerCase().includes('critics') && awardsString.toLowerCase().includes('choice')) {
            const isWinner = /won.*critics.*choice|critics.*choice.*winner/i.test(awardsString);
            addAward('Critics Choice Awards', 'Various Categories', detectedYear, isWinner);
        }

        // Festival Awards

        // Cannes Film Festival - Enhanced detection
        if (awardsString.toLowerCase().includes('cannes')) {
            const isPalmeWinner = /palme d&apos;or|palme d'or|golden palm/i.test(awardsString);
            const isGrandPrixWinner = /grand prix/i.test(awardsString);
            const isJuryPrizeWinner = /jury prize/i.test(awardsString);
            const isDirectorWinner = /best director.*cannes|cannes.*best director/i.test(awardsString);

            if (isPalmeWinner) {
                addFestival('Cannes Film Festival', 'Palme d\'Or', detectedYear, true, 'Best Film');
            } else if (isGrandPrixWinner) {
                addFestival('Cannes Film Festival', 'Grand Prix', detectedYear, true);
            } else if (isJuryPrizeWinner) {
                addFestival('Cannes Film Festival', 'Jury Prize', detectedYear, true);
            } else if (isDirectorWinner) {
                addFestival('Cannes Film Festival', 'Best Director', detectedYear, true);
            } else {
                const isWinner = /won.*cannes|cannes.*winner/i.test(awardsString);
                addFestival('Cannes Film Festival', 'Various Awards', detectedYear, isWinner);
            }
        }

        // Venice Film Festival
        if (awardsString.toLowerCase().includes('venice')) {
            const isGoldenLionWinner = /golden lion/i.test(awardsString);
            const isSilverLionWinner = /silver lion/i.test(awardsString);
            const isVolpiWinner = /volpi cup/i.test(awardsString);

            if (isGoldenLionWinner) {
                addFestival('Venice International Film Festival', 'Golden Lion', detectedYear, true, 'Best Film');
            } else if (isSilverLionWinner) {
                addFestival('Venice International Film Festival', 'Silver Lion', detectedYear, true);
            } else if (isVolpiWinner) {
                addFestival('Venice International Film Festival', 'Volpi Cup', detectedYear, true, 'Best Actor/Actress');
            } else {
                const isWinner = /won.*venice|venice.*winner/i.test(awardsString);
                addFestival('Venice International Film Festival', 'Various Awards', detectedYear, isWinner);
            }
        }

        // Berlin Film Festival
        if (awardsString.toLowerCase().includes('berlin')) {
            const isGoldenBearWinner = /golden bear/i.test(awardsString);
            const isSilverBearWinner = /silver bear/i.test(awardsString);

            if (isGoldenBearWinner) {
                addFestival('Berlin International Film Festival', 'Golden Bear', detectedYear, true, 'Best Film');
            } else if (isSilverBearWinner) {
                addFestival('Berlin International Film Festival', 'Silver Bear', detectedYear, true);
            } else {
                const isWinner = /won.*berlin|berlin.*winner/i.test(awardsString);
                addFestival('Berlin International Film Festival', 'Various Awards', detectedYear, isWinner);
            }
        }

        // Sundance Film Festival
        if (awardsString.toLowerCase().includes('sundance')) {
            const isGrandJuryWinner = /grand jury prize/i.test(awardsString);
            const isAudienceWinner = /audience award/i.test(awardsString);

            if (isGrandJuryWinner) {
                addFestival('Sundance Film Festival', 'Grand Jury Prize', detectedYear, true);
            } else if (isAudienceWinner) {
                addFestival('Sundance Film Festival', 'Audience Award', detectedYear, true);
            } else {
                const isWinner = /won.*sundance|sundance.*winner/i.test(awardsString);
                addFestival('Sundance Film Festival', 'Various Awards', detectedYear, isWinner);
            }
        }

        // Toronto International Film Festival (TIFF)
        if (awardsString.toLowerCase().includes('toronto') || awardsString.toLowerCase().includes('tiff')) {
            const isPeopleChoiceWinner = /people.*choice|audience.*award/i.test(awardsString);

            if (isPeopleChoiceWinner) {
                addFestival('Toronto International Film Festival', 'People\'s Choice Award', detectedYear, true);
            } else {
                const isWinner = /won.*toronto|toronto.*winner|won.*tiff|tiff.*winner/i.test(awardsString);
                addFestival('Toronto International Film Festival', 'Various Awards', detectedYear, isWinner);
            }
        }

        // Parse "Won X awards" format with better regex
        const wonMatches = awardsString.match(/Won (\d+) ([^.]+?)(?:\.|$)/gi);
        if (wonMatches) {
            wonMatches.forEach(match => {
                const parts = match.match(/Won (\d+) ([^.]+?)(?:\.|$)/i);
                if (parts && !parts[2].toLowerCase().includes('oscar') && !parts[2].toLowerCase().includes('academy')) {
                    const awardName = parts[2].trim().replace(/\s+/g, ' ');
                    addAward(awardName, 'Various Categories', detectedYear, true);
                }
            });
        }

        // Parse "Nominated for X" format
        const nominatedMatches = awardsString.match(/Nominated for (\d+) ([^.]+?)(?:\.|$)/gi);
        if (nominatedMatches) {
            nominatedMatches.forEach(match => {
                const parts = match.match(/Nominated for (\d+) ([^.]+?)(?:\.|$)/i);
                if (parts && !parts[2].toLowerCase().includes('oscar') && !parts[2].toLowerCase().includes('academy')) {
                    const awardName = parts[2].trim().replace(/\s+/g, ' ');
                    addAward(awardName, 'Various Categories', detectedYear, false);
                }
            });
        }

        // Update the festivals state if we found any
        if (festivals.length > 0) {
            setFestivals(prev => {
                const existingFestivals = prev.map(f => `${f.festival}-${f.award}-${f.year}`.toLowerCase());
                const newFestivals = festivals.filter(f =>
                    !existingFestivals.includes(`${f.festival}-${f.award}-${f.year}`.toLowerCase())
                );
                return [...prev, ...newFestivals];
            });
        }

        return parsedAwards;
    };

    const handleRefreshAwards = async () => {
        setAutoFetchComplete(false);
        // This will trigger the useEffect to re-fetch
    };

    const handleAddFestival = () => {
        if (!newFestival.festival || !newFestival.award) return;

        const festival: FestivalAward = {
            festival: newFestival.festival,
            year: newFestival.year,
            award: newFestival.award,
            category: newFestival.category || undefined,
            won: newFestival.won,
            nominated: newFestival.nominated || newFestival.won
        };

        setFestivals([...festivals, festival]);
        setNewFestival({
            festival: '',
            year: new Date().getFullYear(),
            award: '',
            category: '',
            won: false,
            nominated: false
        });
        setShowAddFestival(false);
    };

    const handleAddAward = () => {
        if (!newAward.name || !newAward.category) return;

        const award: AwardType = {
            name: newAward.name,
            category: newAward.category,
            year: newAward.year,
            won: newAward.won,
            nominated: newAward.nominated || newAward.won
        };

        setAwards([...awards, award]);
        setNewAward({
            name: '',
            category: '',
            year: new Date().getFullYear(),
            won: false,
            nominated: false
        });
        setShowAddAward(false);
    };

    const removeFestival = (index: number) => {
        setFestivals(festivals.filter((_, i) => i !== index));
    };

    const removeAward = (index: number) => {
        setAwards(awards.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        onUpdateFestivalData(item.id, festivals, awards);
        onClose();
    };

    const popularFestivals = [
        'Cannes Film Festival',
        'Venice International Film Festival',
        'Berlin International Film Festival',
        'Toronto International Film Festival',
        'Sundance Film Festival',
        'New York Film Festival',
        'Los Angeles Film Festival',
        'South by Southwest',
        'Tribeca Film Festival',
        'London Film Festival'
    ];

    const popularAwards = [
        'Academy Awards (Oscars)',
        'Golden Globe Awards',
        'BAFTA Awards',
        'Screen Actors Guild Awards',
        'Critics Choice Awards',
        'Emmy Awards',
        'Satellite Awards',
        'Independent Spirit Awards'
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gray-800 px-6 py-4 border-b border-gray-700 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Trophy className="w-6 h-6 text-yellow-500" />
                        <h2 className="text-xl font-bold text-white">Festival & Awards Tracker</h2>
                        {isLoadingAwards && (
                            <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6">
                    {/* Movie/Show Info */}
                    <div className="bg-gray-700 rounded-lg p-4 mb-6">
                        <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-300">
                            <span>{item.mediaType === 'movie' ? 'Movie' : 'TV Show'}</span>
                            <span>•</span>
                            <span>{new Date(item.release_date || item.first_air_date || '').getFullYear()}</span>

                            {/* Auto-fetch status */}
                            <span>•</span>
                            <div className="flex items-center gap-2">
                                <span className={isLoadingAwards ? 'text-blue-400' : 'text-green-400'}>
                                    {isLoadingAwards ? 'Fetching awards data...' :
                                        awards.length > 0 ? `Auto-loaded ${awards.length} awards` : 'No awards data found'}
                                </span>
                                <button
                                    onClick={handleRefreshAwards}
                                    disabled={isLoadingAwards}
                                    className="text-blue-400 hover:text-blue-300 disabled:opacity-50"
                                    title="Refresh awards data"
                                >
                                    <RefreshCw className={`w-4 h-4 ${isLoadingAwards ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>

                        {/* Raw awards data toggle */}
                        {rawAwardsData && (
                            <div className="mt-3">
                                <button
                                    onClick={() => setShowRawData(!showRawData)}
                                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300"
                                >
                                    {showRawData ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    {showRawData ? 'Hide' : 'Show'} raw awards data
                                </button>
                                {showRawData && (
                                    <div className="mt-2 p-3 bg-gray-600 rounded text-sm text-gray-300">
                                        <strong>Source data:</strong> {rawAwardsData}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Festival Awards Section */}
                    <div className="mb-8">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Medal className="w-5 h-5 text-yellow-500" />
                                Festival Awards ({festivals.length})
                            </h3>
                            <button
                                onClick={() => setShowAddFestival(!showAddFestival)}
                                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Add Festival Award
                            </button>
                        </div>

                        {festivals.length > 0 ? (
                            <div className="grid gap-3">
                                {festivals.map((festival, index) => (
                                    <div key={index} className="bg-gray-700 rounded-lg p-4 flex justify-between items-center">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-lg font-semibold ${festival.won ? 'text-yellow-400' : 'text-blue-400'
                                                    }`}>
                                                    {festival.festival}
                                                </span>
                                                <span className="text-gray-400">({festival.year})</span>
                                                {festival.won && <Trophy className="w-4 h-4 text-yellow-400" />}
                                                {festival.nominated && !festival.won && <Medal className="w-4 h-4 text-gray-400" />}
                                            </div>
                                            <div className="text-sm text-gray-400">
                                                {festival.award}
                                                {festival.category && ` - ${festival.category}`}
                                            </div>
                                            <div className="text-xs mt-1">
                                                <span className={`px-2 py-1 rounded-full ${festival.won
                                                    ? 'bg-yellow-600/20 text-yellow-400'
                                                    : 'bg-blue-600/20 text-blue-400'
                                                    }`}>
                                                    {festival.won ? 'Winner' : 'Nominated'}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeFestival(index)}
                                            className="text-red-400 hover:text-red-300"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-400">
                                <Medal className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>No festival awards tracked yet.</p>
                                <p className="text-sm">Add festival participations and awards manually.</p>
                            </div>
                        )}

                        {showAddFestival && (
                            <div className="bg-gray-700 rounded-lg p-4 space-y-4 mt-4">
                                <h4 className="font-semibold text-white">Add Festival Award</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Festival Name</label>
                                        <input
                                            type="text"
                                            value={newFestival.festival}
                                            onChange={(e) => setNewFestival(prev => ({ ...prev, festival: e.target.value }))}
                                            placeholder="e.g., Cannes Film Festival"
                                            className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                            list="festivals"
                                        />
                                        <datalist id="festivals">
                                            {popularFestivals.map(festival => (
                                                <option key={festival} value={festival} />
                                            ))}
                                        </datalist>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Year</label>
                                        <input
                                            type="number"
                                            value={newFestival.year}
                                            onChange={(e) => setNewFestival(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                                            min="1900"
                                            max={new Date().getFullYear()}
                                            className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Award</label>
                                        <input
                                            type="text"
                                            value={newFestival.award}
                                            onChange={(e) => setNewFestival(prev => ({ ...prev, award: e.target.value }))}
                                            placeholder="e.g., Palme d'Or"
                                            className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Category (Optional)</label>
                                        <input
                                            type="text"
                                            value={newFestival.category}
                                            onChange={(e) => setNewFestival(prev => ({ ...prev, category: e.target.value }))}
                                            placeholder="e.g., Best Feature Film"
                                            className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 text-gray-300">
                                        <input
                                            type="checkbox"
                                            checked={newFestival.won}
                                            onChange={(e) => setNewFestival(prev => ({
                                                ...prev,
                                                won: e.target.checked,
                                                nominated: e.target.checked || prev.nominated
                                            }))}
                                            className="rounded"
                                        />
                                        Won
                                    </label>
                                    <label className="flex items-center gap-2 text-gray-300">
                                        <input
                                            type="checkbox"
                                            checked={newFestival.nominated}
                                            onChange={(e) => setNewFestival(prev => ({ ...prev, nominated: e.target.checked }))}
                                            className="rounded"
                                        />
                                        Nominated
                                    </label>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={handleAddFestival}
                                        className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                                    >
                                        Add Festival Award
                                    </button>
                                    <button
                                        onClick={() => setShowAddFestival(false)}
                                        className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Major Awards Section */}
                    <div className="mb-8">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Star className="w-5 h-5 text-purple-500" />
                                Major Awards ({awards.length})
                                {awards.length > 0 && (
                                    <span className="text-sm text-gray-400 ml-2">
                                        (Auto-populated from database)
                                    </span>
                                )}
                            </h3>
                            <button
                                onClick={() => setShowAddAward(!showAddAward)}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Add Award
                            </button>
                        </div>

                        {awards.length > 0 ? (
                            <div className="grid gap-3">
                                {awards.map((award, index) => (
                                    <div key={index} className="bg-gray-700 rounded-lg p-4 flex justify-between items-center">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-lg font-semibold ${award.won ? 'text-purple-400' : 'text-blue-400'
                                                    }`}>
                                                    {award.name}
                                                </span>
                                                <span className="text-gray-400">({award.year})</span>
                                                {award.won && <Star className="w-4 h-4 text-purple-400" />}
                                            </div>
                                            <div className="text-sm text-gray-400">{award.category}</div>
                                            <div className="text-xs mt-1">
                                                <span className={`px-2 py-1 rounded-full ${award.won
                                                    ? 'bg-purple-600/20 text-purple-400'
                                                    : 'bg-blue-600/20 text-blue-400'
                                                    }`}>
                                                    {award.won ? 'Winner' : 'Nominated'}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeAward(index)}
                                            className="text-red-400 hover:text-red-300"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : !isLoadingAwards ? (
                            <div className="text-center py-8 text-gray-400">
                                <Star className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>No major awards found.</p>
                                <p className="text-sm">We checked online databases but didn&apos;t find any awards for this title.</p>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-400">
                                <RefreshCw className="w-12 h-12 mx-auto mb-3 opacity-50 animate-spin" />
                                <p>Searching for awards information...</p>
                            </div>
                        )}

                        {showAddAward && (
                            <div className="bg-gray-700 rounded-lg p-4 space-y-4 mt-4">
                                <h4 className="font-semibold text-white">Add Major Award/Nomination</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Award Name</label>
                                        <input
                                            type="text"
                                            value={newAward.name}
                                            onChange={(e) => setNewAward(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="e.g., Academy Awards"
                                            className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                            list="awards"
                                        />
                                        <datalist id="awards">
                                            {popularAwards.map(award => (
                                                <option key={award} value={award} />
                                            ))}
                                        </datalist>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                                        <input
                                            type="text"
                                            value={newAward.category}
                                            onChange={(e) => setNewAward(prev => ({ ...prev, category: e.target.value }))}
                                            placeholder="e.g., Best Picture"
                                            className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Year</label>
                                        <input
                                            type="number"
                                            value={newAward.year}
                                            onChange={(e) => setNewAward(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                                            min="1900"
                                            max={new Date().getFullYear()}
                                            className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 text-gray-300">
                                        <input
                                            type="checkbox"
                                            checked={newAward.won}
                                            onChange={(e) => setNewAward(prev => ({
                                                ...prev,
                                                won: e.target.checked,
                                                nominated: e.target.checked || prev.nominated
                                            }))}
                                            className="rounded"
                                        />
                                        Won
                                    </label>
                                    <label className="flex items-center gap-2 text-gray-300">
                                        <input
                                            type="checkbox"
                                            checked={newAward.nominated}
                                            onChange={(e) => setNewAward(prev => ({ ...prev, nominated: e.target.checked }))}
                                            className="rounded"
                                        />
                                        Nominated
                                    </label>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={handleAddAward}
                                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                                    >
                                        Add Award
                                    </button>
                                    <button
                                        onClick={() => setShowAddAward(false)}
                                        className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="bg-gray-600 hover:bg-gray-500 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}; 