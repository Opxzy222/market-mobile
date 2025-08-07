import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import axios from 'axios';
import { SelectList } from 'react-native-dropdown-select-list';
import AutocompleteInput from '../AutocompleteInput';
import { useRouter } from 'expo-router';

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
  const router = useRouter();

  useEffect(() => {
    const fetchTopLevelLocations = async () => {
      try {
        const response = await axios.post('https://retail-alvinia-goza-f6a0e4f7.koyeb.app/location/states/');
        console.log('Top-level locations response:', response.data);
        setLocations(response.data.locations.map(loc => ({ key: loc.id, value: loc.name })));
      } catch (error) {
        console.error('Error fetching top-level locations:', error.message, error.response?.data);
        setFormErrors({ fetch: 'Failed to load locations. Please try again.' });
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
        console.log('Child locations response:', response.data);
        setChildLocations(response.data.locations.map(loc => ({ key: loc.id, value: loc.name })));
      } catch (error) {
        console.error('Error fetching child locations:', error.message, error.response?.data);
        setFormErrors({ fetch: 'Failed to load child locations. Please try again.' });
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
        console.log('Grandchild locations response:', response.data);
        setGrandChildLocations(response.data.locations.map(loc => ({ key: loc.id, value: loc.name })));
      } catch (error) {
        console.error('Error fetching grandchild locations:', error.message, error.response?.data);
        setFormErrors({ fetch: 'Failed to load grandchild locations. Please try again.' });
      }
    }
  };

  const handleGrandChildLocationChange = (selectedOption) => {
    console.log('Town selected:', selectedOption);
    setSelectedGrandChildLocation(selectedOption);
  };

  const handleSearch = useCallback(
    async (query) => {
      setFormErrors({});
      console.log('handleSearch triggered with query:', query);
      const locationId = selectedChildLocation || selectedGrandChildLocation || selectedLocation;

      if (!locationId) {
        console.warn('No location or LGA selected');
        setFormErrors({ location: 'Please select a state, LGA, or town' });
        setLoading(false);
        return;
      }
      if (!query || !query.trim()) {
        console.warn('No search term provided');
        setFormErrors({ searchTerm: 'Please enter a search term' });
        setLoading(false);
        return;
      }

      const trimmedQuery = query.trim();
      setLoading(true);
      console.log('Sending request to backend with params:', { location_id: locationId, input: trimmedQuery });

      try {
        const params = { input: trimmedQuery, location_id: locationId };

        const response = await axios.get('https://retail-alvinia-goza-f6a0e4f7.koyeb.app/location/search/', {
          params,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          timeout: 10000,
        });

        console.log('Search response:', JSON.stringify(response.data, null, 2));

        if (response.data.error) {
          console.error('Backend error:', response.data.error);
          setFormErrors({ search: response.data.error });
          Alert.alert('Error', response.data.error);
          setLoading(false);
          return;
        }

        const shops = Array.isArray(response.data) ? response.data : response.data.shops || [];
        if (shops.length === 0) {
          console.log('No shops found for query:', trimmedQuery, 'locationId:', locationId);
          Alert.alert('No Results', 'No shops found for your search.');
          setLoading(false);
          return;
        }

        // Limit shops to 50 to reduce navigation payload
        const limitedShops = shops.slice(0, 50);
        await onSearch(limitedShops);
        console.log('Navigating to SearchResult with query:', trimmedQuery, 'shops:', limitedShops.length);
        router.push({
          pathname: '/shop/SearchResult',
          params: { searchTerm: trimmedQuery, shops: JSON.stringify(limitedShops) },
        });
      } catch (error) {
        console.error('Search failed:', error.message, error.response?.data, error.response?.status);
        setFormErrors({ search: 'Search failed. Please check your connection and try again.' });
        Alert.alert('Error', 'Failed to fetch search results. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [selectedLocation, selectedChildLocation, selectedGrandChildLocation, onSearch, router]
  );

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {formErrors.location && <Text style={styles.error}>{formErrors.location}</Text>}
        {formErrors.fetch && <Text style={styles.error}>{formErrors.fetch}</Text>}
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
          </>
        )}
        {formErrors.searchTerm && <Text style={styles.error}>{formErrors.searchTerm}</Text>}
        {formErrors.search && <Text style={styles.error}>{formErrors.search}</Text>}
        <AutocompleteInput
          value={searchTerm}
          onChangeText={setSearchTerm}
          onSubmit={handleSearch}
          onSearch={handleSearch}
          loading={loading}
          style={styles.input}
          onFocusChange={onFocusChange}
          inputRef={inputRef}
          onSuggestionsStateChange={onSuggestionsStateChange}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
    zIndex: 1000,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    marginTop: 12,
  },
  dropdownContainer: {
    zIndex: 999,
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
  input: {
    marginBottom: 12,
  },
  error: {
    color: 'red',
    fontSize: 12,
    marginBottom: 8,
  },
});

export default LocationSearch;