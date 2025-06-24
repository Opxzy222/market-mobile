import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import axios from 'axios';
import { SelectList } from 'react-native-dropdown-select-list';
import AutocompleteInput from '../AutocompleteInput';
import { LinearGradient } from 'expo-linear-gradient';

const LocationSearch = ({ onSearch, onFocusChange, onSuggestionsStateChange }) => {
  const [locations, setLocations] = useState([]);
  const [childLocations, setChildLocations] = useState([]);
  const [grandChildLocations, setGrandChildLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedChildLocation, setSelectedChildLocation] = useState(null);
  const [selectedGrandChildLocation, setSelectedGrandChildLocation] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const inputRef = useRef(null);

  useEffect(() => {
    const fetchTopLevelLocations = async () => {
      try {
        const response = await axios.post('https://retail-alvinia-goza-f6a0e4f7.koyeb.app/location/states/');
        setLocations(response.data.locations.map(loc => ({ key: loc.id, value: loc.name })));
      } catch (error) {
        console.error('Error fetching locations:', error);
      }
    };
    fetchTopLevelLocations();
  }, []);

  const handleLocationChange = async (selectedOption) => {
    console.log('State selected:', selectedOption);
    setSelectedLocation(selectedOption);
    setSelectedChildLocation(null);
    setSelectedGrandChildLocation(null);
    setChildLocations([]);
    setGrandChildLocations([]);

    if (selectedOption) {
      try {
        const formData = new FormData();
        formData.append('parent_id', selectedOption);

        const response = await axios.post(
          'https://retail-alvinia-goza-f6a0e4f7.koyeb.app/location/children/',
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );

        setChildLocations(response.data.locations.map(loc => ({ key: loc.id, value: loc.name })));
      } catch (error) {
        console.error('Error fetching child locations:', error);
      }
    }
  };

  const handleChildLocationChange = async (selectedOption) => {
    console.log('LGA selected:', selectedOption);
    setSelectedChildLocation(selectedOption);
    setSelectedGrandChildLocation(null);
    setGrandChildLocations([]);

    if (selectedOption) {
      try {
        const formData = new FormData();
        formData.append('parent_id', selectedOption);

        const response = await axios.post(
          'https://retail-alvinia-goza-f6a0e4f7.koyeb.app/location/children/',
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );

        setGrandChildLocations(response.data.locations.map((loc) => ({ key: loc.id, value: loc.name })));
      } catch (error) {
        console.error('Error fetching grandchild locations:', error);
      }
    }
  };

  const handleGrandChildLocationChange = (selectedOption) => {
    console.log('Town selected:', selectedOption);
    setSelectedGrandChildLocation(selectedOption);
  };

  const handleSearch = useCallback(
    async (query) => {
      setFormErrors([]);
      const locationId = selectedGrandChildLocation || selectedChildLocation || selectedLocation;

      if (!locationId) {
        setFormErrors(prev => ({ ...prev, error: 'Please select a location' }));
        return;
      }
      if (!query.trim()) {
        setFormErrors(prev => ({ prevErrors, searchTerm: 'Please enter a search term' }));
        return;
      }

      setLoading(true);
    try {
      const response = await axios.get("https://retail-alvinia-goza-f6a0e4f7.koyeb.app/location/search/", {
        params: { location_id: locationId, input: query.trim() }
      });

        onSearch(response.data);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setLoading(false);
      }
    },
    [selectedLocation, selectedChildLocation, selectedGrandChildLocation, onSearch]
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#E3F2FD', '#BBDEFB']} style={styles.gradient}>
        <View style={styles.card}>
          
          {formErrors.location && <Text style={styles.error}>{formErrors.location}</Text>}
          <Text style={styles.label}>Select State</Text>
          <View style={styles.dropdownContainer}>
            <SelectList
              setSelected={handleLocationChange}
              data={locations}
              placeholder="Select State"
              save="key"
              boxStyles={styles.dropdown}
              inputStyles={styles.dropdownInput}
              dropdownStyles={styles.dropdownMenu}
              onSelect={() => console.log('State dropdown interacted')}
            />
          </View>
          {selectedLocation && (
            <>
              <Text style={styles.label}>Select Local Government</Text>
              <View style={styles.dropdownContainer}>
                <SelectList
                  setSelected={handleChildLocationChange}
                  data={childLocations}
                  placeholder="Select LGA"
                  save="key"
                  boxStyles={styles.dropdown}
                  inputStyles={styles.dropdownInput}
                  dropdownStyles={styles.dropdownMenu}
                  onSelect={() => console.log('LGA dropdown interacted')}
                />
              </View>
            </>
          )}
          {selectedChildLocation && (
            <>
              <Text style={styles.label}>Select Town/Area</Text>
              <View style={styles.dropdownContainer}>
                <SelectList
                  setSelected={handleGrandChildLocationChange}
                  data={grandChildLocations}
                  placeholder="Select Locality"
                  save="key"
                  boxStyles={styles.dropdown}
                  inputStyles={styles.dropdownInput}
                  dropdownStyles={styles.dropdownMenu}
                  onSelect={() => console.log('Town dropdown interacted')}
                />
              </View>
              {formErrors.searchTerm && <Text style={styles.error}>{formErrors.searchTerm}</Text>}
          <View
            style={styles.inputContainer}
            onStartShouldSetResponder={() => {}}
            onResponderRelease={() => console.log('AutocompleteInput touch captured')}
          >
            
          </View>
            </>
          )}
          <AutocompleteInput
              value={searchTerm}
              onChangeText={setSearchTerm}
              onSubmit={handleSearch}
              style={styles.input}
              onFocusChange={onFocusChange}
              inputRef={inputRef}
              onSuggestionsStateChange={onSuggestionsStateChange}
            />
          <TouchableOpacity
            style={[styles.searchButton, loading && styles.searchButtonDisabled]}
            onPress={() => handleSearch(searchTerm)}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.searchButtonText}>Search</Text>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
    zIndex: 1000,
  },
  inputContainer: {
    zIndex: 1001, // Above card
  },
  input: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    marginTop: 12,
  },
  dropdownContainer: {
    zIndex: 999, // Below input, above card
  },
  dropdown: {
    backgroundColor: '#fff',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 48,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  dropdownInput: {
    fontSize: 16,
    color: '#333',
  },
  dropdownMenu: {
    backgroundColor: '#fff',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
    zIndex: 999,
  },
  error: {
    color: 'red',
    fontSize: 12,
    marginBottom: 8,
  },
  searchButton: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  searchButtonDisabled: {
    backgroundColor: '#A7C7E7',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default LocationSearch;