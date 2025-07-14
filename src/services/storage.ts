import { User, UserSession, UserList, UserMediaItem, JournalEntry, UserPreferences, EpisodeProgress, FestivalAward, Award } from '@/types';
import { APP_CONFIG } from '@/constants/app';

// Storage service for server-side data management
export class StorageService {
    private static instance: StorageService;

    private constructor() { }

    static getInstance(): StorageService {
        if (!StorageService.instance) {
            StorageService.instance = new StorageService();
        }
        return StorageService.instance;
    }

    // User Management
    async createUser(username: string, password: string): Promise<User> {
        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create user');
        }

        const data = await response.json();
        return data.user;
    }

    async getUserByUsername(username: string): Promise<User | null> {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password: '' }),
        });

        if (response.status === 401) {
            return null; // User not found
        }

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        return data.user;
    }

    async getUserById(/* userId: string */): Promise<User | null> {
        // For now, we'll use session storage for user data
        // In a full implementation, you'd have a separate API endpoint
        return this.getStoredUser();
    }

    async updateUser(userId: string, updates: Partial<User>): Promise<User> {
        // Store updated user data in session storage
        const currentUser = this.getStoredUser();
        if (!currentUser) {
            throw new Error('User not found');
        }

        const updatedUser = { ...currentUser, ...updates };
        localStorage.setItem('current_user', JSON.stringify(updatedUser));
        return updatedUser;
    }

    // Session Management
    async createSession(user: User): Promise<UserSession> {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username: user.username, password: user.password }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to authenticate');
        }

        const data = await response.json();
        const authenticatedUser = data.user;

        // Store user data in session storage
        localStorage.setItem('current_user', JSON.stringify(authenticatedUser));

        const session: UserSession = {
            userId: authenticatedUser.id,
            username: authenticatedUser.username,
            isAuthenticated: true,
            loginTime: new Date().toISOString(),
        };

        localStorage.setItem(APP_CONFIG.STORAGE_KEYS.USER_SESSION, JSON.stringify(session));

        return session;
    }

    async getSession(): Promise<UserSession | null> {
        const sessionData = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.USER_SESSION);
        return sessionData ? JSON.parse(sessionData) : null;
    }

    async clearSession(): Promise<void> {
        localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.USER_SESSION);
        localStorage.removeItem('current_user');
    }

    // Helper method to get stored user
    private getStoredUser(): User | null {
        const userData = localStorage.getItem('current_user');
        return userData ? JSON.parse(userData) : null;
    }

    // User Data Management
    async getUserLists(userId: string): Promise<UserList[]> {
        const userData = await this.getUserData(userId);

        // Get all items from system lists
        const allItems = userData.lists.flatMap(list => list.items);

        // Populate custom lists with items based on membership
        const populatedCustomLists = userData.customLists.map(customList => ({
            ...customList,
            items: allItems.filter(item => item.customListIds.includes(customList.id))
        }));

        return [...userData.lists, ...populatedCustomLists];
    }

    async createUserList(userId: string, name: string, description: string): Promise<UserList> {
        const userData = await this.getUserData(userId);

        if (userData.customLists.length >= APP_CONFIG.DEFAULTS.MAX_CUSTOM_LISTS) {
            throw new Error(`Maximum ${APP_CONFIG.DEFAULTS.MAX_CUSTOM_LISTS} custom lists allowed`);
        }

        const newList: UserList = {
            id: this.generateId(),
            name,
            description,
            items: [],
            isSystem: false,
            isDefault: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        userData.customLists.push(newList);
        await this.saveUserData(userId, userData);

        return newList;
    }

    async updateUserList(userId: string, listId: string, updates: Partial<UserList>): Promise<UserList> {
        const userData = await this.getUserData(userId);

        // Check in system lists first
        let listIndex = userData.lists.findIndex(list => list.id === listId);
        let isSystemList = true;

        if (listIndex === -1) {
            // Check in custom lists
            listIndex = userData.customLists.findIndex(list => list.id === listId);
            isSystemList = false;
        }

        if (listIndex === -1) {
            throw new Error('List not found');
        }

        const targetArray = isSystemList ? userData.lists : userData.customLists;
        targetArray[listIndex] = {
            ...targetArray[listIndex],
            ...updates,
            updatedAt: new Date().toISOString(),
        };

        await this.saveUserData(userId, userData);

        return targetArray[listIndex];
    }

    async deleteUserList(userId: string, listId: string): Promise<void> {
        const userData = await this.getUserData(userId);

        const customListIndex = userData.customLists.findIndex(list => list.id === listId);
        if (customListIndex === -1) {
            throw new Error('List not found or cannot delete system list');
        }

        userData.customLists.splice(customListIndex, 1);
        await this.saveUserData(userId, userData);
    }

    async addMediaToList(userId: string, listId: string, mediaItem: Omit<UserMediaItem, 'id' | 'dateAdded'>): Promise<UserMediaItem> {
        const userData = await this.getUserData(userId);

        // Only allow adding to system lists directly
        const targetList = userData.lists.find(list => list.id === listId);
        if (!targetList) {
            throw new Error('Can only add items directly to system lists (to-watch, watched)');
        }

        const newMediaItem: UserMediaItem = {
            ...mediaItem,
            id: this.generateId(),
            dateAdded: new Date().toISOString(),
            customListIds: [], // Initialize empty custom list memberships
        };

        targetList.items.push(newMediaItem);
        targetList.updatedAt = new Date().toISOString();

        await this.saveUserData(userId, userData);

        return newMediaItem;
    }

    async updateMediaItem(userId: string, listId: string, itemId: string, updates: Partial<UserMediaItem>): Promise<UserMediaItem> {
        const userData = await this.getUserData(userId);

        // Find the list
        let targetList = userData.lists.find(list => list.id === listId);
        if (!targetList) {
            targetList = userData.customLists.find(list => list.id === listId);
        }

        if (!targetList) {
            throw new Error('List not found');
        }

        const itemIndex = targetList.items.findIndex(item => item.id === itemId);
        if (itemIndex === -1) {
            throw new Error('Media item not found');
        }

        targetList.items[itemIndex] = {
            ...targetList.items[itemIndex],
            ...updates,
        };

        targetList.updatedAt = new Date().toISOString();

        await this.saveUserData(userId, userData);

        return targetList.items[itemIndex];
    }

    async removeMediaFromList(userId: string, listId: string, itemId: string): Promise<void> {
        const userData = await this.getUserData(userId);

        // Find the list
        let targetList = userData.lists.find(list => list.id === listId);
        if (!targetList) {
            targetList = userData.customLists.find(list => list.id === listId);
        }

        if (!targetList) {
            throw new Error('List not found');
        }

        const itemIndex = targetList.items.findIndex(item => item.id === itemId);
        if (itemIndex === -1) {
            throw new Error('Media item not found');
        }

        targetList.items.splice(itemIndex, 1);
        targetList.updatedAt = new Date().toISOString();

        await this.saveUserData(userId, userData);
    }

    // New methods for multi-list system
    async addItemToCustomList(userId: string, customListId: string, itemId: string): Promise<void> {
        const userData = await this.getUserData(userId);

        // Find the custom list
        const customList = userData.customLists.find(list => list.id === customListId);
        if (!customList) {
            throw new Error('Custom list not found');
        }

        // Find the item in system lists
        const item = this.findItemInSystemLists(userData.lists, itemId);
        if (!item) {
            throw new Error('Item not found in system lists');
        }

        // Add custom list ID to item's customListIds if not already there
        if (!item.customListIds.includes(customListId)) {
            item.customListIds.push(customListId);
        }

        // Update the system list containing the item
        const systemList = userData.lists.find(list => list.items.some(i => i.id === itemId));
        if (systemList) {
            systemList.updatedAt = new Date().toISOString();
        }

        await this.saveUserData(userId, userData);
    }

    async removeItemFromCustomList(userId: string, customListId: string, itemId: string): Promise<void> {
        const userData = await this.getUserData(userId);

        // Find the item in system lists
        const item = this.findItemInSystemLists(userData.lists, itemId);
        if (!item) {
            throw new Error('Item not found in system lists');
        }

        // Remove custom list ID from item's customListIds
        const listIndex = item.customListIds.indexOf(customListId);
        if (listIndex > -1) {
            item.customListIds.splice(listIndex, 1);
        }

        // Update the system list containing the item
        const systemList = userData.lists.find(list => list.items.some(i => i.id === itemId));
        if (systemList) {
            systemList.updatedAt = new Date().toISOString();
        }

        await this.saveUserData(userId, userData);
    }

    async changeItemStatus(userId: string, itemId: string, newStatus: 'to_watch' | 'watched'): Promise<void> {
        const userData = await this.getUserData(userId);

        // Find the item in current system lists
        const currentItem = this.findItemInSystemLists(userData.lists, itemId);
        if (!currentItem) {
            throw new Error('Item not found');
        }

        // If status is the same, no change needed
        if (currentItem.status === newStatus) {
            return;
        }

        // Find current and target system lists
        const currentList = userData.lists.find(list => list.items.some(i => i.id === itemId));
        const targetList = userData.lists.find(list => list.id === (newStatus === 'to_watch' ? 'to-watch' : 'watched'));

        if (!currentList || !targetList) {
            throw new Error('System lists not found');
        }

        // Remove from current list
        const itemIndex = currentList.items.findIndex(item => item.id === itemId);
        if (itemIndex > -1) {
            const item = currentList.items.splice(itemIndex, 1)[0];

            // Update item status and dateWatched
            item.status = newStatus;
            if (newStatus === 'watched' && !item.dateWatched) {
                item.dateWatched = new Date().toISOString();
            }

            // Add to target list
            targetList.items.push(item);
            targetList.updatedAt = new Date().toISOString();
        }

        currentList.updatedAt = new Date().toISOString();
        await this.saveUserData(userId, userData);
    }

    // Helper method to find an item in system lists
    private findItemInSystemLists(systemLists: UserList[], itemId: string): UserMediaItem | null {
        for (const list of systemLists) {
            const item = list.items.find(item => item.id === itemId);
            if (item) {
                return item;
            }
        }
        return null;
    }

    // Updated method to get items for a custom list
    async getCustomListItems(userId: string, customListId: string): Promise<UserMediaItem[]> {
        const userData = await this.getUserData(userId);

        // Get all items from system lists that belong to this custom list
        const allItems = userData.lists.flatMap(list => list.items);
        return allItems.filter(item => item.customListIds.includes(customListId));
    }

    // Episode tracking for TV shows
    async updateEpisodeProgress(userId: string, itemId: string, progress: EpisodeProgress): Promise<void> {
        const userData = await this.getUserData(userId);

        // Find the item in any list
        let foundItem: UserMediaItem | null = null;
        let foundList: UserList | null = null;

        for (const list of userData.lists) {
            const item = list.items.find(item => item.id === itemId);
            if (item) {
                foundItem = item;
                foundList = list;
                break;
            }
        }

        if (!foundItem || !foundList) {
            throw new Error('Item not found');
        }

        if (foundItem.mediaType !== 'tv') {
            throw new Error('Episode progress can only be updated for TV shows');
        }

        // Update the episode progress
        foundItem.episodeProgress = progress;

        // Update the item's watch status based on completion
        if (progress.isCompleted && foundItem.status !== 'watched') {
            foundItem.status = 'watched';
            foundItem.dateWatched = new Date().toISOString();
        } else if (!progress.isCompleted && progress.watchedEpisodes.length > 0 && foundItem.status !== 'watched') {
            // If they've watched some episodes but not all, keep current status or set to watching if we had that status
            // For now, we'll keep the current status since we simplified to just 'to_watch' | 'watched'
        }

        foundList.updatedAt = new Date().toISOString();
        await this.saveUserData(userId, userData);
    }

    async getEpisodeProgress(userId: string, itemId: string): Promise<EpisodeProgress | null> {
        const userData = await this.getUserData(userId);

        // Find the item in any list
        for (const list of userData.lists) {
            const item = list.items.find(item => item.id === itemId);
            if (item && item.mediaType === 'tv') {
                return item.episodeProgress || null;
            }
        }

        return null;
    }

    async updateFestivalData(userId: string, itemId: string, festivals: FestivalAward[], awards: Award[]): Promise<void> {
        const userData = await this.getUserData(userId);

        // Find the item in any list
        let foundItem: UserMediaItem | null = null;
        let foundList: UserList | null = null;

        for (const list of userData.lists) {
            const item = list.items.find(item => item.id === itemId);
            if (item) {
                foundItem = item;
                foundList = list;
                break;
            }
        }

        if (!foundItem || !foundList) {
            throw new Error('Item not found');
        }

        // Update festival and award data
        foundItem.festivals = festivals;
        foundItem.awards = awards;

        foundList.updatedAt = new Date().toISOString();
        await this.saveUserData(userId, userData);
    }

    // Journal Management
    async createJournalEntry(userId: string, entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<JournalEntry> {
        const userData = await this.getUserData(userId);

        const newEntry: JournalEntry = {
            ...entry,
            id: this.generateId(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        userData.journalEntries.push(newEntry);
        await this.saveUserData(userId, userData);

        return newEntry;
    }

    async updateJournalEntry(userId: string, entryId: string, updates: Partial<JournalEntry>): Promise<JournalEntry> {
        const userData = await this.getUserData(userId);

        const entryIndex = userData.journalEntries.findIndex(entry => entry.id === entryId);
        if (entryIndex === -1) {
            throw new Error('Journal entry not found');
        }

        userData.journalEntries[entryIndex] = {
            ...userData.journalEntries[entryIndex],
            ...updates,
            updatedAt: new Date().toISOString(),
        };

        await this.saveUserData(userId, userData);

        return userData.journalEntries[entryIndex];
    }

    async deleteJournalEntry(userId: string, entryId: string): Promise<void> {
        const userData = await this.getUserData(userId);

        const entryIndex = userData.journalEntries.findIndex(entry => entry.id === entryId);
        if (entryIndex === -1) {
            throw new Error('Journal entry not found');
        }

        userData.journalEntries.splice(entryIndex, 1);
        await this.saveUserData(userId, userData);
    }

    async getJournalEntries(userId: string): Promise<JournalEntry[]> {
        const userData = await this.getUserData(userId);
        return userData.journalEntries;
    }

    // Private helper methods
    private async getUserData(userId: string): Promise<{
        lists: UserList[];
        customLists: UserList[];
        journalEntries: JournalEntry[];
        preferences: UserPreferences;
    }> {
        const response = await fetch(`/api/user/${userId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch user data');
        }
        const userData = await response.json();

        // Apply migrations for backward compatibility
        return this.applyMigrations(userData);
    }

    // Migration function to handle data structure changes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private applyMigrations(userData: any): {
        lists: UserList[];
        customLists: UserList[];
        journalEntries: JournalEntry[];
        preferences: UserPreferences;
    } {
        // Migration 1: Add customListIds to existing items
        if (userData.lists) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            userData.lists.forEach((list: any) => {
                if (list.items) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    list.items.forEach((item: any) => {
                        // Add customListIds if missing
                        if (!item.customListIds) {
                            item.customListIds = [];
                        }

                        // Migrate old status values to new ones
                        if (item.status === 'watching' || item.status === 'dropped' || item.status === 'on_hold') {
                            item.status = 'to_watch';
                        } else if (item.status !== 'to_watch' && item.status !== 'watched') {
                            item.status = 'to_watch';
                        }
                    });
                }
            });
        }

        return userData;
    }

    private async saveUserData(userId: string, userData: {
        lists: UserList[];
        customLists: UserList[];
        journalEntries: JournalEntry[];
        preferences: UserPreferences;
    }): Promise<void> {
        const response = await fetch(`/api/user/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
        });

        if (!response.ok) {
            throw new Error('Failed to save user data');
        }
    }

    private generateId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Search History (still using localStorage for now)
    async addToSearchHistory(userId: string, query: string): Promise<void> {
        const key = `${APP_CONFIG.STORAGE_KEYS.SEARCH_HISTORY}_${userId}`;
        const history = await this.getSearchHistory(userId);

        // Remove if already exists
        const filtered = history.filter(item => item !== query);

        // Add to beginning
        filtered.unshift(query);

        // Keep only last 50 items
        const trimmed = filtered.slice(0, APP_CONFIG.DEFAULTS.MAX_SEARCH_HISTORY);

        localStorage.setItem(key, JSON.stringify(trimmed));
    }

    async getSearchHistory(userId: string): Promise<string[]> {
        const key = `${APP_CONFIG.STORAGE_KEYS.SEARCH_HISTORY}_${userId}`;
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    }

    async clearSearchHistory(userId: string): Promise<void> {
        const key = `${APP_CONFIG.STORAGE_KEYS.SEARCH_HISTORY}_${userId}`;
        localStorage.removeItem(key);
    }
}

// Export singleton instance
export const storageService = StorageService.getInstance(); 