import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ScrollView,
  ActivityIndicator,
  Modal,
  StyleSheet,
  Alert,
  Platform,
  Dimensions,
  StatusBar,
  Animated,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { Ionicons } from "@expo/vector-icons";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import StatusViewer from "../../components/shop/ShopStatusViewer";
import SubscriptionRequired from "@/components/RequiredSubscription";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from '../../api';
import { format } from "date-fns";

const { width } = Dimensions.get("window");
const BACKEND_URL = "";
const FALLBACK_IMAGE = "https://randomuser.me/api/portraits/lego/1.jpg";

const StatusItem = ({ item, index, onPress, onDelete, regenerateMediaUrl, sessionId }) => {
  const [mediaUrls, setMediaUrls] = useState({ media: item.media, thumbnail: item.thumbnail_url });

  const handleImageError = async (type) => {
    console.error(`Failed to load ${type} for status ID ${item.id}: ${mediaUrls[type]}`);
    try {
      const response = await api.get(`${BACKEND_URL}/status/regenerate-url/?status_id=${item.id}`, {
        headers: { Authorization: `Bearer ${sessionId}` },
      });
      const { media_url, thumbnail_url } = response.data;
      setMediaUrls({ media: media_url, thumbnail: thumbnail_url });
      regenerateMediaUrl(item.id, media_url, thumbnail_url);
    } catch (error) {
      console.error(`Error regenerating URL for status ID ${item.id}:`, error);
      Alert.alert("Error", "Failed to load media. Please try again.");
    }
  };

  const handleDeletePress = () => {
    Alert.alert(
      "Delete Status",
      "Are you sure you want to delete this status?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDelete(item.id),
        },
      ]
    );
  };

  return (
    <View style={styles.statusItem}>
      <TouchableOpacity onPress={() => onPress(index)} style={styles.statusContent}>
        {item.media_type === "image" && (
          <Image
            source={{ uri: mediaUrls.media || FALLBACK_IMAGE }}
            style={[
              styles.avatar,
              !item.viewed && styles.unreadBorder
            ]}
            onError={() => handleImageError("media")}
          />
        )}
        {item.media_type === "video" && (
          <View style={[
            styles.avatar,
            !item.viewed && styles.unreadBorder
          ]}>
            <Image
              source={{ uri: mediaUrls.thumbnail || FALLBACK_IMAGE }}
              style={styles.avatar}
              onError={() => handleImageError("thumbnail")}
            />
            <View style={styles.playIconContainer}>
              <Ionicons name="play-circle" size={24} color="rgba(255, 255, 255, 0.8)" />
            </View>
          </View>
        )}
        {item.media_type === "text" && (
          <Image
            source={{ uri: item.image || FALLBACK_IMAGE }}
            style={[
              styles.avatar,
              !item.viewed && styles.unreadBorder
            ]}
            onError={() => console.error(`Failed to load shop image: ${item.image}`)}
          />
        )}
        <View style={styles.statusInfo}>
          <Text style={styles.name}>{item.shop}</Text>
          <Text style={styles.time}>{format(new Date(item.created_at), "MMMM d, h:mm a")}</Text>
          <Text style={styles.views}>Views: {item.views_count}</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleDeletePress} style={styles.deleteButton}>
        <Ionicons name="trash-outline" size={20} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  );
};

const StatusScreen = () => {
  const [statuses, setStatuses] = useState([]);
  const [isTextPosting, setIsTextPosting] = useState(false);
  const [isMediaPosting, setIsMediaPosting] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [currentStatusIndex, setCurrentStatusIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const uploadProgressAnim = useRef(new Animated.Value(0));
  const fileInputRef = useRef(null);
  const { shopId, prevRoute } = useLocalSearchParams();
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Subscription from AsyncStorage
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  // Load subscription
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

  // Load session ID
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

  const fetchStatuses = useCallback(async () => {
    if (!sessionId) return;
    try {
      setLoading(true);
      const response = await api.get(`${BACKEND_URL}/shop/${shopId}/active_status/`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionId}`,
        },
      });
      const formattedStatuses = response.data.statuses.map(status => ({
        id: status.id,
        shop_id: status.shop_id,
        shop: status.shop.name,
        text: status.text,
        media: status.media,
        thumbnail_url: status.thumbnail_url,
        media_type: status.media_type,
        created_at: status.created_at,
        views_count: status.views_count,
        image: status.shop.image,
        viewed: status.viewed ?? false,
      }));
      setStatuses(formattedStatuses);
    } catch (error) {
      console.error("Error fetching statuses:", error);
      Alert.alert("Error", "Failed to fetch statuses. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [shopId, sessionId]);

  useEffect(() => {
    if (sessionId) {
      fetchStatuses();
    }
  }, [fetchStatuses, sessionId]);

  useFocusEffect(
    useCallback(() => {
      if (sessionId) {
        fetchStatuses();
      }
    }, [fetchStatuses, sessionId])
  );

  const regenerateMediaUrl = useCallback((statusId, mediaUrl, thumbnailUrl) => {
    setStatuses((prevStatuses) =>
      prevStatuses.map((status) =>
        status.id === statusId ? { ...status, media: mediaUrl, thumbnail_url: thumbnailUrl } : status
      )
    );
  }, []);

  const handleDeleteStatus = useCallback(async (statusId) => {
    try {
      setLoading(true);
      await api.delete(`${BACKEND_URL}/status/${statusId}/delete/`, {
        headers: {
          Authorization: sessionId,
        },
      });
      Alert.alert("Success", "Status deleted successfully.");
      fetchStatuses();
    } catch (error) {
      console.error("Error deleting status:", error);
      const errorMessage = error.response?.data?.error || "Failed to delete status.";
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  }, [sessionId, fetchStatuses]);

  // ──────────────────────────────────────────────────────
  //  FIXED: pickMedia – Copy files to cache, no thumbnails
  // ──────────────────────────────────────────────────────
  const pickMedia = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "Please grant access to your media library to select images or videos.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        quality: 1,
      });

      if (!result.canceled && result.assets?.length > 0) {
        const newMediaPromises = result.assets.map(async (asset) => {
          const { uri, fileName: name, mimeType, fileSize: size, type } = asset;
          const isVideo = type === "video" || mimeType?.startsWith("video/");
          const isImage = type === "image" || mimeType?.startsWith("image/");

          if (!isImage && !isVideo) {
            Alert.alert("Warning", `File "${name || "selected file"}" is not a valid image or video.`);
            return null;
          }

          let finalUri = uri;
          let finalName = name || `media_${Date.now()}.${isVideo ? "mp4" : "jpg"}`;

          try {
            const info = await FileSystem.getInfoAsync(uri);
            if (!info.exists || info.isDirectory) {
              throw new Error("File not found");
            }

            // Copy to cache if not already there
            if (!uri.startsWith(FileSystem.cacheDirectory)) {
              finalUri = `${FileSystem.cacheDirectory}${finalName}`;
              await FileSystem.copyAsync({ from: uri, to: finalUri });
            }

            const newInfo = await FileSystem.getInfoAsync(finalUri);
            if (newInfo.size > 10 * 1024 * 1024) {
              await FileSystem.deleteAsync(finalUri, { idempotent: true });
              Alert.alert("Warning", `File "${name}" is too large (max 10 MB).`);
              return null;
            }

            return {
              id: `${finalUri}_${Date.now()}`,
              uri: finalUri,
              name: finalName,
              type: isVideo ? "video" : "image",
              thumbnail: null, // No thumbnail
              valid: true,
            };
          } catch (error) {
            console.error("Validation failed for:", uri, error);
            try {
              if (finalUri.startsWith(FileSystem.cacheDirectory)) {
                await FileSystem.deleteAsync(finalUri, { idempotent: true });
              }
            } catch (_) {}
            Alert.alert("Warning", `File "${name}" is invalid and will be skipped.`);
            return null;
          }
        });

        const newMedia = (await Promise.all(newMediaPromises)).filter(Boolean);
        setSelectedMedia((prev) => [...prev, ...newMedia]);
      }
    } catch (error) {
      console.error("Error picking media:", error);
      Alert.alert(
        "Error",
        "Failed to select media. Please ensure permissions are granted and try again.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Retry", onPress: pickMedia },
        ]
      );
    }
  };

  const handleSelectMediaWeb = (event) => {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
      const newMedia = files.map((file) => {
        const mediaType = file.type.startsWith("image") ? "image" : "video";
        if (file.size > 10 * 1024 * 1024) {
          Alert.alert("Warning", `File "${file.name}" is too large (max 10 MB).`);
          return null;
        }
        return {
          id: `${file.name}_${Date.now()}`,
          uri: URL.createObjectURL(file),
          name: file.name,
          type: mediaType,
          thumbnail: null,
          file,
          valid: true,
        };
      }).filter(Boolean);
      setSelectedMedia((prev) => [...prev, ...newMedia]);
    }
  };

  const removeMedia = (id) => {
    setSelectedMedia((prev) => prev.filter((m) => m.id !== id));
  };

  const handlePostTextStatus = async () => {
    if (!statusText) {
      Alert.alert("Error", "Please enter some text to post.");
      return;
    }
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("text", statusText);
      await api.post(`${BACKEND_URL}/shop/${shopId}/status/`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${sessionId}`,
        },
      });
      setStatusText("");
      setIsTextPosting(false);
      fetchStatuses();
    } catch (error) {
      console.error("Error posting text status:", error);
      Alert.alert("Error", "Failed to post status. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ──────────────────────────────────────────────────────
  //  FIXED: handlePostMediaStatus – Safe URI handling
  // ──────────────────────────────────────────────────────
  const handlePostMediaStatus = async () => {
    if (!selectedMedia.length && !statusText) {
      Alert.alert("Error", "Please add a caption or select at least one media file.");
      return;
    }
    setLoading(true);
    setUploadProgress(0);
    Animated.timing(uploadProgressAnim.current, {
      toValue: 0,
      duration: 0,
      useNativeDriver: false,
    }).start();

    try {
      const formData = new FormData();
      if (statusText) formData.append("text", statusText);

      const validMedia = [];
      for (const file of selectedMedia) {
        if (!file.valid) continue;

        try {
          if (Platform.OS === "web" && file.file) {
            formData.append("media", file.file);
            validMedia.push(file);
            continue;
          }

          // Ensure file is in cache
          let validUri = file.uri;
          if (!validUri.startsWith(FileSystem.cacheDirectory)) {
            const newUri = `${FileSystem.cacheDirectory}${file.name}`;
            await FileSystem.copyAsync({ from: validUri, to: newUri });
            validUri = newUri;
          }

          const info = await FileSystem.getInfoAsync(validUri);
          if (!info.exists) {
            Alert.alert("Warning", `File "${file.name}" is no longer accessible and will be skipped.`);
            continue;
          }

          formData.append("media", {
            uri: validUri,
            type: file.type === "image" ? "image/jpeg" : "video/mp4",
            name: file.name,
          });
          validMedia.push(file);
        } catch (error) {
          console.error("File validation failed before submit:", file.uri, error);
          Alert.alert("Warning", `File "${file.name}" is invalid and will be skipped.`);
        }
      }

      if (validMedia.length === 0 && !statusText) {
        Alert.alert("Error", "No valid media files or text to submit.");
        setSelectedMedia([]);
        setLoading(false);
        return;
      }

      await api.post(`${BACKEND_URL}/shop/${shopId}/status/`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${sessionId}`,
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.min((progressEvent.loaded / progressEvent.total) * 100, 100);
            setUploadProgress(progress);
            Animated.timing(uploadProgressAnim.current, {
              toValue: Math.min(progress / 100, 1),
              duration: 200,
              useNativeDriver: false,
            }).start();
          }
        },
      });

      setStatusText("");
      setSelectedMedia([]);
      setIsMediaPosting(false);
      fetchStatuses();
    } catch (error) {
      console.error("Error posting media status:", error);
      Alert.alert(
        "Error",
        "Failed to post media statuses. Please try again.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Retry", onPress: handlePostMediaStatus },
        ]
      );
    } finally {
      setLoading(false);
      setUploadProgress(0);
      Animated.timing(uploadProgressAnim.current, {
        toValue: 0,
        duration: 0,
        useNativeDriver: false,
      }).start();
    }
  };

  const handleViewStatus = (index) => {
    setCurrentStatusIndex(index);
  };

  const handleCloseViewer = () => {
    setCurrentStatusIndex(null);
  };

  const renderMediaPreview = () => (
    <ScrollView
      horizontal
      contentContainerStyle={styles.mediaPreviewContainer}
      showsHorizontalScrollIndicator={false}
    >
      {selectedMedia.map((item) => (
        <View key={item.id} style={styles.mediaPreviewWrapper}>
          {item.valid ? (
            item.type === "image" ? (
              <Image
                source={{ uri: item.uri }}
                style={styles.mediaPreview}
                resizeMode="cover"
              />
            ) : (
              // VIDEO: Show placeholder with play icon
              <View style={[styles.mediaPreview, styles.videoPlaceholder]}>
                <Ionicons name="play-circle" size={36} color="#fff" />
              </View>
            )
          ) : (
            <View style={styles.placeholder}>
              <Ionicons
                name={item.type === "image" ? "image-outline" : "videocam-outline"}
                size={30}
                color="#999"
              />
              <Text style={styles.errorText}>No preview</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.removeMediaButton}
            onPress={() => removeMedia(item.id)}
          >
            <Ionicons name="close-circle" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );

  if (subscriptionLoading) {
    return (
      <SafeAreaView style={styles.loader}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loaderText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.navigate("(tabs)/shop")}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Status</Text>
        </View>

        <View style={styles.card}>
          <TouchableOpacity style={styles.myStatus} onPress={() => {}}>
            <Image
              source={{ uri: statuses[0]?.image || FALLBACK_IMAGE }}
              style={styles.avatar}
              onError={() => console.error(`Failed to load myStatus image: ${statuses[0]?.image}`)}
            />
            <View>
              <Text style={styles.name}>My Status</Text>
              <Text style={styles.time}>
                {statuses.length > 0 ? "Tap to view" : "No updates"}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.postButtonsContainer}>
            <TouchableOpacity
              style={styles.postButton}
              onPress={() => {
                setStatusText("");
                setSelectedMedia([]);
                setIsTextPosting(true);
              }}
            >
              <Ionicons name="create-outline" size={20} color="#fff" />
              <Text style={styles.postButtonText}>Text</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.postButton, styles.mediaButton]}
              onPress={() => {
                setStatusText("");
                setSelectedMedia([]);
                setIsMediaPosting(true);
              }}
            >
              <Ionicons name="image-outline" size={20} color="#fff" />
              <Text style={styles.postButtonText}>Media</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subHeader}>Recent Updates</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#34C759" />
          ) : (
            <FlatList
              data={statuses}
              renderItem={({ item, index }) => (
                <StatusItem
                  item={{ ...item, sessionId }}
                  index={index}
                  onPress={handleViewStatus}
                  onDelete={handleDeleteStatus}
                  regenerateMediaUrl={regenerateMediaUrl}
                  sessionId={sessionId}
                />
              )}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.flatListContent}
            />
          )}

          {/* Text Status Modal */}
          <Modal visible={isTextPosting} animationType="slide" transparent>
            <View style={styles.modalContainer}>
              <View style={styles.modalCard}>
                <View style={styles.modalHeaderRow}>
                  <Ionicons name="chatbubble-ellipses-outline" size={24} color="#333" />
                  <Text style={styles.modalHeaderText}>Post a Text Status</Text>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="What's on your mind?"
                  placeholderTextColor="#5A5A5A"
                  value={statusText}
                  onChangeText={setStatusText}
                  multiline
                  numberOfLines={4}
                />
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => setIsTextPosting(false)}
                  >
                    <Ionicons name="close-circle-outline" size={24} color="#FF3B30" />
                    <Text style={styles.actionButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handlePostTextStatus}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#34C759" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle-outline" size={24} color="#34C759" />
                        <Text style={styles.actionButtonText}>Post</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Media Status Modal */}
          <Modal visible={isMediaPosting} animationType="slide" transparent>
            {['standard', 'premium'].includes(subscriptionStatus || '') ? (
              <View style={styles.modalContainer}>
                <View style={styles.modalCard}>
                  <View style={styles.modalHeaderRow}>
                    <Ionicons name="images-outline" size={24} color="#333" />
                    <Text style={styles.modalHeaderText}>Post a Media Status</Text>
                  </View>
                  {selectedMedia.length > 0 && renderMediaPreview()}
                  <TextInput
                    style={styles.input}
                    placeholder="Add a caption (optional)"
                    placeholderTextColor="#5A5A5A"
                    value={statusText}
                    onChangeText={setStatusText}
                    multiline
                    numberOfLines={4}
                  />
                  {loading && (
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBarBackground}>
                        <Animated.View
                          style={[
                            styles.progressBar,
                            {
                              width: uploadProgressAnim.current.interpolate({
                                inputRange: [0, 1],
                                outputRange: ["0%", "100%"],
                              }),
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.progressText}>
                        Uploading: {Math.min(uploadProgress, 100).toFixed(0)}%
                      </Text>
                    </View>
                  )}
                  <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.actionButton} onPress={pickMedia}>
                      <Ionicons name="folder-open-outline" size={24} color="#007AFF" />
                      <Text style={styles.actionButtonText}>Select</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => {
                        setIsMediaPosting(false);
                        setSelectedMedia([]);
                      }}
                    >
                      <Ionicons name="close-circle-outline" size={24} color="#FF3B30" />
                      <Text style={styles.actionButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={handlePostMediaStatus}
                      disabled={loading}
                    >
                      {loading ? (
                        <Ionicons name="cloud-upload-outline" size={24} color="#34C759" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle-outline" size={24} color="#34C759" />
                          <Text style={styles.actionButtonText}>Post</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                  {Platform.OS === "web" && (
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      ref={fileInputRef}
                      onChange={handleSelectMediaWeb}
                      style={{ display: "none" }}
                    />
                  )}
                </View>
              </View>
            ) : (
              <SubscriptionRequired
                visible={true}
                onClose={() => setIsMediaPosting(false)}
              />
            )}
          </Modal>

          {/* Status Viewer */}
          {currentStatusIndex !== null && StatusViewer && (
            <StatusViewer
              statuses={statuses}
              initialIndex={currentStatusIndex}
              onClose={handleCloseViewer}
              sessionId={sessionId}
              onStatusViewed={(viewedData) => {
                const { statuses: viewedStatuses } = viewedData;
                setStatuses((prev) =>
                  prev.map((status) =>
                    viewedStatuses.some((v) => v.id === status.id)
                      ? { ...status, viewed: true }
                      : status
                  )
                );
              }}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

// ────── STYLES (with video placeholder) ──────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  container: {
    flex: 1,
    width: "100%",
    maxWidth: width,
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#007AFF",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  backButton: {
    padding: 5,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    marginLeft: 16,
  },
  card: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    margin: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  myStatus: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#F8F8F8",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  postButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  postButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#34C759",
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  mediaButton: {
    backgroundColor: "#007AFF",
  },
  postButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginLeft: 8,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  time: {
    fontSize: 12,
    color: "#666",
  },
  views: {
    fontSize: 12,
    color: "#666",
  },
  subHeader: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  statusContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  deleteButton: {
    padding: 8,
  },
  unreadBorder: {
    borderWidth: 2,
    borderColor: "#34C759",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 16,
  },
  modalCard: {
    backgroundColor: "#fff",
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  modalHeaderText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginLeft: 8,
  },
  input: {
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: "#333",
    textAlignVertical: "top",
    minHeight: 100,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F8F8",
    paddingVertical: 10,
    borderRadius: 12,
    marginHorizontal: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8,
  },
  mediaPreviewContainer: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 12,
    gap: 8,
  },
  mediaPreviewWrapper: {
    position: "relative",
  },
  mediaPreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  videoPlaceholder: {
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  playIconContainer: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -15 }, { translateY: -15 }],
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 15,
    padding: 5,
  },
  placeholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 10,
    textAlign: "center",
  },
  removeMediaButton: {
    position: "absolute",
    top: -8,
    right: -8,
  },
  flatListContent: {
    paddingBottom: 16,
  },
  progressContainer: {
    marginBottom: 12,
    backgroundColor: "#F8F8F8",
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: "#E0E0E0",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#34C759",
    borderRadius: 3,
  },
  progressText: {
    marginTop: 4,
    fontSize: 14,
    color: "#333",
    textAlign: "center",
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  loaderText: {
    marginTop: 10,
    fontSize: 16,
    color: "#333",
  },
});

export default StatusScreen;