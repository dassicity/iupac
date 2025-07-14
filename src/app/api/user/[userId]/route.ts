import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { UserList, JournalEntry, UserPreferences } from '@/types';

const DATA_DIR = path.join(process.cwd(), 'data');

// Get user data from file
async function getUserData(userId: string): Promise<{
    lists: UserList[];
    customLists: UserList[];
    journalEntries: JournalEntry[];
    preferences: UserPreferences;
} | null> {
    try {
        const userDataFile = path.join(DATA_DIR, `user_${userId}.json`);
        const data = await fs.readFile(userDataFile, 'utf-8');
        return JSON.parse(data);
    } catch {
        return null;
    }
}

// Save user data to file
async function saveUserData(userId: string, userData: {
    lists: UserList[];
    customLists: UserList[];
    journalEntries: JournalEntry[];
    preferences: UserPreferences;
}): Promise<void> {
    const userDataFile = path.join(DATA_DIR, `user_${userId}.json`);
    await fs.writeFile(userDataFile, JSON.stringify(userData, null, 2));
}

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await context.params;
        const userData = await getUserData(userId);

        if (!userData) {
            return NextResponse.json(
                { error: 'User data not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(userData, { status: 200 });

    } catch (error) {
        console.error('Get user data error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await context.params;
        const updates = await request.json();

        const userData = await getUserData(userId);
        if (!userData) {
            return NextResponse.json(
                { error: 'User data not found' },
                { status: 404 }
            );
        }

        // Update user data
        const updatedUserData = {
            ...userData,
            ...updates,
        };

        await saveUserData(userId, updatedUserData);

        return NextResponse.json(updatedUserData, { status: 200 });

    } catch (error) {
        console.error('Update user data error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 