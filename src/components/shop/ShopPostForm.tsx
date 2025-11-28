import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Animated,
  Dimensions,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { Ionicons } from "@expo/vector-icons";
import api from '../../api';
import SubscriptionRequiredModal from "@/components/RequiredSubscription";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { height: screenHeight } = Dimensions.get("window");

const ShopPostForm = ({ shopId, onPostCreated }) => {
  const [description, setDescription] = useState("");
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const uploadProgressAnim = useRef(new Animated.Value(0)); // Keep full ref
  const textInputRef = useRef(null);
  const scrollViewRef = useRef(null);
  const containerViewRef = useRef(null);
  const renderCountRef = useRef(0);

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

  // Render count debug
  useEffect(() => {
    renderCountRef.current += 1;
    console.log(`ShopPostForm rendered (count: ${renderCountRef.current})`);
    return () => {
      console.log("ShopPostForm unmounted");
    };
  }, []);

  // Keyboard scroll
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        if (isFocused && textInputRef.current && containerViewRef.current) {
          textInputRef.current.measureLayout(
            containerViewRef.current,
            (x, y, width, height) => {
              scrollViewRef.current?.scrollTo({ y: y - 20, animated: true });
            },
            () => {
              console.warn("Failed to measure TextInput layout");
            }
          );
        }
      }
    );

    return () => {
      keyboardDidShowListener.remove();
    };
  }, [isFocused]);

  const pickMedia = useCallback(async () => {
    console.log("Picking media");
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "Please grant access to your media library to select images or videos.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: true,
        quality: 1,
      });

      if (!result.canceled && result.assets?.length > 0) {
        if (result.assets.length < 2 && Platform.OS !== "web") {
          Alert.alert(
            "Info",
            "Only one file selected. Want to add more?",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Add More", onPress: pickMedia },
            ]
          );
        }

        const newMediaPromises = result.assets.map(async (asset) => {
          const { uri, fileName: name, mimeType, fileSize: size, type } = asset;
          const isVideo = type === "video" || mimeType?.startsWith("video/");
          const isImage = type === "image" || mimeType?.startsWith("image/");

          if (!isImage && !isVideo) {
            Alert.alert("Warning", `File "${name || 'unknown'}" is not a valid image or video.`);
            return null;
          }

          if (size > 10 * 1024 * 1024) {
            Alert.alert("Warning", `File "${name || 'unknown'}" is too large (max 10 MB).`);
            return null;
          }

          return {
            id: `${uri}_${Date.now()}`,
            uri,
            name: name || `media_${Date.now()}.${isVideo ? "mp4" : "jpg"}`,
            type: isVideo ? "video" : "image",
            mimeType,
            valid: true,
          };
        });

        const newMedia = (await Promise.all(newMediaPromises)).filter(
          (item) => item !== null
        );
        setMedia((prevMedia) => [...prevMedia, ...newMedia]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to select media. Please try again.");
    }
  }, []);

  const removeMedia = useCallback((id) => {
    console.log("Removing media with id:", id);
    setMedia((prevMedia) => prevMedia.filter((m) => m.id !== id));
  }, []);

  const handleSubmit = useCallback(async () => {
    console.log("Submitting post");
    Keyboard.dismiss();
    if (textInputRef.current) {
      textInputRef.current.blur();
      setIsFocused(false);
    }

    // Check subscription
    if (!['standard', 'premium'].includes(subscriptionStatus || '')) {
      setShowSubscriptionModal(true);
      return;
    }

    if (!description.trim()) {
      Alert.alert(
        "Missing Description",
        "Please add a description to your post.",
        [
          {
            text: "OK",
            style: "default",
            onPress: () => {
              if (textInputRef.current) {
                textInputRef.current.focus();
                setIsFocused(true);
              }
            },
          },
        ],
        { cancelable: true }
      );
      return;
    }

    if (media.length === 0) {
      Alert.alert("Error", "Please add at least one media file to your post.");
      return;
    }

    setLoading(true);
    setUploadProgress(0);
    Animated.timing(uploadProgressAnim.current, {
      toValue: 0,
      duration: 0,
      useNativeDriver: false,
    }).start();

    const formData = new FormData();
    formData.append("shop_id", shopId);
    formData.append("description", description);

    const validMedia = [];
    const failedMedia = [];
    for (const file of media) {
      if (file.valid) {
        try {
          const info = await FileSystem.getInfoAsync(file.uri);
          if (!info.exists) {
            failedMedia.push(file.name);
            continue;
          }
          formData.append("files", {
            uri: file.uri.startsWith("file://") ? file.uri : `file://${file.uri}`,
            type: file.mimeType || (file.type === "image" ? "image/jpeg" : "video/mp4"),
            name: file.name,
          });
          validMedia.push(file);
        } catch (error) {
          failedMedia.push(file.name);
        }
      }
    }

    if (validMedia.length === 0) {
      setLoading(false);
      setUploadProgress(0);
      Alert.alert("Error", "No valid media files to submit.");
      setMedia([]);
      return;
    }

    try {
      const response = await api.post(
        `/shops/${shopId}/posts/create/`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          timeout: 30000,
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const progress = Math.min(
                (progressEvent.loaded / progressEvent.total) * 100,
                100
              );
              console.log(`Upload progress: ${progress.toFixed(2)}%`);
              setUploadProgress(progress);
              Animated.timing(uploadProgressAnim.current, {
                toValue: Math.min(progress / 100, 1),
                duration: 200,
                useNativeDriver: false,
              }).start();
            } else {
              console.log("Upload progress: total size unavailable");
              setUploadProgress(0);
            }
          },
        }
      );

      let successMessage = "Post created successfully!";
      if (failedMedia.length > 0) {
        successMessage += `\nWarning: ${failedMedia.length} file(s) failed to upload: ${failedMedia.join(", ")}.`;
      }
      Alert.alert("Success", successMessage);

      if (response.data && onPostCreated) {
        onPostCreated(response.data);
      }

      setDescription("");
      setMedia([]);
    } catch (error) {
      let errorMessage = "Failed to submit post.";
      if (error.code === "ECONNABORTED") {
        errorMessage = "Request timed out. Please check your network.";
      } else if (error.response) {
        errorMessage = `Server error: ${error.response.data?.error || error.response.status}`;
      } else if (error.message.includes("Network Error")) {
        errorMessage = "Network error. Please check your connection.";
      }
      Alert.alert(
        "Error",
        errorMessage,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Retry", onPress: handleSubmit },
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
  }, [description, media, shopId, onPostCreated, subscriptionStatus]);

  const handleFocus = useCallback(() => {
    console.log("Description input focused");
    setIsFocused(true);
    if (textInputRef.current && containerViewRef.current) {
      textInputRef.current.measureLayout(
        containerViewRef.current,
        (x, y, width, height) => {
          scrollViewRef.current?.scrollTo({ y: y - 20, animated: true });
        },
        () => {
          console.warn("Failed to measure TextInput layout");
        }
      );
    }
  }, []);

  const handleBlur = useCallback(() => {
    console.log("Description input blurred");
    setIsFocused(false);
  }, []);

  const renderMediaItem = useCallback(
    ({ item }) => (
      <View style={styles.mediaPreviewWrapper}>
        {!item.valid ? (
          <View style={styles.placeholder}>
            <Ionicons
              name={item.type === "image" ? "image-outline" : "videocam-outline"}
              size={40}
              color="#999"
            />
            <Text style={styles.errorText}>No preview</Text>
          </View>
        ) : item.type === "image" ? (
          <Image
            source={{ uri: item.uri }}
            style={styles.mediaPreview}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.mediaPreview}>
            <Image
              source={{ uri: item.uri }}
              style={styles.mediaPreview}
              resizeMode="cover"
            />
            <View style={styles.playIconContainer}>
              <Ionicons
                name="play-circle"
                size={40}
                color="rgba(255, 255, 255, 0.8)"
              />
            </View>
          </View>
        )}
        <TouchableOpacity
          style={styles.removeMediaButton}
          onPress={() => removeMedia(item.id)}
          activeOpacity={0.7}
        >
          <Ionicons name="close-circle" size={24} color="#ff4d4d" />
        </TouchableOpacity>
      </View>
    ),
    [removeMedia]
  );

  // Loading UI
  if (subscriptionLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#28a745" />
        <Text style={styles.loaderText}>Loading...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View ref={containerViewRef}>
          <Text style={styles.title}>Create a Post</Text>

          <Text style={styles.subtitle}>Select Media (Images or Videos)</Text>
          <TouchableOpacity
            onPress={pickMedia}
            style={styles.optionCard}
            activeOpacity={0.7}
          >
            <Ionicons
              name="image-outline"
              size={24}
              color="#e67e22"
              style={styles.optionIcon}
            />
            <Text style={styles.optionText}>Add Images or Videos</Text>
          </TouchableOpacity>

          <FlatList
            data={media}
            renderItem={renderMediaItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.mediaPreviewContainer}
            numColumns={3}
            scrollEnabled={false}
            keyboardShouldPersistTaps="always"
          />

          <TextInput
            ref={textInputRef}
            style={[styles.input, isFocused && styles.inputFocused]}
            placeholder="Enter post description"
            placeholderTextColor="#888"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            returnKeyType="done"
            blurOnSubmit={true}
            onSubmitEditing={() => {
              console.log("Description input submitted");
              Keyboard.dismiss();
              if (textInputRef.current) {
                textInputRef.current.blur();
                setIsFocused(false);
              }
            }}
            onFocus={handleFocus}
            onBlur={handleBlur}
            accessible={true}
            accessibilityLabel="Post description input"
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

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.7}
            style={[styles.button, loading && styles.buttonDisabled]}
            accessible={true}
            accessibilityLabel="Submit post"
          >
            {loading ? (
              <Ionicons name="cloud-upload-outline" size={24} color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* JUST CALL THE MODAL DIRECTLY */}
      <SubscriptionRequiredModal
        visible={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f9f9f9",
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: screenHeight * 0.1,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 10,
    color: "#555",
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  optionIcon: {
    marginRight: 10,
  },
  optionText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
  },
  mediaPreviewContainer: {
    paddingBottom: 10,
  },
  mediaPreviewWrapper: {
    position: "relative",
    margin: 5,
  },
  mediaPreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  playIconContainer: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -20 }, { translateY: -20 }],
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 20,
    padding: 5,
  },
  placeholder: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "#ff4d4d",
    fontSize: 10,
    textAlign: "center",
  },
  removeMediaButton: {
    position: "absolute",
    top: -8,
    right: -8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 10,
    fontSize: 16,
    backgroundColor: "#fff",
    marginBottom: 15,
    minHeight: 100,
  },
  inputFocused: {
    borderColor: "#28a745",
    shadowColor: "#28a745",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  button: {
    backgroundColor: "#28a745",
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#6c757d",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  progressContainer: {
    marginBottom: 15,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: "#E0E0E0",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#28a745",
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
    backgroundColor: "#f9f9f9",
  },
  loaderText: {
    marginTop: 10,
    fontSize: 16,
    color: "#555",
  },
});

export default ShopPostForm;