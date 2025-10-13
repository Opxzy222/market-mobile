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
  Keyboard,
} from "react-native";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useFocusEffect } from "expo-router";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import api from '../../api';
import { SafeAreaView } from "react-native-safe-area-context";
import { SelectList } from "react-native-dropdown-select-list";
import { MultiSelect as RNMultiSelect } from "react-native-element-dropdown";
import axios from "axios";

export default function CreateShopScreen({ navigation }) {
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

  const router = useRouter();
  const flatListRef = useRef(null);
  const dropdownRef = useRef(null);
  const cancelTokenSourceRef = useRef(null);
  const subcategorySectionRef = useRef(null);
  const addressInputRef = useRef(null);

  // Measure section heights for getItemLayout
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

  // Keyboard listeners for debugging
  useEffect(() => {
    const keyboardDidShow = Keyboard.addListener("keyboardDidShow", () => {
      console.log("Keyboard shown");
    });
    const keyboardDidHide = Keyboard.addListener("keyboardDidHide", () => {
      console.log("Keyboard hidden");
    });

    return () => {
      keyboardDidShow.remove();
      keyboardDidHide.remove();
    };
  }, []);

  // Fetch session ID
  useEffect(() => {
    cancelTokenSourceRef.current = axios.CancelToken.source();
    const fetchSessionId = async () => {
      try {
        const sessionIdString = await AsyncStorage.getItem("sessionToken");
        setSessionId(sessionIdString);
        console.log("Session ID fetched:", sessionIdString);
      } catch (err) {
        console.error("Error fetching session ID:", err);
      }
    };
    fetchSessionId();

    return () => {
      if (cancelTokenSourceRef.current) {
        cancelTokenSourceRef.current.cancel("Component unmounted");
      }
    };
  }, []);

  // Fetch categories and locations only when screen is focused
  useFocusEffect(
    useCallback(() => {
      cancelTokenSourceRef.current = axios.CancelToken.source();

      const fetchCategories = async () => {
        try {
          console.log("Fetching categories...");
          const response = await api.post(
            "/category/dropdown-options/",
            {},
            { cancelToken: cancelTokenSourceRef.current.token }
          );
          const categoryData = response.data.categories.map((cat) => ({
            key: cat.id,
            value: cat.name,
          }));
          // Sort categories alphabetically by name
          const sortedCategories = categoryData.sort((a, b) => a.value.localeCompare(b.value));
          setCategories(sortedCategories);
          setFilteredCategories(sortedCategories);
          console.log("Sorted categories fetched:", sortedCategories);
        } catch (error) {
          if (!axios.isCancel(error)) {
            console.error("Error fetching categories:", error);
          }
        }
      };

      const fetchTopLevelLocations = async () => {
        try {
          console.log("Fetching top-level locations...");
          const response = await api.post(
            "/location/states/",
            {},
            { cancelToken: cancelTokenSourceRef.current.token }
          );
          // Sort locations alphabetically by name
          const sortedLocations = response.data.locations
            .map((loc) => ({
              key: loc.id,
              value: loc.name,
            }))
            .sort((a, b) => a.value.localeCompare(b.value));
          setLocations(sortedLocations);
          console.log("Sorted locations fetched:", sortedLocations);
        } catch (error) {
          if (!axios.isCancel(error)) {
            console.error("Error fetching locations:", error);
          }
        }
      };

      fetchCategories();
      fetchTopLevelLocations();

      return () => {
        console.log("Screen unfocused, canceling requests");
        if (cancelTokenSourceRef.current) {
          cancelTokenSourceRef.current.cancel("Screen unfocused");
        }
      };
    }, [])
  );

  // Filter categories based on search input
  useEffect(() => {
    setFilteredCategories(
      categories.filter((cat) =>
        cat.value.toLowerCase().includes(categorySearch.toLowerCase())
      )
    );
  }, [categorySearch, categories]);

  // Handle state selection and fetch LGAs
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

        const response = await api.post(
          "/location/children/",
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
            cancelToken: cancelTokenSourceRef.current?.token,
          }
        );

        // Sort child locations alphabetically by name
        const sortedChildLocations = response.data.locations
          .map((loc) => ({
            key: loc.id,
            value: loc.name,
          }))
          .sort((a, b) => a.value.localeCompare(b.value));
        setChildLocations(sortedChildLocations);
        console.log("Sorted child locations fetched:", sortedChildLocations);
      } catch (error) {
        if (!axios.isCancel(error)) {
          console.error("Error fetching child locations:", error);
          setChildLocations([]);
        }
      }
    }
  }, []);

  // Handle LGA selection and fetch locations
  const handleChildLocationChange = useCallback(async (selectedOption) => {
    setSelectedChildLocation(selectedOption);
    setSelectedGrandChildLocation(null);
    setGrandChildLocations([]);

    if (selectedOption) {
      try {
        const formData = new FormData();
        formData.append("parent_id", selectedOption);

        const response = await api.post(
          "/location/children/",
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
            cancelToken: cancelTokenSourceRef.current?.token,
          }
        );

        // Sort grandchild locations alphabetically by name
        const sortedGrandChildLocations = response.data.locations
          .map((loc) => ({
            key: loc.id,
            value: loc.name,
          }))
          .sort((a, b) => a.value.localeCompare(b.value));
        setGrandChildLocations(sortedGrandChildLocations);
        console.log("Sorted grandchild locations fetched:", sortedGrandChildLocations);
      } catch (error) {
        if (!axios.isCancel(error)) {
          console.error("Error fetching grandchild locations:", error);
          setGrandChildLocations([]);
        }
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

      const response = await api.post(
        "/category/subcategories/",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          cancelToken: cancelTokenSourceRef.current?.token,
        }
      );

      // Sort subcategories alphabetically by name
      const sortedSubcategories = response.data.subcategories
        .map((subcat) => ({
          key: subcat.id,
          value: subcat.name,
        }))
        .sort((a, b) => a.value.localeCompare(b.value));
      setSubcategories(sortedSubcategories);
      console.log("Sorted subcategories fetched:", sortedSubcategories);

      // Scroll to subcategories section after fetching
      setTimeout(() => {
        const index = formSections.findIndex((section) => section.id === "subcategories");
        if (flatListRef.current && index !== -1) {
          console.log("Scrolling to subcategories section after category change, index:", index);
          flatListRef.current.scrollToIndex({ index, animated: true });
        }
      }, 100);
    } catch (error) {
      if (!axios.isCancel(error)) {
        console.error("Error fetching subcategories:", error);
        setSubcategories([]);
      }
    }
  }, [formSections]);

  const handlePinLocation = useCallback(async () => {
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

              const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
                timeInterval: 5000,
                distanceInterval: 0,
                timeout: 10000,
              });

              const { latitude, longitude } = location.coords;

              setGeoLocation({
                lat: latitude.toString(),
                lng: longitude.toString(),
              });
              setShowGeoFields(true);

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

              setShowAddressField(true);
              setGeoError("");

              setTimeout(() => {
                const addressIndex = formSections.findIndex((section) => section.id === "address");
                if (flatListRef.current && addressIndex !== -1) {
                  console.log("Scrolling to address section after detection, index:", addressIndex);
                  flatListRef.current.scrollToIndex({ index: addressIndex, animated: true });
                }
              }, 100);

              Alert.alert(
                "Verify Your Address",
                `We detected the following address:\n\n${formattedAddress || "No address detected."}\n\nIs this correct? If not, please edit the address in the field provided.`,
                [
                  { text: "OK", style: "default" },
                  {
                    text: "Edit Address",
                    style: "default",
                    onPress: () => {
                      const addressIndex = formSections.findIndex((section) => section.id === "address");
                      if (flatListRef.current && addressIndex !== -1) {
                        console.log("Scrolling to address section for editing, index:", addressIndex);
                        flatListRef.current.scrollToIndex({ index: addressIndex, animated: true });
                        // Focus the address input after scrolling
                        setTimeout(() => {
                          if (addressInputRef.current) {
                            addressInputRef.current.focus();
                            console.log("Address input focused");
                          }
                        }, 300); // Delay to ensure scroll completes
                      }
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
  }, [formSections]);

  const handleValidation = useCallback(() => {
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

      selectedSubcategories.forEach((subId) =>
        formData.append("subcategories[]", subId)
      );

      const response = await api.post(
        "/create-shop/",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: sessionId,
          },
          cancelToken: cancelTokenSourceRef.current?.token,
        }
      );

      const shopId = response.data.shop_id;

      Alert.alert("Success", "Your space has been created!");
      router.replace({ pathname: "/shop/WelcomeWorkingHours", params: { shopId } });
    } catch (error) {
      if (!axios.isCancel(error)) {
        console.error("Error creating space:", error);
        Alert.alert("Error", "Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [name, description, geoLocation, address, selectedChildLocation, selectedGrandChildLocation, selectedSubcategories, sessionId, handleValidation]);

  const handleInputFocus = useCallback((sectionId) => {
    const index = formSections.findIndex((section) => section.id === sectionId);
    if (flatListRef.current && index !== -1) {
      console.log("Scrolling to section:", sectionId, "index:", index);
      flatListRef.current.scrollToIndex({ index, animated: true });
    }
  }, [formSections]);

  // Handle dropdown focus with scroll adjustment
  const handleDropdownFocus = useCallback(() => {
    const index = formSections.findIndex((section) => section.id === "subcategories");
    if (flatListRef.current && index !== -1) {
      console.log("Focusing subcategories section, scrolling to index:", index);
      flatListRef.current.scrollToIndex({ index, animated: true });
      // Delay to ensure scroll is complete before dropdown renders
      setTimeout(() => {
        console.log("Dropdown should open after scroll");
      }, 300);
    }
  }, [formSections]);

  const renderCategoryItem = useCallback(({ item }) => (
    <TouchableOpacity
      style={styles.categoryItem}
      onPress={() => handleCategoryChange(item.key, item.value)}
    >
      <Text style={styles.categoryItemText}>{item.value}</Text>
    </TouchableOpacity>
  ), [handleCategoryChange]);

  const formSections = useMemo(
    () => [
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
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.dropdownText}>
                {selectedCategoryName || "Select Category"}
              </Text>
              <MaterialIcons name="arrow-drop-down" size={24} color="#6c757d" />
            </TouchableOpacity>
          </>
        ),
      },
      {
        id: "subcategories",
        render: () => {
          if (!selectedCategory || !subcategories || subcategories.length === 0) {
            return null;
          }
          console.log("Rendering sorted subcategories:", subcategories);
          return (
            <>
              <Text style={styles.label}>Subcategories</Text>
              <View
                style={styles.subcategoriesContainer}
                ref={subcategorySectionRef}
                onLayout={(event) => {
                  const { y, height } = event.nativeEvent.layout;
                  console.log("Subcategories section layout, y:", y, "height:", height);
                  sectionHeights.subcategories = height;
                }}
              >
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
                placeholder="Select Local Government"
                save="key"
                boxStyles={styles.dropdown}
                searchPlaceholder="Search local governments"
                defaultOption={childLocations.find((loc) => loc.key === selectedChildLocation)}
              />
              {formErrors.childLocation && (
                <Text style={styles.error}>{formErrors.childLocation}</Text>
              )}
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
                defaultOption={grandChildLocations.find(
                  (loc) => loc.key === selectedGrandChildLocation
                )}
              />
              {formErrors.grandChildLocation && (
                <Text style={styles.error}>{formErrors.grandChildLocation}</Text>
              )}
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
                placeholder="Edit your business address if needed"
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
                  <TextInput
                    style={[styles.input, styles.readOnly]}
                    placeholder="Auto-filled after detection"
                    placeholderTextColor="#5A5A5A"
                    value={geoLocation.lat}
                    editable={false}
                  />
                </View>
                <View style={styles.geoInputContainer}>
                  <Text style={styles.geoLabel}>Longitude</Text>
                  <TextInput
                    style={[styles.input, styles.readOnly]}
                    placeholder="Auto-filled after detection"
                    placeholderTextColor="#5A5A5A"
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
    ],
    [
      name,
      description,
      address,
      geoLocation,
      selectedCategory,
      selectedCategoryName,
      selectedSubcategories,
      subcategories,
      selectedLocation,
      selectedChildLocation,
      selectedGrandChildLocation,
      childLocations,
      grandChildLocations,
      locations,
      formErrors,
      isSubmitting,
      showAddressField,
      showGeoFields,
      isDetectingLocation,
      geoError,
      handleInputFocus,
    ]
  );

  const getItemLayout = useCallback(
    (data, index) => {
      let offset = 0;
      for (let i = 0; i < index; i++) {
        const sectionId = formSections[i]?.id;
        offset += sectionHeights[sectionId] || 100;
      }
      return {
        length: sectionHeights[formSections[index]?.id] || 100,
        offset,
        index,
      };
    },
    [formSections]
  );

  const renderFormSection = useCallback(({ item }) => item.render(), []);

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 20}
      >
        <View style={styles.container} keyboardShouldPersistTaps="handled">
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

          <FlatList
            ref={flatListRef}
            data={formSections}
            renderItem={renderFormSection}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.formContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            getItemLayout={getItemLayout}
          />

          <Modal
            visible={modalVisible}
            animationType="slide"
            transparent={false}
            onRequestClose={() => setModalVisible(false)}
            onShow={() => {
              setTimeout(() => {
                flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
              }, 100);
            }}
          >
            <SafeAreaView style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={styles.closeButton}
                >
                  <MaterialIcons name="arrow-back" size={26} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Select Category</Text>
                <View style={styles.headerSpacer} />
              </View>
              <TextInput
                style={styles.searchInput}
                placeholder="Search categories..."
                placeholderTextColor="#5A5A5A"
                value={categorySearch}
                onChangeText={setCategorySearch}
              />
              <FlatList
                data={filteredCategories}
                renderItem={renderCategoryItem}
                keyExtractor={(item) => item.key.toString()}
                contentContainerStyle={styles.categoryList}
                initialNumToRender={15}
                windowSize={21}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No categories found</Text>
                }
                style={styles.modalFlatList}
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
    width: "100%",
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