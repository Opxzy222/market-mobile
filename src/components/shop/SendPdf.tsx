import React, { useState } from 'react';
import { View, TouchableOpacity, Text, Alert, StyleSheet } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';

const SendPDF = ({ onSend }) => {
  const [selectedPDF, setSelectedPDF] = useState(null);

  const pickPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
      });

      if (result.type === 'success') {
        setSelectedPDF(result);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick a document.');
    }
  };

  const handleRemovePDF = () => {
    setSelectedPDF(null);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={pickPDF} style={styles.selectButton}>
        <Text style={styles.selectButtonText}>Select PDF</Text>
      </TouchableOpacity>
      
      {selectedPDF && (
        <View style={styles.previewContainer}>
          <Text style={styles.previewText}>{selectedPDF.name}</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity onPress={handleRemovePDF} style={styles.removeButton}>
              <Ionicons name="trash" size={24} color="#ff4d4d" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onSend(selectedPDF)} style={styles.sendButton}>
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
    padding: 20,
    backgroundColor: '#f8f9fa',
    flex: 1,
  },
  selectButton: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  selectButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  previewContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  previewText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 10,
    alignItems: 'center',
    gap: 20,
  },
  removeButton: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff4d4d',
  },
  sendButton: {
    backgroundColor: '#28a745',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default SendPDF;
