import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';

let db: SQLite.SQLiteDatabase | null = null;
let isInitializing = false;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const deleteDatabaseFile = async (): Promise<void> => {
  try {
    const dbPath = `${FileSystem.documentDirectory}SQLite/secureStorage.db`;
    const info = await FileSystem.getInfoAsync(dbPath);
    if (info.exists) {
      await FileSystem.deleteAsync(dbPath);
      console.log('Deleted database file:', dbPath);
    }
  } catch (error) {
    console.error('Failed to delete database file:', error);
  }
};

export const initializeSQLiteDatabase = async (retryCount = 0): Promise<void> => {
  if (db && isConnectionValid()) {
    console.log('Database already initialized and valid');
    return;
  }
  if (isInitializing) {
    console.log('Database initialization in progress, waiting');
    await new Promise(resolve => setTimeout(resolve, 100));
    if (retryCount >= MAX_RETRIES) {
      throw new Error('Database initialization stuck in progress');
    }
    return initializeSQLiteDatabase(retryCount);
  }

  isInitializing = true;
  try {
    // Close and delete existing database if invalid
    if (db) {
      await db.closeAsync().catch(err => console.error('Failed to close stale database:', err));
      db = null;
    }
    if (retryCount > 0) {
      await deleteDatabaseFile(); // Delete on retry to avoid corruption
    }

    db = await SQLite.openDatabaseAsync('secureStorage.db');
    console.log('Database opened successfully');

    try {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS secure_data (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS suggestions (
          name TEXT PRIMARY KEY NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_suggestions_name_lower ON suggestions (lower(name));
      `);
      console.log('Tables and index created successfully');
    } catch (execError) {
      console.error('ExecAsync failed:', execError);
      throw execError;
    }
  } catch (error) {
    console.error(`Failed to initialize database (attempt ${retryCount + 1}):`, error);
    db = null;
    isInitializing = false;
    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying database initialization in ${RETRY_DELAY}ms`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return initializeSQLiteDatabase(retryCount + 1);
    }
    throw new Error(`Database initialization failed after ${MAX_RETRIES} retries: ${error.message}`);
  } finally {
    isInitializing = false;
  }
};

const isConnectionValid = (): boolean => {
  if (!db) return false;
  try {
    db.getFirstSync('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database connection validation failed:', error);
    return false;
  }
};

export const getSQLiteDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (db && isConnectionValid()) {
    return db;
  }
  try {
    await initializeSQLiteDatabase();
    if (!db) {
      throw new Error('Database initialization succeeded but db is null');
    }
    return db;
  } catch (error) {
    console.error('Failed to get SQLite database:', error);
    throw error;
  }
};

export const closeSQLiteDatabase = async () => {
  if (db && isConnectionValid()) {
    try {
      await db.closeAsync();
      console.log('Database closed successfully');
    } catch (error) {
      console.error('Failed to close database:', error);
    }
  }
  db = null;
};