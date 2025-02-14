import React, { useEffect, useState, useRef } from "react";
import { View, Text, Image, Modal, TouchableOpacity, StyleSheet, Animated } from "react-native";

const STATUS_DURATION = 5000; // Duration per status in milliseconds

const StatusViewer = ({ visible, statuses, onClose }) => {
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
    let sortedStatuses = statuses.map(shop => ({
      ...shop,
      statuses: shop.statuses.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)), // Always sort oldest to newest
    }));

    let firstUnviewedShopIndex = sortedStatuses.findIndex(shop => 
      shop.statuses.some(status => !status.viewed)
    );

    if (firstUnviewedShopIndex !== -1) {
      setCurrentShopIndex(firstUnviewedShopIndex);
      let firstUnviewedStatusIndex = sortedStatuses[firstUnviewedShopIndex].statuses.findIndex(status => !status.viewed);
      setCurrentIndex(firstUnviewedStatusIndex !== -1 ? firstUnviewedStatusIndex : 0);
    } else {
      setCurrentShopIndex(0);
      setCurrentIndex(0);
    }
    progress.setValue(0);
    startProgress(STATUS_DURATION);
  };

  const getAllStatuses = () => {
    if (statuses.length > 0) {
      return statuses[currentShopIndex]?.statuses || [];
    }
    return [];
  };

  useEffect(() => {
    if (visible && !isPaused.current) {
      startProgress(STATUS_DURATION);
    }
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
      const remainingTime = STATUS_DURATION - pausedTime.current;
      startProgress(remainingTime);
    } else {
      isPaused.current = true;
      progressAnimation.current?.stop();
      pausedTime.current = progress.__getValue() * STATUS_DURATION;
    }
  };

  if (!visible || getAllStatuses().length === 0) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent={true}>
      <View style={styles.container}>
        <View style={styles.progressContainer}>
          {getAllStatuses().map((_, index) => (
            <View key={index} style={styles.progressBackground}>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    width:
                      index === currentIndex
                        ? progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] })
                        : index < currentIndex
                        ? "100%"
                        : "0%",
                  },
                ]}
              />
            </View>
          ))}
        </View>
        <TouchableOpacity style={styles.leftExpanded} onPress={handlePrev} onPressIn={togglePause} onPressOut={togglePause} />
        <TouchableOpacity style={styles.content} onPress={togglePause}>
          {getAllStatuses()[currentIndex]?.image ? (
            <Image source={{ uri: getAllStatuses()[currentIndex].image }} style={styles.image} />
          ) : (
            <View style={styles.noImagePlaceholder}>
              <Text style={styles.noImageText}>No Image</Text>
            </View>
          )}
          <Text style={styles.text}>{getAllStatuses()[currentIndex]?.text || "No caption"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.rightExpanded} onPress={handleNext} onPressIn={togglePause} onPressOut={togglePause} />
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1E1E1E", justifyContent: "center", alignItems: "center" },
  content: { width: "90%", height: "80%", justifyContent: "center", alignItems: "center" },
  image: { width: "100%", height: "70%", resizeMode: "cover", borderRadius: 15 },
  noImagePlaceholder: { width: "100%", height: "70%", borderRadius: 15, backgroundColor: "#333", justifyContent: "center", alignItems: "center" },
  noImageText: { color: "#888", fontSize: 20 },
  text: { color: "#F1F1F1", fontSize: 20, marginTop: 15, textAlign: "center", fontWeight: "bold" },
  leftExpanded: { position: "absolute", width: "40%", height: "100%", left: 0 },
  rightExpanded: { position: "absolute", width: "40%", height: "100%", right: 0 },
  closeButton: { position: "absolute", top: 40, right: 20 },
  closeText: { fontSize: 24, color: "white" },
  progressContainer: { flexDirection: "row", position: "absolute", top: 20, width: "90%" },
  progressBackground: { flex: 1, height: 4, backgroundColor: "#555", marginHorizontal: 2, borderRadius: 2 },
  progressBar: { height: 4, backgroundColor: "#fff", borderRadius: 2 },
});

export default StatusViewer;
