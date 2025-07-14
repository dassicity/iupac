import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { User, LocationData } from '@/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Get all users from file
async function getAllUsers(): Promise<User[]> {
    try {
        const data = await fs.readFile(USERS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

// Save users to file (for updating last login)
async function saveUsers(users: User[]): Promise<void> {
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
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

export async function POST(request: NextRequest) {
    try {
        const { username, password, trackingData } = await request.json();

        if (!username || !password) {
            return NextResponse.json(
                { error: 'Username and password are required' },
                { status: 400 }
            );
        }

        // Find user by username
        const users = await getAllUsers();
        const user = users.find(u => u.username === username);

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 401 }
            );
        }

        // Validate password (in production, use bcrypt.compare)
        if (user.password !== password) {
            return NextResponse.json(
                { error: 'Invalid password' },
                { status: 401 }
            );
        }

        // Get client IP and location data
        const clientIP = getClientIP(request);
        const locationData = await getLocationData(clientIP);
        const sessionId = generateSessionId();

        // Update last login and tracking data
        const userIndex = users.findIndex(u => u.id === user.id);
        if (userIndex !== -1) {
            users[userIndex].lastLogin = new Date().toISOString();

            // Initialize or update tracking data
            if (!users[userIndex].trackingData) {
                users[userIndex].trackingData = {
                    sessions: [],
                    deviceInfo: {
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
                    browserFingerprint: '',
                    firstVisit: new Date().toISOString(),
                    totalSessions: 0,
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
                };
            }

            // Update device info from client if provided
            if (trackingData?.deviceInfo) {
                users[userIndex].trackingData!.deviceInfo = {
                    ...users[userIndex].trackingData!.deviceInfo,
                    ...trackingData.deviceInfo
                };
            }

            // Update browser fingerprint if provided
            if (trackingData?.browserFingerprint) {
                users[userIndex].trackingData!.browserFingerprint = trackingData.browserFingerprint;
            }

            // Add new session
            const newSession = {
                id: sessionId,
                sessionStart: new Date().toISOString(),
                ipAddress: clientIP,
                userAgent: request.headers.get('user-agent') || 'unknown',
                referrer: request.headers.get('referer') || 'direct',
                deviceInfo: users[userIndex].trackingData!.deviceInfo,
                locationData,
                pageViews: [],
                interactions: []
            };

            users[userIndex].trackingData!.sessions.push(newSession);
            users[userIndex].trackingData!.totalSessions++;
            users[userIndex].trackingData!.lastUpdated = new Date().toISOString();
            users[userIndex].trackingData!.behaviorData.lastActivity = new Date().toISOString();

            await saveUsers(users);
        }

        // Return user data (without password) and session info
        const userWithoutPassword = {
            id: user.id,
            username: user.username,
            createdAt: user.createdAt,
            preferences: user.preferences,
            lastLogin: users[userIndex].lastLogin,
        };

        return NextResponse.json({
            user: userWithoutPassword,
            sessionId,
            trackingEnabled: true
        }, { status: 200 });

    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 