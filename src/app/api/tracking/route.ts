import { NextRequest, NextResponse } from 'next/server';
import { PageViewData, InteractionData } from '@/types';
import connectDB from '@/lib/mongodb';
import { UserModel } from '@/models/User';

export async function POST(request: NextRequest) {
    console.log('📊 [tracking] Received tracking data');
    try {
        // Connect to MongoDB
        await connectDB();

        const { userId, sessionId, type, data } = await request.json();
        console.log(`👤 [tracking] Processing ${type} data for user ${userId}, session ${sessionId}`);

        if (!userId || !sessionId) {
            console.log('❌ [tracking] Missing required fields');
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Find the user (handle both ObjectId and old string IDs)
        let user;
        try {
            // Try finding by MongoDB _id first
            user = await UserModel.findById(userId);
        } catch {
            // If that fails, try finding by old ID (stored in username or custom field)
            // For now, we'll reject old IDs and require re-login
            console.log(`⚠️ [tracking] Invalid user ID format: ${userId}. User needs to re-login.`);
            return NextResponse.json(
                { error: 'Invalid user session. Please log in again.' },
                { status: 401 }
            );
        }
        if (!user) {
            console.log(`❌ [tracking] User ${userId} not found`);
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Initialize tracking data if it doesn't exist
        if (!user.trackingData) {
            console.log(`📊 [tracking] Initializing tracking data for user ${userId}`);
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
                locationData: {
                    country: 'Unknown',
                    countryCode: 'Unknown',
                    region: 'Unknown',
                    city: 'Unknown',
                    latitude: 0,
                    longitude: 0,
                    timezone: 'Unknown',
                    isp: 'Unknown',
                    approximateLocation: true
                },
                networkInfo: {
                    ipAddress: '127.0.0.1',
                    ipVersion: 'IPv4'
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

        // Find or create the session
        let sessionIndex = user.trackingData.sessions.findIndex((s: { id: string }) => s.id === sessionId);
        if (sessionIndex === -1) {
            console.log(`➕ [tracking] Creating new session ${sessionId} for user ${userId}`);
            user.trackingData.sessions.push({
                id: sessionId,
                sessionStart: new Date().toISOString(),
                ipAddress: '127.0.0.1',
                userAgent: 'unknown',
                referrer: 'direct',
                deviceInfo: user.trackingData.deviceInfo,
                locationData: user.trackingData.locationData,
                pageViews: [],
                interactions: []
            });
            sessionIndex = user.trackingData.sessions.length - 1;
        }

        // Update tracking data based on type
        switch (type) {
            case 'pageview':
                const pageViewData = data as PageViewData;
                console.log(`📄 [tracking] Adding page view: ${pageViewData.url}`);
                user.trackingData.sessions[sessionIndex].pageViews.push(pageViewData);
                user.trackingData.behaviorData.totalPageViews++;

                // Update most visited pages
                const existingPageIndex = user.trackingData.behaviorData.mostVisitedPages.findIndex((p: string) => p === pageViewData.url);
                if (existingPageIndex === -1) {
                    user.trackingData.behaviorData.mostVisitedPages.push(pageViewData.url);
                }
                break;

            case 'interaction':
                const interactionData = data as InteractionData;
                console.log(`🖱️ [tracking] Adding interaction: ${interactionData.type} on ${interactionData.element}`);
                user.trackingData.sessions[sessionIndex].interactions.push(interactionData);
                user.trackingData.behaviorData.totalInteractions++;

                // Handle specific interaction types
                if (interactionData.type === 'search' && interactionData.data?.query) {
                    user.trackingData.behaviorData.searchQueries.push(String(interactionData.data.query));
                } else if (interactionData.type === 'movie_add') {
                    user.trackingData.behaviorData.moviesAdded++;
                } else if (interactionData.type === 'rating') {
                    user.trackingData.behaviorData.moviesRated++;
                }
                break;

            case 'pageExit':
                console.log(`🚪 [tracking] Recording page exit data`);
                // Update session duration and other exit data
                break;

            default:
                console.log(`⚠️ [tracking] Unknown tracking type: ${type}`);
        }

        // Update last activity and tracking timestamp
        user.trackingData.lastUpdated = new Date().toISOString();
        user.trackingData.behaviorData.lastActivity = new Date().toISOString();

        // Save to MongoDB
        await user.save();
        console.log(`✅ [tracking] Successfully saved tracking data for user ${userId}`);

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error) {
        console.error('❌ [tracking] Error processing tracking data:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 