import { NextRequest, NextResponse } from 'next/server';
import { LocationData } from '@/types';
import { APP_CONFIG } from '@/constants/app';
import connectDB from '@/lib/mongodb';
import { UserModel } from '@/models/User';
import { UserDataModel } from '@/models/UserData';

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
        console.error('❌ [signup] Error getting location data:', error);
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
    console.log('🚀 [signup] Starting user registration process');
    try {
        // Connect to MongoDB
        await connectDB();
        console.log('🔌 [signup] Connected to MongoDB');

        const { username, password, trackingData } = await request.json();
        console.log(`👤 [signup] Received registration request for username: ${username}`);

        if (!username || !password) {
            console.log('❌ [signup] Missing required fields');
            return NextResponse.json(
                { error: 'Username and password are required' },
                { status: 400 }
            );
        }

        // Check if user already exists
        const existingUser = await UserModel.findOne({ username });

        if (existingUser) {
            console.log(`⚠️ [signup] User ${username} already exists`);
            return NextResponse.json(
                { error: 'User already exists' },
                { status: 409 }
            );
        }

        // Get client IP and location data
        const clientIP = getClientIP(request);
        console.log(`🌐 [signup] Client IP: ${clientIP}`);

        const locationData = await getLocationData(clientIP);
        console.log(`📍 [signup] Location data retrieved: ${locationData.country}, ${locationData.city}`);

        const sessionId = generateSessionId();
        console.log(`🔑 [signup] Generated session ID: ${sessionId}`);

        // Create new user with tracking data
        console.log('📝 [signup] Creating new user object');
        const newUser = new UserModel({
            username,
            password, // Note: In production, you should hash this
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
        });

        // Save user to MongoDB
        const savedUser = await newUser.save();
        console.log(`✅ [signup] User saved to MongoDB with ID: ${savedUser._id}`);

        // Initialize user's data document
        console.log(`📄 [signup] Initializing user data for ${username}`);
        const userData = new UserDataModel({
            userId: savedUser._id.toString(),
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
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        await userData.save();
        console.log(`✅ [signup] User data initialized for ${username}`);

        // Return user data (without password) and session info
        const userWithoutPassword = {
            id: savedUser._id.toString(),
            username: savedUser.username,
            createdAt: savedUser.createdAt,
            preferences: savedUser.preferences,
        };

        console.log(`✅ [signup] Registration successful for ${username}`);
        return NextResponse.json({
            user: userWithoutPassword,
            sessionId,
            trackingEnabled: true
        }, { status: 201 });

    } catch (error) {
        console.error('❌ [signup] Registration error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 