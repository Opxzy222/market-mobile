import React, { useState, useCallback } from 'react';
import { Alert, Text } from 'react-native';
import * as Location from 'expo-location';
import * as Network from 'expo-network';

const GeolocationTracker = ({ onLocationUpdate, triggerLocationFetch, accuracyThreshold = 5 }) => {
  const [error, setError] = useState(null);

  // Initialize services (permissions and network)
  const initializeServices = useCallback(async () => {
    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied');
        Alert.alert('Permission Denied', 'Please enable location permissions in your device settings.');
        return false;
      }

      // Check network status for A-GPS
      const networkState = await Network.getNetworkStateAsync();
      if (!networkState.isConnected) {
        setError('No network connection. Location accuracy may be reduced.');
      }

      return true;
    } catch (err) {
      setError('Error initializing location services');
      console.error('Initialization error:', err);
      return false;
    }
  }, []);

  // Fetch location with retries
  const fetchLocation = useCallback(async () => {
    setError(null);
    const hasPermission = await initializeServices();
    if (!hasPermission) return;

    const retries = 3;
    for (let i = 0; i < retries; i++) {
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
          maximumAge: 0, // No cached data
          timeout: 10000, // 10-second timeout
        });

        const { latitude, longitude, accuracy } = location.coords;

        if (accuracy <= accuracyThreshold) {
          const locationData = { latitude, longitude, accuracy, source: 'gps' };
          onLocationUpdate(locationData);
          return;
        }
        console.warn(`Retry ${i + 1}: Accuracy ${accuracy.toFixed(1)}m too low`);
        setError(`Poor GPS accuracy: ${accuracy.toFixed(1)} meters`);
      } catch (err) {
        console.error('Location fetch error:', err);
        if (i === retries - 1) {
          setError('Unable to get accurate location after retries. Please try again outdoors.');
        }
      }
    }
  }, [onLocationUpdate, accuracyThreshold]);

  // Trigger location fetch when prop changes
  React.useEffect(() => {
    if (triggerLocationFetch) {
      fetchLocation();
    }
  }, [triggerLocationFetch, fetchLocation]);

  return (
    <>
      {error && (
        <Text style={{ color: 'red', textAlign: 'center', marginVertical: 8 }}>
          {error}
        </Text>
      )}
    </>
  );
};

export default GeolocationTracker;