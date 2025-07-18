import mongoose, { Schema, Document } from 'mongoose';
import { UserList, JournalEntry, UserPreferences } from '@/types';

export interface UserDataDocument extends Document {
    userId: string;
    lists: UserList[];
    customLists: UserList[];
    journalEntries: JournalEntry[];
    preferences: UserPreferences;
    createdAt: string;
    updatedAt: string;
}

// User Media Item Schema
const UserMediaItemSchema = new Schema({
    id: { type: String, required: true },
    mediaType: { type: String, enum: ['movie', 'tv'], required: true },
    mediaId: { type: Number, required: true },
    title: { type: String, required: true },
    poster_path: { type: String },
    release_date: { type: String },
    first_air_date: { type: String },
    status: { type: String, enum: ['to_watch', 'watched'], default: 'to_watch' },
    rating: { type: Number, min: 1, max: 10 },
    notes: { type: String },
    dateAdded: { type: String, required: true },
    dateWatched: { type: String },
    tags: [{ type: String }],
    isFavorite: { type: Boolean, default: false },
    watchCount: { type: Number, default: 0 },
    customListIds: [{ type: String }],
    festivals: [{ type: Schema.Types.Mixed }],
    awards: [{ type: Schema.Types.Mixed }],
    episodeProgress: { type: Schema.Types.Mixed }
}, { _id: false });

// User List Schema
const UserListSchema = new Schema({
    id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    isSystem: { type: Boolean, default: false },
    isDefault: { type: Boolean, default: false },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
    items: [UserMediaItemSchema]
}, { _id: false });

// Journal Entry Schema
const JournalEntrySchema = new Schema({
    id: { type: String, required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    dateCreated: { type: String, required: true },
    dateUpdated: { type: String, required: true },
    movieId: { type: Number },
    tvShowId: { type: Number },
    rating: { type: Number, min: 1, max: 10 },
    tags: [{ type: String }],
    mood: { type: String },
    location: { type: String },
    weather: { type: String },
    isPublic: { type: Boolean, default: false },
    isFavorite: { type: Boolean, default: false }
}, { _id: false });

// User Preferences Schema
const UserPreferencesSchema = new Schema({
    theme: { type: String, enum: ['light', 'dark'], default: 'dark' },
    language: { type: String, default: 'en' },
    region: { type: String, default: 'IN' },
    defaultView: { type: String, enum: ['grid', 'list'], default: 'grid' },
    itemsPerPage: { type: Number, default: 20 },
    notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        marketing: { type: Boolean, default: false }
    }
}, { _id: false });

// Main UserData Schema
const UserDataSchema = new Schema<UserDataDocument>({
    userId: {
        type: String,
        required: true,
        unique: true,
        ref: 'User'
    },
    lists: [UserListSchema],
    customLists: [UserListSchema],
    journalEntries: [JournalEntrySchema],
    preferences: {
        type: UserPreferencesSchema,
        default: () => ({
            theme: 'dark',
            language: 'en',
            region: 'IN',
            defaultView: 'grid',
            itemsPerPage: 20
        })
    },
    createdAt: {
        type: String,
        default: () => new Date().toISOString()
    },
    updatedAt: {
        type: String,
        default: () => new Date().toISOString()
    }
}, {
    timestamps: false, // We're using custom timestamp fields
    toJSON: {
        transform: function (doc, ret) {
            const obj = ret as Record<string, unknown>;
            delete obj._id;
            delete obj.__v;
            return obj;
        }
    }
});

// Create indexes (only if not already defined)  
if (!UserDataSchema.indexes().length) {
    UserDataSchema.index({ userId: 1 });
    UserDataSchema.index({ updatedAt: 1 });
    UserDataSchema.index({ 'lists.items.mediaId': 1 });
    UserDataSchema.index({ 'customLists.items.mediaId': 1 });
}

export const UserDataModel = mongoose.models.UserData || mongoose.model<UserDataDocument>('UserData', UserDataSchema); 