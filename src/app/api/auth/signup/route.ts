import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { User } from '@/types';
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

        const { username, password } = await request.json();

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

        // Create new user
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
        };

        // Save user to users file
        users.push(newUser);
        await saveUsers(users);

        // Initialize user's data file
        await initializeUserData(newUser.id);

        // Return user data (without password)
        const userWithoutPassword = {
            id: newUser.id,
            username: newUser.username,
            createdAt: newUser.createdAt,
            preferences: newUser.preferences,
        };
        return NextResponse.json({ user: userWithoutPassword }, { status: 201 });

    } catch (error) {
        console.error('Signup error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 