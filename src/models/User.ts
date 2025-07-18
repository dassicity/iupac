import mongoose, { Schema, Document } from 'mongoose';
import { User as IUser } from '@/types';

// Extend the User interface to include MongoDB _id
export interface UserDocument extends Omit<IUser, 'id'>, Document {
    _id: string;
}

const DeviceInfoSchema = new Schema({
    browser: { type: String, default: 'Unknown' },
    browserVersion: { type: String, default: 'Unknown' },
    os: { type: String, default: 'Unknown' },
    osVersion: { type: String, default: 'Unknown' },
    device: { type: String, default: 'Unknown' },
    deviceType: { type: String, enum: ['desktop', 'mobile', 'tablet'], default: 'desktop' },
    screenResolution: { type: String, default: '0x0' },
    colorDepth: { type: Number, default: 0 },
    timezone: { type: String, default: 'Unknown' },
    language: { type: String, default: 'Unknown' },
    platform: { type: String, default: 'Unknown' },
    touchSupport: { type: Boolean, default: false },
    cookiesEnabled: { type: Boolean, default: false },
    javascriptEnabled: { type: Boolean, default: true },
    webGLSupported: { type: Boolean, default: false },
    localStorageSupported: { type: Boolean, default: false },
    sessionStorageSupported: { type: Boolean, default: false },
    indexedDBSupported: { type: Boolean, default: false },
    webRTCSupported: { type: Boolean, default: false },
    geolocationSupported: { type: Boolean, default: false },
    doNotTrack: { type: Boolean, default: false },
    hardwareConcurrency: { type: Number, default: 0 },
    maxTouchPoints: { type: Number, default: 0 },
    deviceMemory: { type: Number },
    connection: {
        effectiveType: { type: String },
        downlink: { type: Number },
        rtt: { type: Number },
        saveData: { type: Boolean }
    }
}, { _id: false });

const LocationDataSchema = new Schema({
    country: { type: String, default: 'Unknown' },
    countryCode: { type: String, default: 'Unknown' },
    region: { type: String, default: 'Unknown' },
    city: { type: String, default: 'Unknown' },
    latitude: { type: Number, default: 0 },
    longitude: { type: Number, default: 0 },
    timezone: { type: String, default: 'Unknown' },
    isp: { type: String, default: 'Unknown' },
    approximateLocation: { type: Boolean, default: true },
    vpnDetected: { type: Boolean, default: false },
    proxyDetected: { type: Boolean, default: false }
}, { _id: false });

const NetworkInfoSchema = new Schema({
    ipAddress: { type: String, required: true },
    ipVersion: { type: String, enum: ['IPv4', 'IPv6'], default: 'IPv4' },
    hostname: { type: String },
    asn: { type: String, default: 'Unknown' },
    organization: { type: String, default: 'Unknown' },
    connectionType: { type: String, default: 'Unknown' },
    threatLevel: { type: String, default: 'Unknown' }
}, { _id: false });

const PageViewSchema = new Schema({
    id: { type: String, required: true },
    url: { type: String, required: true },
    title: { type: String, required: true },
    timestamp: { type: String, required: true },
    duration: { type: Number, default: 0 },
    scrollDepth: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    referrer: { type: String, default: 'direct' }
}, { _id: false });

const InteractionSchema = new Schema({
    id: { type: String, required: true },
    type: { type: String, required: true },
    element: { type: String, required: true },
    timestamp: { type: String, required: true },
    coordinates: {
        x: { type: Number },
        y: { type: Number }
    },
    data: { type: Schema.Types.Mixed },
    value: { type: String }
}, { _id: false });

const SessionTrackingSchema = new Schema({
    id: { type: String, required: true },
    sessionStart: { type: String, required: true },
    sessionEnd: { type: String },
    ipAddress: { type: String, required: true },
    userAgent: { type: String, default: 'Unknown' },
    referrer: { type: String, default: 'direct' },
    deviceInfo: { type: DeviceInfoSchema, required: true },
    locationData: { type: LocationDataSchema, required: true },
    pageViews: [PageViewSchema],
    interactions: [InteractionSchema]
}, { _id: false });

const BehaviorDataSchema = new Schema({
    totalPageViews: { type: Number, default: 0 },
    totalInteractions: { type: Number, default: 0 },
    averageSessionDuration: { type: Number, default: 0 },
    mostVisitedPages: [{ type: String }],
    searchQueries: [{ type: String }],
    moviesAdded: { type: Number, default: 0 },
    moviesRated: { type: Number, default: 0 },
    journalEntries: { type: Number, default: 0 },
    customListsCreated: { type: Number, default: 0 },
    lastActivity: { type: String, required: true }
}, { _id: false });

const UserTrackingDataSchema = new Schema({
    sessions: [SessionTrackingSchema],
    deviceInfo: { type: DeviceInfoSchema, required: true },
    browserFingerprint: { type: String, default: '' },
    firstVisit: { type: String, required: true },
    totalSessions: { type: Number, default: 1 },
    lastUpdated: { type: String, required: true },
    locationData: { type: LocationDataSchema, required: true },
    networkInfo: { type: NetworkInfoSchema, required: true },
    behaviorData: { type: BehaviorDataSchema, required: true }
}, { _id: false });

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

const UserSchema = new Schema<UserDocument>({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 30
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    createdAt: {
        type: String,
        default: () => new Date().toISOString()
    },
    lastLogin: {
        type: String
    },
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
    trackingData: {
        type: UserTrackingDataSchema
    }
}, {
    timestamps: false, // We're using custom createdAt field
    toJSON: {
        transform: function (doc, ret) {
            const obj = ret as Record<string, unknown>;
            obj.id = obj._id?.toString();
            delete obj._id;
            delete obj.__v;
            return obj;
        }
    }
});

// Create indexes (only if not already defined)
if (!UserSchema.indexes().length) {
    UserSchema.index({ username: 1 });
    UserSchema.index({ createdAt: 1 });
    UserSchema.index({ 'trackingData.sessions.sessionStart': 1 });
    UserSchema.index({ 'trackingData.behaviorData.lastActivity': 1 });
}

export const UserModel = mongoose.models.User || mongoose.model<UserDocument>('User', UserSchema); 