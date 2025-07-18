import { NextRequest, NextResponse } from 'next/server';
import { UserList, JournalEntry, UserPreferences } from '@/types';
import connectDB from '@/lib/mongodb';
import { UserDataModel } from '@/models/UserData';

// Get user data from MongoDB
async function getUserData(userId: string): Promise<{
    lists: UserList[];
    customLists: UserList[];
    journalEntries: JournalEntry[];
    preferences: UserPreferences;
} | null> {
    try {
        await connectDB();
        const userData = await UserDataModel.findOne({ userId });

        if (!userData) {
            return null;
        }

        return {
            lists: userData.lists,
            customLists: userData.customLists,
            journalEntries: userData.journalEntries,
            preferences: userData.preferences
        };
    } catch (error) {
        console.error('❌ [user-data] Error fetching user data:', error);
        return null;
    }
}

// Save user data to MongoDB
async function saveUserData(userId: string, data: {
    lists: UserList[];
    customLists: UserList[];
    journalEntries: JournalEntry[];
    preferences: UserPreferences;
}): Promise<void> {
    try {
        await connectDB();

        await UserDataModel.findOneAndUpdate(
            { userId },
            {
                ...data,
                updatedAt: new Date().toISOString()
            },
            { upsert: true, new: true }
        );

        console.log(`✅ [user-data] Successfully saved data for user: ${userId}`);
    } catch (error) {
        console.error('❌ [user-data] Error saving user data:', error);
        throw error;
    }
}

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await context.params;
        console.log(`📄 [user-data] GET request for user: ${userId}`);

        const userData = await getUserData(userId);

        if (!userData) {
            console.log(`❌ [user-data] User data not found for user: ${userId}`);
            return NextResponse.json(
                { error: 'User data not found' },
                { status: 404 }
            );
        }

        console.log(`✅ [user-data] Successfully retrieved data for user: ${userId}`);
        return NextResponse.json(userData);
    } catch (error) {
        console.error('❌ [user-data] GET error:', error);
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
        const userData = await request.json();
        console.log(`📝 [user-data] PUT request for user: ${userId}`);

        await saveUserData(userId, userData);

        console.log(`✅ [user-data] Successfully updated data for user: ${userId}`);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('❌ [user-data] PUT error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 