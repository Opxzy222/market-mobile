import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useFocusEffect } from "expo-router";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  FlatList,
  Modal, Alert, InteractionManager
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import SendImage from '../../components/shop/SendImage';
import SendVideo from '../../components/shop/SendVideo';
import SendPDF from '../../components/shop/SendPdf';
import { Image } from 'react-native';
import { Video } from 'expo-av';

const StartConversation = () => {
  const [userId, setUserId] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const flatListRef = useRef(null);
  const websocketRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const receivedMessagesRef = useRef(new Set()); // Track received messages
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const isScreenFocused = useRef(false); // Track if the screen is focused
  const params = useLocalSearchParams();
  const { shopId, name } = params;
  const router = useRouter();

  useEffect(() => {
      const fetchSessionId = async () => {
        const sessionIdString = await AsyncStorage.getItem("sessionToken");
        setSessionId(sessionIdString);
      };
      fetchSessionId();
    }, []);

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

useFocusEffect(
  useCallback(() => {
    isScreenFocused.current = true;
    markMessagesAsRead(); // ✅ Marks messages only when screen is focused

    return () => {
      isScreenFocused.current = false;
    };
  }, [conversationId, messages])
);

useEffect(() => {
  const fetchMessages = async () => {
    if (!userId || !shopId) return;

    try {
      const response = await axios.get(
        `https://127.0.0.1:8000/messages/?user_id=${userId}&shop_id=${shopId}`
      );

      const uniqueMessages = response.data.messages.filter(
        (msg) => !receivedMessagesRef.current.has(msg.id)
      );
      uniqueMessages.forEach((msg) =>
        receivedMessagesRef.current.add(msg.id)
      );
      setMessages(uniqueMessages);
      setConversationId(response.data.conversation_id); // ✅ Set conversation ID

      // ✅ Only mark messages as read if the screen is focused
      if (isScreenFocused.current && uniqueMessages.length > 0) {
        markMessagesAsRead();
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  fetchMessages();
}, [userId, shopId]);
  
  const markMessagesAsRead = async () => {
      if (!conversationId || !sessionId || messages.length === 0) return;
  
      try {
        await axios.post(
          "https://127.0.0.1:8000/mark-messages-read/",
          { conversationId },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: sessionId,
            },
          }
        );
      } catch (error) {
        console.error("Error marking messages as read:", error);
      }
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
      const response = await axios.post('https://127.0.0.1:8000/messages/', {
        sender_id: userId,
        shop_id: shopId,
        content: inputMessage,
      });

      // Replace temporary message with the one from the server
      setMessages((prevMessages) =>
        prevMessages.map((msg) => (msg.id === tempMessage.id ? response.data : msg))
      );

      // ✅ Set conversation ID from the response
      setConversationId(response.data.conversation_id);

      setInputMessage(''); // Clear input
    } catch (error) {
      console.error('Error sending message:', error);

      // Remove the temporary message in case of error
      setMessages((prevMessages) =>
        prevMessages.filter((msg) => msg.id !== tempMessage.id)
      );
    }
};


useEffect(() => {
  if (!conversationId) return;

  const connectWebSocket = () => {
    const websocketUrl = `ws://127.0.0.1:8001/ws/chat/${conversationId}/`;
    websocketRef.current = new WebSocket(websocketUrl);

    websocketRef.current.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("WebSocket received:", data);

  if (data.type === "read_update") {
    setMessages((prevMessages) => {
      const updatedMessages = prevMessages.map((msg) =>
        data.message_ids.includes(msg.id) ? { ...msg, read: true } : msg
      );
      return updatedMessages;
    });
  } else {
    let messageId = Number(data.message_id);
    let tempId = Number(data.temp_id); // ✅ Get temp_id

    if (!messageId || isNaN(messageId)) {
      console.warn("⚠️ Received invalid message ID, ignoring...");
      return;
    }

    setMessages((prevMessages) => {
      const existingIndex = prevMessages.findIndex(
        (msg) => msg.id === tempId // ✅ Match tempId with optimistic message
      );

      if (existingIndex !== -1) {
        // ✅ Replace temp message with real one
        const updatedMessages = [...prevMessages];
        updatedMessages[existingIndex] = {
          ...prevMessages[existingIndex],
          id: messageId,
          pending: false,
        };
        return updatedMessages;
      }

      // If temp message wasn't found, add a new one
      return [
        ...prevMessages,
        {
          id: messageId,
          content: data.message,
          sender_id: data.sender_id,
          timestamp: data.timestamp || new Date().toISOString(),
          attachment: data.attachment || null,
          type: data.msg_type || "text",
          read: false,
        },
      ];
    });

    if (isScreenFocused.current) {
      markMessagesAsRead();
    }
  }
};

  };

  connectWebSocket();

  return () => {
    console.log("Closing WebSocket...");
    websocketRef.current?.close();
  };
}, [conversationId]); // ✅ Removed sessionId to avoid unnecessary reconnections

  const handleSendMessage = () => {
  if (!inputMessage.trim() || !websocketRef.current) return;

  // Generate a temporary ID
  const tempId = Date.now();

  // Optimistically add message to UI
  setMessages((prevMessages) => [
    ...prevMessages,
    {
      id: tempId, // Temporary ID
      content: inputMessage,
      sender_id: userId,
      timestamp: new Date().toISOString(),
      attachment: null,
      type: "text",
      read: false,
      pending: true, // Mark as pending until confirmed
    },
  ]);

  try {
    websocketRef.current.send(
      JSON.stringify({
        content: inputMessage,
        temp_id: tempId,
        sender_id: userId,
        conversation_id: conversationId,
        timestamp: new Date().toISOString(),
      })
    );
    setInputMessage("");
  } catch (error) {
    console.error("Error sending message:", error);
    Alert.alert("Message Failed", "Unable to send message. Please try again.");

    // Remove the failed optimistic message
    setMessages((prevMessages) =>
      prevMessages.filter((msg) => msg.id !== tempId)
    );
  }
};

  const handleSendAttachment = async (file, type) => {
  if (!file?.uri) {
    console.error("Invalid file selected");
    return;
  }

  const formData = new FormData();
  formData.append("sender_id", userId);
  formData.append("shop_id", shop_id);
  formData.append("conversation_id", conversationId);

  let newFile;

  try {
    if (file.uri.startsWith("blob:")) {
      const response = await fetch(file.uri);
      if (!response.ok) throw new Error("Failed to fetch blob data");

      const blob = await response.blob();
      newFile = new File([blob], file.name || `file_${Date.now()}`, {
        type: blob.type || "application/octet-stream",
      });
    } else {
      newFile = {
        uri: file.uri.startsWith("file://") ? file.uri : `file://${file.uri}`,
        type: type === "photo" ? "image/jpeg" : type === "video" ? "video/mp4" : "application/octet-stream",
        name: file.name || `file_${Date.now()}.${type === "photo" ? "jpg" : type === "video" ? "mp4" : "bin"}`,
      };
    }

    console.log("Appending File:", newFile);
    formData.append("file", newFile);

    const response = await axios.post(
      `https://127.0.0.1:8000/upload/${conversationId}/`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );

    const data = response.data;
    if (!data.file_url) throw new Error("File upload failed");

    websocketRef.current.send(
      JSON.stringify({
        sender_id: userId,
        conversation_id: conversationId,
        type,
        timestamp: new Date().toISOString(),
        content: null,
        attachment: data.file_url,
      })
    );
  } catch (error) {
    console.error("Error uploading file:", error);
    Alert.alert("Upload Failed", "Failed to upload file. Please try again.");
  }
};

  useEffect(() => {
    if (!loading) {
      setMessagesLoaded(true);
      InteractionManager.runAfterInteractions(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      });
    }
  }, [loading, messages]);

  return (
  <View style={styles.container}>
    <View style={styles.header}>
      <TouchableOpacity
        onPress={() => router.replace(prevRoute || '((tabs)/placeholder)')}
        style={styles.backButton}
      >
        <MaterialIcons name="arrow-back" size={24} color="#007BFF" />
      </TouchableOpacity>
      <Text style={styles.headerText}>{name}</Text>
    </View>

    <View style={styles.messagesWrapper}>
      {loading && !messagesLoaded ? (
        <Text style={styles.loadingText}>Loading messages...</Text>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => (item.id ? `${item.id}` : `${index}`)}
          renderItem={({ item }) => {
            const isImage =
              item.attachment &&
              (item.type?.includes("image") ||
                item.attachment.match(/\.(jpg|jpeg|png|gif)$/i));
            const isVideo =
              item.attachment &&
              (item.type?.includes("video") ||
                item.attachment.match(/\.(mp4|mov|avi|mkv)$/i));

            const formattedTime = new Date(item.timestamp).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true, // Ensures AM/PM format
            });

            // ✅ Log read status before rendering
            console.log(`Rendering message ${item.id}: read=${item.read}`);

            return (
              <View
                style={[
                  styles.message,
                  item.sender_id === userId ? styles.userMessage : styles.shopMessage,
                ]}
              >
                {item.attachment ? (
                  isImage ? (
                    <ChatImage uri={`https://127.0.0.1:8000${item.attachment}`} />
                  ) : isVideo ? (
                    <ChatVideo uri={`https://127.0.0.1:8000${item.attachment}`} />
                  ) : (
                    <Text style={styles.attachmentText}>Unsupported file type</Text>
                  )
                ) : (
                  <View style={styles.messageContent}>
                    <Text style={styles.messageText}>{item.content}</Text>

                    <View style={styles.timestampContainer}>
                      <Text style={styles.timestampText}>{formattedTime}</Text>
                        {item.sender_id === userId && (
                    <MaterialIcons
                      name={item.read ? "done-all" : "done"}
                      size={18}
                      color={item.read ? "#007BFF" : "gray"}
                      style={styles.checkmark}
                  />
                  )}
                  </View>
                  </View>
                )}
              </View>
            );
          }}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
      )}
    </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={inputMessage}
          onChangeText={setInputMessage}
        />
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuButton}>
          <Text style={styles.menuButtonText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={conversationId ? handleSendMessage : sendMessage} 
          style={styles.sendButton}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>

      </View>

      <Modal visible={menuVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Send Options</Text>
            <TouchableOpacity>
              <SendImage onSend={(file) => { handleSendAttachment(file, 'photo'); setMenuVisible(false); }} />
            </TouchableOpacity>
            <TouchableOpacity>
              <SendVideo onSend={(file) => { handleSendAttachment(file, 'video'); setMenuVisible(false); }} />
            </TouchableOpacity>
            <TouchableOpacity>
              <SendPDF onSend={(file) => { handleSendAttachment(file, 'pdf'); setMenuVisible(false); }} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMenuVisible(false)} style={[styles.modalButton, styles.closeButton]}>
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
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 10,
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
    marginLeft: 60,
  },
  messagesWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 16,
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
    backgroundColor: '#DCF8C6',
  },
  shopMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#ECECEC',
  },
  messageContent: {
    flexDirection: "row", // Ensure text and timestamp are in the same row
    alignItems: "flex-end", // Align timestamp slightly lower
    flexWrap: "wrap", // Allow text wrapping if needed
  },
  timestampContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
    marginTop: 3, // Space between message text and timestamp
  },
  timestampText: {
    fontSize: 12,
    color: "gray",
  },
  checkmark: {
    marginLeft: 3, // Add space between text and checkmark
  },
  messageText: {
    color: 'black',
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
