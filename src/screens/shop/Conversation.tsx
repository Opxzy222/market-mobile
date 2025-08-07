import { useCallback, useRef, useState, useEffect, memo } from "react";
import { useFocusEffect } from "expo-router";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  FlatList,
  Modal,
  Alert,
  InteractionManager,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  StatusBar,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useLocalSearchParams, useRouter, usePathname } from "expo-router";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { storeData, getData, initializeDatabase, getSingletonSQLiteDatabase } from "../../storage/storage";
import SendImage from "../../components/shop/SendImage";
import SendVideo from "../../components/shop/SendVideo";
import SendPDF from "../../components/shop/SendPdf";
import ChatImage from "../../components/shop/ChatImage";
import ChatVideo from "../../components/shop/ChatVideo";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

const isWeb = Constants.platform?.web;
const CACHE_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

const Conversation = () => {
  const [userId, setUserId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const [senderId, setSenderId] = useState(null);
  const [shopOwner, setShopOwner] = useState(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [sessionId, setSessionId] = useState(null);
  const flatListRef = useRef(null);
  const websocketRef = useRef(null);
  const receivedMessagesRef = useRef(new Set());
  const isScreenFocused = useRef(false);
  const lastCacheAttempt = useRef(0);
  const lastMessagesLength = useRef(0);
  const isDatabaseInitialized = useRef(false);

  const params = useLocalSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { conversation_id, shop_id, prevRoute, name, shop_is_active, shopId } = params;
  const isShopActive = shop_is_active === "true";

  // Initialize database and clean up corrupted data
  useEffect(() => {
    const setupDatabase = async () => {
      if (isDatabaseInitialized.current) {
        console.log("Database already initialized, skipping...");
        return;
      }

      try {
        console.log("Initializing database...");
        await initializeDatabase();
        isDatabaseInitialized.current = true;
        console.log("Database initialized in Conversation");

        // One-time cleanup of corrupted SQLite data
        const db = await getSingletonSQLiteDatabase();
        const rows = await db.getAllAsync<{ key: string; value: string }>(
          "SELECT key, value FROM secure_data WHERE key LIKE 'messages_%';"
        );
        for (const row of rows) {
          const isValid = /^[A-Za-z0-9+/=]+$/.test(row.value) && row.value.length % 4 === 0;
          if (!isValid) {
            console.error(`Found corrupted SQLite data for key: ${row.key}, value: ${row.value}`);
            await db.runAsync("DELETE FROM secure_data WHERE key = ?;", [row.key]);
            console.log(`Removed corrupted SQLite data: ${row.key}`);
          }
        }
      } catch (error) {
        console.error("Failed to initialize database or clear data:", error);
      }
    };
    setupDatabase();
  }, []);

  // Load session and user ID
  useEffect(() => {
    const loadSessionData = async () => {
      try {
        const [sessionIdString, userIdString] = await Promise.all([
          AsyncStorage.getItem("sessionToken"),
          AsyncStorage.getItem("user_id"),
        ]);
        setSessionId(sessionIdString);
        if (userIdString) {
          setUserId(parseInt(userIdString, 10));
        }
      } catch (error) {
        console.error("Error loading session data:", error);
      }
    };
    loadSessionData();
  }, []);

  // Clear messages when conversation_id changes
  useEffect(() => {
    console.log("Conversation ID changed:", conversation_id);
    setMessages([]);
    setMessagesLoaded(false);
    receivedMessagesRef.current.clear();
  }, [conversation_id]);

  // Clean up old caches in SQLite
  const cleanOldCaches = async () => {
    try {
      const now = Date.now();
      const db = await getSingletonSQLiteDatabase();
      
      // Query all message keys in secure_data table
      const rows = await db.getAllAsync<{ key: string }>(
        "SELECT key FROM secure_data WHERE key LIKE 'messages_%';"
      );
      const messageKeys = rows.map((row) => row.key);

      for (const key of messageKeys) {
        const cachedData = await getData(key);
        if (cachedData) {
          try {
            if (!cachedData.match(/^{.*}$|^\[.*\]$/)) {
              console.error(`Invalid JSON for key ${key}:`, cachedData);
              await db.runAsync("DELETE FROM secure_data WHERE key = ?;", [key]);
              console.log(`Removed invalid cache from SQLite: ${key}`);
              continue;
            }
            const { timestamp } = JSON.parse(cachedData);
            if (!timestamp || now - timestamp > CACHE_EXPIRATION_MS) {
              await db.runAsync("DELETE FROM secure_data WHERE key = ?;", [key]);
              console.log(`Removed expired cache from SQLite: ${key}`);
            }
          } catch (parseError) {
            console.error(`Error parsing JSON for ${key}:`, parseError, "Data:", cachedData);
            await db.runAsync("DELETE FROM secure_data WHERE key = ?;", [key]);
            console.log(`Removed corrupted cache from SQLite: ${key}`);
          }
        }
      }
    } catch (error) {
      console.error("Error cleaning old caches:", error);
    }
  };

  // Load cached messages
  const loadCachedMessages = async () => {
    const cacheKey = `messages_${conversation_id}`;
    try {
      console.log("Loading cached messages for key:", cacheKey);
      const cached = await getData(cacheKey);
      if (cached) {
        try {
          if (!cached.match(/^{.*}$|^\[.*\]$/)) {
            console.error(`Invalid JSON for key ${cacheKey}:`, cached);
            const db = await getSingletonSQLiteDatabase();
            await db.runAsync("DELETE FROM secure_data WHERE key = ?;", [cacheKey]);
            console.log(`Removed invalid cache from SQLite: ${cacheKey}`);
            return [];
          }
          const { timestamp, messages } = JSON.parse(cached);
          const now = Date.now();
          if (timestamp && now - timestamp <= CACHE_EXPIRATION_MS) {
            const recentMessages = messages.filter(
              (msg) =>
                now - new Date(msg.timestamp).getTime() <= CACHE_EXPIRATION_MS &&
                msg.conversation_id === conversation_id
            );
            recentMessages.forEach((msg) => receivedMessagesRef.current.add(Number(msg.id)));
            console.log(
              `Loaded cached messages from SQLite for ${cacheKey}, timestamp: ${new Date(
                timestamp
              ).toISOString()}, messageCount: ${recentMessages.length}`
            );
            return recentMessages;
          } else {
            const db = await getSingletonSQLiteDatabase();
            await db.runAsync("DELETE FROM secure_data WHERE key = ?;", [cacheKey]);
            console.log(`Removed expired cache from SQLite: ${cacheKey}`);
            return [];
          }
        } catch (parseError) {
          console.error(`Error parsing cached messages for ${cacheKey}:`, parseError, "Data:", cached);
          const db = await getSingletonSQLiteDatabase();
          await db.runAsync("DELETE FROM secure_data WHERE key = ?;", [cacheKey]);
          console.log(`Removed corrupted cache from SQLite: ${cacheKey}`);
          return [];
        }
      }
      console.log("No cached messages found for key:", cacheKey);
      return [];
    } catch (error) {
      console.error("Error loading cached messages:", error);
      return [];
    }
  };

  useEffect(() => {
    const loadCachedData = async () => {
      if (!conversation_id) return;
      try {
        await cleanOldCaches();
        const cachedMessages = await loadCachedMessages();
        setMessages(cachedMessages);
        setMessagesLoaded(!!cachedMessages.length);
      } catch (error) {
        console.error("Error loading cached data:", error);
      }
    };
    loadCachedData();
  }, [conversation_id]);

  // Cache messages with timestamp
  const cacheMessages = async (messagesToCache, localConversationId = conversation_id) => {
    const cacheKey = `messages_${localConversationId}`;
    const now = Date.now();
    try {
      const recentMessages = messagesToCache.filter(
        (msg) =>
          now - new Date(msg.timestamp).getTime() <= CACHE_EXPIRATION_MS &&
          msg.conversation_id === localConversationId
      );
      const cacheData = {
        timestamp: now,
        messages: recentMessages,
      };
      await storeData(cacheKey, JSON.stringify(cacheData));
      console.log(`Cached messages for ${cacheKey}, timestamp: ${new Date(now).toISOString()}`);
    } catch (error) {
      console.error("Error caching messages:", error);
    }
  };

  // Fetch messages
  const fetchMessages = async () => {
    if (!conversation_id || !sessionId) return;

    setLoading(true);
    setFetchError(false);

    try {
      const response = await axios.get(
        `https://retail-alvinia-goza-f6a0e4f7.koyeb.app/conversation/?conversation_id=${conversation_id}`,
        {
          headers: { Authorization: sessionId },
          params: { limit: 50 },
        }
      );

      if (response.data.length > 0) {
        setSenderId(response.data[0].sender_user_id);
        setShopOwner(response.data[0].receiver_id);
      }

      const now = Date.now();
      const uniqueMessages = response.data
        .reduce((acc, msg) => {
          const key = `${msg.id}-${msg.attachment || ""}`;
          if (!acc.some((m) => `${m.id}-${m.attachment || ""}` === key)) {
            acc.push(msg);
          }
          return acc;
        }, [])
        .filter((msg) => {
          const messageTime = new Date(msg.timestamp).getTime();
          return !receivedMessagesRef.current.has(Number(msg.id)) && now - messageTime <= CACHE_EXPIRATION_MS;
        });

      uniqueMessages.forEach((msg) => receivedMessagesRef.current.add(Number(msg.id)));

      const normalizedMessages = uniqueMessages.map((msg) => {
        let normalizedType = msg.type || msg.msg_type || "text";
        if (["photo", "image/jpeg", "image/png", "jpg", "jpeg", "png"].includes(normalizedType)) {
          normalizedType = "image";
        } else if (["video/mp4", "mp4", "video"].includes(normalizedType) || normalizedType?.toLowerCase().includes("video")) {
          normalizedType = "video";
        } else if (normalizedType === "application/pdf") {
          normalizedType = "pdf";
        }

        if (msg.attachment) {
          const lowerAttachment = msg.attachment.toLowerCase();
          if (lowerAttachment.match(/\.(jpg|jpeg|png|gif)$/)) {
            normalizedType = "image";
          } else if (lowerAttachment.match(/\.mp4$/)) {
            normalizedType = "video";
          } else if (lowerAttachment.match(/\.pdf$/)) {
            normalizedType = "pdf";
          }
        }

        const attachmentPath = msg.attachment
          ? msg.attachment.replace(/conversation_attachments/g, "chat_attachments")
          : null;
        const thumbnailPath = msg.thumbnail_url
          ? msg.thumbnail_url.replace(/conversation_thumbnails/g, "chat_thumbnails")
          : null;

        return {
          ...msg,
          id: Number(msg.id),
          conversation_id, // Add conversation_id
          type: normalizedType,
          name: msg.attachment?.split("/").pop(),
          attachment: attachmentPath,
          thumbnail_url: thumbnailPath,
          pending: !!(msg.pending === true || msg.pending === "true"),
          read: !!(msg.read === true || msg.read === "true"),
        };
      });

      setMessages((prev) => {
        const merged = [
          ...prev.filter(
            (msg) =>
              !normalizedMessages.some(
                (newMsg) =>
                  newMsg.id === msg.id ||
                  (newMsg.attachment && newMsg.attachment === msg.attachment)
              ) &&
              now - new Date(msg.timestamp).getTime() <= CACHE_EXPIRATION_MS &&
              msg.conversation_id === conversation_id
          ),
          ...normalizedMessages,
        ].sort((a, b) => a.id - b.id);
        cacheMessages(merged, conversation_id);
        setMessagesLoaded(true);
        return merged;
      });

      if (isScreenFocused.current && uniqueMessages.length > 0) {
        markMessagesAsRead();
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (conversation_id && sessionId) {
      fetchMessages();
    }
  }, [conversation_id, sessionId]);

  // Mark messages as read
  const markMessagesAsRead = async () => {
    if (!conversation_id || !sessionId || messages.length === 0) return;

    try {
      await axios.post(
        "https://retail-alvinia-goza-f6a0e4f7.koyeb.app/mark-messages-read/",
        { conversation_id },
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

  // WebSocket connection
  useEffect(() => {
    if (!conversation_id) return;

    const connectWebSocket = () => {
      const websocketUrl = `wss://retail-alvinia-goza-f6a0e4f7.koyeb.app/ws/chat/${conversation_id}/?user_id=${userId}`;
      websocketRef.current = new WebSocket(websocketUrl);

      websocketRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("WebSocket message received:", JSON.stringify(data));

          // Validate conversation_id
          if (data.conversation_id && data.conversation_id !== conversation_id) {
            console.log(`Ignoring message for different conversation: ${data.conversation_id}`);
            return;
          }

          if (data.type === "read_update") {
            setMessages((prevMessages) => {
              const updatedMessages = prevMessages
                .filter(
                  (msg) =>
                    Date.now() - new Date(msg.timestamp).getTime() <= CACHE_EXPIRATION_MS &&
                    msg.conversation_id === conversation_id
                )
                .map((msg) =>
                  data.message_ids.includes(Number(msg.id))
                    ? { ...msg, read: true }
                    : msg
                );
              cacheMessages(updatedMessages, conversation_id);
              return updatedMessages;
            });
          } else if (data.type === "chat_message") {
            const messageId = Number(data.message_id);
            const tempId = data.temp_id;

            if (!messageId || isNaN(messageId)) {
              console.log("Invalid message_id:", data.message_id);
              return;
            }

            if (receivedMessagesRef.current.has(messageId)) {
              console.log("Duplicate message ignored by message_id:", messageId);
              return;
            }

            const messageTime = new Date(data.timestamp || new Date().toISOString()).getTime();
            if (Date.now() - messageTime > CACHE_EXPIRATION_MS) {
              console.log(`Skipping old WebSocket message: ${messageId}`);
              return;
            }

            receivedMessagesRef.current.add(messageId);

            let normalizedType = data.msg_type || data.type || "text";
            if (data.attachment) {
              const lowerAttachment = data.attachment.toLowerCase();
              if (lowerAttachment.match(/\.(jpg|jpeg|png|gif)$/)) {
                normalizedType = "image";
              } else if (lowerAttachment.match(/\.(mp4|mov)$/)) {
                normalizedType = "video";
              } else if (lowerAttachment.match(/\.pdf$/)) {
                normalizedType = "pdf";
              }
            }

            const attachmentPath = data.attachment
              ? data.attachment.replace(/conversation_attachments/g, "chat_attachments")
              : null;
            const thumbnailPath = data.thumbnail_url
              ? data.thumbnail_url.replace(/conversation_thumbnails/g, "chat_thumbnails")
              : null;

            setMessages((prevMessages) => {
              const existingIndex = prevMessages.findIndex(
                (msg) =>
                  msg.id === messageId ||
                  (tempId && msg.temp_id === tempId)
              );

              let updatedMessages;
              if (existingIndex !== -1) {
                console.log("Updating existing message:", { messageId, tempId, conversation_id });
                updatedMessages = [...prevMessages];
                updatedMessages[existingIndex] = {
                  ...updatedMessages[existingIndex],
                  id: messageId,
                  conversation_id, // Ensure conversation_id
                  attachment: attachmentPath || updatedMessages[existingIndex].attachment,
                  content: data.message || null,
                  msg_type: normalizedType,
                  thumbnail_url: thumbnailPath || updatedMessages[existingIndex].thumbnail_url,
                  pending: false,
                  read: data.read || false,
                  name: data.attachment?.split("/").pop() || updatedMessages[existingIndex].name,
                  sender_id: data.sender_id,
                  timestamp: data.timestamp || updatedMessages[existingIndex].timestamp,
                };
              } else {
                console.log("Adding new message:", { messageId, tempId, conversation_id });
                updatedMessages = [
                  ...prevMessages.filter(
                    (msg) =>
                      Date.now() - new Date(msg.timestamp).getTime() <= CACHE_EXPIRATION_MS &&
                      msg.conversation_id === conversation_id
                  ),
                  {
                    id: messageId,
                    conversation_id, // Ensure conversation_id
                    content: data.message || null,
                    sender_id: data.sender_id,
                    timestamp: data.timestamp || new Date().toISOString(),
                    attachment: attachmentPath,
                    msg_type: normalizedType,
                    thumbnail_url: thumbnailPath,
                    read: data.read || false,
                    pending: false,
                    name: data.attachment?.split("/").pop(),
                    temp_id: tempId,
                  },
                ];
              }
              cacheMessages(updatedMessages, conversation_id);
              return updatedMessages.sort((a, b) => a.id - b.id);
            });

            if (isAtBottom) {
              InteractionManager.runAfterInteractions(() => {
                if (flatListRef.current) {
                  flatListRef.current.scrollToEnd({ animated: true });
                }
              });
            }

            if (isScreenFocused.current) {
              markMessagesAsRead();
            }
          }
        } catch (error) {
          console.error("WebSocket message error:", error);
        }
      };

      websocketRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      websocketRef.current.onclose = () => {
        console.log("WebSocket closed");
      };
    };

    connectWebSocket();

    return () => {
      websocketRef.current?.close();
    };
  }, [conversation_id, userId]);

  // Send message via WebSocket
  const handleSendMessage = useCallback(() => {
    if (!isShopActive) {
      Alert.alert("Cannot Send", "This shop is no longer active.");
      return;
    }

    if (!inputMessage.trim() || !websocketRef.current || !conversation_id) return;

    const tempId = Date.now();
    const now = Date.now();

    setMessages((prevMessages) => {
      const newMessages = [
        ...prevMessages.filter(
          (msg) =>
            now - new Date(msg.timestamp).getTime() <= CACHE_EXPIRATION_MS &&
            msg.conversation_id === conversation_id
        ),
        {
          id: tempId,
          content: inputMessage,
          sender_id: userId,
          timestamp: new Date().toISOString(),
          attachment: null,
          thumbnail_url: null,
          type: "text",
          read: false,
          pending: true,
          conversation_id, // Add conversation_id
        },
      ];
      cacheMessages(newMessages, conversation_id);
      return newMessages;
    });

    try {
      websocketRef.current.send(
        JSON.stringify({
          content: inputMessage,
          temp_id: tempId,
          sender_id: userId,
          conversation_id: conversation_id,
          timestamp: new Date().toISOString(),
        })
      );
      setInputMessage("");
      setIsAtBottom(true);
      InteractionManager.runAfterInteractions(() => {
        if (messages.length > 0) {
          flatListRef.current?.scrollToEnd({ animated: true });
        }
      });
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Message Failed", "Unable to send message. Please try again.");

      setMessages((prevMessages) => {
        const updatedMessages = prevMessages.filter(
          (msg) => (msg.id !== tempId && msg.temp_id !== tempId) && msg.conversation_id === conversation_id
        );
        cacheMessages(updatedMessages, conversation_id);
        return updatedMessages;
      });
    }
  }, [inputMessage, userId, conversation_id, messages, isShopActive]);

  // Send attachment
  const handleSendAttachment = useCallback(
    async (file, type) => {
      if (!isShopActive) {
        Alert.alert("Cannot Send", "This shop is no longer active.");
        return;
      }

      if (!file?.uri || !conversation_id || !userId || !shopId) {
        Alert.alert("Error", "Invalid file or conversation details.");
        return;
      }

      const tempId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const fileExtension = file.fileName?.split(".").pop()?.toLowerCase() || file.uri.split(".").pop()?.toLowerCase();
      const normalizedType =
        type === "image" || (fileExtension && ["jpg", "jpeg", "png", "gif"].includes(fileExtension))
          ? "image"
          : type === "video" || (fileExtension && ["mp4", "mov"].includes(fileExtension))
          ? "video"
          : type === "pdf" || fileExtension === "pdf"
          ? "pdf"
          : "image";

      const now = Date.now();
      const fileName =
        file.fileName ||
        file.name ||
        `file_${Date.now()}.${normalizedType === "video" ? "mp4" : normalizedType === "pdf" ? "pdf" : "jpg"}`;

      setMessages((prevMessages) => {
        console.log("Adding temporary message:", { tempId, attachment: file.uri, conversation_id });
        const newMessages = [
          ...prevMessages.filter(
            (msg) =>
              now - new Date(msg.timestamp).getTime() <= CACHE_EXPIRATION_MS &&
              msg.conversation_id === conversation_id
          ),
          {
            id: tempId,
            content: null,
            sender_id: userId,
            timestamp: new Date().toISOString(),
            attachment: file.uri,
            msg_type: normalizedType,
            thumbnail_url: null,
            read: false,
            pending: true,
            name: fileName,
            temp_id: tempId,
            conversation_id, // Add conversation_id
          },
        ];
        cacheMessages(newMessages, conversation_id);
        return newMessages;
      });

      try {
        const formData = new FormData();
        formData.append("sender_id", String(userId));
        formData.append("shop_id", String(shopId));
        formData.append("conversation_id", conversation_id);
        formData.append("msg_type", normalizedType);

        let fileUri = file.uri;
        let mimeType =
          file.mimeType ||
          (normalizedType === "video" ? "video/mp4" : normalizedType === "pdf" ? "application/pdf" : "image/jpeg");

        if (Platform.OS === "ios" && !fileUri.startsWith("file://")) {
          fileUri = `file://${fileUri}`;
        }

        let newFile;
        if (fileUri.startsWith("blob:")) {
          const response = await fetch(fileUri);
          if (!response.ok) throw new Error("Failed to fetch blob data");
          const blob = await response.blob();
          newFile = new File([blob], fileName, {
            type: mimeType || blob.type || "application/octet-stream",
          });
        } else {
          newFile = {
            uri: fileUri,
            type: mimeType,
            name: fileName,
          };
        }

        formData.append("file", newFile);

        const response = await axios.post(
          `https://retail-alvinia-goza-f6a0e4f7.koyeb.app/upload/${conversation_id}/`,
          formData,
          {
            headers: { "Content-Type": "multipart/form-data", Authorization: sessionId },
            timeout: 30000,
          }
        );

        const data = response.data;
        if (!data.file_url) throw new Error("File upload failed");

        setMessages((prevMessages) => {
          console.log("Updating with server response:", {
            message_id: data.message_id,
            file_url: data.file_url,
            tempId,
            conversation_id,
          });
          const filteredMessages = prevMessages.filter(
            (msg) =>
              (msg.id !== tempId &&
               msg.temp_id !== tempId &&
               msg.id !== Number(data.message_id)) &&
              msg.conversation_id === conversation_id
          );
          const updatedMessages = [
            ...filteredMessages,
            {
              id: Number(data.message_id),
              content: null,
              sender_id: userId,
              timestamp: new Date().toISOString(),
              attachment: data.file_url,
              msg_type: data.msg_type || normalizedType,
              thumbnail_url: data.thumbnail_url || null,
              read: false,
              pending: false,
              name: fileName,
              temp_id: tempId,
              conversation_id, // Add conversation_id
            },
          ];
          cacheMessages(updatedMessages, conversation_id);
          return updatedMessages.sort((a, b) => a.id - b.id);
        });

        if (websocketRef.current) {
          websocketRef.current.send(
            JSON.stringify({
              sender_id: userId,
              conversation_id: conversation_id,
              type: normalizedType,
              timestamp: new Date().toISOString(),
              content: null,
              attachment: data.file_url,
              thumbnail_url: data.thumbnail_url || null,
              temp_id: tempId,
              receiver_id: shopId,
              message_id: data.message_id,
            })
          );
        }

        setIsAtBottom(true);
        InteractionManager.runAfterInteractions(() => {
          if (messages.length > 0 && flatListRef.current) {
            flatListRef.current.scrollToEnd({ animated: false });
          }
        });
      } catch (error) {
        console.error("Upload error:", error);
        Alert.alert("Upload Failed", "Failed to upload file. Please try again.");

        setMessages((prevMessages) => {
          const updatedMessages = prevMessages.filter(
            (msg) =>
              (msg.id !== tempId && msg.temp_id !== tempId) &&
              msg.conversation_id === conversation_id
          );
          cacheMessages(updatedMessages, conversation_id);
          return updatedMessages;
        });
      }
    },
    [userId, shopId, conversation_id, messages, isShopActive, sessionId]
  );

  // Handle screen focus
  useFocusEffect(
    useCallback(() => {
      isScreenFocused.current = true;
      if (conversation_id && messages.length > 0) {
        markMessagesAsRead();
        InteractionManager.runAfterInteractions(() => {
          if (!loading && messages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: false });
          }
        });
      }
      lastMessagesLength.current = messages.length;
      return () => {
        isScreenFocused.current = false;
      };
    }, [conversation_id, messages, loading])
  );

  // Scroll to bottom on messages load
  useEffect(() => {
    if (!loading && messages.length > 0 && messages.length !== lastMessagesLength.current) {
      InteractionManager.runAfterInteractions(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      });
    }
    lastMessagesLength.current = messages.length;
  }, [loading, messages.length]);

  // Handle input focus
  const handleInputFocus = () => {
    if (!isShopActive) return;
    if (messages.length > 0) {
      setIsAtBottom(true);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  // Handle keyboard
  useEffect(() => {
    const keyboardDidShow = Keyboard.addListener("keyboardDidShow", () => {
      if (!isShopActive) return;
      if (messages.length > 0) {
        setIsAtBottom(true);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    });
    return () => keyboardDidShow.remove();
  }, [messages, isShopActive]);

  // Handle scroll
  const handleScroll = (event) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const isCloseToBottom =
      contentSize.height - contentOffset.y - layoutMeasurement.height < 150;
    setIsAtBottom(isCloseToBottom);
  };

  // Handle scrollToIndex failure
  const onScrollToIndexFailed = (info) => {
    InteractionManager.runAfterInteractions(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    });
  };

  const MessageItem = memo(
    ({ item, userId, sessionId }) => {
      console.log("renderItem item:", JSON.stringify(item));
      const isImage =
        item.msg_type === "image" ||
        (item.attachment &&
          !item.msg_type?.includes("video") &&
          !item.msg_type?.includes("pdf") &&
          item.attachment.match(/\.(jpg|jpeg|png|gif)(\?|$)/i));
      const isVideo =
        item.msg_type === "video" ||
        (item.attachment &&
          !item.msg_type?.includes("image") &&
          !item.msg_type?.includes("pdf") &&
          item.attachment.match(/\.mp4(\?|$)/i));
      const isPdf = item.msg_type === "pdf";
      const mediaUri = item.pending ? item.attachment : item.attachment || null;
      const thumbnailUri = item.thumbnail_url || null;

      const formattedTime = new Date(item.timestamp).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      return (
        <View style={styles.messageWrapper}>
          {item.attachment ? (
            <View
              style={[
                styles.mediaContainer,
                item.sender_id === userId ? { alignSelf: "flex-end" } : { alignSelf: "flex-start" },
              ]}
            >
              {isImage ? (
                <View style={item.pending ? styles.pendingContainer : null}>
                  <ChatImage uri={mediaUri} messageId={item.id} sessionId={sessionId} />
                  {item.pending && (
                    <View style={styles.loadingOverlay}>
                      <Text style={styles.loadingText}>Uploading...</Text>
                    </View>
                  )}
                </View>
              ) : isVideo ? (
                <View style={item.pending ? styles.pendingContainer : null}>
                  <ChatVideo
                    uri={mediaUri}
                    name={item.name}
                    thumbnailUrl={thumbnailUri}
                    pending={!!item.pending}
                    messageId={item.id}
                    sessionId={sessionId}
                  />
                  {item.pending && (
                    <View style={styles.loadingOverlay}>
                      <Text style={styles.loadingText}>Uploading...</Text>
                    </View>
                  )}
                </View>
              ) : isPdf ? (
                <Text style={styles.attachmentText}>PDF Document: {item.name}</Text>
              ) : (
                <Text style={styles.attachmentText}>Unsupported file type</Text>
              )}
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
          ) : (
            <View
              style={[
                styles.message,
                item.sender_id === userId ? styles.userMessage : styles.shopMessage,
              ]}
            >
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
            </View>
          )}
        </View>
      );
    },
    (prevProps, nextProps) => {
      return (
        prevProps.item.id === nextProps.item.id &&
        prevProps.item.read === nextProps.item.read &&
        prevProps.item.pending === nextProps.item.pending &&
        prevProps.item.attachment === nextProps.item.attachment &&
        prevProps.item.thumbnail_url === nextProps.item.thumbnail_url &&
        prevProps.userId === nextProps.userId &&
        prevProps.sessionId === nextProps.sessionId
      );
    }
  );

  const renderItem = useCallback(
    ({ item }) => <MessageItem item={item} userId={userId} sessionId={sessionId} />,
    [userId, sessionId]
  );

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor='#2563EB' />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={
          Platform.OS === "ios" ? (StatusBar.currentHeight || 0) + 60 : 0
        }
      >
        <LinearGradient colors={["#F7FAFC", "#E5E7EB"]} style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.navigate("(tabs)/messages")}
              style={styles.backButton}
            >
              <MaterialIcons name="arrow-back" size={26} color="white" />
            </TouchableOpacity>
            {userId !== shopOwner ? (
              <TouchableOpacity
                onPress={() => {
                  router.push({
                    pathname: "/shop/shop-page",
                    params: { shopId: shopId },
                  });
                }}
              >
                <Text style={styles.ShopheaderText}>{name}</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.headerText}>{name}</Text>
            )}
            <View style={styles.headerSpacer} />
          </View>
  
          {!isShopActive && (
            <View style={styles.deletedShopBanner}>
              <Text style={styles.deletedShopText}>
                This shop is no longer active. You cannot send new messages.
              </Text>
            </View>
          )}
  
          {(loading || fetchError) && (
            <View
              style={[styles.statusBar, fetchError ? styles.errorBar : styles.loadingBar]}
            >
              {loading && (
                <View style={styles.statusContent}>
                  <ActivityIndicator size="small" color="#007AFF" />
                  <Text style={styles.statusText}>Fetching new messages...</Text>
                </View>
              )}
              {fetchError && (
                <View style={styles.statusContent}>
                  <Text style={styles.statusText}>Failed to fetch messages</Text>
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => fetchMessages()}
                  >
                    <Text style={styles.retryButtonText}>Try Again</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
  
          <View style={styles.messagesWrapper}>
            {messages.length === 0 && !messagesLoaded && !loading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.loadingText}>No messages available</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => fetchMessages()}
                >
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderItem}
                contentContainerStyle={styles.messageList}
                contentInset={{ bottom: 80 }}
                contentInsetAdjustmentBehavior="automatic"
                onScroll={handleScroll}
                scrollEventThrottle={16}
                windowSize={10}
                removeClippedSubviews={false}
                initialNumToRender={10}
                maxToRenderPerBatch={5}
                onScrollToIndexFailed={onScrollToIndexFailed}
              />
            )}
          </View>
  
          {isShopActive && (
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, !isShopActive && styles.disabledInput]}
                placeholder="Type a message..."
                value={inputMessage}
                onChangeText={setInputMessage}
                onFocus={handleInputFocus}
                editable={isShopActive}
              />
              <TouchableOpacity
                onPress={() => setMenuVisible(true)}
                style={[styles.menuButton, !isShopActive && styles.disabledButton]}
                disabled={!isShopActive}
              >
                <Text style={styles.menuButtonText}>+</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSendMessage}
                style={[styles.sendButton, !isShopActive && styles.disabledButton]}
                disabled={!isShopActive}
              >
                <Text style={styles.sendButtonText}>Send</Text>
              </TouchableOpacity>
            </View>
          )}
  
          <Modal visible={menuVisible} transparent animationType="slide">
            <Pressable
              style={styles.modalContainer}
              onPress={() => setMenuVisible(false)}
            >
              <Pressable
                style={styles.modalContent}
                onPress={(e) => e.stopPropagation()}
              >
                <View style={styles.dragIndicator} />
                <Text style={styles.modalTitle}>Send Options</Text>
                <SendImage
                  onSend={(file) => {
                    handleSendAttachment(file, "photo");
                    setMenuVisible(false);
                  }}
                />
                <SendVideo
                  onSend={(file) => {
                    handleSendAttachment(file, "video");
                    setMenuVisible(false);
                  }}
                />
                <SendPDF
                  onSend={(file) => {
                    handleSendAttachment(file, "pdf");
                    setMenuVisible(false);
                  }}
                />
                {userId === shopOwner && (
                  <TouchableOpacity
                    style={styles.optionCard}
                    onPress={() => {
                      setMenuVisible(false);
                      router.push({
                        pathname: "/shop/GenerateReceipt",
                        params: {
                          shopId: shopId,
                          prevRoute: pathname,
                          senderId: senderId,
                        },
                      });
                    }}
                  >
                    <Ionicons
                      name="receipt-outline"
                      size={26}
                      color="#8e44ad"
                      style={styles.optionIcon}
                    />
                    <Text style={styles.optionText}>Generate Receipt</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => setMenuVisible(false)}
                  style={styles.closeTouchable}
                >
                  <Ionicons name="close-circle" size={32} color="#aaa" />
                </TouchableOpacity>
              </Pressable>
            </Pressable>
          </Modal>
        </LinearGradient>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#fff", // Overridden by LinearGradient
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 16,
      paddingHorizontal: 12,
      backgroundColor: "#3A7BD5",
      borderBottomLeftRadius: 35,
      borderBottomRightRadius: 35,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 6,
    },
    backButton: {
      padding: 5,
      borderRadius: 12,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    headerText: {
      fontSize: 20,
      fontWeight: "bold",
      color: "#FFFFFF",
      textAlign: "center",
      flex: 1,
    },
    ShopheaderText: {
      fontSize: 20,
      fontWeight: "bold",
      color: "#FFFFFF",
      textAlign: "center",
      flex: 1,
      left: 20
    },
    headerSpacer: {
      width: 42,
    },
    deletedShopBanner: {
      backgroundColor: "#FFCDD2",
      padding: 10,
      marginHorizontal: 16,
      borderRadius: 8,
      alignItems: "center",
    },
    deletedShopText: {
      color: "#D32F2F",
      fontSize: 14,
      fontWeight: "600",
      textAlign: "center",
    },
    statusBar: {
      padding: 10,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(255, 255, 255, 0.9)",
      borderRadius: 12,
      marginHorizontal: 16,
      marginTop: 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 4,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.2)",
    },
    loadingBar: {
      backgroundColor: "transparent",
    },
    errorBar: {
      backgroundColor: "rgba(211, 47, 47, 0.9)",
      borderColor: "rgba(211, 47, 47, 0.3)",
    },
    statusContent: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 4,
      paddingHorizontal: 12,
    },
    statusText: {
      color: "#333",
      fontSize: 14,
      fontWeight: "700",
      marginLeft: 10,
      marginRight: 12,
    },
    retryButton: {
      backgroundColor: "#007AFF",
      borderRadius: 6,
      paddingVertical: 6,
      paddingHorizontal: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    retryButtonText: {
      color: "#fff",
      fontSize: 13,
      fontWeight: "600",
      textAlign: "center",
    },
    messagesWrapper: {
      flex: 1,
      position: "relative",
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      textAlign: "center",
      fontSize: 16,
      color: "#666",
      marginBottom: 16,
    },
    messageList: {
      flexGrow: 1,
      paddingHorizontal: 16,
      paddingBottom: 16,
      marginTop: 12,
    },
    messageWrapper: {
      marginBottom: 12,
    },
    message: {
      padding: 12,
      borderRadius: 8,
    },
    userMessage: {
      alignSelf: "flex-end",
      backgroundColor: "#DCF8C6",
    },
    shopMessage: {
      alignSelf: "flex-start",
      backgroundColor: "#ECECEC",
    },
    mediaContainer: {
      marginVertical: 4,
    },
    messageContent: {
      flexDirection: "row",
      alignItems: "flex-end",
      flexWrap: "wrap",
    },
    timestampContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginLeft: 8,
      marginTop: 3,
    },
    timestampText: {
      fontSize: 12,
      color: "gray",
    },
    checkmark: {
      marginLeft: 3,
    },
    messageText: {
      color: "black",
      fontSize: 16,
    },
    attachmentText: {
      color: "black",
      fontSize: 16,
    },
    pendingContainer: {
      position: "relative",
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: "#ddd",
      backgroundColor: "#fff",
      position: "sticky",
      bottom: 0,
      zIndex: 1,
    },
    input: {
      flex: 1,
      height: 40,
      borderWidth: 1,
      borderColor: "#ddd",
      borderRadius: 8,
      paddingHorizontal: 12,
      marginRight: 8,
    },
    disabledInput: {
      backgroundColor: "#F5F5F5",
      color: "#888",
    },
    menuButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "#007AFF",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 8,
    },
    disabledButton: {
      backgroundColor: "#B0BEC5",
    },
    menuButtonText: {
      color: "#fff",
      fontSize: 18,
    },
    sendButton: {
      backgroundColor: "#007AFF",
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 16,
    },
    sendButtonText: {
      color: "#fff",
      fontSize: 16,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: "#fff",
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 30,
    },
    dragIndicator: {
      width: 45,
      height: 5,
      backgroundColor: "#ccc",
      borderRadius: 4,
      alignSelf: "center",
      marginBottom: 12,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: "#333",
      marginBottom: 24,
      textAlign: "center",
    },
    optionCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#f9f9f9",
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 20,
      marginBottom: 14,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 3,
    },
    optionIcon: {
      marginRight: 14,
    },
    optionText: {
      fontSize: 17,
      color: "#2c3e50",
      fontWeight: "600",
    },
    closeTouchable: {
      alignSelf: "center",
      marginTop: 10,
    },
    videoThumbnailContainer: {
      position: "relative",
      width: 150,
      height: 100,
      borderRadius: 8,
      overflow: "hidden",
    },
    videoThumbnail: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
    },
    playIcon: {
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: [{ translateX: -20 }, { translateY: -20 }],
    },
  });
  
  export default memo(Conversation);