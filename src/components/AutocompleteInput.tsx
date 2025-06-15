import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  TextInput,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import debounce from 'lodash.debounce';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

let initializeDatabase = async () => {
  console.log('Fallback: Skipping database initialization');
};
let getSuggestions = async () => [];
let cacheSuggestions = async () => {
  console.error('Fallback failed: Storage module not loaded');
  throw new Error('Storage module not loaded');
};
let getSuggestionsCount = async () => 0;

try {
  const storage = require('../storage/storage');
  if (storage && typeof storage === 'object' && storage.initializeDatabase) {
    initializeDatabase = storage.initializeDatabase;
    getSuggestions = storage.getSuggestions || getSuggestions;
    cacheSuggestions = storage.cacheSuggestions || cacheSuggestions;
    getSuggestionsCount = storage.getSuggestionsCount || getSuggestionsCount;
  }
} catch (error) {
  console.error('Failed to load storage module:', error);
}

const AutocompleteInput = ({
  value,
  onChangeText,
  onSubmit,
  style,
  onFocusChange,
  inputRef,
  onSuggestionsStateChange,
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [error, setError] = useState(null);
  const [suggestionsHeight, setSuggestionsHeight] = useState(0);
  const scrollViewRef = useRef(null);
  const textInputRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      const initialized = await AsyncStorage.getItem('suggestions_initialized');
      if (initialized === 'true') {
        console.log('Suggestions already initialized, skipping');
        return;
      }

      try {
        await initializeDatabase();
        console.log('Database initialized, populating suggestions');
        await populateInitialSuggestions();
        await AsyncStorage.setItem('suggestions_initialized', 'true');
      } catch (err) {
        console.error('Initialization failed:', err);
        setError('Failed to initialize suggestions');
        await populateInitialSuggestions(true); // Fallback to AsyncStorage
      }
    };
    init();
  }, []);

  const populateInitialSuggestions = async (useAsyncStorage = false, retryCount = 0, maxRetries = 3) => {
    try {
      let count = 0;
      if (!useAsyncStorage) {
        count = await getSuggestionsCount();
        console.log('Suggestions count:', count);
      } else {
        const cached = await AsyncStorage.getItem('suggestions');
        count = cached ? JSON.parse(cached).length : 0;
        console.log('AsyncStorage suggestions count:', count);
      }
      if (count >= 1000) {
        console.log('Suggestions sufficiently populated, skipping fetch');
        return;
      }

      setIsLoading(true);
      let response;
      try {
        response = await axios.get('https://retail-alvinia-goza-f6a0e4f7.koyeb.app/all-suggestions/', {
          timeout: 60000,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'market-mobile/1.0.0',
          },
          validateStatus: status => status >= 200 && status < 300,
        });
      } catch (axiosError) {
        console.error('Axios fetch failed:', axiosError);
        console.log('Falling back to fetch');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);
        const fetchResponse = await fetch('https://retail-alvinia-goza-f6a0e4f7.koyeb.app/all-suggestions/', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'market-mobile/1.0.0',
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const contentType = fetchResponse.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await fetchResponse.text();
          console.error('Non-JSON response:', text.slice(0, 100));
          throw new Error('Invalid response: Expected JSON, received ' + contentType);
        }

        response = { data: await fetchResponse.json() };
      }

      console.log('Response status:', response.status || fetchResponse?.status || 'unknown');
      console.log('Response headers:', response.headers || fetchResponse?.headers);

      const rawSuggestions = response.data.suggestions
        .map((item: any, index: number) => {
          if (item && typeof item.name === 'string') {
            const trimmed = item.name.trim();
            return trimmed.length > 0 ? trimmed : null;
          }
          console.warn(`Invalid suggestion item at index ${index}:`, item);
          return null;
        })
        .filter((name: string | null) => name) as string[];
      console.log('Raw API suggestions:', rawSuggestions.length);

      const maxSuggestions = 180000;
      const uniqueSuggestions: string[] = [];
      const seen = new Set<string>();

      for (const s of rawSuggestions) {
        const lower = s.toLowerCase();
        if (!seen.has(lower)) {
          seen.add(lower);
          uniqueSuggestions.push(s);
          if (uniqueSuggestions.length >= maxSuggestions) break;
        }
      }
      console.log('Unique suggestions:', uniqueSuggestions.length);

      console.log('Attempting to cache suggestions');
      if (useAsyncStorage) {
        await AsyncStorage.setItem('suggestions', JSON.stringify(uniqueSuggestions));
        console.log('Cached suggestions in AsyncStorage');
      } else {
        await cacheSuggestions(uniqueSuggestions);
        console.log('Suggestions cached successfully in SQLite');
      }
    } catch (error) {
      console.error('Error populating suggestions:', error);
      if (axios.isAxiosError(error)) {
        console.error('Axios error details:', {
          message: error.message,
          code: error.code,
          response: error.response ? {
            status: error.response.status,
            data: error.response.data,
            headers: error.response.headers,
          } : null,
          request: error.request ? {
            method: error.request.method,
            url: error.request.url,
            headers: error.request.headers,
          } : null,
        });
        setError(`Failed to load suggestions: ${error.response?.status || 'Network error'}`);
      }
      if (
        error.message.includes('NOT NULL constraint failed') ||
        error.message.includes('Cannot convert') ||
        error.message.includes('cannot start a transaction') ||
        error.message.includes('NativeDatabase')
      ) {
        console.log('Aborting retries due to SQLite or transaction error');
        setError('Database error, using fallback storage');
        if (!useAsyncStorage) {
          await populateInitialSuggestions(true, 0, maxRetries);
        }
        return;
      }
      if (retryCount < maxRetries) {
        console.log(`Retrying fetch, attempt ${retryCount + 1}`);
        setTimeout(() => populateInitialSuggestions(useAsyncStorage, retryCount + 1, maxRetries), Math.pow(2, retryCount) * 5000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSuggestions = useCallback(
    debounce(async (input: string) => {
      if (!input || input.length < 1) {
        setSuggestions([]);
        setError(null);
        return;
      }
      setIsLoading(true);
      try {
        let results = await getSuggestions(input, 20, 0);
        if (results.length === 0 && Platform.OS !== 'web') {
          console.log('No SQLite suggestions, trying AsyncStorage fallback');
          const cached = await AsyncStorage.getItem('suggestions');
          if (cached) {
            const allSuggestions = JSON.parse(cached);
            results = allSuggestions
              .filter((name: string) => name.toLowerCase().startsWith(input.toLowerCase()))
              .slice(0, 20);
          }
        }
        console.log('Fetched suggestions:', results.slice(0, 20));
        setSuggestions(results);
        setError(null);
        if (results.length === 0) {
          console.log(`No suggestions found for query "${input}"`);
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setError('Failed to fetch suggestions');
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    []
  );

  const handleInput = (text) => {
    console.log('Input changed:', text);
    onChangeText(text);
    fetchSuggestions(text);
  };

  const handleSelectSuggestion = useCallback(
    (suggestion) => {
      console.log('Suggestion selected:', suggestion);
      onChangeText(suggestion);
      setSuggestions([]);
      setSuggestionsHeight(0);
      onSuggestionsStateChange?.({ showSuggestions: false, suggestions: [], suggestionsHeight: 0 });
      setIsFocused(true);
      onFocusChange?.(true);
      onSubmit?.(suggestion);
      textInputRef.current?.focus();
    },
    [onChangeText, onFocusChange, onSubmit, onSuggestionsStateChange]
  );

  const handleSubmitEditing = () => {
    if (value) {
      console.log('Submit editing with value:', value);
      setSuggestions([]);
      setSuggestionsHeight(0);
      onSuggestionsStateChange?.({ showSuggestions: false, suggestions: [], suggestionsHeight: 0 });
      setIsFocused(true);
      onFocusChange?.(true);
      onSubmit?.(value);
    }
  };

  const handleFocus = () => {
    console.log('Input focused');
    setIsFocused(true);
    onFocusChange?.(true);
    if (value) fetchSuggestions(value);
  };

  const handleBlur = () => {
    console.log('Input blurred, current value:', value);
    setIsFocused(false);
    onFocusChange?.(false);
    setTimeout(() => {
      if (!isFocused) {
        console.log('Hiding suggestions, preserving value:', value);
        setSuggestions([]);
        setSuggestionsHeight(0);
        onSuggestionsStateChange?.({ showSuggestions: false, suggestions: [], suggestionsHeight: 0 });
      }
    }, 200);
  };

  const handleCloseSuggestions = () => {
    console.log('Close suggestions, preserving value:', value);
    setSuggestions([]);
    setSuggestionsHeight(0);
    onSuggestionsStateChange?.({ showSuggestions: false, suggestions: [], suggestionsHeight: 0 });
    setIsFocused(true);
    onFocusChange?.(true);
    textInputRef.current?.focus();
  };

  return (
    <View style={[styles.container, style]}>
      <View
        style={[styles.inputWrapper, isFocused && styles.inputWrapperFocused, { zIndex: 1000 }]}
        onStartShouldSetResponder={() => true}
        onResponderRelease={() => console.log('AutocompleteInput touch captured')}
      >
        <TextInput
          ref={inputRef || textInputRef}
          style={styles.input}
          value={value}
          onChangeText={handleInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={handleSubmitEditing}
          placeholder="What are you looking for?"
          placeholderTextColor="#000"
          returnKeyType="search"
          autoFocus={false}
          blurOnSubmit={true}
        />
        {value && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleCloseSuggestions}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Close suggestions"
          >
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
        {loading && <ActivityIndicator size="small" color="#007bff" style={styles.loader} />}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
      {suggestions.length > 0 && (
        <View style={[styles.suggestionsContainer, { height: suggestionsHeight, zIndex: 999 }]}>
          <ScrollView
            ref={scrollViewRef}
            scrollEnabled={true}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={true}
            style={styles.suggestionsList}
            contentContainerStyle={styles.suggestionsContent}
            keyboardShouldPersistTaps="handled"
            onScroll={(e) => console.log('Suggestions ScrollView scrolled:', e.nativeEvent.contentOffset)}
            onContentSizeChange={(w, h) => {
              console.log(`Suggestions content size: ${w}x${h}`);
              setSuggestionsHeight(Math.min(h, 240));
              onSuggestionsStateChange?.({ showSuggestions: true, suggestions, suggestionsHeight: Math.min(h, 240) });
            }}
          >
            {suggestions.map((item, index) => (
              <TouchableOpacity
                key={`${item}-${index}`}
                style={styles.suggestionItem}
                onPress={() => {
                  console.log('TouchableOpacity pressed for suggestion:', item);
                  handleSelectSuggestion(item);
                }}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                onStartShouldSetResponder={() => true}
                onResponderRelease={() => console.log('Suggestion touch captured:', item)}
              >
                <Text style={styles.suggestionText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
  },
  inputWrapperFocused: {
    borderColor: '#007bff',
    shadowColor: '#007bff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    color: '#777',
  },
  loader: {
    marginLeft: 10,
  },
  suggestionsContainer: {
    marginTop: 4,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
    overflow: 'visible',
  },
  suggestionsList: {
    maxHeight: 240,
  },
  suggestionsContent: {
    paddingBottom: 8,
  },
  suggestionItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    height: 48,
  },
  suggestionText: {
    fontSize: 16,
    color: '#333',
  },
  errorText: {
    color: '#ff4d4d',
    fontSize: 12,
    marginTop: 4,
  },
});

export default React.memo(AutocompleteInput);