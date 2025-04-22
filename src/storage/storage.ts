// src/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const isWeb = Constants.platform?.web;

let db: any;
const initializeDatabase = async (): Promise<void> => {
  if (isWeb) {
    console.log('SQLite not supported on web, using AsyncStorage fallback');
    return;
  }

  try {
    const SQLite = await import('expo-sqlite');
    db = await SQLite.openDatabaseAsync('secureStorage.db');
    console.log('Database opened');
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS secure_data (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
    `);
    console.log('Table created');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
};

const storeData = async (key: string, value: string): Promise<number> => {
  const encodedValue = btoa(value); // Base64 encode for compatibility
  console.log('Encoding data for storage:', key);

  if (isWeb) {
    try {
      console.log('Storing in AsyncStorage:', key);
      await AsyncStorage.setItem(key, encodedValue);
      console.log('Successfully stored in AsyncStorage:', key);
      return 1; // Mimic SQLite row ID
    } catch (error) {
      console.error('Error storing in AsyncStorage:', error);
      throw error;
    }
  }

  try {
    console.log('Storing in SQLite:', key);
    const result = await db.runAsync(
      'INSERT OR REPLACE INTO secure_data (key, value) VALUES (?, ?);',
      key,
      encodedValue
    );
    console.log('Stored data in SQLite:', result.lastInsertRowId, result.changes);
    return result.lastInsertRowId ?? 0;
  } catch (error) {
    console.error('Error storing in SQLite:', error);
    console.log('Falling back to AsyncStorage:', key);
    try {
      await AsyncStorage.setItem(key, encodedValue);
      console.log('Successfully stored in AsyncStorage fallback:', key);
      return 1;
    } catch (asyncError) {
      console.error('Failed to store in AsyncStorage:', asyncError);
      throw asyncError;
    }
  }
};

const getData = async (key: string): Promise<string | null> => {
  if (isWeb) {
    try {
      console.log('Retrieving from AsyncStorage:', key);
      const encodedValue = await AsyncStorage.getItem(key);
      if (encodedValue) {
        const decodedValue = atob(encodedValue);
        console.log('Retrieved data from AsyncStorage:', key);
        return decodedValue;
      }
      console.log('No data found for key in AsyncStorage:', key);
      return null;
    } catch (error) {
      console.error('Error retrieving from AsyncStorage:', error);
      return null;
    }
  }

  try {
    console.log('Retrieving from SQLite:', key);
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM secure_data WHERE key = ?;',
      key
    );
    if (row) {
      const decodedValue = atob(row.value);
      console.log('Retrieved data from SQLite:', key);
      return decodedValue;
    }
    console.log('No data found for key in SQLite:', key);
    return null;
  } catch (error) {
    console.error('Error retrieving from SQLite:', error);
    console.log('Falling back to AsyncStorage:', key);
    try {
      const encodedValue = await AsyncStorage.getItem(key);
      if (encodedValue) {
        const decodedValue = atob(encodedValue);
        console.log('Retrieved data from AsyncStorage fallback:', key);
        return decodedValue;
      }
      console.log('No data found for key in AsyncStorage fallback:', key);
      return null;
    } catch (asyncError) {
      console.error('Failed to retrieve from AsyncStorage:', asyncError);
      return null;
    }
  }
};

export { initializeDatabase, storeData, getData };