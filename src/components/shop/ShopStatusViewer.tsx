import React, { useEffect, useState, useRef } from "react";
import { View, Text, Image, Modal, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

const StatusViewer = ({ visible, statuses, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const progressRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    if (visible) {
      startAutoPlay();
    }
  }, [visible, currentIndex]);

  const startAutoPlay = () => {
    progressRef.current = setTimeout(() => {
      if (currentIndex < statuses.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        onClose(); // Close when last status is viewed
      }
    }, 5000); // Auto-play after 5 seconds
  };

  const handleNext = () => {
    clearTimeout(progressRef.current);
    if (currentIndex < statuses.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    clearTimeout(progressRef.current);
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleHold = () => clearTimeout(progressRef.current); // Pause on hold
  const handleRelease = () => startAutoPlay(); // Resume when released

  if (!statuses.length) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.left} onPress={handlePrev} onLongPress={handleHold} onPressOut={handleRelease} />
        <View style={styles.content}>
          <Image source={{ uri: statuses[currentIndex].image }} style={styles.image} />
          <Text style={styles.text}>{statuses[currentIndex].text}</Text>
        </View>
        <TouchableOpacity style={styles.right} onPress={handleNext} onLongPress={handleHold} onPressOut={handleRelease} />
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black", justifyContent: "center", alignItems: "center" },
  content: { width: "90%", height: "80%", justifyContent: "center", alignItems: "center" },
  image: { width: "100%", height: "70%", resizeMode: "contain" },
  text: { color: "white", fontSize: 18, marginTop: 10, textAlign: "center" },
  left: { position: "absolute", width: "30%", height: "100%", left: 0 },
  right: { position: "absolute", width: "30%", height: "100%", right: 0 },
  closeButton: { position: "absolute", top: 40, right: 20 },
  closeText: { fontSize: 24, color: "white" },
});

export default StatusViewer;
