import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
  Modal,
  Dimensions,
} from "react-native";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useFocusEffect } from "expo-router";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import api from '../../api';
import { SafeAreaView } from "react-native-safe-area-context";
import { SelectList } from "react-native-dropdown-select-list";
import { MultiSelect as RNMultiSelect } from "react-native-element-dropdown";

export default function CreateShopScreen() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [geoLocation, setGeoLocation] = useState({ lat: "", lng: "" });
  const [address, setAddress] = useState("");
  const [showAddressField, setShowAddressField] = useState(false);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState("");
  const [selectedSubcategories, setSelectedSubcategories] = useState([]);
  const [geoError, setGeoError] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [sessionId, setSessionId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showGeoFields, setShowGeoFields] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [childLocations, setChildLocations] = useState([]);
  const [selectedChildLocation, setSelectedChildLocation] = useState(null);
  const [grandChildLocations, setGrandChildLocations] = useState([]);
  const [selectedGrandChildLocation, setSelectedGrandChildLocation] = useState(null);
  const [locationDetected, setLocationDetected] = useState(false); // NEW: hide button after detection

  const router = useRouter();
  const flatListRef = useRef(null);
  const dropdownRef = useRef(null);
  const subcategorySectionRef = useRef(null);
  const addressInputRef = useRef(null);

  const sectionHeights = useRef({
    name: 100,
    description: 150,
    category: 80,
    subcategories: 100,
    state: 80,
    childLocation: 80,
    grandChildLocation: 80,
    address: 120,
    geo: 150,
    submit: 80,
  }).current;

  // Fetch session ID
  useEffect(() => {
    const fetchSessionId = async () => {
      try {
        const sessionIdString = await AsyncStorage.getItem("sessionToken");
        setSessionId(sessionIdString);
      } catch (err) {
        console.error("Error fetching session ID:", err);
      }
    };
    fetchSessionId();
  }, []);

  // Fetch categories and locations on focus
  useFocusEffect(
    useCallback(() => {
      const fetchCategories = async () => {
        try {
          const response = await api.post("/category/dropdown-options/");
          const categoryData = response.data.categories.map((cat) => ({
            key: cat.id,
            value: cat.name,
          }));
          const sortedCategories = categoryData.sort((a, b) => a.value.localeCompare(b.value));
          setCategories(sortedCategories);
          setFilteredCategories(sortedCategories);
        } catch (error) {
          console.error("Error fetching categories:", error);
        }
      };

      const fetchTopLevelLocations = async () => {
        try {
          const response = await api.post("/location/states/");
          const sortedLocations = response.data.locations
            .map((loc) => ({ key: loc.id, value: loc.name }))
            .sort((a, b) => a.value.localeCompare(b.value));
          setLocations(sortedLocations);
        } catch (error) {
          console.error("Error fetching locations:", error);
        }
      };

      fetchCategories();
      fetchTopLevelLocations();
    }, [])
  );

  // Filter categories
  useEffect(() => {
    setFilteredCategories(
      categories.filter((cat) =>
        cat.value.toLowerCase().includes(categorySearch.toLowerCase())
      )
    );
  }, [categorySearch, categories]);

  // Handle location changes
  const handleLocationChange = useCallback(async (selectedOption) => {
    setSelectedLocation(selectedOption);
    setSelectedChildLocation(null);
    setChildLocations([]);
    setSelectedGrandChildLocation(null);
    setGrandChildLocations([]);

    if (selectedOption) {
      try {
        const formData = new FormData();
        formData.append("parent_id", selectedOption);
        const response = await api.post("/location/children/", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const sortedChildLocations = response.data.locations
          .map((loc) => ({ key: loc.id, value: loc.name }))
          .sort((a, b) => a.value.localeCompare(b.value));
        setChildLocations(sortedChildLocations);
      } catch (error) {
        console.error("Error fetching child locations:", error);
        setChildLocations([]);
      }
    }
  }, []);

  const handleChildLocationChange = useCallback(async (selectedOption) => {
    setSelectedChildLocation(selectedOption);
    setSelectedGrandChildLocation(null);
    setGrandChildLocations([]);

    if (selectedOption) {
      try {
        const formData = new FormData();
        formData.append("parent_id", selectedOption);
        const response = await api.post("/location/children/", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const sortedGrandChildLocations = response.data.locations
          .map((loc) => ({ key: loc.id, value: loc.name }))
          .sort((a, b) => a.value.localeCompare(b.value));
        setGrandChildLocations(sortedGrandChildLocations);
      } catch (error) {
        console.error("Error fetching grandchild locations:", error);
        setGrandChildLocations([]);
      }
    }
  }, []);

  const handleGrandChildLocationChange = useCallback((selectedOption) => {
    setSelectedGrandChildLocation(selectedOption);
  }, []);

  const handleCategoryChange = useCallback(async (key, value) => {
    setSelectedCategory(key);
    setSelectedCategoryName(value);
    setModalVisible(false);
    setCategorySearch("");
    setSelectedSubcategories([]);

    try {
      const formData = new FormData();
      formData.append("parent_id", key);
      const response = await api.post("/category/subcategories/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const sortedSubcategories = response.data.subcategories
        .map((subcat) => ({ key: subcat.id, value: subcat.name }))
        .sort((a, b) => a.value.localeCompare(b.value));
      setSubcategories(sortedSubcategories);

      setTimeout(() => {
        const index = formSections.findIndex((s) => s.id === "subcategories");
        if (flatListRef.current && index !== -1) {
          flatListRef.current.scrollToIndex({ index, animated: true });
        }
      }, 100);
    } catch (error) {
      console.error("Error fetching subcategories:", error);
      setSubcategories([]);
    }
  }, []);

  const handlePinLocation = useCallback(async () => {
    Alert.alert(
      "Prepare for Location Detection",
      "For the best accuracy, please stand outside your business location, away from roofs or obstructions.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Proceed",
          onPress: async () => {
            setIsDetectingLocation(true);
            try {
              const { status } = await Location.requestForegroundPermissionsAsync();
              if (status !== "granted") {
                setGeoError("Permission denied.");
                Alert.alert("Location Access Denied", "Enable in settings.", [
                  { text: "OK" },
                  { text: "Open Settings", onPress: () => Location.openLocationSettings?.() },
                ]);
                return;
              }

              const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
                timeout: 15000,
              });

              const { latitude, longitude } = location.coords;
              setGeoLocation({ lat: latitude.toString(), lng: longitude.toString() });
              setShowGeoFields(true);
              setLocationDetected(true);

              let formattedAddress = "";
              try {
                const reverse = await Location.reverseGeocodeAsync({ latitude, longitude });
                if (reverse.length > 0) {
                  const r = reverse[0];
                  formattedAddress = [r.street, r.city, r.region, r.postalCode, r.country]
                    .filter(Boolean)
                    .join(", ");
                  setAddress(formattedAddress || "Address detected");
                }
              } catch (err) {
                setAddress("Enter address manually.");
              }

              setShowAddressField(true);
              setGeoError("");

              setTimeout(() => {
                const idx = formSections.findIndex((s) => s.id === "address");
                if (flatListRef.current && idx !== -1) {
                  flatListRef.current.scrollToIndex({ index: idx, animated: true });
                }
              }, 100);

              Alert.alert("Verify Address", formattedAddress || "No address", [
                { text: "OK" },
                {
                  text: "Edit",
                  onPress: () => {
                    setTimeout(() => addressInputRef.current?.focus(), 300);
                  },
                },
              ]);
            } catch (error) {
              const msg = error.message.includes("timeout")
                ? "Location timed out."
                : "Check connection.";
              setGeoError(msg);
              Alert.alert("Error", msg);
            } finally {
              setIsDetectingLocation(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  }, [formSections]);

  const handleValidation = useCallback(() => {
    const errors = {};
    if (!name.trim()) errors.name = "Business name is required.";
    if (!description.trim()) errors.description = "Description is required.";
    if (!address.trim()) errors.address = "Address is required.";
    if (!geoLocation.lat || !geoLocation.lng) errors.geoLocation = "Detect your location.";
    if (!selectedLocation) errors.location = "State is required.";
    if (!selectedChildLocation) errors.childLocation = "LGA is required.";
    if (!selectedGrandChildLocation) errors.grandChildLocation = "Location is required.";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [name, description, address, geoLocation, selectedLocation, selectedChildLocation, selectedGrandChildLocation]);

  const handleSubmit = useCallback(async () => {
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
      selectedSubcategories.forEach((id) => formData.append("subcategories[]", id));

      const response = await api.post("/create-shop/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: sessionId,
        },
      });

      Alert.alert("Success", "Your space has been created!");
      router.replace({ pathname: "/shop/WelcomeWorkingHours", params: { shopId: response.data.shop_id } });
    } catch (error) {
      console.error("Error creating space:", error);
      Alert.alert("Error", "Failed to create space.");
    } finally {
      setIsSubmitting(false);
    }
  }, [name, description, geoLocation, address, selectedChildLocation, selectedGrandChildLocation, selectedSubcategories, sessionId, handleValidation]);

  const handleInputFocus = useCallback((sectionId) => {
    const index = formSections.findIndex((s) => s.id === sectionId);
    if (flatListRef.current && index !== -1) {
      flatListRef.current.scrollToIndex({ index, animated: true });
    }
  }, []);

  const handleDropdownFocus = useCallback(() => {
    const index = formSections.findIndex((s) => s.id === "subcategories");
    if (flatListRef.current && index !== -1) {
      flatListRef.current.scrollToIndex({ index, animated: true });
    }
  }, []);

  const renderCategoryItem = useCallback(({ item }) => (
    <TouchableOpacity style={styles.categoryItem} onPress={() => handleCategoryChange(item.key, item.value)}>
      <Text style={styles.categoryItemText}>{item.value}</Text>
    </TouchableOpacity>
  ), [handleCategoryChange]);

  const formSections = useMemo(() => [
    {
      id: "name",
      render: () => (
        <>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Input your business name"
            placeholderTextColor="#5A5A5A"
            value={name}
            onChangeText={setName}
            onFocus={() => handleInputFocus("name")}
            returnKeyType="next"
          />
          {formErrors.name && <Text style={styles.error}>{formErrors.name}</Text>}
        </>
      ),
    },
    {
      id: "description",
      render: () => (
        <>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.description]}
            placeholder="Tell us about your business"
            placeholderTextColor="#5A5A5A"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            onFocus={() => handleInputFocus("description")}
            returnKeyType="next"
          />
          {formErrors.description && <Text style={styles.error}>{formErrors.description}</Text>}
        </>
      ),
    },
    {
      id: "category",
      render: () => (
        <>
          <Text style={styles.label}>Category</Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => setModalVisible(true)}>
            <Text style={styles.dropdownText}>{selectedCategoryName || "Select Category"}</Text>
            <MaterialIcons name="arrow-drop-down" size={24} color="#6c757d" />
          </TouchableOpacity>
        </>
      ),
    },
    {
      id: "subcategories",
      render: () => {
        if (!selectedCategory || subcategories.length === 0) return null;
        return (
          <>
            <Text style={styles.label}>Subcategories</Text>
            <View style={styles.subcategoriesContainer} ref={subcategorySectionRef}>
              <RNMultiSelect
                  ref={dropdownRef}
                  style={styles.dropdown}
                  containerStyle={styles.multiSelectDropdownMenu}
                  itemTextStyle={styles.multiSelectText}
                  selectedStyle={styles.multiSelectTagContainer}
                  selectedTextStyle={styles.multiSelectTagText}
                  inputSearchStyle={styles.multiSelectSearchInput}
                  data={subcategories.map((sub) => ({
                    value: sub.key,
                    label: sub.value,
                  }))}
                  labelField="label"
                  valueField="value"
                  placeholder="Select Subcategories"
                  searchPlaceholder="Search Subcategories..."
                  value={selectedSubcategories}
                  onChange={(items) => setSelectedSubcategories(items)}
                  search
                  maxHeight={350}
                fontFamily="System"
                dropdownStyle={styles.fixedWidthDropdown}
                  dropdownPosition="bottom"
                  onFocus={handleDropdownFocus}
                  onBlur={() => console.log("Dropdown blurred")}
                  renderItem={(item, selected) => (
                    <View style={styles.multiSelectItem}>
                      <Text style={selected ? styles.multiSelectTagText : styles.multiSelectText}>
                        {item.label}
                      </Text>
                      {selected && (
                        <MaterialIcons
                          name="check"
                          size={16}
                          color="#FFFFFF"
                          style={styles.checkIcon}
                        />
                      )}
                    </View>
                  )}
                />
              </View>
          </>
        );
      },
    },
    {
      id: "state",
      render: () => (
        <>
          <Text style={styles.label}>State</Text>
          <SelectList
            setSelected={handleLocationChange}
            data={locations}
            placeholder="Select State"
            save="key"
            boxStyles={styles.dropdown}
            searchPlaceholder="Search states"
            defaultOption={locations.find((loc) => loc.key === selectedLocation)}
            maxHeight={250}
          />
          {formErrors.location && <Text style={styles.error}>{formErrors.location}</Text>}
        </>
      ),
    },
    {
      id: "childLocation",
      render: () =>
        selectedLocation && childLocations.length > 0 ? (
          <>
            <Text style={styles.label}>Local Government</Text>
            <SelectList
              setSelected={handleChildLocationChange}
              data={childLocations}
              placeholder="Select LGA"
              save="key"
              boxStyles={styles.dropdown}
              searchPlaceholder="Search LGAs"
              defaultOption={childLocations.find((loc) => loc.key === selectedChildLocation)}
              maxHeight={250}
            />
            {formErrors.childLocation && <Text style={styles.error}>{formErrors.childLocation}</Text>}
          </>
        ) : null,
    },
    {
      id: "grandChildLocation",
      render: () =>
        selectedChildLocation && grandChildLocations.length > 0 ? (
          <>
            <Text style={styles.label}>Location</Text>
            <SelectList
              setSelected={handleGrandChildLocationChange}
              data={grandChildLocations}
              placeholder="Select Location"
              save="key"
              boxStyles={styles.dropdown}
              searchPlaceholder="Search locations"
              defaultOption={grandChildLocations.find((loc) => loc.key === selectedGrandChildLocation)}
              maxHeight={250}
            />
            {formErrors.grandChildLocation && <Text style={styles.error}>{formErrors.grandChildLocation}</Text>}
          </>
        ) : null,
    },
    {
      id: "address",
      render: () =>
        showAddressField ? (
          <>
            <Text style={styles.label}>Address</Text>
            <TextInput
              ref={addressInputRef}
              style={[styles.input, styles.addressInput]}
              placeholder="Edit address if needed"
              placeholderTextColor="#5A5A5A"
              value={address}
              onChangeText={setAddress}
              onFocus={() => handleInputFocus("address")}
              multiline
              numberOfLines={3}
              returnKeyType="done"
            />
            {formErrors.address && <Text style={styles.error}>{formErrors.address}</Text>}
          </>
        ) : null,
    },
    {
      id: "geo",
      render: () => (
        <View style={styles.geoSection}>
          {showGeoFields && (
            <>
              <View style={styles.geoInputContainer}>
                <Text style={styles.geoLabel}>Latitude</Text>
                <TextInput style={[styles.input, styles.readOnly]} value={geoLocation.lat} editable={false} />
              </View>
              <View style={styles.geoInputContainer}>
                <Text style={styles.geoLabel}>Longitude</Text>
                <TextInput style={[styles.input, styles.readOnly]} value={geoLocation.lng} editable={false} />
              </View>
            </>
          )}

          {/* Only show button if not detected */}
          {!locationDetected && (
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
                  <Text style={styles.pinButtonText}>Detect My Location</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <Text style={styles.helperText}>
            Stand outside your business for accurate GPS.
          </Text>
          {geoError && <Text style={styles.error}>{geoError}</Text>}
          {formErrors.geoLocation && <Text style={styles.error}>{formErrors.geoLocation}</Text>}
        </View>
      ),
    },
    {
      id: "submit",
      render: () => (
        <Pressable
          style={[styles.submitButton, isSubmitting && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? "Submitting..." : "Create Business Space"}
          </Text>
        </Pressable>
      ),
    },
  ], [
    name, description, address, geoLocation, selectedCategory, selectedCategoryName,
    selectedSubcategories, subcategories, selectedLocation, selectedChildLocation,
    selectedGrandChildLocation, childLocations, grandChildLocations, locations,
    formErrors, isSubmitting, showAddressField, showGeoFields, isDetectingLocation,
    locationDetected, geoError, handleInputFocus
  ]);

  const getItemLayout = useCallback((data, index) => {
    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += sectionHeights[formSections[i]?.id] || 100;
    }
    return { length: sectionHeights[formSections[index]?.id] || 100, offset, index };
  }, []);

  const renderFormSection = useCallback(({ item }) => item.render(), []);

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={80}
      >
        <View style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#3A7BD5" />
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={26} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Create Space</Text>
            <View style={styles.headerSpacer} />
          </View>

          <FlatList
            ref={flatListRef}
            data={formSections}
            renderItem={renderFormSection}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.formContainer}
            showsVerticalScrollIndicator={false}
            getItemLayout={getItemLayout}
          />

          <Modal visible={modalVisible} animationType="slide" transparent={false}>
            <SafeAreaView style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                  <MaterialIcons name="arrow-back" size={26} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Select Category</Text>
                <View style={styles.headerSpacer} />
              </View>
              <TextInput
                style={styles.searchInput}
                placeholder="Search categories..."
                value={categorySearch}
                onChangeText={setCategorySearch}
              />
              <FlatList
                data={filteredCategories}
                renderItem={renderCategoryItem}
                keyExtractor={(item) => item.key.toString()}
                contentContainerStyle={styles.categoryList}
                ListEmptyComponent={<Text style={styles.emptyText}>No categories found</Text>}
              />
            </SafeAreaView>
          </Modal>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  formContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: "#3A7BD5",
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  backButton: {
    padding: 5,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
    flex: 1,
  },
  headerSpacer: {
    width: 42,
  },
  input: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 12,
    borderColor: "#E5E7EB",
    borderWidth: 1,
    marginBottom: 15,
    fontSize: 16,
    fontFamily: "System",
  },
  description: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  addressInput: {
    borderColor: "#3B82F6",
    borderWidth: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  dropdown: {
    backgroundColor: "#fff",
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dropdownText: {
    fontSize: 16,
    color: "#1F2937",
    fontFamily: "System",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: "#3A7BD5",
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
  },
  closeButton: {
    padding: 5,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  searchInput: {
    backgroundColor: "#fff",
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    margin: 16,
    fontSize: 16,
    fontFamily: "System",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexGrow: 1,
  },
  modalFlatList: {
    flex: 1,
  },
  categoryItem: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryItemText: {
    fontSize: 16,
    color: "#1F2937",
    fontWeight: "500",
    fontFamily: "System",
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 20,
    fontFamily: "System",
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
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  readOnly: {
    backgroundColor: "#E9ECEF",
  },
  pinButton: {
    backgroundColor: "#3B82F6",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
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
    fontWeight: "600",
    marginLeft: 5,
    fontFamily: "System",
  },
  pinIcon: {
    fontSize: 18,
    color: "#fff",
  },
  submitButton: {
    backgroundColor: "#10B981",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
    fontFamily: "System",
  },
  disabledButton: {
    backgroundColor: "#6B7280",
  },
  error: {
    color: "#EF4444",
    backgroundColor: "#FEF2F2",
    padding: 8,
    marginVertical: 6,
    borderRadius: 8,
    fontSize: 14,
    fontWeight: "600",
    borderWidth: 1,
    borderColor: "#FECACA",
    fontFamily: "System",
  },
  helperText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 5,
    fontStyle: "italic",
    fontFamily: "System",
  },
  subcategoriesContainer: {
    marginBottom: 15,
    position: "relative",
    zIndex: 2000,
    width: "100%",
    overflow: "visible",
  },
  multiSelectDropdownMenu: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderColor: "#E5E7EB",
    borderWidth: 1,
    maxHeight: 350,
    zIndex: 2100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    marginTop: 2,
    width: "89%",
  },
  multiSelectText: {
    fontSize: 16,
    color: "#6B7280",
    fontFamily: "System",
    fontWeight: "400",
    paddingVertical: 8,
    left: 5,
  },
  multiSelectTagContainer: {
    backgroundColor: "#FFFFFF",
    borderColor: "#1E40AF",
    borderWidth: 2,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    margin: 4,
  },
  multiSelectTagText: {
    fontSize: 14,
    color: "#2563EB",
    fontWeight: "800",
    fontFamily: "System",
    left: 5,
  },
  multiSelectSearchInput: {
    fontSize: 16,
    color: "#1F2937",
    fontFamily: "System",
    padding: 8,
  },
  multiSelectItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  checkIcon: {
    marginLeft: 8,
  },
});