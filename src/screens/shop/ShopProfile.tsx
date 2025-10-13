import React, { useState, useEffect, useCallback, Component } from "react";
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from '../../api';
import { useRouter, useLocalSearchParams } from "expo-router";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Modal from "react-native-modal";
import { debounce } from "lodash";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// TypeScript interfaces
interface Category {
  key: number;
  value: string;
}

interface Subcategory {
  key: number;
  value: string;
}

interface MultiSelectItem {
  label: string;
  value: number;
}

interface MultiSelectProps {
  items: { id: number; name: string }[];
  selectedItems: number[];
  onSelectedItemsChange: (items: MultiSelectItem[]) => void;
  selectText: string;
  searchPlaceholder?: string;
  submitButtonText?: string;
}

interface ShopDetails {
  name: string;
  description: string;
  address: string;
  image: string | null;
  parent_category_id: number | null;
  category_ids: number[];
}

// Error Boundary Component
class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null; errorInfo: React.ErrorInfo | null }
> {
  state = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ padding: 20 }}>
          <Text>Error: {this.state.error?.toString()}</Text>
          <Text>Details: {this.state.errorInfo?.componentStack}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// Simplified CustomMultiSelect
const SimpleMultiSelect: React.FC<MultiSelectProps> = ({
  items,
  selectedItems,
  onSelectedItemsChange,
  selectText,
}) => {
  const [tempSelected, setTempSelected] = useState<number[]>(selectedItems);

  // Sync tempSelected with selectedItems prop
  useEffect(() => {
    console.log("SimpleMultiSelect syncing selectedItems:", selectedItems);
    setTempSelected(selectedItems);
  }, [selectedItems]);

  const toggleItem = useCallback(
    (id: number) => {
      setTempSelected((prev) => {
        const isSelected = prev.includes(id);
        const newSelected = isSelected
          ? prev.filter((selected) => selected !== id)
          : [...prev, id];
        console.log("SimpleMultiSelect toggled:", newSelected);
        const selectedItemsData = newSelected
          .map((id) => ({
            label: items.find((item) => item.id === id)?.name || "",
            value: id,
          }))
          .filter((item): item is MultiSelectItem => item.label !== "");
        console.log("SimpleMultiSelect onSelectedItemsChange:", selectedItemsData);
        onSelectedItemsChange(selectedItemsData);
        return newSelected;
      });
    },
    [onSelectedItemsChange, items]
  );

  return (
    <View style={styles.customMultiSelect}>
      <ScrollView
        nestedScrollEnabled={true}
        style={styles.modalList}
        contentContainerStyle={styles.modalListContent}
      >
        {items.map((item) => (
          <TouchableOpacity
            key={item.id.toString()}
            style={[
              styles.modalItem,
              tempSelected.includes(item.id) && styles.selectedModalItem,
            ]}
            onPress={() => toggleItem(item.id)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.modalItemText,
                tempSelected.includes(item.id) && styles.selectedModalItemText,
              ]}
            >
              {item.name}
            </Text>
            {tempSelected.includes(item.id) && (
              <Ionicons name="checkmark" size={20} color="#FF3D00" />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

// Custom Multi-Select Component with Modal
const CustomMultiSelect = React.memo<MultiSelectProps>(
  ({
    items,
    selectedItems,
    onSelectedItemsChange,
    selectText,
    searchPlaceholder,
    submitButtonText,
  }) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [search, setSearch] = useState("");
    const [tempSelected, setTempSelected] = useState<{ id: number; name: string }[]>(
      selectedItems
        .map((id) => items.find((item) => item.id === id))
        .filter((item): item is { id: number; name: string } => !!item)
    );

    useEffect(() => {
      setTempSelected(
        selectedItems
          .map((id) => items.find((item) => item.id === id))
          .filter((item): item is { id: number; name: string } => !!item)
      );
    }, [selectedItems, items]);

    const filteredItems = items.filter((item) =>
      item.name.toLowerCase().includes(search.toLowerCase())
    );

    const toggleItem = useCallback((item: { id: number; name: string }) => {
      setTimeout(() => {
        setTempSelected((prev) => {
          const isSelected = prev.some((selected) => selected.id === item.id);
          const newSelected = isSelected
            ? prev.filter((selected) => selected.id !== item.id)
            : [...prev, item];
          console.log("CustomMultiSelect toggled:", newSelected.map((i) => i.id));
          return newSelected;
        });
      }, 0);
    }, []);

    const handleSearch = useCallback(debounce((text: string) => setSearch(text), 300), []);

    const handleSubmit = useCallback(() => {
      const selectedIds = tempSelected.map((item) => item.id);
      console.log("CustomMultiSelect submitting:", selectedIds);
      onSelectedItemsChange(
        selectedIds.map((id) => ({
          label: items.find((item) => item.id === id)?.name || "",
          value: id,
        }))
      );
      setModalVisible(false);
      setSearch("");
    }, [tempSelected, items, onSelectedItemsChange]);

    const renderTag = useCallback(
      (item: { id: number; name: string }) => (
        <TouchableOpacity
          key={item.id.toString()}
          style={styles.tagContainer}
          onPress={() => toggleItem(item)}
          activeOpacity={0.8}
        >
          <Text style={styles.tagText}>{item.name}</Text>
          <Ionicons name="close-circle" size={18} color="#CCC" />
        </TouchableOpacity>
      ),
      [toggleItem]
    );

    return (
      <View style={styles.customMultiSelect}>
        <TouchableOpacity
          style={styles.selectBox}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.selectText}>
            {tempSelected.length > 0 ? `${tempSelected.length} selected` : selectText}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#333" />
        </TouchableOpacity>

        {tempSelected.length > 0 && (
          <View style={styles.tagList}>
            {tempSelected.map((item) => renderTag(item))}
          </View>
        )}

        <Modal
          isVisible={modalVisible}
          onBackdropPress={() => {
            setModalVisible(false);
            setSearch("");
          }}
          style={styles.modal}
          animationIn="slideInUp"
          animationOut="slideOutDown"
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Child Categories</Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setSearch("");
                }}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalSearchInput}
              placeholder={searchPlaceholder}
              value={search}
              onChangeText={handleSearch}
              blurOnSubmit
              returnKeyType="done"
              onFocus={() => console.log("Modal Search TextInput focused")}
            />
            <ScrollView
              nestedScrollEnabled={true}
              style={styles.modalList}
              contentContainerStyle={styles.modalListContent}
            >
              {filteredItems.map((item) => (
                <TouchableOpacity
                  key={item.id.toString()}
                  style={[
                    styles.modalItem,
                    tempSelected.some((selected) => selected.id === item.id) &&
                      styles.selectedModalItem,
                  ]}
                  onPress={() => toggleItem(item)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      tempSelected.some((selected) => selected.id === item.id) &&
                        styles.selectedModalItemText,
                    ]}
                  >
                    {item.name}
                  </Text>
                  {tempSelected.some((selected) => selected.id === item.id) && (
                    <Ionicons name="checkmark" size={20} color="#FF3D00" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={handleSubmit} style={styles.modalSubmitButton}>
              <LinearGradient
                colors={["#FF8C42", "#FF3D00"]}
                style={styles.modalSubmitGradient}
              >
                <Text style={styles.modalSubmitText}>{submitButtonText}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Modal>
      </View>
    );
  }
);

const ShopProfileScreen: React.FC = () => {
  console.log("ShopProfileScreen rendered");
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [parentCategories, setParentCategories] = useState<Category[]>([]);
  const [selectedParentCategory, setSelectedParentCategory] = useState<number | null>(null);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [selectedChildCategories, setSelectedChildCategories] = useState<MultiSelectItem[]>([]);
  const [image, setImage] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [originalName, setOriginalName] = useState<string>("");
  const [originalDescription, setOriginalDescription] = useState<string>("");
  const [originalAddress, setOriginalAddress] = useState<string>("");
  const [originalParentCategory, setOriginalParentCategory] = useState<number | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [initialSubcategoryIds, setInitialSubcategoryIds] = useState<number[]>([]);

  const params = useLocalSearchParams<{ shopId: string }>();
  const { shopId } = params;
  const router = useRouter();

  useEffect(() => {
    const fetchSessionId = async () => {
      try {
        const sessionIdString = await AsyncStorage.getItem("sessionToken");
        setSessionId(sessionIdString);
      } catch (error) {
        console.error("Error fetching session ID:", error);
      }
    };
    fetchSessionId();
  }, []);

  useEffect(() => {
    const fetchShopDetails = async () => {
      try {
        const response = await api.get<ShopDetails>(
          `/shop/profile/${shopId}/`,
          {
            headers: {
              Authorization: sessionId ? `Bearer ${sessionId}` : "",
            },
          }
        );
        setName(response.data.name);
        setDescription(response.data.description);
        setAddress(response.data.address);
        setImage(response.data.image);
        setOriginalName(response.data.name);
        setOriginalDescription(response.data.description);
        setOriginalAddress(response.data.address);
        setOriginalImage(response.data.image);
        setOriginalParentCategory(response.data.parent_category_id);
        setSelectedParentCategory(response.data.parent_category_id);
        setInitialSubcategoryIds(response.data.category_ids);
        setSelectedChildCategories([]); // Reset child categories on initial fetch
      } catch (error) {
        console.error("Error fetching shop details:", error);
      }
    };
    if (sessionId) {
      fetchShopDetails();
    }
  }, [shopId, sessionId]);

  useEffect(() => {
    const fetchParentCategories = async () => {
      try {
        const response = await api.post<{ categories: { id: number; name: string }[] }>(
          "/category/dropdown-options/"
        );
        // Sort parent categories alphabetically by name
        const sortedParentCategories = response.data.categories
          .map((cat) => ({ key: cat.id, value: cat.name }))
          .sort((a, b) => a.value.localeCompare(b.value));
        setParentCategories(sortedParentCategories);
        console.log("Sorted parent categories fetched:", sortedParentCategories);
      } catch (error) {
        console.error("Error fetching parent categories:", error);
      }
    };
    fetchParentCategories();
  }, []);

  useEffect(() => {
    if (!selectedParentCategory) {
      console.log("No parent category selected, clearing subcategories and selected child categories");
      setSubcategories([]);
      setSelectedChildCategories([]);
      return;
    }

    const fetchChildCategories = async () => {
      try {
        console.log("Fetching subcategories for parent category:", selectedParentCategory);
        const formData = new FormData();
        formData.append("parent_id", selectedParentCategory.toString());
        const response = await api.post<{ subcategories: { id: number; name: string }[] }>(
          "/category/subcategories/",
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        // Sort subcategories alphabetically by name
        const sortedSubcategories = response.data.subcategories
          .map((subcat) => ({ key: subcat.id, value: subcat.name }))
          .sort((a, b) => a.value.localeCompare(b.value));
        console.log(
          "Sorted subcategories fetched for parent",
          selectedParentCategory,
          ":",
          sortedSubcategories
        );
        setSubcategories(sortedSubcategories);

        // Preselect subcategories that match initialSubcategoryIds and belong to the current parent
        const preselected = initialSubcategoryIds
          .map((id) => {
            const subcategory = sortedSubcategories.find((sub) => sub.key === id);
            return subcategory ? { label: subcategory.value, value: subcategory.key } : null;
          })
          .filter((item): item is MultiSelectItem => item !== null);
        console.log("Preselecting subcategories:", preselected);
        setSelectedChildCategories(preselected);
      } catch (error) {
        console.error("Error fetching child categories:", error);
      }
    };

    // Clear selected child categories before fetching new subcategories
    console.log("Clearing selected child categories due to parent category change");
    setSelectedChildCategories([]);
    fetchChildCategories();
  }, [selectedParentCategory, initialSubcategoryIds]);

  const pickImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (!result.canceled) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
    }
  }, []);

  const handleUpdate = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Validate category consistency
      if (selectedChildCategories.length > 0 && !selectedParentCategory) {
        console.warn("Validation failed: Child categories selected without a parent category");
        alert("Error", "Please select a parent category for the selected child categories.");
        setIsSubmitting(false);
        return;
      }

      // Validate that selectedChildCategories belong to the current selectedParentCategory
      const validSubcategoryIds = subcategories.map((sub) => sub.key);
      const currentSubIds = selectedChildCategories
        .map((item) => item.value)
        .filter((id): id is number => id !== null);
      const invalidSubcategories = currentSubIds.filter(
        (id) => !validSubcategoryIds.includes(id)
      );
      if (invalidSubcategories.length > 0) {
        console.warn("Invalid subcategories detected:", invalidSubcategories);
        alert(
          "Error",
          "Selected child categories do not belong to the current parent category. Please reselect."
        );
        setIsSubmitting(false);
        return;
      }

      const formData = new FormData();
      let hasChanges = false;

      // Append non-category fields only if they have changed
      if (name !== originalName) {
        formData.append("shop_name", name);
        hasChanges = true;
      }
      if (description !== originalDescription) {
        formData.append("description", description);
        hasChanges = true;
      }
      if (address !== originalAddress) {
        formData.append("address", address);
        hasChanges = true;
      }
      if (image && image !== originalImage) {
        formData.append("image", {
          uri: image,
          type: "image/jpeg",
          name: "profile.jpg",
        } as any);
        hasChanges = true;
      }

      // Always include category_id and subcategory_ids to preserve them
      if (selectedParentCategory !== null) {
        formData.append("category_id", selectedParentCategory.toString());
        if (selectedParentCategory !== originalParentCategory) {
          hasChanges = true;
        }
      }

      const sortedCurrentSubIds = currentSubIds.sort();
      const sortedOriginalSubIds = initialSubcategoryIds.slice().sort();
      const subcategoriesChanged =
        JSON.stringify(sortedCurrentSubIds) !== JSON.stringify(sortedOriginalSubIds);

      if (sortedCurrentSubIds.length > 0) {
        sortedCurrentSubIds.forEach((id) => {
          formData.append("subcategory_ids", id.toString());
        });
        if (subcategoriesChanged) {
          hasChanges = true;
        }
      }

      console.log("Original state:", {
        originalName,
        originalDescription,
        originalAddress,
        originalParentCategory,
        originalSubIds: initialSubcategoryIds,
      });
      console.log("Current state:", {
        name,
        description,
        address,
        selectedParentCategory,
        currentSubIds: sortedCurrentSubIds,
      });
      console.log("FormData contents:");
      for (const [key, value] of formData) {
        console.log(`${key}: ${value}`);
      }

      // Prevent request if no changes are made
      if (!hasChanges) {
        console.log("No changes detected, aborting update");
        alert("No Changes", "No changes detected.");
        setIsSubmitting(false);
        return;
      }

      // Append shop_id for valid updates
      formData.append("shop_id", shopId);

      const response = await api.post(
        `/shop/profile/${shopId}/`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: sessionId,
          },
        }
      );

      console.log("Backend response:", response.data);

      // Update original values to reflect the new state
      setOriginalName(name);
      setOriginalDescription(description);
      setOriginalAddress(address);
      setOriginalImage(image);
      setOriginalParentCategory(selectedParentCategory);
      setInitialSubcategoryIds(sortedCurrentSubIds);

      alert("Success", "Space profile updated successfully!");
      router.back();
    } catch (error) {
      console.error("Error updating shop:", error);
      alert("Error", "Failed to update shop profile. Please check your selections.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isSubmitting,
    name,
    description,
    address,
    selectedParentCategory,
    image,
    selectedChildCategories,
    originalName,
    originalDescription,
    originalAddress,
    originalImage,
    originalParentCategory,
    initialSubcategoryIds,
    shopId,
    sessionId,
    router,
    subcategories,
  ]);

  const handleNameChange = useCallback((text: string) => setName(text), []);
  const handleDescriptionChange = useCallback((text: string) => setDescription(text), []);
  const handleAddressChange = useCallback((text: string) => setAddress(text), []);

  return (
    <ErrorBoundary>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
        <LinearGradient colors={["#F5F5F5", "#E0E0E0"]} style={styles.container}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
          >
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <MaterialIcons name="arrow-back" size={26} color="white" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Space Profile</Text>
              <View style={styles.headerSpacer} />
            </View>

            <View style={styles.imageContainer}>
              <TouchableOpacity onPress={pickImage} style={styles.imageWrapper}>
                <Image
                  source={{ uri: image || "https://via.placeholder.com/40" }}
                  style={styles.profileImage}
                />
                <TouchableOpacity onPress={pickImage} style={styles.uploadIcon}>
                  <Ionicons name="camera" size={20} color="white" />
                </TouchableOpacity>
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.contentContainer}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.card}>
                <Text style={styles.label}>Business Name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={handleNameChange}
                  placeholder="Enter Business Name"
                  placeholderTextColor="#5A5A5A"
                  blurOnSubmit
                  returnKeyType="done"
                  onFocus={() => console.log("Shop Name TextInput focused")}
                />

                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={handleDescriptionChange}
                  placeholder="Enter Business Description"
                  placeholderTextColor="#5A5A5A"
                  multiline
                  blurOnSubmit
                  returnKeyType="done"
                  onFocus={() => console.log("Description TextInput focused")}
                />

                <Text style={styles.label}>Address</Text>
                <TextInput
                  style={styles.input}
                  value={address}
                  onChangeText={handleAddressChange}
                  placeholder="Enter Business Address"
                  placeholderTextColor="#5A5A5A"
                  blurOnSubmit
                  returnKeyType="done"
                  onFocus={() => console.log("Address TextInput focused")}
                />

                <Text style={styles.label}>Parent Category</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={selectedParentCategory}
                    onValueChange={(value: number | null) => {
                      console.log("Parent category changed to:", value);
                      setSelectedParentCategory(value);
                    }}
                    style={styles.picker}
                    itemStyle={styles.pickerItem}
                  >
                    <Picker.Item label="Select Parent Category" value={null} />
                    {parentCategories.map((cat) => (
                      <Picker.Item key={cat.key} label={cat.value} value={cat.key} />
                    ))}
                  </Picker>
                </View>

                {selectedParentCategory && subcategories.length > 0 && (
                  <>
                    <Text style={styles.label}>Child Categories</Text>
                    <View style={styles.multiSelectContainer}>
                      <SimpleMultiSelect
                        items={subcategories.map((sub) => ({ id: sub.key, name: sub.value }))}
                        selectedItems={selectedChildCategories.map((item) => item.value)}
                        onSelectedItemsChange={(selectedItems) => {
                          console.log("SimpleMultiSelect selected:", selectedItems);
                          setSelectedChildCategories(selectedItems);
                        }}
                        selectText="Select Categories"
                      />
                    </View>
                  </>
                )}

                <TouchableOpacity onPress={handleUpdate} style={styles.updateButton}>
                  <LinearGradient
                    colors={["#FF8C42", "#FF3D00"]}
                    style={styles.gradientButton}
                  >
                    <Text style={styles.updateButtonText}>
                      {isSubmitting ? "Updating..." : "Update Profile"}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </LinearGradient>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

export default ShopProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    flex: 1,
    textAlign: "center",
  },
  headerSpacer: {
    width: 42,
  },
  imageContainer: {
    alignItems: "center",
    marginVertical: 24,
  },
  imageWrapper: {
    position: "relative",
  },
  profileImage: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 3,
    borderColor: "#FF8C42",
  },
  uploadIcon: {
    position: "absolute",
    bottom: 5,
    right: 5,
    backgroundColor: "#FF8C42",
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  contentContainer: {
    padding: 20,
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.35)",
    padding: 20,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 6,
    color: "black",
  },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    padding: 14,
    borderRadius: 10,
    fontSize: 16,
    color: "black",
    marginBottom: 14,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  pickerContainer: {
    backgroundColor: "white",
    borderRadius: 10,
    marginBottom: 14,
    overflow: "hidden",
  },
  picker: {
    height: Platform.OS === "ios" ? 150 : 50,
    width: "100%",
    color: "#333", // Ensure selected label is visible
  },
  pickerItem: {
    color: "#333",
    fontSize: 16,
  },
  updateButton: {
    marginTop: 20,
    borderRadius: 12,
    overflow: "hidden",
    elevation: 4,
  },
  gradientButton: {
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  updateButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  multiSelectContainer: {
    backgroundColor: "white",
    borderRadius: 10,
    marginBottom: 14,
    overflow: "hidden",
  },
  customMultiSelect: {
    padding: 10,
  },
  selectBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    padding: 14,
    borderRadius: 8,
    marginBottom: 10,
  },
  selectText: {
    fontSize: 16,
    color: "#333",
  },
  tagList: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10,
  },
  tagContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#CCC",
    borderRadius: 15,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    color: "#333",
    fontSize: 14,
    marginRight: 6,
  },
  modal: {
    justifyContent: "flex-end",
    margin: 0,
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: SCREEN_HEIGHT * 0.7,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  modalSearchInput: {
    backgroundColor: "#F5F5F5",
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    color: "#333",
    marginBottom: 15,
  },
  modalList: {
    flexGrow: 0,
  },
  modalListContent: {
    paddingBottom: 10,
  },
  modalItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  selectedModalItem: {
    backgroundColor: "#FFF3E0",
  },
  modalItemText: {
    fontSize: 16,
    color: "#333",
  },
  selectedModalItemText: {
    color: "#FF3D00",
    fontWeight: "600",
  },
  modalSubmitButton: {
    marginTop: 15,
    borderRadius: 8,
    overflow: "hidden",
  },
  modalSubmitGradient: {
    padding: 14,
    alignItems: "center",
  },
  modalSubmitText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});