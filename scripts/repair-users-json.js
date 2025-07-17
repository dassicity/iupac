#!/usr/bin/env node

/**
 * User JSON File Repair Utility
 * 
 * This script repairs corrupted users.json files by:
 * 1. Checking if a backup file exists and is valid
 * 2. If backup is valid, restoring from backup
 * 3. If no valid backup, attempting to truncate the file at the last valid JSON array closing bracket
 * 4. If all else fails, creating a new empty users array
 * 
 * Usage:
 *   node scripts/repair-users-json.js [options]
 * 
 * Options:
 *   --file <path>     Path to the users.json file (default: data/users.json)
 *   --backup <path>   Path to backup file (default: data/users.json.backup)
 *   --force           Force repair even if file appears valid
 *   --create-backup   Create a backup before repairing
 *   --dry-run         Show what would be done without making changes
 */

import fs from 'fs';
import path from 'path';

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
    filePath: path.join(process.cwd(), 'data', 'users.json'),
    backupPath: null,
    force: false,
    createBackup: false,
    dryRun: false
};

for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--file' && i + 1 < args.length) {
        options.filePath = path.resolve(args[++i]);
    } else if (arg === '--backup' && i + 1 < args.length) {
        options.backupPath = path.resolve(args[++i]);
    } else if (arg === '--force') {
        options.force = true;
    } else if (arg === '--create-backup') {
        options.createBackup = true;
    } else if (arg === '--dry-run') {
        options.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
        console.log(`
User JSON File Repair Utility

Usage:
  node scripts/repair-users-json.js [options]

Options:
  --file <path>     Path to the users.json file (default: data/users.json)
  --backup <path>   Path to backup file (default: <file>.backup)
  --force           Force repair even if file appears valid
  --create-backup   Create a backup before repairing
  --dry-run         Show what would be done without making changes
  --help, -h        Show this help message
    `);
        process.exit(0);
    }
}

// Set default backup path if not provided
if (!options.backupPath) {
    options.backupPath = `${options.filePath}.backup`;
}

// Ensure data directory exists
const dataDir = path.dirname(options.filePath);
if (!fs.existsSync(dataDir)) {
    console.log(`📁 Creating directory: ${dataDir}`);
    if (!options.dryRun) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
}

// Check if file exists
if (!fs.existsSync(options.filePath)) {
    console.log(`❌ File not found: ${options.filePath}`);
    console.log('📝 Creating new empty users array');

    if (!options.dryRun) {
        fs.writeFileSync(options.filePath, '[]', 'utf8');
        console.log('✅ Created new empty users file');
    } else {
        console.log('🔍 [DRY RUN] Would create new empty users file');
    }

    process.exit(0);
}

// Read the file
console.log(`📄 Reading file: ${options.filePath}`);
const fileData = fs.readFileSync(options.filePath, 'utf8');
console.log(`📊 File size: ${fileData.length} bytes`);

// Check if file is valid JSON
let isValid = false;
let users = [];

try {
    users = JSON.parse(fileData);

    if (!Array.isArray(users)) {
        console.log('⚠️ File contains valid JSON but not an array');
    } else {
        console.log(`✅ File contains valid JSON array with ${users.length} users`);
        isValid = true;
    }
} catch (error) {
    console.log(`❌ Invalid JSON: ${error.message}`);
}

// If file is valid and not forcing repair, exit
if (isValid && !options.force) {
    console.log('✅ File is valid, no repair needed');
    process.exit(0);
}

// Create backup if requested
if (options.createBackup && !options.dryRun) {
    console.log(`📦 Creating backup: ${options.backupPath}`);
    fs.copyFileSync(options.filePath, options.backupPath);
}

// Attempt to repair
console.log('🔧 Attempting repair...');

// Check if backup exists and is valid
let backupValid = false;
if (fs.existsSync(options.backupPath)) {
    console.log(`🔍 Found backup file: ${options.backupPath}`);

    try {
        const backupData = fs.readFileSync(options.backupPath, 'utf8');
        const backupUsers = JSON.parse(backupData);

        if (Array.isArray(backupUsers)) {
            console.log(`✅ Backup contains valid JSON array with ${backupUsers.length} users`);
            backupValid = true;

            // Restore from backup
            if (!options.dryRun) {
                fs.copyFileSync(options.backupPath, options.filePath);
                console.log('✅ Restored from backup');
            } else {
                console.log('🔍 [DRY RUN] Would restore from backup');
            }
        } else {
            console.log('⚠️ Backup contains valid JSON but not an array');
        }
    } catch (error) {
        console.log(`❌ Backup contains invalid JSON: ${error.message}`);
    }
}

// If backup is not valid, try to repair the file
if (!backupValid) {
    console.log('🔧 Attempting to repair file manually');

    // Look for the last valid array closing bracket
    const lastClosingBracket = fileData.lastIndexOf(']');

    if (lastClosingBracket > 0) {
        console.log(`🔍 Found closing bracket at position ${lastClosingBracket}`);

        // Extract what appears to be valid JSON
        const potentiallyValidJson = fileData.substring(0, lastClosingBracket + 1);

        try {
            const repairedUsers = JSON.parse(potentiallyValidJson);

            if (Array.isArray(repairedUsers)) {
                console.log(`✅ Successfully extracted valid JSON array with ${repairedUsers.length} users`);

                if (!options.dryRun) {
                    fs.writeFileSync(options.filePath, JSON.stringify(repairedUsers, null, 2), 'utf8');
                    console.log('✅ Saved repaired file');
                } else {
                    console.log('🔍 [DRY RUN] Would save repaired file');
                }
            } else {
                console.log('⚠️ Extracted valid JSON but not an array');
            }
        } catch (error) {
            console.log(`❌ Could not repair by truncating: ${error.message}`);

            // If all else fails, create a new empty users array
            console.log('📝 Creating new empty users array');

            if (!options.dryRun) {
                fs.writeFileSync(options.filePath, '[]', 'utf8');
                console.log('✅ Created new empty users file');
            } else {
                console.log('🔍 [DRY RUN] Would create new empty users file');
            }
        }
    } else {
        console.log('❌ Could not find valid JSON structure');

        // Create a new empty users array
        console.log('📝 Creating new empty users array');

        if (!options.dryRun) {
            fs.writeFileSync(options.filePath, '[]', 'utf8');
            console.log('✅ Created new empty users file');
        } else {
            console.log('🔍 [DRY RUN] Would create new empty users file');
        }
    }
}

console.log('✅ Repair process completed'); 