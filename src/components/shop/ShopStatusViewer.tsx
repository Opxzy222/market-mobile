import React, { useEffect, useState, useRef } from "react";
import { View, Text, Image, Modal, TouchableOpacity, StyleSheet, Animated } from "react-native";

const StatusViewer = ({ statuses, initialIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex || 0);
  const progress = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);

  useEffect(() => {
    // Start timer when component mounts
    startTimer();
    
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []); // Runs once on mount

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    startTimer();
  }, [currentIndex]); // Restart timer on index change

  const startTimer = () => {
    progress.setValue(0);
    if (timerRef.current) clearTimeout(timerRef.current);

    Animated.timing(progress, {
      toValue: 1,
      duration: 5000,
      useNativeDriver: false,
    }).start();

    timerRef.current = setTimeout(() => {
      handleNext(true);
    }, 5000);
  };

  const handleNext = (fromTimer = false) => {
    if (currentIndex < statuses.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      if (timerRef.current) clearTimeout(timerRef.current);
      startTimer();
    }
  };

  const handleHold = () => {
    progress.stopAnimation();
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const handleRelease = () => startTimer();

  if (!statuses || statuses.length === 0) return null;

  return (
    <Modal visible={true} animationType="slide" transparent={true}>
      <View style={styles.container}>
        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          {statuses.map((_, index) => (
            <View key={index} style={styles.progressBar}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: currentIndex === index ? progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0%", "100%"],
                    }) : currentIndex > index ? "100%" : "0%",
                  },
                ]}
              />
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.left} onPress={handlePrev} onLongPress={handleHold} onPressOut={handleRelease} />
        
        <View style={styles.content}>
          {statuses[currentIndex]?.image ? (
            <Image source={{ uri: statuses[currentIndex].image }} style={styles.image} />
          ) : (
            <Text style={styles.placeholderText}>No Image Available</Text>
          )}
          <Text style={styles.text}>{statuses[currentIndex]?.text}</Text>
        </View>

        <TouchableOpacity style={styles.right} onPress={() => handleNext(false)} onLongPress={handleHold} onPressOut={handleRelease} />

        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black", justifyContent: "center", alignItems: "center" },
  progressBarContainer: { flexDirection: "row", position: "absolute", top: 40, width: "90%" },
  progressBar: { flex: 1, height: 4, backgroundColor: "#333", marginHorizontal: 2, borderRadius: 2 },
  progressFill: { height: "100%", backgroundColor: "#fff", borderRadius: 2 },
  content: { width: "90%", height: "80%", justifyContent: "center", alignItems: "center" },
  image: { width: "100%", height: "70%", resizeMode: "contain" },
  text: { color: "white", fontSize: 18, marginTop: 10, textAlign: "center" },
  placeholderText: { color: "gray", fontSize: 16, marginTop: 20 },
  left: { position: "absolute", width: "30%", height: "100%", left: 0 },
  right: { position: "absolute", width: "30%", height: "100%", right: 0 },
  closeButton: { position: "absolute", top: 40, right: 20 },
  closeText: { fontSize: 24, color: "white" },
});

export default StatusViewer;
