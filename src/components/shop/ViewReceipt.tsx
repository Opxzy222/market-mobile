// src/components/shop/ViewReceipt.tsx
import React, { useState } from "react";
import {
  Alert,
  Modal,
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  Dimensions,
  Platform,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import { Button, IconButton } from "react-native-paper";
import ImageViewer from "react-native-image-zoom-viewer";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const ViewReceiptPDF = ({ receipt }) => {
  if (!receipt || typeof receipt !== "object") {
    console.warn("Invalid receipt prop:", receipt);
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Invalid receipt data</Text>
      </View>
    );
  }

  const { pdf_url, image_urls, receipt_id } = receipt;
  console.log("Receipt image_urls:", JSON.stringify(image_urls, null, 2));

  const [modalVisible, setModalVisible] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Format image_urls for ImageViewer with fallback
  const fallbackImage = "https://via.placeholder.com/800x1200.png";
  const images = (image_urls?.length ? image_urls : [fallbackImage]).map((url, index) => ({
    url,
    props: {
      onError: () => {
        console.error(`Failed to load image ${index + 1}: ${url}`);
        setError(`Failed to load image for page ${index + 1}`);
        Alert.alert("Error", `Failed to load image for page ${index + 1}`);
      },
      onLoad: () => {
        console.log(`Image ${index + 1} loaded: ${url}`);
      },
    },
  }));

  // Request storage permissions
  const requestPermissions = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Storage permission is required to save images.");
      return false;
    }
    return true;
  };

  // Save image to Receipts album only
  const saveImage = async () => {
    if (saving || !images[currentImageIndex]?.url) return;
    setSaving(true);

    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        setSaving(false);
        return;
      }

      const imageUrl = images[currentImageIndex].url;
      const fileName = `receipt_${receipt_id || "unknown"}_page_${currentImageIndex + 1}.png`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`; // Use documentDirectory

      console.log(`Downloading image: ${imageUrl}`);
      const downloadResult = await FileSystem.downloadAsync(imageUrl, fileUri);
      if (downloadResult.status !== 200) {
        throw new Error(`Download failed with status ${downloadResult.status}`);
      }

      // Create or get Receipts album
      let album = await MediaLibrary.getAlbumAsync("Receipts");
      if (!album) {
        console.log("Creating Receipts album");
        album = await MediaLibrary.createAlbumAsync("Receipts", null, false);
      }

      // Create asset and add to Receipts album
      const asset = await MediaLibrary.createAssetAsync(fileUri);
      console.log(`Adding asset ${asset.id} to Receipts album ${album.id}`);
      await MediaLibrary.addAssetsToAlbumAsync([asset], album.id, false); // false to avoid copying to Camera Roll

      // Clean up downloaded file
      await FileSystem.deleteAsync(fileUri, { idempotent: true });

      Alert.alert("Success", "Image saved to Receipts album!");
    } catch (error) {
      console.error("Error saving image:", error);
      Alert.alert("Error", `Failed to save image: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Open PDF externally
  const viewReceiptExternally = async () => {
    if (!pdf_url) {
      Alert.alert("Error", "No PDF available for this receipt");
      return;
    }
    try {
      await WebBrowser.openBrowserAsync(pdf_url);
    } catch (error) {
      console.error("Error opening receipt:", error);
      Alert.alert("Error", "Failed to open the receipt.");
    }
  };

  // Show images in modal
  const viewReceiptAsImages = () => {
    if (!images.length) {
      Alert.alert("Error", "No images available for this receipt.");
      return;
    }
    setError(null);
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      {/* Buttons for viewing options */}
      <View style={styles.buttonContainer}>
        <Button
          mode="outlined"
          icon="image"
          onPress={viewReceiptAsImages}
          disabled={!images.length}
          style={styles.button}
          labelStyle={styles.buttonLabel}
        >
          Images
        </Button>
        <Button
          mode="outlined"
          icon="eye"
          onPress={viewReceiptExternally}
          disabled={false}
          style={styles.button}
          labelStyle={styles.buttonLabel}
        >
          PDF
        </Button>
      </View>

      {/* Modal for displaying images */}
      <Modal
        visible={modalVisible}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        {error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
            <Button
              mode="contained"
              onPress={() => setModalVisible(false)}
              style={styles.closeButton}
            >
              Close
            </Button>
          </View>
        ) : (
          <ImageViewer
            imageUrls={images}
            onCancel={() => setModalVisible(false)}
            enableSwipeDown={true}
            saveToLocalByLongPress={false}
            renderIndicator={(currentIndex, allSize) => (
              <Text style={styles.indicator}>
                {currentIndex}/{allSize}
              </Text>
            )}
            renderHeader={() => (
              <View style={styles.header}>
                <IconButton
                  icon="close"
                  size={24}
                  iconColor="#FFF"
                  onPress={() => setModalVisible(false)}
                  style={styles.closeIcon}
                />
                <Text style={styles.headerTitle}>Receipt Images</Text>
                <IconButton
                  icon={saving ? "loading" : "download"}
                  size={24}
                  iconColor="#FFF"
                  onPress={saveImage}
                  disabled={saving}
                  style={styles.saveIcon}
                />
              </View>
            )}
            backgroundColor="#000"
            maxOverflow={0}
            enablePreload={true}
            loadingRender={() => (
              <ActivityIndicator size="large" color="#FFF" style={styles.centered} />
            )}
            style={styles.imageViewer}
            onChange={(index) => setCurrentImageIndex(index || 0)}
          />
        )}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 8,
  },
  button: {
    borderColor: "#2563EB",
    borderRadius: 8,
  },
  buttonLabel: {
    fontSize: 12,
    color: "#2563EB",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  errorText: {
    color: "#FFF",
    textAlign: "center",
    fontSize: 16,
    marginBottom: 20,
  },
  closeButton: {
    marginTop: 10,
  },
  imageViewer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 50 : 20,
    paddingHorizontal: 10,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerTitle: {
    flex: 1,
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  closeIcon: {
    position: "absolute",
    left: 10,
  },
  saveIcon: {
    position: "absolute",
    right: 10,
  },
  indicator: {
    color: "#FFF",
    fontSize: 16,
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 5,
    borderRadius: 10,
  },
});

export default ViewReceiptPDF;