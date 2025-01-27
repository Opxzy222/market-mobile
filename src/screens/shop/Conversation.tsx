import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
} from 'react-native';
import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from "@react-native-async-storage/async-storage";

const Conversation = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef(null);
  const websocketRef = useRef(null);

  const params = useLocalSearchParams();
  const { name, conversation_id } = params;
  const router = useRouter();
  const [userId, setUserId] = useState(null);

  // Fetch user ID from AsyncStorage
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const userIdString = await AsyncStorage.getItem('user_id');
        if (userIdString) setUserId(parseInt(userIdString, 10));
      } catch (error) {
        console.error('Error fetching user ID:', error);
      }
    };
    fetchUserId();
  }, []);

  // Fetch messages for the conversation
  useEffect(() => {
    const fetchMessages = async () => {
      if (!conversation_id || !userId) return;

      try {
        const response = await axios.get(
          `https://172.27.243.94:8000/conversation/?conversation_id=${conversation_id}`
        );
        setMessages(response.data);

        // Mark messages as read
        await axios.post(
          'https://172.27.243.94:8000/mark-messages-read/',
          {
            conversation_id,
            user_id: userId,
          },
          { headers: { 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [conversation_id, userId]);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!conversation_id || !userId) return;

    const websocketUrl = `ws://172.27.243.94:8001/ws/chat/${conversation_id}/`;
    websocketRef.current = new WebSocket(websocketUrl);

    websocketRef.current.onopen = () => {
      console.log('WebSocket connected');
    };

    websocketRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.message && data.sender_id) {
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            id: data.id || Date.now(),
            content: data.message,
            sender_id: data.sender_id,
            receiver_id: data.receiver_id,
            timestamp: data.timestamp || new Date().toISOString(),
          },
        ]);
      }
    };

    websocketRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    websocketRef.current.onclose = () => {
      console.log('WebSocket disconnected');
    };

    return () => {
      websocketRef.current?.close();
    };
  }, [conversation_id, userId]);

  // Handle message sending
  const handleSendMessage = () => {
    if (!inputMessage.trim() || !websocketRef.current) return;

    const tempMessage = {
      id: Date.now(),
      content: inputMessage,
      sender_id: userId,
      receiver_id: null, // Set appropriately
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempMessage]);
    setInputMessage('');

    try {
      websocketRef.current.send(
        JSON.stringify({
          message: inputMessage,
          sender_id: userId,
          conversation_id,
        })
      );
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Navigate back
  const handleBackClick = () => {
    console.log('Navigating back');
    router.back();
  };

  // Render each message
  const renderMessage = ({ item }) => {
    const isSentByUser = item.sender_id === userId;
    const messageStyle = isSentByUser ? styles.sentMessage : styles.receivedMessage;

    return (
      <View style={[styles.messageContainer, messageStyle]}>
        <Text style={styles.messageText}>{item.content}</Text>
      </View>
    );
  };


  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackClick} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>{name}</Text>
      </View>

      {loading ? (
        <Text style={styles.loadingText}>Loading messages...</Text>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id?.toString() || Date.now().toString()}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={inputMessage}
          onChangeText={setInputMessage}
        />
        <TouchableOpacity onPress={handleSendMessage} style={styles.sendButton}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
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
  loadingText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  messageList: {
    flexGrow: 1,
    padding: 16,
  },
  messageContainer: {
    marginBottom: 10,
    padding: 10,
    borderRadius: 10,
    maxWidth: '75%',
  },
  sentMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#DCF8C6',
  },
  receivedMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#ECECEC',
  },
  messageText: {
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 10,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: '#25D366',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default Conversation;
