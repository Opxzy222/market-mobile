import { useState, useEffect } from "react";
import { 
  View, Text, TextInput, Image, TouchableOpacity, 
  StyleSheet, ScrollView, ActivityIndicator 
} from "react-native";
import { SelectList } from "react-native-dropdown-select-list";
import MultiSelect from 'react-native-multiple-select';
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useRouter, useLocalSearchParams } from "expo-router";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";

export default function ShopProfileScreen() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [parentCategories, setParentCategories] = useState([]);
  const [selectedParentCategory, setSelectedParentCategory] = useState(null);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedChildCategories, setSelectedChildCategories] = useState([]);
  const [image, setImage] = useState(null);
  const [sessionId, setSessionId] = useState(null);

  const [originalName, setOriginalName] = useState("");
  const [originalDescription, setOriginalDescription] = useState("");
  const [originalAddress, setOriginalAddress] = useState("");
  const [originalParentCategory, setOriginalParentCategory] = useState(null);
  const [originalChildCategories, setOriginalChildCategories] = useState([]);
  const [initialChildCategoryIds, setInitialChildCategoryIds] = useState([]);
  const [originalImage, setOriginalImage] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const params = useLocalSearchParams();
  const { shopId, prevRoute } = params;
  const router = useRouter();

  useEffect(() => {
    const fetchSessionId = async () => {
      const sessionIdString = await AsyncStorage.getItem("sessionToken");
      setSessionId(sessionIdString); // No need to parse as an integer
    };

    fetchSessionId();
  }, []);

  // Fetch shop details and preselect values
  useEffect(() => {
    const fetchShopDetails = async () => {
      try {
        const response = await axios.get(`https://retail-alvinia-goza-f6a0e4f7.koyeb.app/shop/profile/${shopId}/`, {
          headers: {
            Authorization: sessionId, // Send sessionId in headers
          },
  });

        setName(response.data.name);
        setDescription(response.data.description);
        setAddress(response.data.address);
        setImage(response.data.image);
        setSelectedParentCategory(response.data.parent_category_id);
        setOriginalParentCategory(response.data.parent_category_id);
        
        // Store original values
        setOriginalName(response.data.name);
        setOriginalDescription(response.data.description);
        setOriginalAddress(response.data.address);
        setOriginalImage(response.data.image);
        setInitialChildCategoryIds(response.data.category_ids);
        setOriginalChildCategories(response.data.category_ids);

      } catch (error) {
        console.error("Error fetching shop details:", error);
      }
    };
    fetchShopDetails();
  }, [shopId]);

  // Fetch parent categories
  useEffect(() => {
    const fetchParentCategories = async () => {
      try {
        const response = await axios.post("https://retail-alvinia-goza-f6a0e4f7.koyeb.app/category/dropdown-options/");
        setParentCategories(response.data.categories.map(cat => ({ key: cat.id, value: cat.name })));
      } catch (error) {
        console.error("Error fetching parent categories:", error);
      }
    };
    fetchParentCategories();
  }, []);

  // Fetch child categories when parent category changes
  useEffect(() => {
    if (!selectedParentCategory) return;

    const fetchChildCategories = async () => {
      try {
        const formData = new FormData();
        formData.append("parent_id", selectedParentCategory);

        const response = await axios.post("https://retail-alvinia-goza-f6a0e4f7.koyeb.app/category/subcategories/", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        const formattedSubcategories = response.data.subcategories.map(subcat => ({
          key: subcat.id,
          value: subcat.name
        }));

        setSubcategories(formattedSubcategories);

        // Preselect child categories based on previously fetched data
        setSelectedChildCategories(
          initialChildCategoryIds.map(id => {
            const subcategory = formattedSubcategories.find(sub => sub.key === id);
            return subcategory ? { label: subcategory.value, value: subcategory.key } : null;
          }).filter(Boolean) // Remove null values
        );

      } catch (error) {
        console.error("Error fetching child categories:", error);
      }
    };

    fetchChildCategories();
  }, [selectedParentCategory]);

  const pickImage = async () => {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (!result.canceled) {
        setImage(result.assets[0].uri);  // Instant update
      }
    };

  // Handle shop update
  const handleUpdate = async () => {
  if (isSubmitting) return;
  setIsSubmitting(true);

  try {
    const formData = new FormData();

    if (name !== originalName) {
      formData.append("shop_name", name);
    }
    if (description !== originalDescription) {
      formData.append("description", description);
    }
    if (address !== originalAddress) {
      formData.append("address", address);
    }
    if (selectedParentCategory !== originalParentCategory) {
      formData.append("category_id", selectedParentCategory);
    }

    if (image && image !== originalImage) {
      formData.append("image", {
        uri: image,
        type: "image/jpeg",
        name: "profile.jpg",
      });
    }

    // Append subcategories correctly
    const currentSubIds = selectedChildCategories.map(sub => sub.value);
    if (JSON.stringify(currentSubIds) !== JSON.stringify(originalChildCategories)) {
      currentSubIds.forEach((subId) => {
        formData.append("subcategory_ids", subId);
      });
    }

    // Debug FormData
    for (let pair of formData.entries()) {
      console.log(pair[0], pair[1]);
    }

    if (formData.entries().next().done) {
      alert("No Changes", "No changes were detected.");
      setIsSubmitting(false);
      return;
    }

    formData.append("shop_id", shopId);

    await axios.post(
      `https://retail-alvinia-goza-f6a0e4f7.koyeb.app/shop/profile/${shopId}/`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${sessionId}`,
        },
      }
    );

    alert("Success", "Shop profile updated successfully!");
    router.back();
  } catch (error) {
    console.error("Error updating shop:", error);
    alert("Error", "Something went wrong.");
  } finally {
    setIsSubmitting(false);
  }
};


  return (
    <LinearGradient colors={["#F5F5F5", "#E0E0E0"]} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#007BFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Shop Profile</Text>
      </View>

      <View style={styles.imageContainer}>
        <TouchableOpacity onPress={pickImage} style={styles.imageWrapper}>
          <Image source={{ uri: image || "https://via.placeholder.com/40" }} style={styles.profileImage} />
          <TouchableOpacity onPress={pickImage} style={styles.uploadIcon}>
            <Ionicons name="camera" size={20} color="white" />
          </TouchableOpacity>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.card}>
          <Text style={styles.label}>Shop Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Enter Shop Name" />

          <Text style={styles.label}>Description</Text>
          <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} placeholder="Enter Shop Description" multiline />

          <Text style={styles.label}>Address</Text>
          <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Enter Shop Address" />

          <Text style={styles.label}>Parent Category</Text>
          <SelectList
            setSelected={setSelectedParentCategory}
            data={parentCategories}
            defaultOption={parentCategories.find((cat) => cat.key === selectedParentCategory) || null}
            placeholder="Select Parent Category"
            boxStyles={{ backgroundColor: 'white' }}
          />

          {selectedParentCategory && subcategories.length > 0 && (
            <>
              <Text style={styles.label}>Child Categories</Text>
              <MultiSelect
  items={subcategories.map((sub) => ({ id: sub.key, name: sub.value }))}
  uniqueKey="id"
  onSelectedItemsChange={(selectedItems) => {
    const selectedFormatted = selectedItems.map((id) => {
      const match = subcategories.find((sub) => sub.key === id);
      return { label: match?.value, value: id };
    });
    setSelectedChildCategories(selectedFormatted);
  }}
  selectedItems={selectedChildCategories.map((item) => item.value)}
  selectText="Select Categories"
  searchInputPlaceholderText="Search Categories..."
  onChangeInput={(text) => console.log(text)}
  tagRemoveIconColor="#CCC"
  tagBorderColor="#CCC"
  tagTextColor="#333"
  selectedItemTextColor="#FF3D00"
  selectedItemIconColor="#FF3D00"
  itemTextColor="#000"
  displayKey="name"
  searchInputStyle={{ color: '#CCC' }}
  submitButtonColor="#FF3D00"
  submitButtonText="Submit"
/>
            </>
          )}

          <TouchableOpacity onPress={handleUpdate} style={styles.updateButton}>
            <LinearGradient colors={["#FF8C42", "#FF3D00"]} style={styles.gradientButton}>
              <Text style={styles.updateButtonText}>{isSubmitting ? "Updating..." : "Update Shop"}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 20
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginLeft: 75,
    color: "black",
  },
  backButton: {
    borderRadius: 50,
    backgroundColor: "#E0E0E0",
    marginRight: 12,
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
});