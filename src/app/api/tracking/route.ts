import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { User, PageViewData, InteractionData } from '@/types';

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

// Save users to file
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

// Update user tracking data
async function updateUserTrackingData(userId: string, sessionId: string, type: string, data: Record<string, unknown>): Promise<void> {
    const users = await getAllUsers();
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) return;

    const user = users[userIndex];
    if (!user.trackingData) {
        // Initialize with minimal tracking data structure
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
                ipAddress: 'unknown',
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

    const trackingData = user.trackingData;

    // Find or create session
    let session = trackingData.sessions.find(s => s.id === sessionId);
    if (!session) {
        session = {
            id: sessionId,
            sessionStart: new Date().toISOString(),
            ipAddress: (data.ipAddress as string) || 'unknown',
            userAgent: (data.userAgent as string) || 'unknown',
            referrer: (data.referrer as string) || 'direct',
            deviceInfo: trackingData.deviceInfo,
            locationData: trackingData.locationData,
            pageViews: [],
            interactions: []
        };
        trackingData.sessions.push(session);
        trackingData.totalSessions++;
    }

    // Update session data based on type
    switch (type) {
        case 'pageview':
            if (session && data.id && data.url && data.title && data.timestamp) {
                const pageView: PageViewData = {
                    id: data.id as string,
                    url: data.url as string,
                    title: data.title as string,
                    timestamp: data.timestamp as string,
                    duration: (data.duration as number) || 0,
                    scrollDepth: (data.scrollDepth as number) || 0,
                    clicks: (data.clicks as number) || 0,
                    referrer: (data.referrer as string) || 'direct'
                };
                session.pageViews.push(pageView);
                trackingData.behaviorData.totalPageViews++;

                // Update most visited pages
                const url = data.url as string;
                if (!trackingData.behaviorData.mostVisitedPages.includes(url)) {
                    trackingData.behaviorData.mostVisitedPages.push(url);
                }
            }
            break;

        case 'interaction':
            if (session && data.id && data.type && data.element && data.timestamp) {
                const interaction: InteractionData = {
                    id: data.id as string,
                    type: data.type as InteractionData['type'],
                    element: data.element as string,
                    timestamp: data.timestamp as string,
                    data: data.data as Record<string, unknown>,
                    coordinates: data.coordinates as { x: number; y: number },
                    value: data.value as string
                };
                session.interactions.push(interaction);
                trackingData.behaviorData.totalInteractions++;

                // Track specific interactions
                if (data.type === 'search') {
                    const query = (data.data as Record<string, unknown>)?.query as string;
                    if (query && !trackingData.behaviorData.searchQueries.includes(query)) {
                        trackingData.behaviorData.searchQueries.push(query);
                    }
                } else if (data.type === 'movie_add') {
                    trackingData.behaviorData.moviesAdded++;
                } else if (data.type === 'rating') {
                    trackingData.behaviorData.moviesRated++;
                } else if (data.type === 'list_create') {
                    trackingData.behaviorData.customListsCreated++;
                } else if (data.type === 'journal_entry') {
                    trackingData.behaviorData.journalEntries++;
                }
            }
            break;

        case 'pageExit':
            if (session && data.id) {
                const pageView = session.pageViews.find(pv => pv.id === data.id);
                if (pageView) {
                    pageView.duration = (data.duration as number) || 0;
                    pageView.scrollDepth = (data.scrollDepth as number) || 0;
                    pageView.clicks = (data.clicks as number) || 0;
                    pageView.exitMethod = (data.exitMethod as PageViewData['exitMethod']) || 'navigation';
                }
            }
            break;
    }

    // Update last activity
    trackingData.behaviorData.lastActivity = new Date().toISOString();
    trackingData.lastUpdated = new Date().toISOString();

    // Calculate average session duration
    const completedSessions = trackingData.sessions.filter(s => s.sessionEnd);
    if (completedSessions.length > 0) {
        const totalDuration = completedSessions.reduce((sum, s) => {
            const start = new Date(s.sessionStart).getTime();
            const end = new Date(s.sessionEnd!).getTime();
            return sum + (end - start);
        }, 0);
        trackingData.behaviorData.averageSessionDuration = totalDuration / completedSessions.length;
    }

    users[userIndex] = user;
    await saveUsers(users);
}

export async function POST(request: NextRequest) {
    try {
        const { userId, sessionId, type, data } = await request.json();

        if (!userId || !sessionId || !type) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Add IP address to data
        const clientIP = getClientIP(request);
        data.ipAddress = clientIP;

        await updateUserTrackingData(userId, sessionId, type, data);

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error) {
        console.error('Tracking error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 