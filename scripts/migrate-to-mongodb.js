#!/usr/bin/env node

/**
 * MongoDB Migration Script
 * 
 * This script migrates existing JSON data to MongoDB:
 * 1. Reads users.json and all user_*.json files
 * 2. Inserts data into MongoDB collections
 * 3. Creates backups of JSON files
 * 4. Validates the migration
 * 
 * Usage:
 *   node scripts/migrate-to-mongodb.js [options]
 * 
 * Options:
 *   --dry-run         Show what would be migrated without making changes
 *   --force           Force migration even if MongoDB collections already exist
 *   --backup          Create backup of JSON files before migration
 *   --clean           Clean up JSON files after successful migration
 */

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

// MongoDB connection
const MONGODB_URI = 'mongodb+srv://dassic:Dassic007@cluster0.ad9yl.mongodb.net/iupac?retryWrites=true&w=majority&appName=Cluster0';

// Define Mongoose schemas directly in the migration script
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: String, default: () => new Date().toISOString() },
    lastLogin: { type: String },
    preferences: { type: mongoose.Schema.Types.Mixed },
    trackingData: { type: mongoose.Schema.Types.Mixed }
}, {
    timestamps: false,
    toJSON: {
        transform: function (doc, ret) {
            const obj = ret;
            obj.id = obj._id?.toString();
            delete obj._id;
            delete obj.__v;
            return obj;
        }
    }
});

const UserDataSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    lists: { type: mongoose.Schema.Types.Mixed, default: [] },
    customLists: { type: mongoose.Schema.Types.Mixed, default: [] },
    journalEntries: { type: mongoose.Schema.Types.Mixed, default: [] },
    preferences: { type: mongoose.Schema.Types.Mixed },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() }
}, { timestamps: false });

// Define models
const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
const UserDataModel = mongoose.models.UserData || mongoose.model('UserData', UserDataSchema);

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
    dryRun: false,
    force: false,
    backup: false,
    clean: false
};

for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--dry-run') {
        options.dryRun = true;
    } else if (arg === '--force') {
        options.force = true;
    } else if (arg === '--backup') {
        options.backup = true;
    } else if (arg === '--clean') {
        options.clean = true;
    } else if (arg === '--help' || arg === '-h') {
        console.log(`
MongoDB Migration Script

Usage:
  node scripts/migrate-to-mongodb.js [options]

Options:
  --dry-run         Show what would be migrated without making changes
  --force           Force migration even if MongoDB collections already exist
  --backup          Create backup of JSON files before migration
  --clean           Clean up JSON files after successful migration
  --help, -h        Show this help message
        `);
        process.exit(0);
    }
}

// Connect to MongoDB
async function connectToMongoDB() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        return true;
    } catch (error) {
        console.error('❌ Failed to connect to MongoDB:', error.message);
        return false;
    }
}

// Read JSON file safely
async function readJsonFile(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            return null;
        }

        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`❌ Error reading ${filePath}:`, error.message);
        return null;
    }
}

// Get all user data files
function getUserDataFiles() {
    if (!fs.existsSync(DATA_DIR)) {
        return [];
    }

    return fs.readdirSync(DATA_DIR)
        .filter(file => file.startsWith('user_') && file.endsWith('.json'))
        .map(file => path.join(DATA_DIR, file));
}

// Create backup of JSON files
async function createBackups() {
    const backupDir = path.join(DATA_DIR, 'backups');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const currentBackupDir = path.join(backupDir, `migration-backup-${timestamp}`);

    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    fs.mkdirSync(currentBackupDir, { recursive: true });

    // Backup users.json
    if (fs.existsSync(USERS_FILE)) {
        fs.copyFileSync(USERS_FILE, path.join(currentBackupDir, 'users.json'));
        console.log('📦 Backed up users.json');
    }

    // Backup all user data files
    const userDataFiles = getUserDataFiles();
    for (const file of userDataFiles) {
        const fileName = path.basename(file);
        fs.copyFileSync(file, path.join(currentBackupDir, fileName));
    }

    console.log(`📦 Created backup in: ${currentBackupDir}`);
    return currentBackupDir;
}

// Check if collections already exist and have data
async function checkExistingData() {
    const userCount = await UserModel.countDocuments();
    const userDataCount = await UserDataModel.countDocuments();

    return {
        hasUsers: userCount > 0,
        hasUserData: userDataCount > 0,
        userCount,
        userDataCount
    };
}

// Migrate users
async function migrateUsers(users) {
    if (!users || users.length === 0) {
        console.log('⚠️ No users to migrate');
        return [];
    }

    console.log(`👥 Migrating ${users.length} users...`);
    const migratedUsers = [];

    for (const user of users) {
        try {
            if (!options.dryRun) {
                // Convert old id to new structure
                const userData = {
                    ...user,
                    _id: undefined // Let MongoDB generate new _id
                };
                delete userData.id; // Remove old id field

                const newUser = new UserModel(userData);
                const savedUser = await newUser.save();
                migratedUsers.push(savedUser);
                console.log(`✅ Migrated user: ${user.username} (${savedUser._id})`);
            } else {
                console.log(`🔍 [DRY RUN] Would migrate user: ${user.username}`);
                migratedUsers.push({ ...user, _id: 'dry-run-id' });
            }
        } catch (error) {
            console.error(`❌ Error migrating user ${user.username}:`, error.message);
        }
    }

    return migratedUsers;
}

// Migrate user data
async function migrateUserData(userDataFiles, userIdMap) {
    if (userDataFiles.length === 0) {
        console.log('⚠️ No user data files to migrate');
        return;
    }

    console.log(`📄 Migrating ${userDataFiles.length} user data files...`);

    for (const filePath of userDataFiles) {
        try {
            const fileName = path.basename(filePath);
            const oldUserId = fileName.replace('user_', '').replace('.json', '');

            // Find the new MongoDB _id for this user
            const newUserId = userIdMap[oldUserId];
            if (!newUserId) {
                console.log(`⚠️ Skipping ${fileName}: User not found in migration map`);
                continue;
            }

            const userData = await readJsonFile(filePath);
            if (!userData) {
                console.log(`⚠️ Skipping ${fileName}: Could not read file`);
                continue;
            }

            if (!options.dryRun) {
                const userDataDoc = new UserDataModel({
                    userId: newUserId,
                    lists: userData.lists || [],
                    customLists: userData.customLists || [],
                    journalEntries: userData.journalEntries || [],
                    preferences: userData.preferences || {},
                    createdAt: userData.createdAt || new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });

                await userDataDoc.save();
                console.log(`✅ Migrated data for user: ${oldUserId} -> ${newUserId}`);
            } else {
                console.log(`🔍 [DRY RUN] Would migrate data file: ${fileName}`);
            }
        } catch (error) {
            console.error(`❌ Error migrating ${filePath}:`, error.message);
        }
    }
}

// Validate migration
async function validateMigration(originalUserCount, originalDataFileCount) {
    const finalUserCount = await UserModel.countDocuments();
    const finalUserDataCount = await UserDataModel.countDocuments();

    console.log('\n📊 Migration Summary:');
    console.log(`👥 Users: ${originalUserCount} -> ${finalUserCount}`);
    console.log(`📄 User Data: ${originalDataFileCount} -> ${finalUserDataCount}`);

    if (finalUserCount !== originalUserCount) {
        console.log('⚠️ User count mismatch - some users may not have been migrated');
    }

    if (finalUserDataCount !== originalDataFileCount) {
        console.log('⚠️ User data count mismatch - some data files may not have been migrated');
    }

    return finalUserCount === originalUserCount && finalUserDataCount === originalDataFileCount;
}

// Clean up JSON files
async function cleanupJsonFiles() {
    console.log('🧹 Cleaning up JSON files...');

    try {
        // Remove users.json
        if (fs.existsSync(USERS_FILE)) {
            fs.unlinkSync(USERS_FILE);
            console.log('🗑️ Removed users.json');
        }

        // Remove user data files
        const userDataFiles = getUserDataFiles();
        for (const file of userDataFiles) {
            fs.unlinkSync(file);
            console.log(`🗑️ Removed ${path.basename(file)}`);
        }

        console.log('✅ Cleanup completed');
    } catch (error) {
        console.error('❌ Error during cleanup:', error.message);
    }
}

// Main migration function
async function migrate() {
    console.log('🚀 Starting MongoDB migration...\n');

    // Connect to MongoDB
    const connected = await connectToMongoDB();
    if (!connected) {
        process.exit(1);
    }

    // Check existing data
    const existingData = await checkExistingData();
    console.log(`📊 Current MongoDB state: ${existingData.userCount} users, ${existingData.userDataCount} user data records`);

    if ((existingData.hasUsers || existingData.hasUserData) && !options.force) {
        console.log('⚠️ MongoDB collections already contain data. Use --force to override.');
        process.exit(1);
    }

    // Read existing JSON data
    console.log('\n📖 Reading existing JSON data...');
    const users = await readJsonFile(USERS_FILE) || [];
    const userDataFiles = getUserDataFiles();

    console.log(`📊 Found: ${users.length} users, ${userDataFiles.length} user data files`);

    if (users.length === 0 && userDataFiles.length === 0) {
        console.log('⚠️ No data to migrate');
        process.exit(0);
    }

    // Create backup if requested
    if (options.backup && !options.dryRun) {
        await createBackups();
    }

    console.log('\n🔄 Starting migration...');

    // Migrate users first
    const migratedUsers = await migrateUsers(users);

    // Create mapping of old user IDs to new MongoDB _ids
    const userIdMap = {};
    for (let i = 0; i < users.length; i++) {
        if (migratedUsers[i]) {
            userIdMap[users[i].id] = migratedUsers[i]._id.toString();
        }
    }

    // Migrate user data
    await migrateUserData(userDataFiles, userIdMap);

    if (!options.dryRun) {
        // Validate migration
        const success = await validateMigration(users.length, userDataFiles.length);

        if (success) {
            console.log('\n✅ Migration completed successfully!');

            // Clean up JSON files if requested
            if (options.clean) {
                await cleanupJsonFiles();
            }
        } else {
            console.log('\n⚠️ Migration completed with issues. Please review the summary above.');
        }
    } else {
        console.log('\n🔍 [DRY RUN] Migration simulation completed');
    }

    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
}

// Run migration
migrate().catch(error => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
}); 