import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { User, LocationData } from '@/types';
import { APP_CONFIG } from '@/constants/app';

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Ensure data directory exists
async function ensureDataDir() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
}

// Get all users from file
async function getAllUsers(): Promise<User[]> {
    try {
        const data = await fs.readFile(USERS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

// Save users to file
async function saveUsers(users: User[]): Promise<void> {
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

// Generate unique ID
function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Get client IP address
function getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');

    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }

    if (realIP) {
        return realIP;
    }

    return request.headers.get('x-forwarded-for') ||
        request.headers.get('x-real-ip') ||
        request.headers.get('remote-addr') ||
        'unknown';
}

// Get IP-based location data
async function getLocationData(ipAddress: string): Promise<LocationData> {
    try {
        const response = await fetch(`https://ipapi.co/${ipAddress}/json/`);
        const data = await response.json();

        return {
            country: data.country_name || 'Unknown',
            countryCode: data.country_code || 'Unknown',
            region: data.region || 'Unknown',
            city: data.city || 'Unknown',
            latitude: data.latitude || 0,
            longitude: data.longitude || 0,
            timezone: data.timezone || 'Unknown',
            isp: data.org || 'Unknown',
            approximateLocation: true,
            vpnDetected: data.threat?.is_anonymous || false,
            proxyDetected: data.threat?.is_proxy || false
        };
    } catch (error) {
        console.error('Error getting location data:', error);
        return {
            country: 'Unknown',
            countryCode: 'Unknown',
            region: 'Unknown',
            city: 'Unknown',
            latitude: 0,
            longitude: 0,
            timezone: 'Unknown',
            isp: 'Unknown',
            approximateLocation: true
        };
    }
}

// Generate session ID
function generateSessionId(): string {
    return Math.random().toString(36).substr(2, 9);
}

// Initialize user data file
async function initializeUserData(userId: string): Promise<void> {
    const userDataFile = path.join(DATA_DIR, `user_${userId}.json`);
    const userData = {
        lists: APP_CONFIG.DEFAULT_LISTS.map(list => ({
            ...list,
            items: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        })),
        customLists: [],
        journalEntries: [],
        preferences: {
            theme: 'dark',
            language: 'en',
            region: 'IN',
            defaultView: 'grid',
            itemsPerPage: 20,
        },
    };

    await fs.writeFile(userDataFile, JSON.stringify(userData, null, 2));
}

export async function POST(request: NextRequest) {
    try {
        await ensureDataDir();

        const { username, password, trackingData } = await request.json();

        if (!username || !password) {
            return NextResponse.json(
                { error: 'Username and password are required' },
                { status: 400 }
            );
        }

        // Check if user already exists
        const users = await getAllUsers();
        const existingUser = users.find(user => user.username === username);

        if (existingUser) {
            return NextResponse.json(
                { error: 'User already exists' },
                { status: 409 }
            );
        }

        // Get client IP and location data
        const clientIP = getClientIP(request);
        const locationData = await getLocationData(clientIP);
        const sessionId = generateSessionId();

        // Create new user with tracking data
        const newUser: User = {
            id: generateId(),
            username,
            password, // In production, hash this password
            createdAt: new Date().toISOString(),
            preferences: {
                theme: 'dark',
                language: 'en',
                region: 'IN',
                defaultView: 'grid',
                itemsPerPage: 20,
            },
            trackingData: {
                sessions: [{
                    id: sessionId,
                    sessionStart: new Date().toISOString(),
                    ipAddress: clientIP,
                    userAgent: request.headers.get('user-agent') || 'unknown',
                    referrer: request.headers.get('referer') || 'direct',
                    deviceInfo: trackingData?.deviceInfo || {
                        browser: 'Unknown',
                        browserVersion: 'Unknown',
                        os: 'Unknown',
                        osVersion: 'Unknown',
                        device: 'Unknown',
                        deviceType: 'desktop',
                        screenResolution: '0x0',
                        colorDepth: 0,
                        timezone: 'Unknown',
                        language: 'Unknown',
                        platform: 'Unknown',
                        touchSupport: false,
                        cookiesEnabled: false,
                        javascriptEnabled: true,
                        webGLSupported: false,
                        localStorageSupported: false,
                        sessionStorageSupported: false,
                        indexedDBSupported: false,
                        webRTCSupported: false,
                        geolocationSupported: false,
                        doNotTrack: false,
                        hardwareConcurrency: 0,
                        maxTouchPoints: 0
                    },
                    locationData,
                    pageViews: [],
                    interactions: []
                }],
                deviceInfo: trackingData?.deviceInfo || {
                    browser: 'Unknown',
                    browserVersion: 'Unknown',
                    os: 'Unknown',
                    osVersion: 'Unknown',
                    device: 'Unknown',
                    deviceType: 'desktop',
                    screenResolution: '0x0',
                    colorDepth: 0,
                    timezone: 'Unknown',
                    language: 'Unknown',
                    platform: 'Unknown',
                    touchSupport: false,
                    cookiesEnabled: false,
                    javascriptEnabled: true,
                    webGLSupported: false,
                    localStorageSupported: false,
                    sessionStorageSupported: false,
                    indexedDBSupported: false,
                    webRTCSupported: false,
                    geolocationSupported: false,
                    doNotTrack: false,
                    hardwareConcurrency: 0,
                    maxTouchPoints: 0
                },
                browserFingerprint: trackingData?.browserFingerprint || '',
                firstVisit: new Date().toISOString(),
                totalSessions: 1,
                lastUpdated: new Date().toISOString(),
                locationData,
                networkInfo: {
                    ipAddress: clientIP,
                    ipVersion: clientIP.includes(':') ? 'IPv6' : 'IPv4'
                },
                behaviorData: {
                    totalPageViews: 0,
                    totalInteractions: 0,
                    averageSessionDuration: 0,
                    mostVisitedPages: [],
                    searchQueries: [],
                    moviesAdded: 0,
                    moviesRated: 0,
                    journalEntries: 0,
                    customListsCreated: 0,
                    lastActivity: new Date().toISOString()
                }
            }
        };

        // Save user to users file
        users.push(newUser);
        await saveUsers(users);

        // Initialize user's data file
        await initializeUserData(newUser.id);

        // Return user data (without password) and session info
        const userWithoutPassword = {
            id: newUser.id,
            username: newUser.username,
            createdAt: newUser.createdAt,
            preferences: newUser.preferences,
        };
        return NextResponse.json({
            user: userWithoutPassword,
            sessionId,
            trackingEnabled: true
        }, { status: 201 });

    } catch (error) {
        console.error('Signup error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 