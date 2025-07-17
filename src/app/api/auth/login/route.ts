import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { User, LocationData } from '@/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Attempt to repair corrupted JSON
async function repairJsonFile(filePath: string): Promise<boolean> {
    console.log(`🔧 [login] Attempting to repair corrupted JSON file: ${filePath}`);
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
                console.log(`✅ [login] Successfully restored from backup file`);
                return true;
            } catch {
                console.log(`⚠️ [login] Backup file exists but contains invalid JSON`);
            }
        } catch {
            console.log(`⚠️ [login] No backup file found at ${backupFile}`);
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
                    console.log(`✅ [login] Successfully repaired JSON file by truncating at valid array end`);
                    return true;
                }
            } catch {
                console.log(`❌ [login] Could not repair JSON by truncating at array end`);
            }
        }

        console.log(`❌ [login] Could not repair corrupted JSON file`);
        return false;
    } catch (error) {
        console.error(`❌ [login] Error while attempting to repair JSON file:`, error);
        return false;
    }
}

// Get all users from file
async function getAllUsers(): Promise<User[]> {
    console.log('🔍 [login] Attempting to read users from:', USERS_FILE);
    try {
        await fs.access(USERS_FILE);
        console.log('✅ [login] Users file exists, reading content');
        const data = await fs.readFile(USERS_FILE, 'utf-8');
        console.log(`📄 [login] Read ${data.length} bytes from users file`);

        try {
            const users = JSON.parse(data) || [];
            console.log(`👥 [login] Successfully parsed ${users.length} users from file`);
            return users;
        } catch (parseError) {
            console.error('❌ [login] Error parsing users.json:', parseError);

            // Attempt to repair the file
            const repaired = await repairJsonFile(USERS_FILE);
            if (repaired) {
                // Try reading again after repair
                const repairedData = await fs.readFile(USERS_FILE, 'utf-8');
                try {
                    const users = JSON.parse(repairedData) || [];
                    console.log(`🔄 [login] Successfully parsed ${users.length} users after repair`);
                    return users;
                } catch {
                    console.error('❌ [login] Still cannot parse JSON after repair attempt');
                }
            }

            return [];
        }
    } catch {
        console.log('📝 [login] Users file does not exist yet, creating new array');
        return [];
    }
}

// Save users to file (for updating last login)
async function saveUsers(users: User[]): Promise<void> {
    console.log(`💾 [login] Attempting to save ${users.length} users to file`);
    try {
        // Create a backup of the current file if it exists
        try {
            await fs.access(USERS_FILE);
            const backupFile = `${USERS_FILE}.backup`;
            await fs.copyFile(USERS_FILE, backupFile);
            console.log(`📑 [login] Created backup at ${backupFile}`);
        } catch {
            console.log('⚠️ [login] No existing file to backup');
        }

        // Use atomic write pattern: write to temp file first, then rename
        const tempFile = `${USERS_FILE}.temp`;
        const jsonData = JSON.stringify(users, null, 2);

        // Write to temporary file
        await fs.writeFile(tempFile, jsonData);
        console.log(`📝 [login] Wrote data to temporary file: ${tempFile}`);

        // Validate the JSON in the temp file
        try {
            const savedData = await fs.readFile(tempFile, 'utf-8');
            const savedUsers = JSON.parse(savedData);
            console.log(`✓ [login] Validation: ${savedUsers.length} users in temp file`);

            // If validation passes, atomically rename the temp file to the target file
            await fs.rename(tempFile, USERS_FILE);
            console.log(`✅ [login] Successfully saved ${users.length} users to ${USERS_FILE}`);
        } catch (error) {
            console.error('❌ [login] Validation failed: Could not parse temp file', error);

            // If validation fails, attempt to restore from backup
            try {
                const backupFile = `${USERS_FILE}.backup`;
                await fs.access(backupFile);
                await fs.copyFile(backupFile, USERS_FILE);
                console.log(`🔄 [login] Restored from backup after validation failure`);
            } catch (restoreError) {
                console.error('❌ [login] Could not restore from backup:', restoreError);
            }

            throw new Error('Failed to save users: JSON validation failed');
        }
    } catch (error) {
        console.error('❌ [login] Error saving users to file:', error);
        throw error;
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
    console.log('🚀 [login] Starting user login process');
    try {
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
        const users = await getAllUsers();
        console.log(`📊 [login] Found ${users.length} users in database`);

        const user = users.find(u => u.username === username);

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
        const userIndex = users.findIndex(u => u.id === user.id);
        console.log(`🔍 [login] Found user at index ${userIndex}`);

        if (userIndex !== -1) {
            users[userIndex].lastLogin = new Date().toISOString();
            console.log(`⏱️ [login] Updated last login time for user: ${username}`);

            // Initialize or update tracking data
            if (!users[userIndex].trackingData) {
                console.log(`📊 [login] Initializing tracking data for user: ${username}`);
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
                console.log(`📱 [login] Updating device info for user: ${username}`);
                users[userIndex].trackingData!.deviceInfo = {
                    ...users[userIndex].trackingData!.deviceInfo,
                    ...trackingData.deviceInfo
                };
            }

            // Update browser fingerprint if provided
            if (trackingData?.browserFingerprint) {
                console.log(`👆 [login] Updating browser fingerprint for user: ${username}`);
                users[userIndex].trackingData!.browserFingerprint = trackingData.browserFingerprint;
            }

            // Add new session
            console.log(`➕ [login] Adding new session for user: ${username}`);
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

            console.log(`💾 [login] Saving updated user data for: ${username}`);
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