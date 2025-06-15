import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeSQLiteDatabase, getSQLiteDatabase } from './sqliteStorage.native';

let isInitialized = false;

const initializeDatabase = async (): Promise<void> => {
  if (isInitialized) {
    console.log('Database already initialized, skipping');
    return;
  }

  if (Platform.OS === 'web') {
    console.log('Platform is web, using AsyncStorage');
    isInitialized = true;
    return;
  }

  try {
    await initializeSQLiteDatabase();
    isInitialized = true;
  } catch (error) {
    console.error('Database initialization failed:', error);
    isInitialized = false;
    throw error;
  }
};

const storeData = async (key: string, value: string): Promise<number> => {
  const encodedValue = btoa(encodeURIComponent(value));

  if (Platform.OS === 'web') {
    try {
      await AsyncStorage.setItem(key, encodedValue);
      console.log('Stored in AsyncStorage:', key);
      return 1;
    } catch (error) {
      console.error('Error storing in AsyncStorage:', error);
      throw error;
    }
  }

  const db = await getSQLiteDatabase();

  try {
    const result = await db.runAsync(
      'INSERT OR REPLACE INTO secure_data (key, value) VALUES (?, ?);',
      [key, encodedValue]
    );
    console.log('Stored in SQLite (secure_data):', result.lastInsertRowId, result.changes);
    return result.lastInsertRowId ?? 0;
  } catch (error) {
    console.error('SQLite store failed:', error);
    throw error;
  }
};

const getData = async (key: string): Promise<string | null> => {
  if (Platform.OS === 'web') {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        return decodeURIComponent(atob(value));
      }
      return null;
    } catch (error) {
      console.error('Error retrieving from AsyncStorage:', error);
      throw error;
    }
  }

  const db = await getSQLiteDatabase();

  try {
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM secure_data WHERE key = ?;',
      [key]
    );
    if (row) {
      return decodeURIComponent(atob(row.value));
    }
    return null;
  } catch (error) {
    console.error('SQLite retrieval failed:', error);
    throw error;
  }
};

const clearStaleData = async (prefix: string): Promise<void> => {
  if (Platform.OS === 'web') {
    try {
      const keys = await AsyncStorage.getAllKeys();
      for (const key of keys) {
        if (key.startsWith(prefix)) {
          await AsyncStorage.removeItem(key);
          console.log('Removed stale key from AsyncStorage:', key);
        }
      }
    } catch (error) {
      console.error('Error clearing stale AsyncStorage:', error);
    }
    return;
  }

  let db;
  try {
    db = await getSQLiteDatabase();
  } catch (error) {
    console.error('Failed to get database for clearStaleData:', error);
    return;
  }

  try {
    await db.runAsync('DELETE FROM secure_data WHERE key LIKE ?;', [`${prefix}%`]);
    console.log('Cleared stale secure_data');
  } catch (error) {
    console.error('Error clearing stale secure_data:', error);
    throw error;
  }
};

const getSuggestions = async (query: string, limit: number = 20, offset: number = 0): Promise<string[]> => {
  if (Platform.OS === 'web') {
    try {
      const cached = await AsyncStorage.getItem('suggestions');
      if (!cached) return [];
      const suggestions = JSON.parse(cached);
      const filtered = suggestions
        .filter((name: string) => name.toLowerCase().startsWith(query.toLowerCase()))
        .slice(offset, offset + limit);
      console.log(`Fetched ${filtered.length} suggestions from AsyncStorage`);
      return filtered;
    } catch (error) {
      console.error('Error fetching suggestions from AsyncStorage:', error);
      return [];
    }
  }

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

const cacheSuggestions = async (suggestions: string[]): Promise<void> => {
  if (Platform.OS === 'web') {
    try {
      await AsyncStorage.setItem('suggestions', JSON.stringify(suggestions));
      console.log('Cached suggestions in AsyncStorage');
    } catch (error) {
      console.error('Error caching suggestions in AsyncStorage:', error);
      throw error;
    }
    return;
  }

  let db;
  try {
    db = await getSQLiteDatabase();
  } catch (error) {
    console.error('Failed to get database for cacheSuggestions:', error);
    return;
  }

  try {
    // Validate and sanitize suggestions
    const validSuggestions = suggestions
      .map(s => (typeof s === 'string' && s.trim().length > 0 ? s.trim() : null))
      .filter((s): s is string => s !== null);
    console.log('Valid suggestions to cache:', validSuggestions.length);

    // Log invalid suggestions for debugging
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

    // Cache in suggestions table with retry logic
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
          console.log(`Cached ${i + safeBatch.length} of ${validSuggestions.length} suggestions in SQLite table`);
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
          console.log(`Retrying cacheSuggestions in ${RETRY_DELAY}ms`);
          await delay(RETRY_DELAY);
          // Reinitialize database
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

const getSuggestionsCount = async (): Promise<number> => {
  if (Platform.OS === 'web') {
    try {
      const cached = await AsyncStorage.getItem('suggestions');
      if (!cached) return 0;
      const suggestions = JSON.parse(cached);
      return suggestions.length;
    } catch (error) {
      console.error('Error counting suggestions in AsyncStorage:', error);
      return 0;
    }
  }

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

export {
  initializeDatabase,
  storeData,
  getData,
  clearStaleData,
  getSuggestions,
  cacheSuggestions,
  getSuggestionsCount,
};