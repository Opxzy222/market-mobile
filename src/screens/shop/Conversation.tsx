import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  Modal,
} from 'react-native';
import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import SendImage from '../../components/shop/SendImage';
import SendVideo from '../../components/shop/SendVideo';
import SendPDF from '../../components/shop/SendPdf';
import { Image } from 'react-native';
import { Video } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import mime from "mime";

const Conversation = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const flatListRef = useRef(null);
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const websocketRef = useRef(null);
  
  const receivedMessagesRef = useRef(new Set()); // Track received messages

  const params = useLocalSearchParams();
  const { name, conversation_id, shop_id, prevRoute } = params;
  const router = useRouter();
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    const fetchSessionId = async () => {
      const sessionIdString = await AsyncStorage.getItem("sessionToken");
      setSessionId(sessionIdString); // No need to parse as an integer
    };

    fetchSessionId();
    console.log(sessionId, 'heya')
  }, []);

  useEffect(() => {
  const fetchMessages = async () => {
    if (!conversation_id || !sessionId) return;

    try {
      // Fetch messages with sessionId in headers
      const response = await axios.get(
        `https://172.27.243.94:8000/conversation/?conversation_id=${conversation_id}`,
        {
          headers: {
            Authorization: sessionId, // Sending sessionId in headers
          },
        }
      );

      const uniqueMessages = response.data.filter(
        (msg) => !receivedMessagesRef.current.has(msg.id)
      );
      uniqueMessages.forEach((msg) => receivedMessagesRef.current.add(msg.id));
      setMessages(uniqueMessages);

      // Mark messages as read with sessionId in headers
      await axios.post(
        "https://172.27.243.94:8000/mark-messages-read/",
        { conversation_id},
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: sessionId, // Sending sessionId in headers
          },
        }
      );
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  fetchMessages();
}, [conversation_id, sessionId]);

  useEffect(() => {
    if (!conversation_id || !sessionId) return;

    const connectWebSocket = () => {
      const websocketUrl = `ws://172.27.243.94:8001/ws/chat/${conversation_id}/`;
      websocketRef.current = new WebSocket(websocketUrl);

      websocketRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("WebSocket received:", data);

        const messageId = `${data.sender_id}-${data.timestamp}`;

        if (!receivedMessagesRef.current.has(messageId)) {
          receivedMessagesRef.current.add(messageId);

          // ✅ Ensure attachments are also added to messages
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              id: messageId,
              content: data.message || null, // Allow empty message content
              sender_id: data.sender_id,
              timestamp: data.timestamp || new Date().toISOString(),
              attachment: data.attachment || null, // ✅ Add attachment
              type: data.type || (data.attachment ? "image" : "text"), // ✅ Infer type
            }
          ]);
        }
      };
    }

    connectWebSocket();

    return () => {
      websocketRef.current?.close();
    };
  }, [conversation_id, sessionId]);

  const toggleMenu = () => {
    setMenuVisible(!menuVisible);
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim() || !websocketRef.current) return;
    
    try {
      websocketRef.current.send(
        JSON.stringify({
          content: inputMessage,
          sender_id: sessionId,
          conversation_id: conversation_id,
          timestamp: new Date().toISOString(),
        })
      );
      setInputMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleSendAttachment = async (file, type) => {
  if (!file || !file.uri) {
    console.error("Invalid file selected");
    return;
  }

  const formData = new FormData();
  formData.append("sender_id", sessionId);
  formData.append("shop_id", shop_id);
  formData.append("conversation_id", conversation_id);

  let newFile;

  if (file.uri.startsWith("blob:")) {
    const response = await fetch(file.uri);
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

  try {
    const response = await axios.post(
      `https://172.27.243.94:8000/upload/${conversation_id}/`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );

    const data = response.data;
    console.log("Upload Response:", data);
    if (!data.file_url) throw new Error("File upload failed");

    // ✅ Send file URL via WebSocket but don't update state yet
    websocketRef.current.send(
      JSON.stringify({
        sender_id: sessionId,
        conversation_id: conversation_id,
        type,
        timestamp: new Date().toISOString(),
        content: null,
        attachment: data.file_url,
      })
    );

    // ✅ WebSocket will handle updating state when message is received
  } catch (error) {
    console.error("Error uploading file:", error);
  }
};


  const handleBackClick = () => {
    router.back();
  };

  useEffect(() => {
    if (!loading) {
      setMessagesLoaded(true);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
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
        const isImage = item.attachment && (item.type?.includes("image") || item.attachment.match(/\.(jpg|jpeg|png|gif)$/i));
        const isVideo = item.attachment && (item.type?.includes("video") || item.attachment.match(/\.(mp4|mov|avi|mkv)$/i));

        return (
          <View style={[styles.message, item.sender_id === sessionId ? styles.userMessage : styles.shopMessage]}>
            {item.attachment ? (
              isImage ? (
                <>
                  {console.log("Image URI:", `https://172.27.243.94:8000${item.attachment}`)}
                  <Image 
                    source={{ uri: `https://172.27.243.94:8000${item.attachment}` }} 
                    onError={(e) => console.error("Image Load Error:", e)}
                    style={{ width: 150, height: 150, borderRadius: 10 }}
                  />
                </>
              ) : isVideo ? (
                <Video
                  source={{ uri: `https://172.27.243.94:8000${item.attachment}` }}
                  style={{ width: 150, height: 150, borderRadius: 10 }}
                  useNativeControls
                  resizeMode="contain"
                  shouldPlay={false}
                />
              ) : (
                <Text style={styles.attachmentText}>Unsupported file type</Text>
              )
            ) : (
              <Text style={styles.messageText}>{item.content}</Text>
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
        <TouchableOpacity onPress={handleSendMessage} style={styles.sendButton}>
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

export default Conversation;
