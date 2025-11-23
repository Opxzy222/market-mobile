import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  Linking,
  Alert,
  Platform,
} from "react-native";
import * as Location from "expo-location";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage"; // ← NEW
import SubscriptionRequired from "../RequiredSubscription";

const ShopLocation = ({ shopLat, shopLng }) => {
  const [userLocation, setUserLocation] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  // ────── Load subscription from AsyncStorage ──────
  useEffect(() => {
    const loadSubscription = async () => {
      try {
        const cache = await AsyncStorage.getItem("subscription_cache");
        if (cache) {
          const parsed = JSON.parse(cache);
          setSubscriptionStatus(parsed.plan?.toLowerCase() || null);
        } else {
          setSubscriptionStatus(null);
        }
      } catch (error) {
        console.error("Failed to load subscription_cache:", error);
        setSubscriptionStatus(null);
      } finally {
        setSubscriptionLoading(false);
      }
    };

    loadSubscription();
  }, []);

  const handleLocationAndOpenMaps = async () => {
    console.log("Subscription Status:", subscriptionStatus);
    console.log("Subscription Loading:", subscriptionLoading);
    console.log("Modal visible (before check):", modalVisible);
    console.log("Shop Coordinates:", { shopLat, shopLng });

    // Wait for subscription to load
    if (subscriptionLoading) {
      console.log("Subscription still loading, skipping action");
      return;
    }

    // Check subscription status
    if (subscriptionStatus !== "standard" && subscriptionStatus !== "premium") {
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
      let url = googleMapsAppUrl;
      let supported = await Linking.canOpenURL(url);
      console.log("Can open Google Maps app:", supported);

      if (supported) {
        await Linking.openURL(url);
        console.log("Opened Google Maps app URL:", url);
        return;
      }

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

      url = googleMapsWebUrl;
      supported = await Linking.canOpenURL(url);
      console.log("Can open Google Maps web:", supported);
      if (supported) {
        await Linking.openURL(url);
        console.log("Opened Google Maps web URL:", url);
        return;
      }

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
        disabled={subscriptionLoading} // Optional: disable while loading
      >
        <MaterialIcons name="location-on" size={24} color="#007BFF" />
        <Text style={{ color: "#007BFF", marginLeft: 5, fontSize: 16 }}>
          {subscriptionLoading ? "Loading..." : "View in Maps"}
        </Text>
      </TouchableOpacity>

      {/* Subscription Modal */}
      <SubscriptionRequired
        visible={modalVisible}
        onClose={() => {
          console.log("Modal closed");
          setModalVisible(false);
        }}
      />
    </>
  );
};

export default ShopLocation;