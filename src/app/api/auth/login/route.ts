import { NextRequest, NextResponse } from 'next/server';
import { LocationData } from '@/types';
import connectDB from '@/lib/mongodb';
import { UserModel } from '@/models/User';

// Helper function to get client IP
function getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const cfConnectingIP = request.headers.get('cf-connecting-ip');

    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }

    if (realIP) {
        return realIP;
    }

    if (cfConnectingIP) {
        return cfConnectingIP;
    }

    return '127.0.0.1';
}

// Helper function to generate session ID
function generateSessionId(): string {
    return 'sess_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

// Get location data from IP
async function getLocationData(ipAddress: string): Promise<LocationData> {
    try {
        // Skip API call for localhost
        if (ipAddress === '127.0.0.1' || ipAddress === '::1' || ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.')) {
            return {
                country: 'Local',
                countryCode: 'LC',
                region: 'Local',
                city: 'Local',
                latitude: 0,
                longitude: 0,
                timezone: 'UTC',
                isp: 'Local',
                approximateLocation: true
            };
        }

        const response = await fetch(`https://ipapi.co/${ipAddress}/json/`, {
            headers: {
                'User-Agent': 'IUPAC Movie Tracker/1.0'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

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
        console.error('❌ [login] Error getting location data:', error);
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

export async function POST(request: NextRequest) {
    console.log('🚀 [login] Starting user login process');
    try {
        // Connect to MongoDB
        await connectDB();
        console.log('🔌 [login] Connected to MongoDB');

        const { username, password, trackingData } = await request.json();
        console.log(`👤 [login] Received login request for username: ${username}`);

        if (!username || !password) {
            console.log('❌ [login] Missing required fields');
            return NextResponse.json(
                { error: 'Username and password are required' },
                { status: 400 }
            );
        }

        // Find user by username
        const user = await UserModel.findOne({ username });
        console.log(`📊 [login] User lookup complete`);

        if (!user) {
            console.log(`❌ [login] User not found: ${username}`);
            return NextResponse.json(
                { error: 'User not found' },
                { status: 401 }
            );
        }

        // Validate password (in production, use bcrypt.compare)
        if (user.password !== password) {
            console.log(`🔒 [login] Invalid password for user: ${username}`);
            return NextResponse.json(
                { error: 'Invalid password' },
                { status: 401 }
            );
        }

        console.log(`✓ [login] Password validated for user: ${username}`);

        // Get client IP and location data
        const clientIP = getClientIP(request);
        console.log(`🌐 [login] Client IP: ${clientIP}`);

        const locationData = await getLocationData(clientIP);
        console.log(`📍 [login] Location data retrieved: ${locationData.country}, ${locationData.city}`);

        const sessionId = generateSessionId();
        console.log(`🔑 [login] Generated session ID: ${sessionId}`);

        // Update last login and tracking data
        console.log(`🔄 [login] Updating user tracking data for: ${username}`);

        // Update last login
        user.lastLogin = new Date().toISOString();

        // Initialize or update tracking data
        if (!user.trackingData) {
            console.log(`📊 [login] Initializing tracking data for user: ${username}`);
            user.trackingData = {
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
            console.log(`📱 [login] Updating device info for user: ${username}`);
            user.trackingData.deviceInfo = {
                ...user.trackingData.deviceInfo,
                ...trackingData.deviceInfo
            };
        }

        // Update browser fingerprint if provided
        if (trackingData?.browserFingerprint) {
            console.log(`👆 [login] Updating browser fingerprint for user: ${username}`);
            user.trackingData.browserFingerprint = trackingData.browserFingerprint;
        }

        // Add new session
        console.log(`➕ [login] Adding new session for user: ${username}`);
        const newSession = {
            id: sessionId,
            sessionStart: new Date().toISOString(),
            ipAddress: clientIP,
            userAgent: request.headers.get('user-agent') || 'unknown',
            referrer: request.headers.get('referer') || 'direct',
            deviceInfo: user.trackingData.deviceInfo,
            locationData,
            pageViews: [],
            interactions: []
        };

        user.trackingData.sessions.push(newSession);
        user.trackingData.totalSessions++;
        user.trackingData.lastUpdated = new Date().toISOString();
        user.trackingData.behaviorData.lastActivity = new Date().toISOString();

        // Save updated user data to MongoDB
        console.log(`💾 [login] Saving updated user data for: ${username}`);
        await user.save();

        // Return user data (without password) and session info
        const userWithoutPassword = {
            id: user._id.toString(),
            username: user.username,
            createdAt: user.createdAt,
            preferences: user.preferences,
            lastLogin: user.lastLogin,
        };

        console.log(`✅ [login] Login successful for user: ${username}`);
        return NextResponse.json({
            user: userWithoutPassword,
            sessionId,
            trackingEnabled: true
        }, { status: 200 });

    } catch (error) {
        console.error('❌ [login] Login error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 