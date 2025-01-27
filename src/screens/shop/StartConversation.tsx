import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  FlatList,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';

const StartConversation = () => {
  const [userId, setUserId] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const params = useLocalSearchParams();
  const { shopId, name } = params;
  const router = useRouter();

  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const userIdString = await AsyncStorage.getItem('user_id');
        if (userIdString) {
          setUserId(parseInt(userIdString, 10));
        }
      } catch (error) {
        console.error('Error fetching user ID:', error);
      }
    };

    fetchUserId();
  }, []);

  useEffect(() => {
    const fetchMessages = async () => {
      if (userId && shopId) {
        try {
          const response = await axios.get(
            `https://172.27.243.94:8000/messages/?user_id=${userId}&shop_id=${shopId}`
          );
          setMessages(response.data);
        } catch (error) {
          console.error('Error fetching messages:', error);
        }
      }
    };

    fetchMessages();
  }, [userId, shopId]);

  const handleBackClick = () => {
    router.back();
  };

  const toggleMenu = () => {
    setMenuVisible(!menuVisible);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return; // Prevent sending empty messages

    // Optimistic update
    const tempMessage = {
      id: Date.now(), // Temporary ID for UI rendering
      sender_id: userId,
      shop_id: shopId,
      content: inputMessage,
      timestamp: new Date().toISOString(),
    };

    setMessages((prevMessages) => [...prevMessages, tempMessage]);

    try {
      const response = await axios.post('https://172.27.243.94:8000/messages/', {
        sender_id: userId,
        shop_id: shopId,
        content: inputMessage,
      });

      // Replace temporary message with the one from the server
      setMessages((prevMessages) =>
        prevMessages.map((msg) => (msg.id === tempMessage.id ? response.data : msg))
      );

      setInputMessage(''); // Clear input
    } catch (error) {
      console.error('Error sending message:', error);

      // Remove the temporary message in case of error
      setMessages((prevMessages) =>
        prevMessages.filter((msg) => msg.id !== tempMessage.id)
      );
    }
  };

  const renderMessage = ({ item }) => (
    <View
      style={[
        styles.message,
        item.sender_id === userId ? styles.userMessage : styles.shopMessage,
      ]}
    >
      <Text style={styles.messageText}>{item.content}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackClick} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>{name}</Text>
      </View>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={inputMessage}
          onChangeText={setInputMessage}
        />
        <TouchableOpacity onPress={toggleMenu} style={styles.menuButton}>
          <Text style={styles.menuButtonText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
      <Modal visible={menuVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Send Options</Text>
            <TouchableOpacity style={styles.modalButton}>
              <Text style={styles.modalButtonText}>Send Video</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalButton}>
              <Text style={styles.modalButtonText}>Send Picture</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalButton}>
              <Text style={styles.modalButtonText}>Send PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={toggleMenu}
              style={[styles.modalButton, styles.closeButton]}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  messageList: {
    flexGrow: 1,
    padding: 16,
  },
  message: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  shopMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1f1f1',
  },
  messageText: {
    color: '#fff',
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  menuButtonText: {
    color: '#fff',
    fontSize: 18,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalButton: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  modalButtonText: {
    fontSize: 16,
  },
  closeButton: {
    borderBottomWidth: 0,
    marginTop: 16,
  },
});

export default StartConversation;
