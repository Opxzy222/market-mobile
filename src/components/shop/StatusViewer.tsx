import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  Image,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { Video } from "expo-av";
import axios from "axios";

const IMAGE_TEXT_DURATION = 6000; // 6 seconds for image and text statuses
const VIDEO_MAX_DURATION = 30000; // 30 seconds maximum for video statuses

const StatusViewer = ({ visible, statuses, onClose, userId }) => {
  const [currentShopIndex, setCurrentShopIndex] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;
  const progressAnimation = useRef(null);
  const pausedTime = useRef(0);
  const isPaused = useRef(false);

  useEffect(() => {
    if (visible) {
      resetStatus();
    }
  }, [visible]);

  const resetStatus = () => {
    let sortedStatuses = statuses.map((shop) => ({
      ...shop,
      statuses: shop.statuses.sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      ), // Always sort oldest to newest
    }));

    let firstUnviewedShopIndex = sortedStatuses.findIndex((shop) =>
      shop.statuses.some((status) => !status.viewed)
    );

    if (firstUnviewedShopIndex !== -1) {
      setCurrentShopIndex(firstUnviewedShopIndex);
      let firstUnviewedStatusIndex = sortedStatuses[
        firstUnviewedShopIndex
      ].statuses.findIndex((status) => !status.viewed);
      setCurrentIndex(firstUnviewedStatusIndex !== -1 ? firstUnviewedStatusIndex : 0);
    } else {
      setCurrentShopIndex(-0);
      setCurrentIndex(-0);
    }
    setTimeout(() => {
      progress.setValue(0);
      startProgress(getStatusDuration());
    }, 0);
  };

  const getAllStatuses = () => {
    return statuses.length > 0 ? statuses[currentShopIndex]?.statuses || [] : [];
  };

  // Calculate duration based on media type of the current status
  const getStatusDuration = () => {
    const currentStatus = getAllStatuses()[currentIndex];
    if (currentStatus && currentStatus.media_type === "video") {
      return VIDEO_MAX_DURATION;
    }
    return IMAGE_TEXT_DURATION;
  };

  useEffect(() => {
    if (visible && !isPaused.current) {
      startProgress(getStatusDuration());
    }
    markStatusAsViewed(getAllStatuses()[currentIndex]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, currentShopIndex]);

  const startProgress = (duration) => {
    if (isPaused.current) return;
    progress.setValue(0);
    progressAnimation.current = Animated.timing(progress, {
      toValue: 1,
      duration: duration,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) handleNext();
    });
  };

  const handleNext = () => {
    const allStatuses = getAllStatuses();
    if (currentIndex < allStatuses.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else if (currentShopIndex < statuses.length - 1) {
      setCurrentShopIndex((prev) => prev + 1);
      setCurrentIndex(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    } else if (currentShopIndex > 0) {
      setCurrentShopIndex((prev) => prev - 1);
      setCurrentIndex(statuses[currentShopIndex - 1].statuses.length - 1);
    }
  };

  const togglePause = () => {
    if (isPaused.current) {
      isPaused.current = false;
      const remainingTime = getStatusDuration() - pausedTime.current;
      startProgress(remainingTime);
    } else {
      isPaused.current = true;
      progressAnimation.current?.stop();
      pausedTime.current = progress.__getValue() * getStatusDuration();
    }
  };

  const markStatusAsViewed = async (status) => {
    if (!status || status.viewed || !userId) return;

    try {
      console.log("Marking status as viewed:", status.id);

      const formData = new FormData();
      formData.append("user_id", userId.toString());
      formData.append("status_ids[]", status.id);

      await axios.post(
        "https://172.27.243.94:8000/mark_status_viewed/",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      status.viewed = true;
    } catch (error) {
      console.error("Error marking status as viewed:", error);
    }
  };

  if (!visible || getAllStatuses().length === 0) return null;

  const currentStatus = getAllStatuses()[currentIndex];
  const isImage = currentStatus?.media_type === "image";
  const isVideo = currentStatus?.media_type === "video";
  const hasMedia = isImage || isVideo;
  const statusText = currentStatus?.text || "";

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.container}>
        {/* Progress Bars */}
        <View style={styles.progressContainer}>
          {getAllStatuses().map((_, idx) => (
            <View key={idx} style={styles.progressBackground}>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    width:
                      idx === currentIndex
                        ? progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: ["0%", "100%"],
                          })
                        : idx < currentIndex
                        ? "100%"
                        : "0%",
                  },
                ]}
              />
            </View>
          ))}
        </View>

        {/* Left side - previous */}
        <TouchableOpacity
          style={styles.leftExpanded}
          onPress={handlePrev}
          onPressIn={togglePause}
          onPressOut={togglePause}
        />

        {/* Center Content */}
        <TouchableOpacity
          style={styles.content}
          activeOpacity={1}
          onPress={togglePause}
        >
          {hasMedia ? (
            <>
              {isVideo ? (
                <Video
                  source={{ uri: currentStatus.media }}
                  style={styles.media}
                  resizeMode="stretch"
                  shouldPlay={!isPaused.current}
                  isLooping={false}
                  onPlaybackStatusUpdate={(status) => {
                    // If video completes playing, move to next immediately
                    if (status.didJustFinish) {
                      // Clear the progress animation if still running
                      progressAnimation.current?.stop();
                      handleNext();
                    }
                  }}
                />
              ) : (
                <Image
                  source={{ uri: currentStatus.media }}
                  style={styles.media}
                  resizeMode="contain"
                />
              )}
              {statusText.trim().length > 0 && (
                <Text style={styles.caption}>{statusText}</Text>
              )}
            </>
          ) : (
            // Plain text status (no media)
            <View style={styles.plainTextContainer}>
              <Text style={styles.plainText}>{statusText}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Right side - next */}
        <TouchableOpacity
          style={styles.rightExpanded}
          onPress={handleNext}
          onPressIn={togglePause}
          onPressOut={togglePause}
        />

        {/* Close Button */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

export default StatusViewer;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#2E2E2E",
    justifyContent: "center",
    alignItems: "center",
  },
  // Progress bars
  progressContainer: {
    flexDirection: "row",
    position: "absolute",
    top: 40,
    width: "90%",
    zIndex: 999,
  },
  progressBackground: {
    flex: 1,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginHorizontal: 2,
    borderRadius: 2,
  },
  progressBar: {
    height: 3,
    backgroundColor: "#fff",
    borderRadius: 2,
  },
  // Tap zones
  leftExpanded: {
    position: "absolute",
    width: "40%",
    height: "100%",
    left: 0,
  },
  rightExpanded: {
    position: "absolute",
    width: "40%",
    height: "100%",
    right: 0,
  },
  // Main content
  content: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
  },
  media: {
    width: "100%",
    height: "70%",
  },
  caption: {
    color: "#f1f1f1",
    fontSize: 20,
    marginTop: 10,
    textAlign: "center",
    fontWeight: "600",
    paddingHorizontal: 20,
  },
  plainTextContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  plainText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#f1f1f1",
    textAlign: "center",
  },
  // Close button
  closeButton: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 999,
  },
  closeText: {
    fontSize: 30,
    color: "#fff",
  },
});
