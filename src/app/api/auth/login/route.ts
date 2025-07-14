import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { User } from '@/types';

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

export async function POST(request: NextRequest) {
    try {
        const { username, password } = await request.json();

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

        // Update last login
        const userIndex = users.findIndex(u => u.id === user.id);
        if (userIndex !== -1) {
            users[userIndex].lastLogin = new Date().toISOString();
            await saveUsers(users);
        }

        // Return user data (without password)
        const userWithoutPassword = {
            id: user.id,
            username: user.username,
            createdAt: user.createdAt,
            preferences: user.preferences,
            lastLogin: users[userIndex].lastLogin,
        };

        return NextResponse.json({ user: userWithoutPassword }, { status: 200 });

    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 