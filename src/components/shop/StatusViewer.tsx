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
import { useVideoPlayer, VideoView } from "expo-video";
import { useEvent } from "expo";
import axios from "axios";

const IMAGE_TEXT_DURATION = 6000; // 6 seconds for image and text statuses
const VIDEO_MAX_DURATION = 30000; // 30 seconds maximum for video statuses

const StatusViewer = ({ visible, statuses, onClose, userId }) => {
  console.log("statuses", statuses);

  const [currentShopIndex, setCurrentShopIndex] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sortedStatuses, setSortedStatuses] = useState([]);

  const progress = useRef(new Animated.Value(0)).current;
  const progressAnimation = useRef(null);
  const pausedTime = useRef(0);
  const isPaused = useRef(false);

  // Sort statuses once on first render or when `statuses` change
  useEffect(() => {
  if (statuses.length > 0) {
    let sorted = statuses.map((shop) => ({
      ...shop,
      statuses: shop.statuses
        .slice()
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)), // Sort oldest to newest
    }));

    let firstUnviewedShopIndex = sorted.findIndex((shop) =>
      shop.statuses.some((status) => !status.viewed)
    );

    if (firstUnviewedShopIndex !== -1) {
      let firstUnviewedStatusIndex = sorted[firstUnviewedShopIndex].statuses.findIndex(
        (status) => !status.viewed
      );
      setCurrentShopIndex(firstUnviewedShopIndex);
      setCurrentIndex(firstUnviewedStatusIndex !== -1 ? firstUnviewedStatusIndex : 0);
    } else {
      setCurrentShopIndex(0);
      setCurrentIndex(0);
    }

    setSortedStatuses(sorted);

    setTimeout(() => {
      progress.setValue(0);
      startProgress(getStatusDuration());
    }, 0);
  }
}, [statuses]);

  const getAllStatuses = () => {
    return sortedStatuses[currentShopIndex]?.statuses || [];
  };

  const getStatusDuration = () => {
  const currentStatus = getAllStatuses()[currentIndex];
  if (currentStatus?.media_type === "video") {
    return Math.min(player?.duration * 1000 || VIDEO_MAX_DURATION, VIDEO_MAX_DURATION);
  } else if (currentStatus?.media_type === "image" || currentStatus?.text) {
    return IMAGE_TEXT_DURATION; // Text statuses should follow the 6s rule
  }
  return IMAGE_TEXT_DURATION;
};

  useEffect(() => {
    if (visible) {
      progress.setValue(0);
      startProgress(getStatusDuration());
    }
    markStatusAsViewed(getAllStatuses()[currentIndex]);
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
  if (!allStatuses.length) return; // Ensure statuses are available

  if (currentIndex < allStatuses.length - 1) {
    setCurrentIndex((prev) => prev + 1);
  } else if (currentShopIndex < sortedStatuses.length - 1) {
    setCurrentShopIndex((prev) => prev + 1);
    setCurrentIndex(0);
  } else {
    onClose();
  }
};


  const handlePrev = () => {
  setCurrentIndex((prevIndex) => {
    if (prevIndex > 0) {
      return prevIndex - 1;  // Go to the previous status
    } 
    
    return setCurrentShopIndex((prevShopIndex) => {
      if (prevShopIndex > 0) {
        const prevShopStatuses = sortedStatuses[prevShopIndex - 1].statuses;
        setCurrentIndex(prevShopStatuses.length - 1);  // Last status of previous shop
        return prevShopIndex - 1;
      } else {
        onClose();
        return prevShopIndex; // Ensures no invalid updates
      }
    });
  });
};


  const markStatusAsViewed = async (status) => {
    if (!status || status.viewed || !userId) return;
    try {
      const formData = new FormData();
      formData.append("user_id", userId.toString());
      formData.append("status_ids[]", status.id);

      await axios.post(
        "https://127.0.0.1:8000/mark_status_viewed/",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      status.viewed = true;
    } catch (error) {
      console.error("Error marking status as viewed:", error);
    }
  };

  const togglePause = () => {
  if (!player || !player?.play) return;

  if (isPaused.current) {
    isPaused.current = false;
    const remainingTime = getStatusDuration() - pausedTime.current;
    progress.setValue(pausedTime.current / getStatusDuration());
    startProgress(remainingTime); // Restart progress with remaining time

    if (isVideo && player?.paused) {
      player.play();
    }
  } else {
    isPaused.current = true;
    progressAnimation.current?.stop();  // Stop the timer
    pausedTime.current = progress.__getValue() * getStatusDuration();

    if (isVideo && !player?.paused) {
      player.pause();
    }
  }
};

  const allStatuses = getAllStatuses();
  const hasStatuses = allStatuses.length > 0;

  // Move this above the return statement to ensure Hooks are always called
  const currentStatus = allStatuses[currentIndex] || {};
  const isImage = currentStatus?.media_type === "image";
const isVideo = currentStatus?.media_type === "video";
const hasMedia = isImage || isVideo;
const statusText = currentStatus?.text || "";

  // Always define hooks before any conditional return
  const player = useVideoPlayer(
    currentStatus?.media ?? "", // Provide a fallback that ensures it's never undefined
    (player) => {
      if (player) {
        player.loop = false;
      }
    }
  );

  useEffect(() => {
  if (isVideo && player) {
    const checkDuration = setInterval(() => {
      if (player?.duration) {
        progress.setValue(0);  // Reset progress
        progressAnimation.current?.stop();
        startProgress(getStatusDuration()); // Start timer only after video is ready
        clearInterval(checkDuration); 
      }
    }, 100);

    return () => clearInterval(checkDuration);
  }
}, [player, isVideo]);


  useEffect(() => {
  if (isVideo && player) {
    player.play();
    return () => player.pause();
  }
}, [currentIndex, currentShopIndex, player]);


  useEffect(() => {
    if (isVideo && !isPaused.current) {
      player.play();
    } else {
      player.pause();
    }

    if (!isVideo && progressAnimation?.current) {
      progressAnimation.current.start();
    }

    return () => {
      player.pause();
      progressAnimation?.current?.stop();
    };
  }, [currentIndex, currentShopIndex]);

  if (!visible || !hasStatuses) return null;

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

        {/* Left Side - Previous */}
        <TouchableOpacity
          style={styles.leftExpanded}
          onPress={handlePrev}
          onPressIn={togglePause}
          onPressOut={togglePause}
        />

        {/* Status Content */}
        <TouchableOpacity
          style={styles.content}
          activeOpacity={1}
          onPress={togglePause}
        >
          {hasMedia ? (
            <>
              {isVideo ? (
                <VideoView
                  style={styles.media}
                  resizeMode="cover"
                  player={player}
                  allowsFullscreen={false}
              allowsPictureInPicture={false}
                />
              ) : (
                <Image
                  source={{ uri: currentStatus.media }}
                  style={styles.media}
                  resizeMode="contain"
                />
              )}
              {currentStatus?.text?.trim().length > 0 && (
                <Text style={styles.caption}>{currentStatus.text}</Text>
              )}
            </>
          ) : (
            <View style={styles.plainTextContainer}>
              <Text style={styles.plainText}>{currentStatus?.text}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Right Side - Next */}
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
