import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeSQLiteDatabase, getSQLiteDatabase } from './sqliteStorage.native';

let isInitialized = false;

// Initialize SQLite database
const initializeDatabase = async (): Promise<void> => {
  if (isInitialized) {
    console.log('Database already initialized, skipping');
    return;
  }

  try {
    await initializeSQLiteDatabase();
    isInitialized = true;
    console.log('SQLite database initialized');
  } catch (error) {
    console.error('Database initialization failed:', error);
    isInitialized = false;
    throw error;
  }
};

// Store data in SQLite or AsyncStorage
const storeData = async (key: string, value: string): Promise<number> => {
  const encodedValue = btoa(encodeURIComponent(value));

  const db = await getSQLiteDatabase();

  try {
    const result = await db.runAsync(
      'INSERT OR REPLACE INTO secure_data (key, value) VALUES (?, ?);',
      [key, encodedValue]
    );
    console.log('Stored in SQLite (secure_data):', result.lastInsertRowId, result.changes);
    // Mirror in AsyncStorage for compatibility
    await AsyncStorage.setItem(key, encodedValue);
    console.log('Stored in AsyncStorage:', key);
    return result.lastInsertRowId ?? 0;
  } catch (error) {
    console.error('Store failed:', error);
    throw error;
  }
};

// Retrieve data from SQLite or AsyncStorage
const getData = async (key: string): Promise<string | null> => {
  const db = await getSQLiteDatabase();

  try {
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM secure_data WHERE key = ?;',
      [key]
    );
    if (row) {
      return decodeURIComponent(atob(row.value));
    }
    // Fallback to AsyncStorage
    const asyncValue = await AsyncStorage.getItem(key);
    if (asyncValue) {
      return decodeURIComponent(atob(asyncValue));
    }
    return null;
  } catch (error) {
    console.error('Retrieval failed:', error);
    throw error;
  }
};

// Clear stale data by prefix in SQLite and AsyncStorage
const clearStaleData = async (prefix: string): Promise<void> => {
  let db;
  try {
    db = await getSQLiteDatabase();
  } catch (error) {
    console.error('Failed to get database for clearStaleData:', error);
    throw error;
  }

  try {
    // Clear SQLite secure_data with prefix
    await db.runAsync('DELETE FROM secure_data WHERE key LIKE ?;', [`${prefix}%`]);
    console.log('Cleared stale secure_data in SQLite');

    // Clear AsyncStorage with prefix
    const keys = await AsyncStorage.getAllKeys();
    for (const key of keys) {
      if (key.startsWith(prefix)) {
        await AsyncStorage.removeItem(key);
        console.log('Removed stale key from AsyncStorage:', key);
      }
    }
    console.log('Cleared stale data with prefix:', prefix);
  } catch (error) {
    console.error('Error clearing stale data:', error);
    throw error;
  }
};

// Fetch suggestions from SQLite
const getSuggestions = async (query: string, limit: number = 20, offset: number = 0): Promise<string[]> => {
  let db;
  try {
    db = await getSQLiteDatabase();
  } catch (error) {
    console.error('Failed to get database for suggestions:', error);
    return [];
  }

  try {
    const sanitizedQuery = query.trim().toLowerCase().replace(/[^a-zA-Z0-9 ]/g, '');
    if (!sanitizedQuery) return [];

    const results = await db.getAllAsync<{ name: string }>(
      `SELECT name FROM suggestions WHERE lower(name) LIKE ? ORDER BY name ASC LIMIT ? OFFSET ?`,
      [`${sanitizedQuery}%`, limit, offset]
    );
    console.log(`Fetched ${results.length} suggestions from SQLite for query "${query}"`);
    return results.map(row => row.name);
  } catch (error) {
    console.error('Suggestions fetch failed:', error);
    return [];
  }
};

// Cache suggestions in SQLite
const cacheSuggestions = async (suggestions: string[]): Promise<void> => {
  let db;
  try {
    db = await getSQLiteDatabase();
  } catch (error) {
    console.error('Failed to get database for cacheSuggestions:', error);
    throw error;
  }

  try {
    const validSuggestions = suggestions
      .map(s => (typeof s === 'string' && s.trim().length > 0 ? s.trim() : null))
      .filter((s): s is string => s !== null);
    console.log('Valid suggestions to cache:', validSuggestions.length);

    const invalidSuggestions = suggestions.filter(s => !(typeof s === 'string' && s.trim().length > 0));
    if (invalidSuggestions.length > 0) {
      console.log('Invalid suggestions detected:', invalidSuggestions.slice(0, 10));
    }

    if (validSuggestions.length === 0) {
      console.log('No valid suggestions to cache');
      return;
    }

    const batchSize = 100;
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    let attempt = 0;
    const maxAttempts = 3;
    while (attempt < maxAttempts) {
      try {
        await db.execAsync('BEGIN EXCLUSIVE TRANSACTION;');
        for (let i = 0; i < validSuggestions.length; i += batchSize) {
          const batch = validSuggestions.slice(i, i + batchSize);
          const safeBatch = batch.map(s => String(s));
          const placeholders = safeBatch.map(() => '(?)').join(', ');
          await db.runAsync(
            `INSERT OR IGNORE INTO suggestions (name) VALUES ${placeholders};`,
            safeBatch
          );
          console.log(`Cached ${i + safeBatch.length} of ${validSuggestions.length} suggestions in SQLite`);
          await delay(10);
        }
        await db.execAsync('COMMIT;');
        console.log('Successfully cached suggestions in SQLite:', validSuggestions.length);
        return;
      } catch (error) {
        console.error(`Cache attempt ${attempt + 1} failed:`, error);
        await db.execAsync('ROLLBACK;').catch(err => console.error('Rollback failed:', err));
        attempt++;
        if (attempt < maxAttempts) {
          console.log(`Retrying cacheSuggestions in 500ms`);
          await delay(500);
          await initializeSQLiteDatabase();
          db = await getSQLiteDatabase();
        } else {
          throw error;
        }
      }
    }
  } catch (error) {
    console.error('Error caching suggestions in SQLite:', error);
    throw error;
  }
};

// Count suggestions in SQLite
const getSuggestionsCount = async (): Promise<number> => {
  let db;
  try {
    db = await getSQLiteDatabase();
  } catch (error) {
    console.error('Failed to get database for suggestions count:', error);
    return 0;
  }

  try {
    const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM suggestions');
    return row?.count ?? 0;
  } catch (error) {
    console.error('Error counting suggestions in SQLite:', error);
    return 0;
  }
};

// Clear all non-suggestion data in SQLite and AsyncStorage
const clearNonSuggestionData = async (): Promise<void> => {
  let db;
  try {
    db = await getSQLiteDatabase();
  } catch (error) {
    console.error('Failed to get database for clearNonSuggestionData:', error);
    throw error;
  }

  try {
    // Clear all SQLite tables except suggestions
    await db.runAsync('DELETE FROM secure_data;');
    console.log('Cleared secure_data table in SQLite');

    // Clear all AsyncStorage keys, including suggestions
    const asyncKeys = await AsyncStorage.getAllKeys();
    console.log('AsyncStorage keys before clearing:', asyncKeys);
    for (const key of asyncKeys) {
      await AsyncStorage.removeItem(key);
      console.log('Removed AsyncStorage key:', key);
    }
    console.log('Cleared all AsyncStorage data');

    // Verify remaining SQLite tables
    const tables = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"
    );
    console.log('Remaining SQLite tables:', tables.map(t => t.name));

    // Verify remaining AsyncStorage keys
    const remainingAsyncKeys = await AsyncStorage.getAllKeys();
    console.log('Remaining AsyncStorage keys after clearing:', remainingAsyncKeys);
  } catch (error) {
    console.error('Error clearing non-suggestion data:', error);
    throw error;
  }
};

export {
  initializeDatabase,
  storeData,
  getData,
  clearStaleData,
  getSuggestions,
  cacheSuggestions,
  getSuggestionsCount,
  clearNonSuggestionData,
};