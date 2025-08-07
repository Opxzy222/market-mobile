// ../../storage/storage (or sqliteStorage.native.ts)

import { initializeSQLiteDatabase, getSQLiteDatabase } from './sqliteStorage.native';

let isInitialized = false;
let isInitializing = false; // Track initialization in progress
let dbInstance: any = null; // Singleton database instance

// Initialize SQLite database with locking
const initializeDatabase = async (): Promise<void> => {
  if (isInitialized && dbInstance) {
    console.log('Database already initialized, returning existing instance');
    return;
  }

  if (isInitializing) {
    console.log('Database initialization in progress, waiting...');
    await new Promise((resolve) => setTimeout(resolve, 100)); // Wait for ongoing initialization
    if (isInitialized && dbInstance) return;
  }

  isInitializing = true;
  let attempt = 0;
  const maxAttempts = 5;
  const baseDelay = 1000;

  while (attempt < maxAttempts) {
    try {
      await initializeSQLiteDatabase();
      dbInstance = await getSQLiteDatabase(); // Use imported getSQLiteDatabase
      isInitialized = true;
      isInitializing = false;
      console.log('SQLite database initialized');
      return;
    } catch (error) {
      console.error(`Failed to initialize database (attempt ${attempt + 1}):`, error);
      attempt++;
      if (attempt < maxAttempts) {
        const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
        console.log(`Retrying database initialization in ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        isInitializing = false;
        isInitialized = false;
        throw new Error(`Database initialization failed after ${maxAttempts} retries: ${error.message}`);
      }
    }
  }
};

// Get SQLite database with singleton pattern
const getSingletonSQLiteDatabase = async (): Promise<any> => {
  if (isInitialized && dbInstance) {
    return dbInstance;
  }
  await initializeDatabase();
  if (!dbInstance) {
    throw new Error('Database not initialized');
  }
  return dbInstance;
};

// Validate base64 string
const isValidBase64 = (str: string): boolean => {
  try {
    if (!str || str.length % 4 !== 0) return false;
    if (!/^[A-Za-z0-9+/=]+$/.test(str)) return false;
    atob(str);
    return true;
  } catch {
    return false;
  }
};

// Store data in SQLite only
const storeData = async (key: string, value: string): Promise<number> => {
  if (typeof value !== 'string' || !value.trim()) {
    console.error('Invalid value for storage:', { key, value });
    throw new Error('Value must be a non-empty string');
  }

  let encodedValue;
  try {
    encodedValue = btoa(encodeURIComponent(value));
  } catch (error) {
    console.error('Error encoding value:', error, { key, value });
    throw new Error('Failed to encode value as base64');
  }

  const db = await getSingletonSQLiteDatabase();
  try {
    await db.execAsync('BEGIN EXCLUSIVE TRANSACTION;');
    const result = await db.runAsync(
      'INSERT OR REPLACE INTO secure_data (key, value) VALUES (?, ?);',
      [key, encodedValue]
    );
    await db.execAsync('COMMIT;');
    console.log('Stored in SQLite (secure_data):', result.lastInsertRowId, result.changes);
    return result.lastInsertRowId ?? 0;
  } catch (error) {
    console.error('SQLite store failed:', error, { key });
    await db.execAsync('ROLLBACK;').catch((err) => console.error('Rollback failed:', err));
    throw error;
  }
};

// Retrieve data from SQLite only
const getData = async (key: string): Promise<string | null> => {
  try {
    const db = await getSingletonSQLiteDatabase();
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM secure_data WHERE key = ?;',
      [key]
    );
    if (row) {
      if (!isValidBase64(row.value)) {
        console.error('Invalid base64 value in SQLite:', key, 'Value:', row.value);
        await db.runAsync('DELETE FROM secure_data WHERE key = ?;', [key]);
        console.log(`Removed invalid SQLite data: ${key}`);
        return null;
      }
      try {
        return decodeURIComponent(atob(row.value));
      } catch (error) {
        console.error('Error decoding SQLite value:', key, 'Error:', error);
        await db.runAsync('DELETE FROM secure_data WHERE key = ?;', [key]);
        console.log(`Removed corrupted SQLite data: ${key}`);
        return null;
      }
    }
    return null;
  } catch (error) {
    console.error('SQLite retrieval failed:', error, { key });
    return null;
  }
};

// Clear stale data by prefix in SQLite only
const clearStaleData = async (prefix: string): Promise<void> => {
  try {
    const db = await getSingletonSQLiteDatabase();
    await db.execAsync('BEGIN EXCLUSIVE TRANSACTION;');
    await db.runAsync('DELETE FROM secure_data WHERE key LIKE ?;', [`${prefix}%`]);
    await db.execAsync('COMMIT;');
    console.log(`Cleared stale secure_data in SQLite with prefix: ${prefix}`);
  } catch (error) {
    console.error('Error clearing stale data:', error);
    if (dbInstance) {
      await dbInstance.execAsync('ROLLBACK;').catch((err) => console.error('Rollback failed:', err));
    }
    throw error;
  }
};

// Fetch suggestions from SQLite
const getSuggestions = async (query: string, limit: number = 20, offset: number = 0): Promise<string[]> => {
  try {
    const db = await getSingletonSQLiteDatabase();
    const sanitizedQuery = query.trim().toLowerCase().replace(/[^a-zA-Z0-9 ]/g, '');
    if (!sanitizedQuery) return [];

    const results = await db.getAllAsync<{ name: string }>(
      `SELECT name FROM suggestions WHERE lower(name) LIKE ? ORDER BY name ASC LIMIT ? OFFSET ?`,
      [`${sanitizedQuery}%`, limit, offset]
    );
    console.log(`Fetched ${results.length} suggestions from SQLite for query "${query}"`);
    return results.map((row) => row.name);
  } catch (error) {
    console.error('Suggestions fetch failed:', error);
    return [];
  }
};

// Cache suggestions in SQLite
const cacheSuggestions = async (suggestions: string[]): Promise<void> => {
  try {
    const db = await getSingletonSQLiteDatabase();
    const validSuggestions = suggestions
      .map((s) => (typeof s === 'string' && s.trim().length > 0 ? s.trim() : null))
      .filter((s): s is string => s !== null);
    console.log('Valid suggestions to cache:', validSuggestions.length);

    const invalidSuggestions = suggestions.filter((s) => !(typeof s === 'string' && s.trim().length > 0));
    if (invalidSuggestions.length > 0) {
      console.log('Invalid suggestions detected:', invalidSuggestions.slice(0, 10));
    }

    if (validSuggestions.length === 0) {
      console.log('No valid suggestions to cache');
      return;
    }

    const batchSize = 500;
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    let attempt = 0;
    const maxAttempts = 3;
    while (attempt < maxAttempts) {
      try {
        await db.execAsync('BEGIN EXCLUSIVE TRANSACTION;');
        for (let i = 0; i < validSuggestions.length; i += batchSize) {
          const batch = validSuggestions.slice(i, i + batchSize);
          const safeBatch = batch.map((s) => String(s));
          const placeholders = safeBatch.map(() => '(?)').join(', ');
          await db.runAsync(
            `INSERT OR IGNORE INTO suggestions (name) VALUES ${placeholders};`,
            safeBatch
          );
          console.log(`Cached ${i + safeBatch.length} of ${validSuggestions.length} suggestions in SQLite`);
          await delay(20);
        }
        await db.execAsync('COMMIT;');
        console.log('Successfully cached suggestions in SQLite:', validSuggestions.length);
        return;
      } catch (error) {
        console.error(`Cache attempt ${attempt + 1} failed:`, error);
        await db.execAsync('ROLLBACK;').catch((err) => console.error('Rollback failed:', err));
        attempt++;
        if (attempt < maxAttempts) {
          console.log(`Retrying cacheSuggestions in 1000ms`);
          await delay(1000);
          await initializeDatabase();
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
  try {
    const db = await getSingletonSQLiteDatabase();
    const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM suggestions');
    return row?.count ?? 0;
  } catch (error) {
    console.error('Error counting suggestions in SQLite:', error);
    return 0;
  }
};

// Clear all non-suggestion data in SQLite
const clearNonSuggestionData = async (): Promise<void> => {
  try {
    const db = await getSingletonSQLiteDatabase();
    await db.execAsync('BEGIN EXCLUSIVE TRANSACTION;');
    await db.runAsync('DELETE FROM secure_data;');
    await db.execAsync('COMMIT;');
    console.log('Cleared secure_data table in SQLite');

    const secureData = await db.getAllAsync('SELECT * FROM secure_data;');
    if (secureData.length > 0) {
      console.warn('Secure data persists in SQLite:', secureData);
    } else {
      console.log('SQLite secure_data table is empty');
    }

    const tables = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"
    );
    console.log('Remaining SQLite tables:', tables.map((t) => t.name));
  } catch (error) {
    console.error('Error clearing non-suggestion data:', error);
    if (dbInstance) {
      await dbInstance.execAsync('ROLLBACK;').catch((err) => console.error('Rollback failed:', err));
    }
    throw error;
  }
};

export {
  initializeDatabase,
  getSingletonSQLiteDatabase,
  storeData,
  getData,
  clearStaleData,
  getSuggestions,
  cacheSuggestions,
  getSuggestionsCount,
  clearNonSuggestionData,
};