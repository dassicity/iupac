'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PenTool, Plus, Edit3, Trash2, Calendar, Tag, Film, Search, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { storageService } from '@/services/storage';
import { JournalEntry, UserMediaItem } from '@/types';

interface JournalFormProps {
    entry?: JournalEntry;
    onSave: (entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>) => void;
    onCancel: () => void;
    availableMovies: UserMediaItem[];
}

const JournalForm: React.FC<JournalFormProps> = ({ entry, onSave, onCancel, availableMovies }) => {
    const [title, setTitle] = useState(entry?.title || '');
    const [content, setContent] = useState(entry?.content || '');
    const [tags, setTags] = useState<string[]>(entry?.tags || []);
    const [linkedMovies, setLinkedMovies] = useState<string[]>(entry?.mediaItems || []);
    const [newTag, setNewTag] = useState('');
    const [isPublic, setIsPublic] = useState(entry?.isPublic || false);
    const [movieSearchQuery, setMovieSearchQuery] = useState('');

    const filteredMovies = availableMovies.filter(movie =>
        movie.title.toLowerCase().includes(movieSearchQuery.toLowerCase()) &&
        !linkedMovies.includes(movie.id)
    );

    const handleAddTag = () => {
        if (newTag.trim() && !tags.includes(newTag.trim())) {
            setTags([...tags, newTag.trim()]);
            setNewTag('');
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const handleLinkMovie = (movieId: string) => {
        setLinkedMovies([...linkedMovies, movieId]);
        setMovieSearchQuery('');
    };

    const handleUnlinkMovie = (movieId: string) => {
        setLinkedMovies(linkedMovies.filter(id => id !== movieId));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) return;

        onSave({
            title: title.trim(),
            content: content.trim(),
            tags,
            mediaItems: linkedMovies,
            isPublic
        });
    };

    const linkedMovieItems = availableMovies.filter(movie => linkedMovies.includes(movie.id));

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
                <div className="p-6 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">
                        {entry ? 'Edit Journal Entry' : 'New Journal Entry'}
                    </h2>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Title
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                            placeholder="Enter journal entry title..."
                            required
                        />
                    </div>

                    {/* Content */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Content
                        </label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            rows={8}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none resize-none"
                            placeholder="Write your thoughts, review, or notes..."
                            required
                        />
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Tags
                        </label>
                        <div className="flex gap-2 mb-2">
                            <input
                                type="text"
                                value={newTag}
                                onChange={(e) => setNewTag(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                                placeholder="Add a tag..."
                            />
                            <button
                                type="button"
                                onClick={handleAddTag}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                            >
                                Add
                            </button>
                        </div>
                        {tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-sm rounded-full"
                                    >
                                        <Tag className="w-3 h-3" />
                                        {tag}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveTag(tag)}
                                            className="ml-1 hover:text-red-300"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Linked Movies */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Linked Movies & Shows
                        </label>

                        {/* Movie Search */}
                        <div className="relative mb-3">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={movieSearchQuery}
                                onChange={(e) => setMovieSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                                placeholder="Search movies to link..."
                            />
                        </div>

                        {/* Movie Search Results */}
                        {movieSearchQuery && filteredMovies.length > 0 && (
                            <div className="bg-gray-700 border border-gray-600 rounded-md mb-3 max-h-32 overflow-y-auto">
                                {filteredMovies.slice(0, 5).map((movie) => (
                                    <button
                                        key={movie.id}
                                        type="button"
                                        onClick={() => handleLinkMovie(movie.id)}
                                        className="w-full text-left px-3 py-2 hover:bg-gray-600 transition-colors border-b border-gray-600 last:border-b-0"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Film className="w-4 h-4 text-blue-400" />
                                            <span className="text-white">{movie.title}</span>
                                            <span className="text-gray-400 text-sm">
                                                ({movie.mediaType === 'movie' ? 'Movie' : 'TV Show'})
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Linked Movies Display */}
                        {linkedMovieItems.length > 0 && (
                            <div className="space-y-2">
                                {linkedMovieItems.map((movie) => (
                                    <div
                                        key={movie.id}
                                        className="flex items-center justify-between p-2 bg-gray-700 rounded-md"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Film className="w-4 h-4 text-blue-400" />
                                            <span className="text-white">{movie.title}</span>
                                            <span className="text-gray-400 text-sm">
                                                ({movie.mediaType === 'movie' ? 'Movie' : 'TV Show'})
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleUnlinkMovie(movie.id)}
                                            className="text-red-400 hover:text-red-300 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Public Toggle */}
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="isPublic"
                            checked={isPublic}
                            onChange={(e) => setIsPublic(e.target.checked)}
                            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="isPublic" className="text-sm text-gray-300">
                            Make this entry public
                        </label>
                    </div>
                </form>

                {/* Footer */}
                <div className="p-6 border-t border-gray-700 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!title.trim() || !content.trim()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md transition-colors"
                    >
                        {entry ? 'Update Entry' : 'Create Entry'}
                    </button>
                </div>
            </div>
        </div>
    );
};

interface JournalEntryCardProps {
    entry: JournalEntry;
    onEdit: (entry: JournalEntry) => void;
    onDelete: (entryId: string) => void;
    linkedMovies: UserMediaItem[];
}

const JournalEntryCard: React.FC<JournalEntryCardProps> = ({ entry, onEdit, onDelete, linkedMovies }) => {
    const [showFullContent, setShowFullContent] = useState(false);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const truncateContent = (content: string, maxLength: number = 200) => {
        if (content.length <= maxLength) return content;
        return content.substring(0, maxLength) + '...';
    };

    return (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-white mb-1">{entry.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(entry.createdAt)}
                        </div>
                        {entry.createdAt !== entry.updatedAt && (
                            <div className="text-xs">
                                Updated: {formatDate(entry.updatedAt)}
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => onEdit(entry)}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
                        title="Edit entry"
                    >
                        <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onDelete(entry.id)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-md transition-colors"
                        title="Delete entry"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="mb-4">
                <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {showFullContent ? entry.content : truncateContent(entry.content)}
                </p>
                {entry.content.length > 200 && (
                    <button
                        onClick={() => setShowFullContent(!showFullContent)}
                        className="text-blue-400 hover:text-blue-300 text-sm mt-2 transition-colors"
                    >
                        {showFullContent ? 'Show less' : 'Show more'}
                    </button>
                )}
            </div>

            {/* Tags */}
            {entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                    {entry.tags.map((tag) => (
                        <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-sm rounded-full"
                        >
                            <Tag className="w-3 h-3" />
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            {/* Linked Movies */}
            {linkedMovies.length > 0 && (
                <div className="border-t border-gray-700 pt-4">
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Linked Movies & Shows</h4>
                    <div className="flex flex-wrap gap-2">
                        {linkedMovies.map((movie) => (
                            <div
                                key={movie.id}
                                className="flex items-center gap-1 px-2 py-1 bg-gray-700 text-white text-sm rounded-md"
                            >
                                <Film className="w-3 h-3 text-blue-400" />
                                {movie.title}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export const JournalPage: React.FC = () => {
    const { user } = useAuth();
    const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
    const [availableMovies, setAvailableMovies] = useState<UserMediaItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const loadJournalEntries = useCallback(async () => {
        if (!user) return;

        try {
            const entries = await storageService.getJournalEntries(user.id);
            setJournalEntries(entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        } catch (error) {
            console.error('Error loading journal entries:', error);
        }
    }, [user]);

    const loadAvailableMovies = useCallback(async () => {
        if (!user) return;

        try {
            const lists = await storageService.getUserLists(user.id);
            const allMovies = lists.flatMap(list => list.items);
            setAvailableMovies(allMovies);
        } catch (error) {
            console.error('Error loading available movies:', error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            loadJournalEntries();
            loadAvailableMovies();
        }
    }, [user, loadJournalEntries, loadAvailableMovies]);

    const handleCreateEntry = async (entryData: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
        if (!user) return;

        try {
            await storageService.createJournalEntry(user.id, entryData);
            setShowForm(false);
            await loadJournalEntries();
        } catch (error) {
            console.error('Error creating journal entry:', error);
        }
    };

    const handleUpdateEntry = async (entryData: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
        if (!user || !editingEntry) return;

        try {
            await storageService.updateJournalEntry(user.id, editingEntry.id, entryData);
            setEditingEntry(null);
            await loadJournalEntries();
        } catch (error) {
            console.error('Error updating journal entry:', error);
        }
    };

    const handleDeleteEntry = async (entryId: string) => {
        if (!user) return;

        if (confirm('Are you sure you want to delete this journal entry? This action cannot be undone.')) {
            try {
                await storageService.deleteJournalEntry(user.id, entryId);
                await loadJournalEntries();
            } catch (error) {
                console.error('Error deleting journal entry:', error);
            }
        }
    };

    const handleEditEntry = (entry: JournalEntry) => {
        setEditingEntry(entry);
    };

    const handleCancelForm = () => {
        setShowForm(false);
        setEditingEntry(null);
    };

    const filteredEntries = journalEntries.filter(entry =>
        entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-lg">
                        <PenTool className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Journal</h1>
                        <p className="text-gray-400 text-sm">
                            Write detailed thoughts and reviews about the movies and shows you&apos;ve watched
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    New Entry
                </button>
            </div>

            {/* Search */}
            {journalEntries.length > 0 && (
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                        placeholder="Search journal entries..."
                    />
                </div>
            )}

            {/* Journal Entries */}
            {filteredEntries.length > 0 ? (
                <div className="space-y-6">
                    {filteredEntries.map((entry) => (
                        <JournalEntryCard
                            key={entry.id}
                            entry={entry}
                            onEdit={handleEditEntry}
                            onDelete={handleDeleteEntry}
                            linkedMovies={availableMovies.filter(movie => entry.mediaItems.includes(movie.id))}
                        />
                    ))}
                </div>
            ) : journalEntries.length === 0 ? (
                /* Empty State */
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="p-4 bg-gray-800 rounded-full mb-4">
                        <PenTool className="w-8 h-8 text-gray-400" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-300 mb-2">No journal entries yet.</h2>
                    <p className="text-gray-400 mb-6 max-w-md">
                        Start writing your thoughts about movies and TV shows. Link them to your watched films for better organization.
                    </p>
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Create Your First Entry
                    </button>
                </div>
            ) : (
                /* No Search Results */
                <div className="text-center py-20">
                    <div className="p-4 bg-gray-800 rounded-full mb-4 mx-auto w-fit">
                        <Search className="w-8 h-8 text-gray-400" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-300 mb-2">No entries found</h2>
                    <p className="text-gray-400">
                        Try adjusting your search terms or create a new entry.
                    </p>
                </div>
            )}

            {/* Journal Form Modal */}
            {(showForm || editingEntry) && (
                <JournalForm
                    entry={editingEntry || undefined}
                    onSave={editingEntry ? handleUpdateEntry : handleCreateEntry}
                    onCancel={handleCancelForm}
                    availableMovies={availableMovies}
                />
            )}
        </div>
    );
}; 