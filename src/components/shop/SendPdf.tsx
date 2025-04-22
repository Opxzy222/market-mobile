import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  Alert,
  StyleSheet,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";

const SendPDF = ({ onSend }) => {
  const [selectedPDF, setSelectedPDF] = useState(null);

  const pickPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true, // Ensure file is accessible
      });

      if (!result.canceled && result.assets?.length > 0) {
        const { uri, name } = result.assets[0];
        setSelectedPDF({
          uri,
          name: name || `document_${Date.now()}.pdf`,
        });
      }
    } catch (error) {
      console.error("Error picking PDF:", error);
      Alert.alert("Error", "Failed to select document. Please try again.");
    }
  };

  const handleRemovePDF = () => {
    setSelectedPDF(null);
  };

  const handleSend = () => {
    if (selectedPDF) {
      onSend(selectedPDF);
      setSelectedPDF(null); // Clear selection after sending
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={pickPDF} style={styles.optionCard}>
        <Ionicons
          name="document-text-outline"
          size={24}
          color="#2980b9"
          style={styles.optionIcon}
        />
        <Text style={styles.optionText}>Select Document</Text>
      </TouchableOpacity>

      {selectedPDF && (
        <View style={styles.previewContainer}>
          <Text style={styles.previewText} numberOfLines={1} ellipsizeMode="tail">
            {selectedPDF.name}
          </Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              onPress={handleRemovePDF}
              style={styles.removeButton}
            >
              <Ionicons name="trash" size={24} color="#ff4d4d" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
              <Text style={styles.sendButtonText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
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
  previewContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  previewText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
    maxWidth: 200, // Prevent overflow
  },
  actionButtons: {
    flexDirection: "row",
    marginTop: 10,
    alignItems: "center",
    gap: 20,
  },
  removeButton: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ff4d4d",
  },
  sendButton: {
    backgroundColor: "#28a745",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  sendButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default SendPDF;