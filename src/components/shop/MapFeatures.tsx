import React, { useState, useContext } from "react";
import { View, TouchableOpacity, Text, Linking, Alert, Modal } from "react-native";
import * as Location from "expo-location";
import { MaterialIcons } from "@expo/vector-icons";
import SubscriptionProvider, { SubscriptionContext } from "../SubscriptionProvider";
import SubscriptionRequired from "../RequiredSubscription";

const ShopLocation = ({ shopLat, shopLng }) => {
  const [userLocation, setUserLocation] = useState(null);
  const { subscriptionStatus, loading } = useContext(SubscriptionContext);
  const [modalVisible, setModalVisible] = useState(false);

  console.log("Subscription Status:", subscriptionStatus);

  const handleLocationAndOpenMaps = async () => {
    // Show modal if user does not meet subscription requirement
    if (!loading && subscriptionStatus !== "standard" && subscriptionStatus !== "premium") {
      setModalVisible(true);
      return;
    }

    // Request location permission when button is clicked
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission denied", "Enable location to get directions");
      return;
    }

    let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    setUserLocation(location.coords);

    if (!location?.coords) {
      Alert.alert("Location error", "Unable to get your location");
      return;
    }

    const { latitude, longitude } = location.coords;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${latitude},${longitude}&destination=${shopLat},${shopLng}&travelmode=driving&layer=streetview`;

    Linking.openURL(url).catch(() => Alert.alert("Error", "Unable to open Google Maps"));
  };

  return (
    <>
      <TouchableOpacity
        onPress={handleLocationAndOpenMaps}
        style={{ flexDirection: "row", alignItems: "center", marginTop: 10 }}
      >
        <MaterialIcons name="location-on" size={24} color="#007BFF" />
        <Text style={{ color: "#007BFF", marginLeft: 5 }}>View in Maps</Text>
      </TouchableOpacity>

      {/* Subscription Requirement Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <SubscriptionRequired />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = {
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalCard: {
    width: "80%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  closeButton: {
    backgroundColor: "#007BFF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginTop: 15,
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 16,
  },
};

export default (props) => (
  <SubscriptionProvider>
    <ShopLocation {...props} />
  </SubscriptionProvider>
);
