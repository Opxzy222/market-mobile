import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, Linking, Alert } from 'react-native';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';

const ShopLocation = ({ shopLat, shopLng }) => {
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    const getUserLocation = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Enable location to get directions');
        return;
      }
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setUserLocation(location.coords);
    };

    getUserLocation();
  }, []);

  const openGoogleMaps = () => {
    if (!userLocation) {
      Alert.alert('Location error', 'Unable to get your location');
      return;
    }
    const { latitude, longitude } = userLocation;
    console.log('lol', latitude)
    console.log('uiy', longitude)
    const url = `https://www.google.com/maps/dir/?api=1&origin=${latitude},${longitude}&destination=${shopLat},${shopLng}&travelmode=driving&layer=streetview`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Unable to open Google Maps'));
  };

  return (
    <TouchableOpacity onPress={openGoogleMaps} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
      <MaterialIcons name="location-on" size={24} color="#007BFF" />
      <Text style={{ color: '#007BFF', marginLeft: 5 }}>View in Maps</Text>
    </TouchableOpacity>
  );
};

export default ShopLocation;
