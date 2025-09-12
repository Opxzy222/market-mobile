import React, { useState, useContext } from "react";
import { View, TouchableOpacity, Text, Linking, Alert, Platform } from "react-native";
import * as Location from "expo-location";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import SubscriptionProvider, { SubscriptionContext } from "../SubscriptionProvider";
import SubscriptionRequired from "../RequiredSubscription";

const ShopLocation = ({ shopLat, shopLng }) => {
  const [userLocation, setUserLocation] = useState(null);
  const { subscriptionStatus, loading } = useContext(SubscriptionContext);
  const [modalVisible, setModalVisible] = useState(false);

  const handleLocationAndOpenMaps = async () => {
    console.log("Subscription Status:", subscriptionStatus);
    console.log("Modal visible (before check):", modalVisible);
    console.log("Shop Coordinates:", { shopLat, shopLng });

    // Check subscription status
    if (!loading && subscriptionStatus !== "standard" && subscriptionStatus !== "premium") {
      console.log("Subscription check failed, showing modal");
      setModalVisible(true);
      return;
    }

    // Validate shop coordinates
    if (!shopLat || !shopLng || isNaN(shopLat) || isNaN(shopLng)) {
      console.log("Invalid shop coordinates:", { shopLat, shopLng });
      Alert.alert("Error", "Invalid shop location coordinates");
      return;
    }

    // Request location permission
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      console.log("Location permission denied");
      Alert.alert("Permission denied", "Please enable location to get directions");
      return;
    }

    // Get user location
    let location;
    try {
      location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      console.log("User location:", location.coords);
    } catch (error) {
      console.log("Location error:", error.message);
      Alert.alert("Location error", "Unable to get your location");
      return;
    }

    if (!location?.coords) {
      console.log("No coordinates found");
      Alert.alert("Location error", "Unable to get your location");
      return;
    }

    const { latitude, longitude } = location.coords;

    // Construct URLs
    const googleMapsAppUrl = `comgooglemaps://?saddr=${latitude},${longitude}&daddr=${shopLat},${shopLng}&directionsmode=driving`;
    const googleMapsWebUrl = `https://maps.google.com/?saddr=${latitude},${longitude}&daddr=${shopLat},${shopLng}`;
    const appleMapsUrl = `maps://?saddr=${latitude},${longitude}&daddr=${shopLat},${shopLng}&dirflg=d`;

    console.log("Google Maps App URL:", googleMapsAppUrl);
    console.log("Google Maps Web URL:", googleMapsWebUrl);
    console.log("Apple Maps URL:", appleMapsUrl);

    try {
      // Prioritize Google Maps app
      let url = googleMapsAppUrl;
      let supported = await Linking.canOpenURL(url);
      console.log("Can open Google Maps app:", supported);

      if (supported) {
        await Linking.openURL(url);
        console.log("Opened Google Maps app URL:", url);
        return;
      }

      // Fallback to Apple Maps on iOS
      if (Platform.OS === "ios") {
        url = appleMapsUrl;
        supported = await Linking.canOpenURL(url);
        console.log("Can open Apple Maps:", supported);
        if (supported) {
          await Linking.openURL(url);
          console.log("Opened Apple Maps URL:", url);
          return;
        }
      }

      // Fallback to Google Maps web URL
      url = googleMapsWebUrl;
      supported = await Linking.canOpenURL(url);
      console.log("Can open Google Maps web:", supported);
      if (supported) {
        await Linking.openURL(url);
        console.log("Opened Google Maps web URL:", url);
        return;
      }

      // No supported apps
      console.log("No supported map apps found");
      Alert.alert("Error", "No map application available on this device");
    } catch (error) {
      console.log("Linking error:", error.message);
      Alert.alert("Error", "Unable to open maps: " + error.message);
    }
  };

  return (
    <>
      <TouchableOpacity
        onPress={handleLocationAndOpenMaps}
        style={{ flexDirection: "row", alignItems: "center", marginTop: 5 }}
      >
        <MaterialIcons name="location-on" size={24} color="#007BFF" />
        <Text style={{ color: "#007BFF", marginLeft: 5, fontSize: 16 }}>View in Maps</Text>
      </TouchableOpacity>

      {/* Render SubscriptionRequired directly when modalVisible is true */}
      {modalVisible && (
        <SubscriptionRequired
          onClose={() => {
            console.log("Modal closed via SubscriptionRequired");
            setModalVisible(false);
          }}
        />
      )}
    </>
  );
};

export default (props) => (
  <SubscriptionProvider>
    <ShopLocation {...props} />
  </SubscriptionProvider>
);