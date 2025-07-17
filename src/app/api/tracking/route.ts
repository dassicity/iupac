import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { User, PageViewData, InteractionData } from '@/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const LOCK_FILE = path.join(DATA_DIR, 'users.json.lock');

// Maximum number of retries for file operations
const MAX_RETRIES = 5;
// Initial delay in ms before retrying (will be multiplied by 2^retryCount)
const INITIAL_RETRY_DELAY = 50;
// Maximum time to wait for a lock in ms (3 seconds)
const MAX_LOCK_WAIT = 3000;

// Attempt to acquire a lock file
async function acquireLock(maxWait = MAX_LOCK_WAIT): Promise<boolean> {
    const startTime = Date.now();
    let retryCount = 0;

    while (Date.now() - startTime < maxWait) {
        try {
            // Try to create the lock file
            await fs.writeFile(LOCK_FILE, String(Date.now()), { flag: 'wx' });
            console.log('🔒 [tracking] Lock acquired');
            return true;
        } catch {
            // If the file already exists, wait and retry
            if (retryCount >= MAX_RETRIES) {
                console.log(`⚠️ [tracking] Max retries (${MAX_RETRIES}) reached while trying to acquire lock`);
                break;
            }

            // Check if the lock is stale (older than 30 seconds)
            try {
                const stats = await fs.stat(LOCK_FILE);
                const lockAge = Date.now() - stats.mtimeMs;
                if (lockAge > 30000) { // 30 seconds
                    console.log('⚠️ [tracking] Found stale lock, removing it');
                    await fs.unlink(LOCK_FILE);
                    continue;
                }
            } catch {
                // If we can't read the lock file, it might have been deleted
                continue;
            }

            // Exponential backoff
            const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
            console.log(`⏳ [tracking] Lock exists, waiting ${delay}ms before retry ${retryCount + 1}/${MAX_RETRIES}`);
            await new Promise(resolve => setTimeout(resolve, delay));
            retryCount++;
        }
    }

    console.log('❌ [tracking] Failed to acquire lock');
    return false;
}

// Release the lock file
async function releaseLock(): Promise<void> {
    try {
        await fs.unlink(LOCK_FILE);
        console.log('🔓 [tracking] Lock released');
    } catch (error) {
        console.error('⚠️ [tracking] Error releasing lock:', error);
    }
}

// Attempt to repair corrupted JSON
async function repairJsonFile(filePath: string): Promise<boolean> {
    console.log(`🔧 [tracking] Attempting to repair corrupted JSON file: ${filePath}`);
    try {
        // Check if backup exists and is valid
        const backupFile = `${filePath}.backup`;
        try {
            await fs.access(backupFile);
            const backupData = await fs.readFile(backupFile, 'utf-8');
            try {
                JSON.parse(backupData); // Validate JSON
                // If valid, restore from backup
                await fs.copyFile(backupFile, filePath);
                console.log(`✅ [tracking] Successfully restored from backup file`);
                return true;
            } catch {
                console.log(`⚠️ [tracking] Backup file exists but contains invalid JSON`);
            }
        } catch {
            console.log(`⚠️ [tracking] No backup file found at ${backupFile}`);
        }

        // If no valid backup, try to fix the file manually
        const data = await fs.readFile(filePath, 'utf-8');

        // Look for the last valid array closing bracket
        const lastValidIndex = data.lastIndexOf(']');
        if (lastValidIndex > 0) {
            // Extract what appears to be valid JSON
            const potentiallyValidJson = data.substring(0, lastValidIndex + 1);
            try {
                const parsed = JSON.parse(potentiallyValidJson);
                if (Array.isArray(parsed)) {
                    // Write the repaired JSON back to the file
                    await fs.writeFile(filePath, JSON.stringify(parsed, null, 2));
                    console.log(`✅ [tracking] Successfully repaired JSON file by truncating at valid array end`);
                    return true;
                }
            } catch {
                console.log(`❌ [tracking] Could not repair JSON by truncating at array end`);
            }
        }

        console.log(`❌ [tracking] Could not repair corrupted JSON file`);
        return false;
    } catch (error) {
        console.error(`❌ [tracking] Error while attempting to repair JSON file:`, error);
        return false;
    }
}

// Get all users from file with retry logic
async function getAllUsers(): Promise<User[]> {
    console.log('🔍 [tracking] Attempting to read users from:', USERS_FILE);
    let retryCount = 0;

    while (retryCount <= MAX_RETRIES) {
        try {
            await fs.access(USERS_FILE);
            console.log('✅ [tracking] Users file exists, reading content');
            const data = await fs.readFile(USERS_FILE, 'utf-8');
            console.log(`📄 [tracking] Read ${data.length} bytes from users file`);

            try {
                const users = JSON.parse(data) || [];
                console.log(`👥 [tracking] Successfully parsed ${users.length} users from file`);
                return users;
            } catch (parseError) {
                console.error('❌ [tracking] Error parsing users.json:', parseError);

                // Attempt to repair the file
                const repaired = await repairJsonFile(USERS_FILE);
                if (repaired) {
                    // Try reading again after repair
                    const repairedData = await fs.readFile(USERS_FILE, 'utf-8');
                    try {
                        const users = JSON.parse(repairedData) || [];
                        console.log(`🔄 [tracking] Successfully parsed ${users.length} users after repair`);
                        return users;
                    } catch {
                        console.error('❌ [tracking] Still cannot parse JSON after repair attempt');
                    }
                }

                // If we've reached max retries, return empty array
                if (retryCount >= MAX_RETRIES) {
                    console.error(`❌ [tracking] Max retries (${MAX_RETRIES}) reached, returning empty array`);
                    return [];
                }

                // Otherwise, wait and retry
                const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
                console.log(`⏳ [tracking] Retrying after ${delay}ms (${retryCount + 1}/${MAX_RETRIES})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                retryCount++;
                continue;
            }
        } catch {
            if (retryCount >= MAX_RETRIES) {
                console.log('📝 [tracking] Users file does not exist yet, creating new array');
                return [];
            }

            // If file doesn't exist and we're not at max retries, wait and retry
            const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
            console.log(`⏳ [tracking] File access error, retrying after ${delay}ms (${retryCount + 1}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            retryCount++;
        }
    }

    return [];
}

// Save users to file with locking mechanism
async function saveUsers(users: User[]): Promise<void> {
    console.log(`💾 [tracking] Attempting to save ${users.length} users to file`);

    // Try to acquire lock
    const lockAcquired = await acquireLock();
    if (!lockAcquired) {
        throw new Error('Could not acquire lock for saving users');
    }

    try {
        // Create a backup of the current file if it exists
        try {
            await fs.access(USERS_FILE);
            const backupFile = `${USERS_FILE}.backup`;
            await fs.copyFile(USERS_FILE, backupFile);
            console.log(`📑 [tracking] Created backup at ${backupFile}`);
        } catch {
            console.log('⚠️ [tracking] No existing file to backup');
        }

        // Use atomic write pattern: write to temp file first, then rename
        const tempFile = `${USERS_FILE}.temp`;
        const jsonData = JSON.stringify(users, null, 2);

        // Write to temporary file
        await fs.writeFile(tempFile, jsonData);
        console.log(`📝 [tracking] Wrote data to temporary file: ${tempFile}`);

        // Validate the JSON in the temp file
        try {
            const savedData = await fs.readFile(tempFile, 'utf-8');
            const savedUsers = JSON.parse(savedData);
            console.log(`✓ [tracking] Validation: ${savedUsers.length} users in temp file`);

            // If validation passes, atomically rename the temp file to the target file
            await fs.rename(tempFile, USERS_FILE);
            console.log(`✅ [tracking] Successfully saved ${users.length} users to ${USERS_FILE}`);
        } catch (error) {
            console.error('❌ [tracking] Validation failed: Could not parse temp file', error);

            // If validation fails, attempt to restore from backup
            try {
                const backupFile = `${USERS_FILE}.backup`;
                await fs.access(backupFile);
                await fs.copyFile(backupFile, USERS_FILE);
                console.log(`🔄 [tracking] Restored from backup after validation failure`);
            } catch (restoreError) {
                console.error('❌ [tracking] Could not restore from backup:', restoreError);
            }

            throw new Error('Failed to save users: JSON validation failed');
        }
    } catch (error) {
        console.error('❌ [tracking] Error saving users to file:', error);
        throw error;
    } finally {
        // Always release the lock when done
        await releaseLock();
    }
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
    console.log(`🔄 [tracking] Updating tracking data for user ${userId}, session ${sessionId}, type ${type}`);

    const users = await getAllUsers();
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
        console.log(`❌ [tracking] User ${userId} not found`);
        return;
    }

    console.log(`👤 [tracking] Found user at index ${userIndex}`);
    const user = users[userIndex];

    if (!user.trackingData) {
        console.log(`📊 [tracking] Initializing tracking data for user ${userId}`);
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
        console.log(`➕ [tracking] Creating new session ${sessionId} for user ${userId}`);
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
    } else {
        console.log(`🔍 [tracking] Found existing session ${sessionId}`);
    }

    // Update session data based on type
    switch (type) {
        case 'pageview':
            if (session && data.id && data.url && data.title && data.timestamp) {
                console.log(`📄 [tracking] Adding pageview for ${data.url}`);
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
                console.log(`👆 [tracking] Adding interaction of type ${data.type}`);
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
                console.log(`🚪 [tracking] Recording page exit for page ${data.id}`);
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

    console.log(`💾 [tracking] Saving updated tracking data for user ${userId}`);
    users[userIndex] = user;
    await saveUsers(users);
}

export async function POST(request: NextRequest) {
    console.log('🚀 [tracking] Received tracking data');
    try {
        // More robust JSON parsing
        let requestData;
        try {
            const rawText = await request.text();
            console.log(`📄 [tracking] Raw request body: ${rawText.substring(0, 200)}${rawText.length > 200 ? '...' : ''}`);

            if (!rawText || rawText.trim() === '') {
                console.log('❌ [tracking] Empty request body');
                return NextResponse.json(
                    { error: 'Empty request body' },
                    { status: 400 }
                );
            }

            try {
                requestData = JSON.parse(rawText);
            } catch (parseError: unknown) {
                const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown JSON parse error';
                console.error(`❌ [tracking] JSON parse error: ${errorMessage}`);
                console.error(`❌ [tracking] Problematic JSON: ${rawText.substring(0, 500)}${rawText.length > 500 ? '...' : ''}`);
                return NextResponse.json(
                    { error: 'Invalid JSON in request body' },
                    { status: 400 }
                );
            }
        } catch (readError: unknown) {
            const errorMessage = readError instanceof Error ? readError.message : 'Unknown request body read error';
            console.error(`❌ [tracking] Error reading request body: ${errorMessage}`);
            return NextResponse.json(
                { error: 'Error reading request body' },
                { status: 400 }
            );
        }

        const { userId, sessionId, type, data } = requestData;
        console.log(`📊 [tracking] Processing ${type} tracking data for user ${userId}`);

        if (!userId || !sessionId || !type) {
            console.log('❌ [tracking] Missing required fields');
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Add IP address to data
        const clientIP = getClientIP(request);
        console.log(`🌐 [tracking] Client IP: ${clientIP}`);
        data.ipAddress = clientIP;

        // Try to update user tracking data with retries
        let retryCount = 0;
        while (retryCount <= MAX_RETRIES) {
            try {
                await updateUserTrackingData(userId, sessionId, type, data);
                console.log('✅ [tracking] Successfully processed tracking data');
                return NextResponse.json({ success: true }, { status: 200 });
            } catch (error) {
                if (retryCount >= MAX_RETRIES) {
                    throw error; // Re-throw if we've reached max retries
                }

                const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
                console.log(`⏳ [tracking] Error updating tracking data, retrying after ${delay}ms (${retryCount + 1}/${MAX_RETRIES})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                retryCount++;
            }
        }

        // This should not be reached due to the throw in the catch block above
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown tracking error';
        console.error(`❌ [tracking] Tracking error: ${errorMessage}`);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 