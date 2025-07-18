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

        // Use atomic updates to prevent version conflicts
        const updateQuery: Record<string, unknown> = {
            'trackingData.lastUpdated': new Date().toISOString(),
            'trackingData.behaviorData.lastActivity': new Date().toISOString()
        };

        // Update tracking data based on type using atomic operations
        switch (type) {
            case 'pageview':
                const pageViewData = data as PageViewData;
                console.log(`📄 [tracking] Adding page view: ${pageViewData.url}`);

                updateQuery[`trackingData.sessions.${sessionIndex}.pageViews`] = pageViewData;
                updateQuery['trackingData.behaviorData.totalPageViews'] = 1;

                // Check if page already exists in mostVisited
                if (!user.trackingData.behaviorData.mostVisitedPages.includes(pageViewData.url)) {
                    updateQuery['trackingData.behaviorData.mostVisitedPages'] = pageViewData.url;
                }
                break;

            case 'interaction':
                const interactionData = data as InteractionData;
                console.log(`🖱️ [tracking] Adding interaction: ${interactionData.type} on ${interactionData.element}`);

                updateQuery[`trackingData.sessions.${sessionIndex}.interactions`] = interactionData;
                updateQuery['trackingData.behaviorData.totalInteractions'] = 1;

                // Handle specific interaction types
                if (interactionData.type === 'search' && interactionData.data?.query) {
                    updateQuery['trackingData.behaviorData.searchQueries'] = String(interactionData.data.query);
                } else if (interactionData.type === 'movie_add') {
                    updateQuery['trackingData.behaviorData.moviesAdded'] = 1;
                } else if (interactionData.type === 'rating') {
                    updateQuery['trackingData.behaviorData.moviesRated'] = 1;
                }
                break;

            case 'pageExit':
                console.log(`🚪 [tracking] Recording page exit data`);
                // Update session duration and other exit data
                break;

            default:
                console.log(`⚠️ [tracking] Unknown tracking type: ${type}`);
        }

        // Perform atomic update to prevent version conflicts
        await UserModel.findByIdAndUpdate(userId, {
            $push: updateQuery,
            $inc: {
                'trackingData.behaviorData.totalPageViews': type === 'pageview' ? 1 : 0,
                'trackingData.behaviorData.totalInteractions': type === 'interaction' ? 1 : 0,
                'trackingData.behaviorData.moviesAdded': (type === 'interaction' && (data as InteractionData).type === 'movie_add') ? 1 : 0,
                'trackingData.behaviorData.moviesRated': (type === 'interaction' && (data as InteractionData).type === 'rating') ? 1 : 0,
            },
            $set: {
                'trackingData.lastUpdated': new Date().toISOString(),
                'trackingData.behaviorData.lastActivity': new Date().toISOString()
            }
        });
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