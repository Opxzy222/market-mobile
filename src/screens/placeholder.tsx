import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
} from "react-native";
import { SelectList } from "react-native-dropdown-select-list";
import { MultiSelect } from "react-multi-select-component";
import * as Location from "expo-location";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from "expo-router";
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import axios from "axios";

export default function CreateShopScreen({ navigation }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [geoLocation, setGeoLocation] = useState({ lat: "", lng: "" });
  const [address, setAddress] = useState("");
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategories, setSelectedSubcategories] = useState([]);
  const [geoError, setGeoError] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [userId, setUserId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.post(
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

  useEffect(() => {
    const fetchUserId = async () => {
      const userIdString = await AsyncStorage.getItem("user_id");
      setUserId(parseInt(userIdString, 10));
    };

    fetchUserId();
  }, []);

  const handleCategoryChange = async (selectedOption) => {
    setSelectedCategory(selectedOption);

    try {
      const formData = new FormData();
      formData.append("parent_id", selectedOption);

      const response = await api.post(
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
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setGeoError("Permission to access location was denied.");
        Alert.alert(
          "Location Access Denied",
          "Please enable location permissions in your device settings."
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setGeoLocation({
        lat: location.coords.latitude.toString(),
        lng: location.coords.longitude.toString(),
      });

      setGeoError(""); // Clear any previous errors
      Alert.alert("Location Pinned", "Coordinates added successfully.");
    } catch (error) {
      console.error("Error fetching geolocation:", error);
      setGeoError("An error occurred while fetching your location.");
    }
  };

  const handleValidation = () => {
    const errors = {};
    if (!name.trim()) errors.name = "Shop name is required.";
    if (!description.trim()) errors.description = "Description is required.";
    if (!address.trim()) errors.address = "Address is required.";
    if (!geoLocation.lat || !geoLocation.lng)
      errors.geoLocation = "Geolocation is required. Please pin your location.";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!handleValidation() || isSubmitting) return;
  
    setIsSubmitting(true); // Disable further submissions
    try {
      const formData = new FormData();
      formData.append("shop_name", name);
      formData.append("description", description);
      formData.append("geo_location", `POINT(${geoLocation.lng} ${geoLocation.lat})`);
      formData.append("address", address);
      formData.append("shop_owner", userId);
  
      selectedSubcategories.forEach((sub) =>
        formData.append("subcategories[]", sub.value)
      );
  
      const response = await api.post(
        "https://retail-alvinia-goza-f6a0e4f7.koyeb.app/create-shop/",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
  
      Alert.alert("Success", "Your shop has been created!", [
        { text: "OK", onPress: () => navigation.navigate("shop") },
      ]);
    } catch (error) {
      console.error("Error creating shop:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false); // Allow future submissions
    }
  };

  return (
    <View>
      <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#007BFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Back</Text>
        </View>
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.heading}>Create Your Digital Shop</Text>

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Input shop name"
          value={name}
          onChangeText={setName}
        />
        {formErrors.name && <Text style={styles.error}>{formErrors.name}</Text>}

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.description]}
          placeholder="Input Shop Description"
          value={description}
          onChangeText={setDescription}
          multiline
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
            <MultiSelect
              options={subcategories.map((sub) => ({
                label: sub.value,
                value: sub.key,
              }))}
              value={selectedSubcategories}
              onChange={setSelectedSubcategories}
              labelledBy="Select Subcategories"
            />
          </>
        )}

        <Text style={styles.label}>Address</Text>
        <TextInput
          style={styles.input}
          placeholder="Input your shop address"
          value={address}
          onChangeText={setAddress}
        />
        {formErrors.address && <Text style={styles.error}>{formErrors.address}</Text>}

        <View style={styles.geoSection}>
          <View style={styles.geoInputContainer}>
            <Text style={styles.geoLabel}>Latitude</Text>
            <TextInput
              style={[styles.input, styles.readOnly]}
              placeholder="Latitude"
              value={geoLocation.lat}
              editable={false}
            />
          </View>
          <View style={styles.geoInputContainer}>
            <Text style={styles.geoLabel}>Longitude</Text>
            <TextInput
              style={[styles.input, styles.readOnly]}
              placeholder="Longitude"
              value={geoLocation.lng}
              editable={false}
            />
          </View>

          <TouchableOpacity style={styles.pinButton} onPress={handlePinLocation}>
            <Text style={styles.pinButtonText}>Pin Location</Text>
          </TouchableOpacity>
        </View>
        {geoError && <Text style={styles.error}>{geoError}</Text>}
        {formErrors.geoLocation && <Text style={styles.error}>{formErrors.geoLocation}</Text>}

        <Pressable
  style={[
    styles.submitButton,
    isSubmitting && styles.disabledButton,
  ]}
  onPress={handleSubmit}
  disabled={isSubmitting}
>
  <Text style={styles.submitButtonText}>
    {isSubmitting ? "Submitting..." : "Create Shop"}
  </Text>
</Pressable>

      </View>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: "#f9f9f9" },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
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
    zIndex: 10, // Ensure dropdown stays above other components
    width: "100%", // Ensure it takes up the full width of the parent
  },
  
  heading: { fontSize: 22, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
    borderColor: "#ddd",
    borderWidth: 1,
    marginBottom: 15,
  },
  description: { height: 100, textAlignVertical: "top" },
  label: { fontSize: 14, fontWeight: "bold", marginBottom: 5 },
  labels: { fontSize: 14, fontWeight: "bold", marginBottom: 5, marginTop: 12 },
  dropdown: {
    backgroundColor: "#fff",
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 8,
  },
  
  geoInputContainer: { flex: 1, marginRight: 10 },
  geoLabel: { fontSize: 14, fontWeight: "bold", marginBottom: 5 },
  geoInput: { width: "100%" },
  readOnly: { backgroundColor: "#e9ecef" },
  pinButton: {
    backgroundColor: "#007BFF",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  pinButtonText: { color: "#fff", fontWeight: "bold" },
  submitButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20, // Ensure spacing between buttons
  },
  submitButtonText: { color: "#fff", fontWeight: "bold" },
  error: {
    color: '#FF4D4F', // Modern red shade for error
    backgroundColor: '#FFF2F0', // Subtle red background for better visibility
    padding: 8, // Add some padding for readability
    marginVertical: 6, // Add spacing between errors and other elements
    borderRadius: 5, // Rounded corners for a modern feel
    fontSize: 14, // Standard font size for legibility
    fontWeight: '600', // Slightly bold for emphasis
    borderWidth: 1, // Optional: Add a border for definition
    borderColor: '#FFCCC7', // Match the border with the background
  },
});