import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  TextInput,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import debounce from 'lodash.debounce';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { initializeDatabase, getSuggestions, cacheSuggestions, getSuggestionsCount } from '../storage/storage';
import api from '../api';

const TOTAL_SUGGESTIONS = 163000; // Total number of suggestions
const PROCESSING_BATCH_SIZE = 1000; // Batch size for processing suggestions

const AutocompleteInput = ({
  value,
  onChangeText,
  onSubmit,
  style,
  onFocusChange,
  inputRef,
  onSuggestionsStateChange,
  onSearch,
  loading,
  onPopulationStateChange,
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [error, setError] = useState(null);
  const [suggestionsHeight, setSuggestionsHeight] = useState(0);
  const [isPopulating, setIsPopulating] = useState(false);
  const [progress, setProgress] = useState(0);
  const scrollViewRef = useRef(null);
  const textInputRef = useRef(null);
  const lastProgressRef = useRef(0); // Track last reported progress

  useEffect(() => {
    const init = async () => {
      try {
        await initializeDatabase();
        console.log('Database initialized, checking suggestions');
        const count = await getSuggestionsCount();
        if (count < 160000) {
          console.log('Populating initial suggestions');
          await populateInitialSuggestions();
        } else {
          console.log('Suggestions sufficiently populated, count:', count);
        }
      } catch (err) {
        console.error('Initialization failed:', err);
        setError('Failed to initialize database');
        await populateInitialSuggestions(true);
      }
    };
    init();
  }, []);

  const populateInitialSuggestions = async (forceFetch = false) => {
    try {
      const count = await getSuggestionsCount();
      console.log('Suggestions count:', count);
      if (!forceFetch && count >= TOTAL_SUGGESTIONS) {
        console.log('Suggestions sufficiently populated, skipping fetch');
        return;
      }

      setIsPopulating(true);
      setProgress(0);
      lastProgressRef.current = 0;
      onPopulationStateChange?.({ isPopulating: true, progress: 0 });

      const response = await api.get('/all-suggestions/', {
        timeout: 60000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'market-mobile/1.0.0',
        },
        validateStatus: (status) => status >= 200 && status < 300,
      });

      const rawSuggestions = [];
      for (let i = 0; i < response.data.suggestions.length; i += PROCESSING_BATCH_SIZE) {
        const batch = response.data.suggestions.slice(i, i + PROCESSING_BATCH_SIZE);
        const processedBatch = batch
          .map((item, index) => {
            const globalIndex = i + index + 1;
            const currentProgress = (globalIndex / TOTAL_SUGGESTIONS) * 100;
            const roundedProgress = Math.min(Math.round(currentProgress * 10) / 10, 99);
            // Stricter check to avoid duplicates
            if (roundedProgress > lastProgressRef.current + 0.099) {
              setProgress(roundedProgress);
              onPopulationStateChange?.({ isPopulating: true, progress: roundedProgress });
              lastProgressRef.current = roundedProgress;
              console.log('Population state changed:', { isPopulating: true, progress: roundedProgress });
            }

            if (item && typeof item.name === 'string') {
              const trimmed = item.name.trim();
              return trimmed.length > 0 ? trimmed : null;
            }
            console.warn(`Invalid suggestion item at index ${globalIndex - 1}:`, item);
            return null;
          })
          .filter((name) => name);

        rawSuggestions.push(...processedBatch);
        await new Promise((resolve) => setTimeout(resolve, 10)); // Yield for UI
      }

      const finalSuggestions = rawSuggestions.slice(0, TOTAL_SUGGESTIONS);
      
      await cacheSuggestions(finalSuggestions);
      console.log('Suggestions cached successfully in SQLite');
      setProgress(100);
      onPopulationStateChange?.({ isPopulating: true, progress: 100 });
      lastProgressRef.current = 100;

      setTimeout(() => {
        setIsPopulating(false);
        setProgress(0);
        lastProgressRef.current = 0;
        onPopulationStateChange?.({ isPopulating: false, progress: 0 });
      }, 500);
    } catch (error) {
      console.error('Error populating suggestions:', error);
      setError(`Failed to load suggestions: ${error.response?.status || 'Network error'}`);
      setIsPopulating(false);
      setProgress(0);
      lastProgressRef.current = 0;
      onPopulationStateChange?.({ isPopulating: false, progress: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSuggestions = useCallback(
    debounce(async (input) => {
      if (!input || input.length < 1) {
        setSuggestions([]);
        setError(null);
        return;
      }
      setIsLoading(true);
      try {
        let results = await getSuggestions(input, 20, 0);
        if (results.length === 0) {
          console.log('No SQLite suggestions, fetching from backend');
          const response = await api.get('/all-suggestions/', {
            timeout: 60000,
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'User-Agent': 'market-mobile/1.0.0',
            },
            validateStatus: (status) => status >= 200 && status < 300,
          });

          const rawSuggestions = response.data.suggestions
            .map((item) => (item && typeof item.name === 'string' && item.name.trim().length > 0 ? item.name.trim() : null))
            .filter((name) => name)
            .filter((name) => name.toLowerCase().startsWith(input.toLowerCase()))
            .slice(0, 20);

          if (rawSuggestions.length > 0) {
            await cacheSuggestions(rawSuggestions);
            console.log('Cached backend suggestions in SQLite');
          }
          results = rawSuggestions;
        }
        setSuggestions(results);
        setError(null);
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
    onChangeText(text);
    fetchSuggestions(text);
  };

  const handleSelectSuggestion = useCallback(
    (suggestion) => {
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
      setSuggestions([]);
      setSuggestionsHeight(0);
      onSuggestionsStateChange?.({ showSuggestions: false, suggestions: [], suggestionsHeight: 0 });
      setIsFocused(true);
      onFocusChange?.(true);
      onSubmit?.(value);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    onFocusChange?.(true);
    if (value) fetchSuggestions(value);
  };

  const handleBlur = () => {
    setIsFocused(false);
    onFocusChange?.(false);
    setTimeout(() => {
      if (!isFocused) {
        setSuggestions([]);
        setSuggestionsHeight(0);
        onSuggestionsStateChange?.({ showSuggestions: false, suggestions: [], suggestionsHeight: 0 });
      }
    }, 200);
  };

  const handleClear = () => {
    onChangeText('');
    setSuggestions([]);
    setSuggestionsHeight(0);
    onSuggestionsStateChange?.({ showSuggestions: false, suggestions: [], suggestionsHeight: 0 });
    setIsFocused(true);
    onFocusChange?.(true);
    textInputRef.current?.focus();
  };

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.inputWrapper, isFocused && styles.inputWrapperFocused, { zIndex: 1000 }]}>
        <TextInput
          ref={inputRef || textInputRef}
          style={styles.input}
          value={value}
          onChangeText={handleInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={handleSubmitEditing}
          placeholder="What are you looking for?"
          placeholderTextColor="#5A5A5A"
          returnKeyType="search"
          autoFocus={false}
          blurOnSubmit={true}
        />
        {value && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClear}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Clear input"
          >
            <Ionicons name="close-circle" size={20} color="#777" />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.searchButton, loading && styles.searchButtonDisabled]}
          onPress={() => onSearch?.(value)}
          disabled={loading}
          activeOpacity={0.8}
          accessibilityLabel="Search"
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="search" size={20} color="#fff" />
          )}
        </TouchableOpacity>
        {/*{isLoading && <ActivityIndicator size="small" color="#007bff" style={styles.loader} />} */}
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
    height: 48,
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
    paddingRight: 8,
  },
  clearButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButton: {
    backgroundColor: '#007bff',
    borderRadius: 6,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  searchButtonDisabled: {
    backgroundColor: '#A7C7E7',
  },
  loader: {
    marginLeft: 8,
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