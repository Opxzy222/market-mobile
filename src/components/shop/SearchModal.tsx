import React, { useRef, useEffect } from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, Text, Keyboard } from 'react-native';
import AutocompleteInput from '../AutocompleteInput';

const SearchModal = ({ visible, onClose, onSearch, onSuggestionsStateChange, onFocusChange }) => {
  const textInputRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        if (textInputRef.current) {
          console.log('Focusing TextInput in modal');
          textInputRef.current.focus();
        }
      }, 100);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => {
        console.log('Modal closing');
        Keyboard.dismiss();
        onClose();
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => {
              console.log('Close modal pressed');
              Keyboard.dismiss();
              onClose();
            }}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          <AutocompleteInput
            inputRef={textInputRef}
            onSubmit={onSearch}
            onSuggestionsStateChange={onSuggestionsStateChange}
            onFocusChange={onFocusChange}
            style={styles.input}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    paddingTop: 50,
  },
  modalContent: {
    backgroundColor: '#fff',
    marginHorizontal: 10,
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 10,
  },
  closeButton: {
    fontSize: 20,
    color: '#333',
  },
  input: {
    marginBottom: 10,
  },
});

export default SearchModal;