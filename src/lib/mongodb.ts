import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable in .env.local');
}

interface MongooseCache {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
}

// Global mongoose cache to prevent multiple connections in development
declare global {
    var mongoose: MongooseCache | undefined;
}

let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB(): Promise<typeof mongoose> {
    if (cached!.conn) {
        console.log('🔄 Using existing MongoDB connection');
        return cached!.conn;
    }

    if (!cached!.promise) {
        const opts = {
            bufferCommands: false,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            family: 4,
        };

        console.log('🔌 Connecting to MongoDB...');
        cached!.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
            console.log('✅ Connected to MongoDB successfully');
            return mongoose;
        }).catch((error) => {
            console.error('❌ MongoDB connection error:', error);
            throw error;
        });
    }

    try {
        cached!.conn = await cached!.promise;
    } catch (e) {
        cached!.promise = null;
        throw e;
    }

    return cached!.conn;
}

export default connectDB; 