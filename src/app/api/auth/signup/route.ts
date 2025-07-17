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

// Attempt to repair corrupted JSON
async function repairJsonFile(filePath: string): Promise<boolean> {
    console.log(`🔧 [signup] Attempting to repair corrupted JSON file: ${filePath}`);
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
                console.log(`✅ [signup] Successfully restored from backup file`);
                return true;
            } catch {
                console.log(`⚠️ [signup] Backup file exists but contains invalid JSON`);
            }
        } catch {
            console.log(`⚠️ [signup] No backup file found at ${backupFile}`);
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
                    console.log(`✅ [signup] Successfully repaired JSON file by truncating at valid array end`);
                    return true;
                }
            } catch {
                console.log(`❌ [signup] Could not repair JSON by truncating at array end`);
            }
        }

        console.log(`❌ [signup] Could not repair corrupted JSON file`);
        return false;
    } catch (error) {
        console.error(`❌ [signup] Error while attempting to repair JSON file:`, error);
        return false;
    }
}

// Get all users from file
async function getAllUsers(): Promise<User[]> {
    console.log('🔍 [signup] Attempting to read users from:', USERS_FILE);
    try {
        await fs.access(USERS_FILE);
        console.log('✅ [signup] Users file exists, reading content');
        const data = await fs.readFile(USERS_FILE, 'utf-8');
        console.log(`📄 [signup] Read ${data.length} bytes from users file`);

        try {
            const users = JSON.parse(data) || [];
            console.log(`👥 [signup] Successfully parsed ${users.length} users from file`);
            return users;
        } catch (parseError) {
            console.error('❌ [signup] Error parsing users.json:', parseError);

            // Attempt to repair the file
            const repaired = await repairJsonFile(USERS_FILE);
            if (repaired) {
                // Try reading again after repair
                const repairedData = await fs.readFile(USERS_FILE, 'utf-8');
                try {
                    const users = JSON.parse(repairedData) || [];
                    console.log(`🔄 [signup] Successfully parsed ${users.length} users after repair`);
                    return users;
                } catch {
                    console.error('❌ [signup] Still cannot parse JSON after repair attempt');
                }
            }

            return [];
        }
    } catch {
        console.log('📝 [signup] Users file does not exist yet, creating new array');
        return [];
    }
}

// Save users to file
async function saveUsers(users: User[]): Promise<void> {
    console.log(`💾 [signup] Attempting to save ${users.length} users to file`);
    try {
        // Create a backup of the current file if it exists
        try {
            await fs.access(USERS_FILE);
            const backupFile = `${USERS_FILE}.backup`;
            await fs.copyFile(USERS_FILE, backupFile);
            console.log(`📑 [signup] Created backup at ${backupFile}`);
        } catch {
            console.log('⚠️ [signup] No existing file to backup');
        }

        // Use atomic write pattern: write to temp file first, then rename
        const tempFile = `${USERS_FILE}.temp`;
        const jsonData = JSON.stringify(users, null, 2);

        // Write to temporary file
        await fs.writeFile(tempFile, jsonData);
        console.log(`📝 [signup] Wrote data to temporary file: ${tempFile}`);

        // Validate the JSON in the temp file
        try {
            const savedData = await fs.readFile(tempFile, 'utf-8');
            const savedUsers = JSON.parse(savedData);
            console.log(`✓ [signup] Validation: ${savedUsers.length} users in temp file`);

            // If validation passes, atomically rename the temp file to the target file
            await fs.rename(tempFile, USERS_FILE);
            console.log(`✅ [signup] Successfully saved ${users.length} users to ${USERS_FILE}`);
        } catch (error) {
            console.error('❌ [signup] Validation failed: Could not parse temp file', error);

            // If validation fails, attempt to restore from backup
            try {
                const backupFile = `${USERS_FILE}.backup`;
                await fs.access(backupFile);
                await fs.copyFile(backupFile, USERS_FILE);
                console.log(`🔄 [signup] Restored from backup after validation failure`);
            } catch (restoreError) {
                console.error('❌ [signup] Could not restore from backup:', restoreError);
            }

            throw new Error('Failed to save users: JSON validation failed');
        }
    } catch (error) {
        console.error('❌ [signup] Error saving users to file:', error);
        throw error;
    }
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
    console.log('🚀 [signup] Starting user registration process');
    try {
        await ensureDataDir();
        console.log('📁 [signup] Ensured data directory exists');

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
        const users = await getAllUsers();
        console.log(`📊 [signup] Found ${users.length} existing users`);

        const existingUser = users.find(user => user.username === username);

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
        console.log(`➕ [signup] Adding new user ${username} to users array (now ${users.length + 1} users)`);
        users.push(newUser);
        await saveUsers(users);

        // Initialize user's data file
        console.log(`📄 [signup] Initializing user data file for ${username}`);
        await initializeUserData(newUser.id);

        // Return user data (without password) and session info
        const userWithoutPassword = {
            id: newUser.id,
            username: newUser.username,
            createdAt: newUser.createdAt,
            preferences: newUser.preferences,
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