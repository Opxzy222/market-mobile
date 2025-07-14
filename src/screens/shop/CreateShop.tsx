import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { SelectList } from "react-native-dropdown-select-list";
import MultiSelect from "react-native-multiple-select";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import axios from "axios";
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CreateShopScreen({ navigation }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [geoLocation, setGeoLocation] = useState({ lat: "", lng: "" });
  const [address, setAddress] = useState("");
  const [showAddressField, setShowAddressField] = useState(false); // New state for address field visibility
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategories, setSelectedSubcategories] = useState([]);
  const [geoError, setGeoError] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [sessionId, setSessionId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showGeoFields, setShowGeoFields] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [childLocations, setChildLocations] = useState([]);
  const [selectedChildLocation, setSelectedChildLocation] = useState(null);
  const [grandChildLocations, setGrandChildLocations] = useState([]);
  const [selectedGrandChildLocation, setSelectedGrandChildLocation] = useState(null);

  const router = useRouter();
  const scrollViewRef = useRef(null);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.post(
          "https://retail-alvinia-goza-f6a0e4f7.koyeb.app/category/dropdown-options/"
        );
        setCategories(
          response.data.categories.map((cat) => ({
            key: cat.id,
            value: cat.name,
          }))
        );
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    fetchCategories();
  }, []);

  // Fetch user ID
  useEffect(() => {
    const fetchSessionId = async () => {
      const sessionIdString = await AsyncStorage.getItem("sessionToken");
      setSessionId(sessionIdString);
    };

    fetchSessionId();
  }, []);

  // Fetch top-level locations
  useEffect(() => {
    const fetchTopLevelLocations = async () => {
      try {
        const response = await axios.post(
          "https://retail-alvinia-goza-f6a0e4f7.koyeb.app/location/states/"
        );
        setLocations(
          response.data.locations.map((loc) => ({
            key: loc.id,
            value: loc.name,
          }))
        );
      } catch (error) {
        console.error("Error fetching locations:", error);
      }
    };

    fetchTopLevelLocations();
  }, []);

  const handleLocationChange = async (selectedOption) => {
    setSelectedLocation(selectedOption);
    setSelectedChildLocation(null);
    setSelectedGrandChildLocation(null);

    try {
      const formData = new FormData();
      formData.append("parent_id", selectedOption);

      const response = await axios.post(
        "https://retail-alvinia-goza-f6a0e4f7.koyeb.app/location/children/",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setChildLocations(
        response.data.locations.map((loc) => ({
          key: loc.id,
          value: loc.name,
        }))
      );
    } catch (error) {
      console.error("Error fetching child locations:", error);
    }
  };

  const handleChildLocationChange = async (selectedOption) => {
    setSelectedChildLocation(selectedOption);
    setSelectedGrandChildLocation(null);

    try {
      const formData = new FormData();
      formData.append("parent_id", selectedOption);

      const response = await axios.post(
        "https://retail-alvinia-goza-f6a0e4f7.koyeb.app/location/children/",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setGrandChildLocations(
        response.data.locations.map((loc) => ({
          key: loc.id,
          value: loc.name,
        }))
      );
    } catch (error) {
      console.error("Error fetching grandchild locations:", error);
    }
  };

  const handleGrandChildLocationChange = (selectedOption) => {
    setSelectedGrandChildLocation(selectedOption);
  };

  const handleCategoryChange = async (selectedOption) => {
    setSelectedCategory(selectedOption);
    setSelectedSubcategories([]);

    try {
      const formData = new FormData();
      formData.append("parent_id", selectedOption);

      const response = await axios.post(
        "https://retail-alvinia-goza-f6a0e4f7.koyeb.app/category/subcategories/",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      setSubcategories(
        response.data.subcategories.map((subcat) => ({
          key: subcat.id,
          value: subcat.name,
        }))
      );
    } catch (error) {
      console.error("Error fetching subcategories:", error);
    }
  };

  const handlePinLocation = async () => {
    // Prompt user to stand outside
    Alert.alert(
      "Prepare for Location Detection",
      "For the best accuracy, please stand outside your business location, away from roofs or obstructions, to allow clear GPS signal reception.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Proceed",
          onPress: async () => {
            setIsDetectingLocation(true);
            try {
              // Request foreground permissions
              let { status } = await Location.requestForegroundPermissionsAsync();
              if (status !== "granted") {
                setGeoError("Permission to access location was denied.");
                Alert.alert(
                  "Location Access Denied",
                  "Please enable location permissions in your device settings to use this feature.",
                  [
                    { text: "OK", style: "cancel" },
                    {
                      text: "Open Settings",
                      onPress: () =>
                        Location.openLocationSettings?.() ||
                        Alert.alert("Error", "Unable to open settings."),
                    },
                  ]
                );
                return;
              }

              // Get current position with high accuracy and timeout
              const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
                timeInterval: 5000,
                distanceInterval: 0,
                timeout: 10000,
              });

              const { latitude, longitude } = location.coords;

              // Update geolocation state
              setGeoLocation({
                lat: latitude.toString(),
                lng: longitude.toString(),
              });
              setShowGeoFields(true);

              // Reverse geocode to get address
              let formattedAddress = "";
              try {
                const reverseGeocode = await Location.reverseGeocodeAsync({
                  latitude,
                  longitude,
                });

                if (reverseGeocode.length > 0) {
                  const { street, city, region, postalCode, country } = reverseGeocode[0];
                  formattedAddress = [street, city, region, postalCode, country]
                    .filter(Boolean)
                    .join(", ");
                  setAddress(formattedAddress || "Address detected");
                } else {
                  setAddress("Unable to fetch address. Please enter manually.");
                }
              } catch (error) {
                console.error("Error during reverse geocoding:", error);
                setAddress("Unable to fetch address. Please enter manually.");
              }

              setShowAddressField(true); // Show address field after detection
              setGeoError("");

              // Scroll to address field
              setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
              }, 100);

              // Prompt user to verify/edit address
              Alert.alert(
                "Verify Your Address",
                `We detected the following address:\n\n${formattedAddress || "No address detected."}\n\nIs this correct? If not, please edit the address in the field provided.`,
                [
                  { text: "OK", style: "default" },
                  {
                    text: "Edit Address",
                    style: "default",
                    onPress: () => {
                      // Optional: could focus the address input, but handled by scroll
                    },
                  },
                ]
              );
            } catch (error) {
              console.error("Error fetching geolocation:", error);
              let errorMessage = "An error occurred while fetching your location.";
              if (error.message.includes("timeout")) {
                errorMessage = "Location request timed out. Please try again.";
              } else if (error.message.includes("network")) {
                errorMessage = "Network error. Please check your connection and try again.";
              }
              setGeoError(errorMessage);
              Alert.alert("Error", errorMessage);
            } finally {
              setIsDetectingLocation(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleValidation = () => {
    const errors = {};
    if (!name.trim()) errors.name = "Business name is required.";
    if (!description.trim()) errors.description = "Description is required.";
    if (!address.trim()) errors.address = "Address is required.";
    if (!geoLocation.lat || !geoLocation.lng)
      errors.geoLocation = "Geolocation is required. Please pin your location.";
    if (!selectedLocation) errors.location = "Location is required.";
    if (!selectedChildLocation) errors.childLocation = "Child location is required.";
    if (!selectedGrandChildLocation)
      errors.grandChildLocation = "Grandchild location is required.";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!handleValidation() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("shop_name", name);
      formData.append("description", description);
      formData.append("geo_location", `POINT(${geoLocation.lng} ${geoLocation.lat})`);
      formData.append("address", address);
      formData.append("lga", selectedChildLocation);
      formData.append("location", selectedGrandChildLocation);

      selectedSubcategories.forEach((subId) =>
        formData.append("subcategories[]", subId)
      );

      const response = await axios.post(
        "https://retail-alvinia-goza-f6a0e4f7.koyeb.app/create-shop/",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: sessionId,
          },
        }
      );

      const shopId = response.data.shop_id;

      Alert.alert("Success", "Your space has been created!");
      router.push({ pathname: "/shop/WelcomeWorkingHours", params: { shopId: shopId } });
    } catch (error) {
      console.error("Error creating space:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputFocus = () => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 120 : 20}
    >
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
        <View style={styles.header}>
                  <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                  >
                    <MaterialIcons name="arrow-back" size={26} color="white" />
                  </TouchableOpacity>
                  <Text style={styles.headerTitle}>Create Space</Text>
                  <View style={styles.headerSpacer} />
                </View>

        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.heading}>Create Your Digital Shop</Text>

            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Input your business name"
              value={name}
              onChangeText={setName}
              onFocus={handleInputFocus}
              returnKeyType="next"
            />
            {formErrors.name && <Text style={styles.error}>{formErrors.name}</Text>}

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.description]}
              placeholder="Input business description"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              onFocus={handleInputFocus}
              returnKeyType="next"
            />
            {formErrors.description && <Text style={styles.error}>{formErrors.description}</Text>}

            <Text style={styles.label}>Category</Text>
            <SelectList
              setSelected={handleCategoryChange}
              data={categories}
              placeholder="Select Category"
              save="key"
              searchPlaceholder="Search categories"
              boxStyles={styles.dropdown}
            />

            {selectedCategory && subcategories.length > 0 && (
              <>
                <Text style={styles.label}>Subcategories</Text>
                <View style={styles.subcategoriesContainer}>
                  <MultiSelect
                    key={selectedCategory}
                    items={subcategories.map((sub) => ({
                      id: sub.key,
                      name: sub.value,
                    }))}
                    uniqueKey="id"
                    onSelectedItemsChange={setSelectedSubcategories}
                    selectedItems={selectedSubcategories}
                    selectText="Select Subcategories"
                    searchInputPlaceholderText="Search Subcategories..."
                    displayKey="name"
                    styleDropdownMenuSubsection={{
                      backgroundColor: "#fff",
                      borderColor: "#ddd",
                      borderWidth: 1,
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 18,
                      marginLeft: 10,
                    }}
                    altFontFamily="ProximaNova-Light"
                    tagRemoveIconColor="#CCC"
                    tagBorderColor="#CCC"
                    tagTextColor="#CCC"
                    selectedItemTextColor="#CCC"
                    selectedItemIconColor="#CCC"
                    itemTextColor="#000"
                    searchInputStyle={{ color: "#CCC" }}
                    submitButtonColor="#00BFA5"
                    submitButtonText="Submit"
                  />
                </View>
              </>
            )}

            <Text style={styles.label}>State</Text>
            <SelectList
              setSelected={handleLocationChange}
              data={locations}
              placeholder="Select Location"
              save="key"
              boxStyles={styles.dropdown}
            />
            {formErrors.location && <Text style={styles.error}>{formErrors.location}</Text>}

            {selectedLocation && (
              <>
                <Text style={styles.label}>Local Government</Text>
                <SelectList
                  setSelected={handleChildLocationChange}
                  data={childLocations}
                  placeholder="Select Child Location"
                  save="key"
                  boxStyles={styles.dropdown}
                />
                {formErrors.childLocation && (
                  <Text style={styles.error}>{formErrors.childLocation}</Text>
                )}
              </>
            )}

            {selectedChildLocation && (
              <>
                <Text style={styles.label}>Location</Text>
                <SelectList
                  setSelected={handleGrandChildLocationChange}
                  data={grandChildLocations}
                  placeholder="Select Grandchild Location"
                  save="key"
                  boxStyles={styles.dropdown}
                />
                {formErrors.grandChildLocation && (
                  <Text style={styles.error}>{formErrors.grandChildLocation}</Text>
                )}
              </>
            )}

            {showAddressField && (
              <>
                <Text style={styles.label}>Address</Text>
                <TextInput
                  style={[styles.input, styles.addressInput]}
                  placeholder="Edit your business address if needed"
                  value={address}
                  onChangeText={setAddress}
                  onFocus={handleInputFocus}
                  multiline
                  numberOfLines={3}
                  returnKeyType="done"
                />
                {formErrors.address && <Text style={styles.error}>{formErrors.address}</Text>}
              </>
            )}

            <View style={styles.geoSection}>
              {showGeoFields && (
                <>
                  <View style={styles.geoInputContainer}>
                    <Text style={styles.geoLabel}>Latitude</Text>
                    <TextInput
                      style={[styles.input, styles.readOnly]}
                      placeholder="Auto-filled after detection"
                      value={geoLocation.lat}
                      editable={false}
                    />
                  </View>

                  <View style={styles.geoInputContainer}>
                    <Text style={styles.geoLabel}>Longitude</Text>
                    <TextInput
                      style={[styles.input, styles.readOnly]}
                      placeholder="Auto-filled after detection"
                      value={geoLocation.lng}
                      editable={false}
                    />
                  </View>
                </>
              )}

              <TouchableOpacity
                style={[styles.pinButton, isDetectingLocation && styles.disabledButton]}
                onPress={handlePinLocation}
                disabled={isDetectingLocation}
              >
                {isDetectingLocation ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="my-location" style={styles.pinIcon} />
                    <Text style={styles.pinButtonText}>
                      {geoLocation.lat && geoLocation.lng ? "Update Location" : "Detect My Location"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              <Text style={styles.helperText}>
                Stand outside your business, away from roofs, for accurate location detection.
              </Text>
            </View>

            {geoError && <Text style={styles.error}>{geoError}</Text>}
            {formErrors.geoLocation && <Text style={styles.error}>{formErrors.geoLocation}</Text>}

            <Pressable
              style={[styles.submitButton, isSubmitting && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? "Submitting..." : "Create Business Space"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#3A7BD5',
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  backButton: {
    padding: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    flex: 1,
  },
  headerSpacer: {
    width: 42,
  },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    elevation: 4,
  },
  subcategoriesContainer: {
    marginBottom: 15,
    position: "relative",
    zIndex: 10,
    width: "100%",
  },
  heading: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
    borderColor: "#ddd",
    borderWidth: 1,
    marginBottom: 15,
    fontSize: 16,
  },
  description: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  addressInput: {
    borderColor: "#007BFF", // Highlight address field
    borderWidth: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 5,
  },
  dropdown: {
    backgroundColor: "#fff",
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
  },
  geoSection: {
    marginBottom: 15,
  },
  geoInputContainer: {
    flex: 1,
    marginBottom: 10,
  },
  geoLabel: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 5,
  },
  readOnly: {
    backgroundColor: "#e9ecef",
  },
  pinButton: {
    backgroundColor: "#007BFF",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  pinButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 5,
  },
  pinIcon: {
    fontSize: 18,
    color: "#fff",
  },
  submitButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: "#6c757d",
  },
  error: {
    color: "#FF4D4F",
    backgroundColor: "#FFF2F0",
    padding: 8,
    marginVertical: 6,
    borderRadius: 5,
    fontSize: 14,
    fontWeight: "600",
    borderWidth: 1,
    borderColor: "#FFCCC7",
  },
  helperText: {
    fontSize: 12,
    color: "#6c757d",
    marginTop: 5,
    fontStyle: "italic",
  },
});