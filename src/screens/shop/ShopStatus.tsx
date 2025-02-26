import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Modal,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as MediaLibrary from "expo-media-library";
import { Video } from "expo-av";
import { format } from "date-fns";
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from "expo-router";
import StatusViewer from "../../components/shop/ShopStatusViewer";

const BACKEND_URL = "https://172.27.243.94:8000";

const StatusScreen = () => {
  const [statuses, setStatuses] = useState([]);
  const [isTextPosting, setIsTextPosting] = useState(false);
  const [isMediaPosting, setIsMediaPosting] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentStatusIndex, setCurrentStatusIndex] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [mediaAssets, setMediaAssets] = useState([]);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);

  // Ref for the hidden file input on web
  const fileInputRef = useRef(null);

  const params = useLocalSearchParams();
  const { shopId } = params;

  // Fetch statuses when shopId changes
  useEffect(() => {
    fetchStatuses();
  }, [shopId]);

  useFocusEffect(
    useCallback(() => {
      fetchStatuses();
    }, [shopId])
  );

  // Request permissions on native, or bypass on web
  useEffect(() => {
    if (Platform.OS === "web") {
      // On web, we bypass native media permissions.
      setPermissionGranted(true);
    } else {
      requestPermissions();
    }
  }, []);

  const requestPermissions = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === "granted") {
        setPermissionGranted(true);
      } else {
        Alert.alert("Permission Denied", "We need access to your media library.");
      }
    } catch (error) {
      console.error("Error requesting permissions:", error);
    }
  };

  const fetchStatuses = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/shop/${shopId}/active_status/`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      setStatuses(data.statuses || []);
    } catch (error) {
      console.error("Error fetching statuses:", error);
    } finally {
      setLoading(false);
    }
  };

  // For native: open media picker using MediaLibrary
  const pickMediaNative = async () => {
    try {
      const assetResponse = await MediaLibrary.getAssetsAsync({
        mediaType: ["photo", "video"],
        first: 50,
      });
      setMediaAssets(assetResponse.assets);
      setIsMediaPickerOpen(true);
    } catch (error) {
      console.error("Error fetching media assets:", error);
    }
  };

  // Unified pickMedia function: on web, trigger file input; on native, use MediaLibrary
  const pickMedia = () => {
    if (!permissionGranted) {
      Alert.alert("Permission not granted", "Media library permission is required!");
      return;
    }
    if (Platform.OS === "web") {
      // Trigger the hidden file input element
      fileInputRef.current.click();
    } else {
      pickMediaNative();
    }
  };

  // Handle file input change on web
  const handleSelectMediaWeb = (event) => {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
      // For simplicity, we only take the first selected file
      const file = files[0];
      const mediaType = file.type.startsWith("image") ? "image" : "video";
      setSelectedMedia({
        uri: URL.createObjectURL(file),
        type: mediaType,
        name: file.name,
        file, // keep the File object for potential upload conversion
      });
    }
  };

  // Handle selection from native media picker modal
  const selectMediaAsset = (asset) => {
    setSelectedMedia({
      uri: asset.uri,
      type: asset.mediaType === "video" ? "video" : "image",
      name: asset.filename || asset.id,
    });
    setIsMediaPickerOpen(false);
  };

  // Handle plain text status posting
  const handlePostTextStatus = async () => {
    if (!statusText) return;
    try {
      const formData = new FormData();
      formData.append("text", statusText);
      await fetch(`${BACKEND_URL}/shop/${shopId}/status/`, {
        method: "POST",
        body: formData,
      });
      setStatusText("");
      setIsTextPosting(false);
      fetchStatuses();
    } catch (error) {
      console.error("Error posting text status:", error);
    }
  };

  // Handle media status posting (media with an optional caption)
  const handlePostMediaStatus = async () => {
    if (!selectedMedia && !statusText) return;
    try {
      const formData = new FormData();
      if (statusText) {
        formData.append("text", statusText);
      }
      if (selectedMedia) {
        // On web, if we have a File object, use it directly.
        if (Platform.OS === "web" && selectedMedia.file) {
          formData.append("media", selectedMedia.file);
        } else {
          const fileName = selectedMedia.name || selectedMedia.uri.split("/").pop();
          const mimeType = selectedMedia.type === "video" ? "video/mp4" : "image/jpeg";
          formData.append("media", {
            uri: selectedMedia.uri,
            type: mimeType,
            name: fileName,
          });
        }
      }
      await fetch(`${BACKEND_URL}/shop/${shopId}/status/`, {
        method: "POST",
        body: formData,
      });
      setStatusText("");
      setSelectedMedia(null);
      setIsMediaPosting(false);
      fetchStatuses();
    } catch (error) {
      console.error("Error posting media status:", error);
    }
  };

  const handleViewStatus = (index) => {
    setCurrentStatusIndex(index);
  };

  const handleCloseViewer = () => {
    setCurrentStatusIndex(null);
  };

  const renderStatusItem = ({ item, index }) => (
    <TouchableOpacity onPress={() => handleViewStatus(index)} style={styles.statusItem}>
      {item.media && item.media_type === "image" && (
        <Image source={{ uri: item.media }} style={[styles.avatar, styles.unreadBorder]} />
      )}
      {item.media && item.media_type === "video" && (
        <Video
          source={{ uri: item.media }}
          style={[styles.avatar, styles.unreadBorder]}
          resizeMode="cover"
          useNativeControls
          isLooping
        />
      )}
      {!item.media && (
        <Image
          source={{ uri: "https://randomuser.me/api/portraits/lego/1.jpg" }}
          style={[styles.avatar, styles.unreadBorder]}
        />
      )}
      <View>
        <Text style={styles.name}>{item.shop}</Text>
        <Text style={styles.time}>{format(new Date(item.created_at), "MMMM d, h:mm a")}</Text>
        <Text style={styles.views}>Views: {item.views_count}</Text>
      </View>
    </TouchableOpacity>
  );

  // Inside your component's return:
return (
  <View style={styles.container}>
    <Text style={styles.header}>Status</Text>

    {/* My Status Section */}
    <TouchableOpacity style={styles.myStatus} onPress={() => {}}>
      <Image
        source={{ uri: "https://randomuser.me/api/portraits/lego/1.jpg" }}
        style={styles.avatar}
      />
      <View>
        <Text style={styles.name}>My Status</Text>
        <Text style={styles.time}>
          {statuses.length > 0 ? "Tap to view" : "No updates"}
        </Text>
      </View>
    </TouchableOpacity>

    {/* Buttons for Posting Different Status Types */}
    <View style={styles.postButtonsContainer}>
      <TouchableOpacity
  style={styles.postButton}
  onPress={() => {
    setStatusText("");
    setIsTextPosting(true);
  }}
>
  <Ionicons name="create-outline" size={20} color="#fff" />
  <Text style={styles.postButtonText}>Post Text Status</Text>
</TouchableOpacity>

<TouchableOpacity
  style={[styles.postButton, styles.mediaButton]}
  onPress={() => {
    setStatusText("");
    setSelectedMedia(null);
    setIsMediaPosting(true);
  }}
>
  <Ionicons name="image-outline" size={20} color="#fff" />
  <Text style={styles.postButtonText}>Post Media Status</Text>
</TouchableOpacity>
    </View>

    {/* Recent Updates */}
    <Text style={styles.subHeader}>Recent Updates</Text>
    {loading ? (
      <ActivityIndicator size="large" color="#25D366" />
    ) : (
      <FlatList
        data={statuses}
        renderItem={renderStatusItem}
        keyExtractor={(item) => item.id.toString()}
      />
    )}

    {/* Modal for Posting Plain Text Status */}
    <Modal visible={isTextPosting} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeaderRow}>
            <Ionicons name="chatbubble-ellipses-outline" size={24} color="#555" />
            <Text style={styles.modalHeaderText}>Post a Text Status</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="What's on your mind?"
            placeholderTextColor="#888"
            value={statusText}
            onChangeText={setStatusText}
            multiline
          />
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setIsTextPosting(false)}
            >
              <Ionicons name="close-circle-outline" size={24} color="#d9534f" />
              <Text style={styles.actionButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handlePostTextStatus}
            >
              <Ionicons name="checkmark-circle-outline" size={24} color="#5cb85c" />
              <Text style={styles.actionButtonText}>Post</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

    {/* Modal for Posting Media Status */}
    <Modal visible={isMediaPosting} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeaderRow}>
            <Ionicons name="images-outline" size={24} color="#555" />
            <Text style={styles.modalHeaderText}>Post a Media Status</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Add a caption (optional)"
            placeholderTextColor="#888"
            value={statusText}
            onChangeText={setStatusText}
            multiline
          />
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionButton} onPress={pickMedia}>
              <Ionicons name="folder-open-outline" size={24} color="#0275d8" />
              <Text style={styles.actionButtonText}>Pick Media</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                setIsMediaPosting(false);
                setSelectedMedia(null);
              }}
            >
              <Ionicons name="close-circle-outline" size={24} color="#d9534f" />
              <Text style={styles.actionButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handlePostMediaStatus}
            >
              <Ionicons name="checkmark-circle-outline" size={24} color="#5cb85c" />
              <Text style={styles.actionButtonText}>Post</Text>
            </TouchableOpacity>
          </View>
          {/* Hidden file input for web */}
          {Platform.OS === "web" && (
            <input
              type="file"
              accept="image/*,video/*"
              multiple={false}
              ref={fileInputRef}
              onChange={handleSelectMediaWeb}
              style={{ display: "none" }}
            />
          )}
        </View>
      </View>
    </Modal>

    {/* Status Viewer Modal */}
    {currentStatusIndex !== null && (
      <StatusViewer
        statuses={statuses}
        initialIndex={currentStatusIndex}
        onClose={handleCloseViewer}
      />
    )}
  </View>
);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f7f7",
    padding: 15,
  },
  header: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    marginBottom: 15,
    textAlign: "center",
  },
  myStatus: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 15,
  },
  postButton: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#25D366", // WhatsApp-style green
  paddingVertical: 12,
  paddingHorizontal: 16,
  borderRadius: 10,
  shadowColor: "#000",
  shadowOpacity: 0.15,
  shadowRadius: 6,
  elevation: 5,
  marginVertical: 8,
},
mediaButton: {
  backgroundColor: "#007AFF", // iOS blue for media post
},
postButtonText: {
  fontSize: 16,
  fontWeight: "600",
  color: "#fff",
  marginLeft: 8,
},
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  time: {
    fontSize: 14,
    color: "#888",
  },
  postButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  subHeader: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginVertical: 10,
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  unreadBorder: {
    borderWidth: 2,
    borderColor: "#25D366",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: "#fff",
    width: "100%",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeaderRow: {
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: 12,
  paddingHorizontal: 16,
  backgroundColor: "#f5f5f5",
  borderTopLeftRadius: 12,
  borderTopRightRadius: 12,
  shadowColor: "#000",
  shadowOpacity: 0.1,
  shadowRadius: 8,
  elevation: 4,
},

modalHeaderText: {
  fontSize: 18,
  fontWeight: "600",
  color: "#333",
  marginLeft: 10,
},

modalCard: {
  backgroundColor: "#fff",
  borderRadius: 16,
  paddingVertical: 20,
  paddingHorizontal: 16,
  shadowColor: "#000",
  shadowOpacity: 0.15,
  shadowRadius: 12,
  elevation: 6,
},

iconStyle: {
  color: "#007AFF", // Modern blue shade for better visibility
},

  input: {
    backgroundColor: "#f1f1f1",
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 20,
    fontSize: 16,
    color: "#333",
    textAlignVertical: "top",
    minHeight: 100,
    marginBottom: 20,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eaeaea",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    flex: 1,
    marginHorizontal: 5,
  },
  actionButtonText: {
    fontSize: 16,
    color: "#333",
    marginLeft: 8,
    fontWeight: "500",
  },
});


export default StatusScreen;
