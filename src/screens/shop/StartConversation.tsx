import React, { useCallback, useEffect, useState, useRef, memo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../api';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import {
  storeData,
  getData,
  initializeDatabase,
  getSingletonSQLiteDatabase,
} from '../../storage/storage';
import SendImage from '../../components/shop/SendImage';
import SendVideo from '../../components/shop/SendVideo';
import SendPDF from '../../components/shop/SendPdf';
import ChatImage from '../../components/shop/ChatImage';
import ChatVideo from "../../components/shop/ChatVideo";
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const isWeb = Constants.platform?.web;

const CACHE_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

const StartConversation = () => {
  const [userId, setUserId] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const [senderId, setSenderId] = useState(null);
  const [shopOwner, setShopOwner] = useState(null);
  const flatListRef = useRef(null);
  const websocketRef = useRef(null);
  const receivedMessagesRef = useRef(new Set());
  const isScreenFocused = useRef(false);
  const hasFetchedMessages = useRef(false);
  const isDatabaseInitialized = useRef(false);

  const params = useLocalSearchParams();
  const { shopId, name } = params;
  const router = useRouter();

  // Validate userId
  const isValidUserId = (id) => id !== null && !isNaN(parseInt(id, 10));

  // Set isScreenFocused based on screen focus
  useFocusEffect(
    useCallback(() => {
      console.log("Screen focused, setting isScreenFocused to true");
      isScreenFocused.current = true;
      if (conversationId && messages.length > 0 && isValidUserId(userId)) {
        console.log("Screen focused, marking messages as read for conversationId:", conversationId);
        markMessagesAsRead();
      }

      return () => {
        console.log("Screen blurred, setting isScreenFocused to false");
        isScreenFocused.current = false;
      };
    }, [conversationId, userId, messages.length])
  );

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
        console.log("Database initialized in StartConversation");

        // One-time cleanup of corrupted SQLite data
        const db = await getSingletonSQLiteDatabase();
        const rows = await db.getAllAsync<{ key: string; value: string }>(
          "SELECT key, value FROM secure_data WHERE key LIKE 'messages_%' OR key LIKE 'conversation_id_%';"
        );
        for (const row of rows) {
          const isValid = /^[A-Za-z0-9+/=]+$/.test(row.value) && row.value.length % 4 === 0;
          if (!isValid) {
            console.error(`Found corrupted SQLite data for key: ${row.key}, value: ${row.value}`);
            await db.runAsync("DELETE FROM secure_data WHERE key = ?;", [row.key]);
            console.log(`Removed corrupted SQLite data: ${row.key}`);
          }
        }

        // Debug SQLite contents
        await debugStorage();
      } catch (error) {
        console.error("Failed to initialize database or clear data:", error);
      }
    };
    setupDatabase();
  }, []);

  // Debug SQLite contents
  const debugStorage = async () => {
    try {
      const db = await getSingletonSQLiteDatabase();
      const rows = await db.getAllAsync<{ key: string; value: string }>(
        "SELECT key, value FROM secure_data;"
      );
      for (const row of rows) {
        if (row.value && /^[A-Za-z0-9+/=]+$/.test(row.value) && row.value.length % 4 === 0) {
          try {
            console.log(`Decoded SQLite value: ${decodeURIComponent(atob(row.value))}`);
          } catch (error) {
            console.error(`Error decoding SQLite key ${row.key}:`, error);
          }
        } else {
          console.error(`Invalid SQLite data for key ${row.key}:`, row.value);
        }
      }
    } catch (error) {
      console.error("Error debugging storage:", error);
    }
  };

  // Clear messages when shopId changes
  useEffect(() => {
    console.log("Shop ID changed:", shopId);
    setMessages([]);
    setConversationId(null);
    setConversationStarted(false);
    setMessagesLoaded(false);
    receivedMessagesRef.current.clear();
  }, [shopId]);

  // Clean up old caches in SQLite
  const cleanOldCaches = async () => {
    try {
      const now = Date.now();
      const db = await getSingletonSQLiteDatabase();

      const rows = await db.getAllAsync<{ key: string }>(
        "SELECT key FROM secure_data WHERE key LIKE 'messages_%' OR key LIKE 'conversation_id_%';"
      );
      const cacheKeys = rows.map((row) => row.key);

      for (const key of cacheKeys) {
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

  // Cache conversation ID with timestamp
  const cacheConversationId = async (shopId, conversationId) => {
    const cacheKey = `conversation_id_${shopId}`;
    try {
      const cacheData = {
        timestamp: Date.now(),
        conversationId,
      };
      await storeData(cacheKey, JSON.stringify(cacheData));
      console.log(`Cached conversationId in SQLite: ${conversationId} for shopId: ${shopId}, timestamp: ${new Date(cacheData.timestamp).toISOString()}`);
    } catch (error) {
      console.error(`Error caching conversationId for ${cacheKey}:`, error);
    }
  };

  // Load cached conversation ID
  const loadCachedConversationId = async (shopId) => {
    const cacheKey = `conversation_id_${shopId}`;
    try {
      const cached = await getData(cacheKey);
      if (cached) {
        try {
          if (!cached.match(/^{.*}$/)) {
            console.error(`Invalid JSON for key ${cacheKey}:`, cached);
            const db = await getSingletonSQLiteDatabase();
            await db.runAsync("DELETE FROM secure_data WHERE key = ?;", [cacheKey]);
            console.log(`Removed invalid cache from SQLite: ${cacheKey}`);
            return null;
          }
          const { timestamp, conversationId } = JSON.parse(cached);
          const now = Date.now();
          if (timestamp && now - timestamp <= CACHE_EXPIRATION_MS) {
            console.log(`Loaded cached conversationId from SQLite: ${conversationId} for ${cacheKey}, timestamp: ${new Date(timestamp).toISOString()}`);
            return conversationId;
          } else {
            const db = await getSingletonSQLiteDatabase();
            await db.runAsync("DELETE FROM secure_data WHERE key = ?;", [cacheKey]);
            console.log(`Removed expired conversationId cache from SQLite: ${cacheKey}`);
            return null;
          }
        } catch (parseError) {
          console.error(`Error parsing conversationId for ${cacheKey}:`, parseError, "Data:", cached);
          const db = await getSingletonSQLiteDatabase();
          await db.runAsync("DELETE FROM secure_data WHERE key = ?;", [cacheKey]);
          console.log(`Removed corrupted cache from SQLite: ${cacheKey}`);
          return null;
        }
      }
      return null;
    } catch (error) {
      console.error(`Error loading cached conversationId for ${cacheKey}:`, error);
      return null;
    }
  };

  // Load cached messages
  const loadCachedMessages = async (localConversationId) => {
    const cacheKey = `messages_${localConversationId}`;
    try {
      console.log("Loading cached messages for key:", cacheKey);
      const cached = await getData(cacheKey);
      if (cached) {
        try {
          if (!cached.match(/^{.*}$/)) {
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
                msg.conversation_id === localConversationId
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

  // Cache messages with timestamp
  const cacheMessages = async (messagesToCache, localConversationId) => {
    const cacheKey = `messages_${localConversationId}`;
    try {
      const now = Date.now();
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
      console.log(
        `Cached messages in SQLite for ${cacheKey}, timestamp: ${new Date(
          now
        ).toISOString()}, messageCount: ${recentMessages.length}`
      );
    } catch (error) {
      console.error("Error caching messages:", error);
    }
  };

  // Load session data, cached conversationId, and messages, then fetch if necessary
  useEffect(() => {
    const loadData = async () => {
  if (!shopId) {
    console.warn("No shopId provided, skipping data load");
    return;
  }

  try {
    // Clean up old caches
    await cleanOldCaches();

    // Load sessionId and userId from AsyncStorage
    const [sessionIdString, userIdString] = await Promise.all([
      AsyncStorage.getItem("sessionToken"),
      AsyncStorage.getItem("user_id"),
    ]);
    console.log("Fetched session ID from AsyncStorage:", sessionIdString, "user ID:", userIdString);
    setSessionId(sessionIdString);

    // Declare parsedUserId outside the if block to ensure it's always in scope
    let parsedUserId = null;
    if (userIdString) {
      parsedUserId = parseInt(userIdString, 10);
      if (isValidUserId(parsedUserId)) {
        setUserId(parsedUserId);
        console.log("User ID loaded:", parsedUserId);
      } else {
        console.warn("Invalid userId in AsyncStorage:", userIdString);
        Alert.alert("Error", "Invalid user ID. Please log in again.");
      }
    } else {
      console.warn("No userId found in AsyncStorage");
      Alert.alert("Error", "User not logged in. Please log in to start a conversation.");
    }

    // Load cached conversationId
    const cachedId = await loadCachedConversationId(shopId);
    if (cachedId) {
      setConversationId(cachedId);
      setConversationStarted(true);
      const cachedMessages = await loadCachedMessages(cachedId);
      console.log("Setting messages from SQLite cache:", {
        messageCount: cachedMessages.length,
        messages: cachedMessages.map((msg) => ({
          id: msg.id,
          conversation_id: msg.conversation_id,
          content: msg.content,
          type: msg.type,
          thumbnail_url: msg.thumbnail_url,
        })),
      });
      setMessages(cachedMessages);
      setMessagesLoaded(!!cachedMessages.length);
    }

    // Fetch messages if no cached conversationId and not already fetched
    // Now parsedUserId is always defined, and isValidUserId(null) will safely return false
    if (!cachedId && sessionIdString && isValidUserId(parsedUserId)) {
      hasFetchedMessages.current = true;
      await fetchMessages(sessionIdString, parsedUserId);
    }
  } catch (error) {
    console.error("Error loading data:", error);
  }
};
    loadData();
  }, [shopId]);

  // Fetch messages
  const fetchMessages = async (sessionId, userId) => {
    if (!isValidUserId(userId) || !shopId || !sessionId) {
      console.warn("Cannot fetch messages: missing or invalid required params", { userId, shopId, sessionId });
      return;
    }

    console.log("Starting fetchMessages, userId:", userId, "shopId:", shopId);
    setLoading(true);
    setFetchError(false);
    receivedMessagesRef.current.clear();

    try {
      const response = await api.get(
        `/messages/?user_id=${userId}&shop_id=${shopId}`,
        { headers: { Authorization: sessionId } }
      );

      console.log("API response:", response.data);
      console.log("Fetched messages:", response.data.messages?.length || 0);

      const newConversationId = response.data.conversation_id ? String(response.data.conversation_id) : null;
      console.log("Setting conversationId:", newConversationId);
      setConversationId(newConversationId);

      if (newConversationId) {
        await cacheConversationId(shopId, newConversationId);
        setConversationStarted(true);
      }

      if (response.data.messages?.length > 0) {
        console.log(
          "Setting senderId:",
          response.data.messages[0].sender_user_id,
          "shopOwner:",
          response.data.messages[0].receiver_id
        );
        setSenderId(response.data.messages[0].sender_user_id);
        setShopOwner(response.data.messages[0].receiver_id);
      }

      const now = Date.now();
      const uniqueMessages = response.data.messages
        .filter(
          (msg) =>
            !receivedMessagesRef.current.has(Number(msg.id)) &&
            now - new Date(msg.timestamp).getTime() <= CACHE_EXPIRATION_MS
        )
        .map((msg) => ({
          ...msg,
          conversation_id: newConversationId, // Add conversation_id
        }));

      console.log("Unique messages:", uniqueMessages.length);
      uniqueMessages.forEach((msg) => receivedMessagesRef.current.add(Number(msg.id)));

      const normalizedMessages = uniqueMessages.map((msg) => {
        let normalizedType = msg.type || msg.msg_type || "text";
        if (
          ["photo", "image/jpeg", "image/png", "jpg", "jpeg", "png"].includes(normalizedType)
        ) {
          normalizedType = "image";
        } else if (
          ["video/mp4", "mp4", "video"].includes(normalizedType) ||
          normalizedType?.toLowerCase().includes("video")
        ) {
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
          conversation_id: newConversationId, // Ensure conversation_id
          type: normalizedType,
          name: msg.attachment?.split("/").pop(),
          attachment: attachmentPath,
          thumbnail_url: thumbnailPath,
          pending: !!(msg.pending === true || msg.pending === "true"),
          read: !!(msg.read === true || msg.read === "true"),
        };
      });

      setMessages((prev) => {
        const now = Date.now();
        const merged = [
          ...prev.filter(
            (msg) =>
              !normalizedMessages.some(
                (newMsg) =>
                  newMsg.id === msg.id ||
                  (newMsg.temp_id && newMsg.temp_id === msg.temp_id) ||
                  (newMsg.attachment && newMsg.attachment === msg.attachment)
              ) &&
              now - new Date(msg.timestamp).getTime() <= CACHE_EXPIRATION_MS &&
              msg.conversation_id === newConversationId
          ),
          ...normalizedMessages,
        ].sort((a, b) => a.id - b.id);

        console.log("Setting merged messages:", {
          messageCount: merged.length,
          messages: merged.map((msg) => ({
            id: msg.id,
            conversation_id: msg.conversation_id,
            content: msg.content,
            type: msg.type,
            attachment: msg.attachment,
            thumbnail_url: msg.thumbnail_url,
            pending: msg.pending,
            read: msg.read,
          })),
        });
        if (newConversationId) {
          cacheMessages(merged, newConversationId);
        }
        setMessagesLoaded(true);
        return merged;
      });
    } catch (error) {
      console.error("Error fetching messages:", error);
      setFetchError(true);
    } finally {
      console.log("Fetch complete, setting loading to false");
      setLoading(false);
    }
  };

  // Mark messages as read
  const markMessagesAsRead = async (localConversationId = conversationId) => {
    if (!localConversationId || !sessionId || messages.length === 0 || !isValidUserId(userId)) {
      console.warn("Cannot mark messages as read:", {
        conversationId: localConversationId,
        sessionId,
        messageCount: messages.length,
        userId,
      });
      return;
    }

    try {
      console.log("Marking messages as read for conversationId:", localConversationId);
      await api.post(
        "/mark-messages-read/",
        { conversation_id: localConversationId },
        { headers: { "Content-Type": "application/json", Authorization: sessionId } }
      );
      console.log("Messages marked as read successfully for conversationId:", localConversationId);
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  // Send message via HTTP (fallback for starting conversation)
  const sendMessage = async () => {
    if (!inputMessage.trim()) {
      console.warn("Cannot send empty message");
      return;
    }

    if (!isValidUserId(userId) || !shopId || !sessionId) {
      console.warn("Cannot send HTTP message: missing or invalid required params", {
        userId,
        shopId,
        sessionId,
      });
      Alert.alert("Error", "User not logged in. Please log in to send a message.");
      return;
    }

    const tempId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const now = Date.now();
    const tempMessage = {
      id: tempId,
      sender_id: userId,
      shop_id: shopId,
      content: inputMessage,
      timestamp: new Date().toISOString(),
      type: "text",
      read: false,
      pending: true,
      attachment: null,
      thumbnail_url: null,
      conversation_id: conversationId || `temp_${shopId}`,
      temp_id: tempId,
    };

    setMessages((prevMessages) => {
      const newMessages = [
        ...prevMessages.filter(
          (msg) =>
            msg.id !== tempId &&
            msg.temp_id !== tempId &&
            now - new Date(msg.timestamp).getTime() <= CACHE_EXPIRATION_MS &&
            msg.conversation_id === (conversationId || `temp_${shopId}`)
        ),
        tempMessage,
      ];
      console.log("Adding temp message:", { tempId, content: inputMessage });
      if (conversationId) {
        cacheMessages(newMessages, conversationId);
      }
      return newMessages;
    });

    try {
      console.log("Sending HTTP message:", inputMessage);
      const response = await api.post(
        "/messages/",
        { sender_id: userId, shop_id: shopId, content: inputMessage },
        { headers: { Authorization: sessionId } }
      );

      const newConversationId = String(response.data.conversation_id);
      setConversationId(newConversationId);
      setConversationStarted(true);
      await cacheConversationId(shopId, newConversationId);
      console.log("Cached conversationId in SQLite:", newConversationId, "for shopId:", shopId);

      const messageId = Number(response.data.id);
      if (isNaN(messageId)) {
        throw new Error(`Invalid message ID in response: ${response.data.id}`);
      }

      // Add messageId and tempId to receivedMessagesRef to prevent WebSocket echo
      receivedMessagesRef.current.add(messageId);
      receivedMessagesRef.current.add(tempId);

      const serverMessage = {
        ...response.data,
        id: messageId,
        conversation_id: newConversationId,
        type: "text",
        read: false,
        pending: false,
        name: response.data.file_url?.split("/").pop(),
        attachment: response.data.file_url
          ? response.data.file_url.replace(/conversation_attachments/g, "chat_attachments")
          : null,
        thumbnail_url: response.data.thumbnail_url
          ? response.data.thumbnail_url.replace(/conversation_thumbnails/g, "chat_thumbnails")
          : null,
        temp_id: tempId,
      };

      setMessages((prevMessages) => {
        const now = Date.now();
        const updatedMessages = [
          ...prevMessages.filter(
            (msg) =>
              msg.id !== tempId &&
              msg.temp_id !== tempId &&
              msg.id !== messageId &&
              !(msg.content === serverMessage.content && msg.sender_id === userId) &&
              now - new Date(msg.timestamp).getTime() <= CACHE_EXPIRATION_MS &&
              msg.conversation_id === newConversationId
          ),
          serverMessage,
        ].sort((a, b) => a.id - b.id);

        console.log("Replacing temp message with server message:", {
          tempId,
          serverId: messageId,
          content: serverMessage.content,
        });
        cacheMessages(updatedMessages, newConversationId);
        return updatedMessages;
      });

      setSenderId(response.data.sender_user_id);
      setShopOwner(response.data.receiver_id);

      setInputMessage("");
      setIsAtBottom(true);
      InteractionManager.runAfterInteractions(() => {
        if (messages.length > 0) {
          console.log("Scrolling to bottom after sending HTTP message");
          flatListRef.current?.scrollToEnd({ animated: true });
        }
      });
      setMessagesLoaded(true);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prevMessages) => {
        const now = Date.now();
        const updatedMessages = prevMessages.filter(
          (msg) =>
            msg.id !== tempId &&
            msg.temp_id !== tempId &&
            now - new Date(msg.timestamp).getTime() <= CACHE_EXPIRATION_MS &&
            msg.conversation_id === (conversationId || `temp_${shopId}`)
        );
        console.log("Removing failed temp message:", tempId);
        if (conversationId) {
          cacheMessages(updatedMessages, conversationId);
        }
        return updatedMessages;
      });
      Alert.alert("Message Failed", "Unable to send message. Please try again.");
    }
  };

  // WebSocket connection
  useEffect(() => {
    if (!conversationId || !isValidUserId(userId)) {
      console.warn("Cannot connect WebSocket: missing or invalid conversationId or userId", { conversationId, userId });
      return;
    }

    console.log("Connecting WebSocket for conversationId:", conversationId, "with userId:", userId);
    const connectWebSocket = () => {
      const websocketUrl = `wss://api.gogo-digital.com/ws/chat/${conversationId}/?user_id=${userId}`;
      websocketRef.current = new WebSocket(websocketUrl);

      websocketRef.current.onopen = () => {
        console.log("WebSocket connected");
      };

      websocketRef.current.onmessage = (event) => {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error, "Data:", event.data);
          return;
        }
        console.log("WebSocket received:", {
          message_id: data.message_id,
          temp_id: data.temp_id,
          conversation_id: data.conversation_id,
          attachment: data.attachment,
          thumbnail_url: data.thumbnail_url,
          type: data.type,
          msg_type: data.msg_type,
          sender_id: data.sender_id,
          content: data.message,
          message_ids: data.message_ids,
          read: data.read,
        });

        const now = Date.now();
        const messageTime = new Date(data.timestamp || new Date().toISOString()).getTime();
        if (now - messageTime > CACHE_EXPIRATION_MS) {
          console.log(`Skipping old WebSocket message: ${data.message_id}`);
          return;
        }

        if (data.type === "read_update") {
          console.log("Processing read_update:", {
            message_ids: data.message_ids,
            conversation_id: data.conversation_id,
            received_at: new Date().toISOString(),
          });
          if (!data.message_ids || !Array.isArray(data.message_ids)) {
            console.warn("Invalid or missing message_ids in read_update:", data.message_ids);
            return;
          }
          const messageIds = data.message_ids.map(Number).filter(id => !isNaN(id));
          if (messageIds.length === 0) {
            console.warn("No valid message_ids in read_update:", data.message_ids);
            return;
          }
          setMessages((prevMessages) => {
            console.log("Messages state before read_update:", prevMessages.map(msg => ({
              id: msg.id,
              temp_id: msg.temp_id,
              read: msg.read,
              sender_id: msg.sender_id,
              conversation_id: msg.conversation_id,
            })));
            const updatedMessages = prevMessages.map((msg) => {
              if (
                messageIds.includes(Number(msg.id)) &&
                !msg.read &&
                msg.conversation_id === conversationId &&
                !msg.pending
              ) {
                console.log(`Updating read status for message ${msg.id} in conversation ${conversationId}`);
                return { ...msg, read: true };
              }
              return msg;
            }).filter(
              (msg) =>
                now - new Date(msg.timestamp).getTime() <= CACHE_EXPIRATION_MS &&
                msg.conversation_id === conversationId
            );
            console.log("Messages state after read_update:", updatedMessages.map(msg => ({
              id: msg.id,
              temp_id: msg.temp_id,
              read: msg.read,
              sender_id: msg.sender_id,
              conversation_id: msg.conversation_id,
            })));
            console.log("Updated read status for messages:", {
              messageIds,
              updatedCount: updatedMessages.filter(msg => messageIds.includes(Number(msg.id)) && msg.read).length,
            });
            cacheMessages(updatedMessages, conversationId);
            return [...updatedMessages]; // Force new array to ensure UI update
          });
        } else if (data.type !== "unread_message_notification") {
          const messageId = Number(data.message_id);
          const tempId = data.temp_id;

          if (!messageId || isNaN(messageId)) {
            console.warn("Invalid message ID, ignoring:", messageId);
            return;
          }

          // Prevent processing duplicates
          if (receivedMessagesRef.current.has(messageId) || (tempId && receivedMessagesRef.current.has(tempId))) {
            console.log(`Message ${messageId || tempId} already processed, skipping...`);
            return;
          }

          // Handle echo messages (sent by the current user)
          if (data.sender_id === userId) {
            console.log(`Processing echo message from user ${userId} with message_id ${messageId} and temp_id ${tempId || 'no temp_id'}`);
            receivedMessagesRef.current.add(messageId);
            if (tempId) receivedMessagesRef.current.add(tempId);

            // Update message with temp_id to server-assigned message_id
            setMessages((prevMessages) => {
              const existingIndex = prevMessages.findIndex(
                (msg) => msg.temp_id === tempId || msg.id === tempId
              );
              if (existingIndex !== -1) {
                const updatedMessages = [...prevMessages];
                updatedMessages[existingIndex] = {
                  ...updatedMessages[existingIndex],
                  id: messageId,
                  pending: false,
                  conversation_id: conversationId,
                  content: data.message || updatedMessages[existingIndex].content,
                  timestamp: data.timestamp || updatedMessages[existingIndex].timestamp,
                  read: data.read || false,
                };
                console.log(`Updated message from temp_id ${tempId} to server id ${messageId}`);
                cacheMessages(updatedMessages, conversationId);
                return [...updatedMessages].sort((a, b) => Number(a.id) - Number(b.id));
              }
              return prevMessages;
            });
            return;
          }

          receivedMessagesRef.current.add(messageId);
          if (tempId) receivedMessagesRef.current.add(tempId);

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
                (tempId && msg.temp_id === tempId) ||
                (attachmentPath && msg.attachment === attachmentPath)
            );

            let updatedMessages;
            if (existingIndex !== -1) {
              updatedMessages = [...prevMessages];
              updatedMessages[existingIndex] = {
                ...updatedMessages[existingIndex],
                id: messageId,
                conversation_id: conversationId,
                attachment: attachmentPath || updatedMessages[existingIndex].attachment,
                content: data.message || null,
                type: normalizedType,
                thumbnail_url: thumbnailPath || updatedMessages[existingIndex].thumbnail_url,
                pending: false,
                read: data.read || false,
                name: data.attachment?.split("/").pop() || updatedMessages[existingIndex].name,
                sender_id: data.sender_id,
                timestamp: data.timestamp || updatedMessages[existingIndex].timestamp,
                temp_id: tempId,
              };
              console.log("Replacing existing message:", {
                oldId: prevMessages[existingIndex].id,
                newId: messageId,
                conversation_id: conversationId,
              });
            } else {
              updatedMessages = [
                ...prevMessages.filter(
                  (msg) =>
                    msg.id !== messageId &&
                    (!tempId || msg.temp_id !== tempId) &&
                    !(attachmentPath && msg.attachment === attachmentPath) &&
                    !(msg.content === data.message && msg.sender_id === data.sender_id) &&
                    now - new Date(msg.timestamp).getTime() <= CACHE_EXPIRATION_MS &&
                    msg.conversation_id === conversationId
                ),
                {
                  id: messageId,
                  conversation_id: conversationId,
                  content: data.message || null,
                  sender_id: data.sender_id,
                  timestamp: data.timestamp || new Date().toISOString(),
                  attachment: attachmentPath,
                  type: normalizedType,
                  thumbnail_url: thumbnailPath,
                  read: data.read || false,
                  pending: false,
                  name: data.attachment?.split("/").pop(),
                  temp_id: tempId,
                },
              ];
              console.log("Adding new WebSocket message:", { messageId, content: data.message });
            }

            // Mark all user messages as read if this is a reply from the shop
            if (data.sender_id !== userId && messages.length > 0 && isValidUserId(userId)) {
              console.log("Shop replied: Marking all user messages as read");
              updatedMessages = updatedMessages.map((msg) => {
                if (msg.sender_id === userId && !msg.pending && !msg.read) {
                  console.log(`Marking message ${msg.id} as read`);
                  return { ...msg, read: true };
                }
                return msg;
              });
              if (isScreenFocused.current) {
                console.log("Triggering markMessagesAsRead due to shop reply");
                markMessagesAsRead(conversationId);
              }
            }

            cacheMessages(updatedMessages, conversationId);
            return [...updatedMessages].sort((a, b) => a.id - b.id); // Force new array
          });

          if (isAtBottom) {
            InteractionManager.runAfterInteractions(() => {
              if (messages.length > 0) {
                console.log("Scrolling to bottom after WebSocket message");
                flatListRef.current?.scrollToEnd({ animated: true });
              }
            });
          }

          if (isScreenFocused.current) {
            console.log("Marking messages as read after WebSocket message");
            markMessagesAsRead(conversationId);
          }
        }
      };

      websocketRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      websocketRef.current.onclose = (event) => {
        console.log("WebSocket closed:", { code: event.code, reason: event.reason });
        setTimeout(connectWebSocket, 3000); // Reconnect after 3 seconds
      };
    };

    connectWebSocket();

    return () => {
      console.log("Closing WebSocket...");
      websocketRef.current?.close();
    };
  }, [conversationId, userId]);

  // Send message via WebSocket
  const handleSendMessage = useCallback(() => {
    if (!inputMessage.trim()) {
      console.warn("Cannot send empty message");
      return;
    }

    if (!isValidUserId(userId) || !shopId || !sessionId) {
      console.warn("Cannot send message: missing or invalid required params", {
        userId,
        shopId,
        sessionId,
      });
      Alert.alert("Error", "User not logged in. Please log in to send a message.");
      return;
    }

    if (!websocketRef.current || !conversationId || websocketRef.current.readyState !== WebSocket.OPEN) {
      console.warn("Cannot send WebSocket message: WebSocket not ready", {
        inputMessage: !!inputMessage.trim(),
        websocket: !!websocketRef.current,
        conversationId,
        readyState: websocketRef.current?.readyState,
      });
      return sendMessage(); // Fallback to HTTP if WebSocket not ready
    }

    const tempId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const now = Date.now();

    setMessages((prevMessages) => {
      const newMessages = [
        ...prevMessages.filter(
          (msg) =>
            msg.id !== tempId &&
            msg.temp_id !== tempId &&
            now - new Date(msg.timestamp).getTime() <= CACHE_EXPIRATION_MS &&
            msg.conversation_id === conversationId
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
          conversation_id: conversationId,
          temp_id: tempId,
        },
      ];
      console.log("Adding temp WebSocket message:", tempId);
      cacheMessages(newMessages, conversationId);
      return newMessages;
    });

    try {
      console.log("Sending WebSocket message:", inputMessage);
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
      setIsAtBottom(true);
      InteractionManager.runAfterInteractions(() => {
        if (messages.length > 0) {
          console.log("Scrolling to bottom after sending WebSocket message");
          flatListRef.current?.scrollToEnd({ animated: true });
        }
      });
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Message Failed", "Unable to send message. Please try again.");

      setMessages((prevMessages) => {
        const now = Date.now();
        const updatedMessages = prevMessages.filter(
          (msg) =>
            msg.id !== tempId &&
            msg.temp_id !== tempId &&
            now - new Date(msg.timestamp).getTime() <= CACHE_EXPIRATION_MS &&
            msg.conversation_id === conversationId
        );
        console.log("Removing failed WebSocket temp message:", tempId);
        cacheMessages(updatedMessages, conversationId);
        return updatedMessages;
      });
    }
  }, [inputMessage, userId, shopId, sessionId, conversationId, messages, sendMessage]);

  // Send attachment
  const handleSendAttachment = useCallback(
    async (file, type) => {
      if (!file?.uri || !isValidUserId(userId) || !shopId || !sessionId) {
        console.error("Invalid file, userId, shopId, or sessionId:", {
          fileUri: file?.uri,
          userId,
          shopId,
          sessionId,
        });
        Alert.alert("Error", "Invalid file or user details. Please log in to send an attachment.");
        return;
      }

      const tempId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const fileExtension = file.name?.split(".").pop()?.toLowerCase() || file.uri.split(".").pop()?.toLowerCase();
      const normalizedType =
        type === "photo" || (fileExtension && ["jpg", "jpeg", "png", "gif"].includes(fileExtension))
          ? "image"
          : type === "video" || (fileExtension && ["mp4", "mov"].includes(fileExtension))
          ? "video"
          : type === "pdf" || fileExtension === "pdf"
          ? "pdf"
          : "image";
      const now = Date.now();
      const fileName =
        file.name ||
        `file_${Date.now()}.${normalizedType === "video" ? "mp4" : normalizedType === "pdf" ? "pdf" : "jpg"}`;

      setMessages((prevMessages) => {
        const newMessages = [
          ...prevMessages.filter(
            (msg) =>
              msg.id !== tempId &&
              msg.temp_id !== tempId &&
              !(msg.attachment && msg.attachment === file.uri) &&
              now - new Date(msg.timestamp).getTime() <= CACHE_EXPIRATION_MS &&
              msg.conversation_id === (conversationId || `temp_${shopId}`)
          ),
          {
            id: tempId,
            content: null,
            sender_id: userId,
            timestamp: new Date().toISOString(),
            attachment: file.uri,
            type: normalizedType,
            thumbnail_url: null,
            read: false,
            pending: true,
            name: fileName,
            conversation_id: conversationId || `temp_${shopId}`,
            temp_id: tempId,
          },
        ];
        console.log("Adding temp attachment message:", { tempId, conversation_id: conversationId || `temp_${shopId}` });
        cacheMessages(newMessages, conversationId || `temp_${shopId}`);
        return newMessages;
      });

      try {
        const formData = new FormData();
        formData.append("sender_id", String(userId));
        formData.append("shop_id", String(shopId));
        formData.append("type", normalizedType);

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

        console.log("Uploading attachment:", { type: normalizedType, fileName });
        const response = await api.post(
          `/upload-conversation/`,
          formData,
          {
            headers: {
              Authorization: sessionId,
              "Content-Type": "multipart/form-data",
            },
            timeout: 30000,
          }
        );

        console.log("Raw server response:", JSON.stringify(response.data));

        // Validate response data
        if (!response.data || !response.data.message_id || !response.data.conversation_id) {
          throw new Error("Invalid server response: missing message_id or conversation_id");
        }

        const messageId = Number(response.data.message_id);
        if (isNaN(messageId)) {
          throw new Error(`Invalid message ID in response: ${response.data.message_id}`);
        }

        const newConversationId = String(response.data.conversation_id);
        if (newConversationId !== conversationId) {
          setConversationId(newConversationId);
          setConversationStarted(true);
          await cacheConversationId(shopId, newConversationId);
          console.log("Cached conversationId in SQLite:", newConversationId, "for shopId:", shopId);
        }

        const serverMessage = {
          id: messageId,
          conversation_id: newConversationId,
          content: null,
          sender_id: userId,
          timestamp: response.data.timestamp || new Date().toISOString(),
          attachment: response.data.file_url
            ? response.data.file_url.replace(/conversation_attachments/g, "chat_attachments")
            : null,
          type: normalizedType,
          thumbnail_url: response.data.thumbnail_url
            ? response.data.thumbnail_url.replace(/conversation_thumbnails/g, "chat_thumbnails")
            : null,
          read: false,
          pending: false,
          name: response.data.file_url?.split("/").pop() || fileName,
          temp_id: tempId,
        };

        setMessages((prevMessages) => {
          const now = Date.now();
          const updatedMessages = [
            ...prevMessages.filter(
              (msg) =>
                msg.id !== tempId &&
                msg.temp_id !== tempId &&
                !(msg.attachment && msg.attachment === serverMessage.attachment) &&
                now - new Date(msg.timestamp).getTime() <= CACHE_EXPIRATION_MS &&
                msg.conversation_id === newConversationId
            ),
            serverMessage,
          ].sort((a, b) => a.id - b.id);

          console.log("Replacing temp attachment message with server message:", serverMessage.id);
          cacheMessages(updatedMessages, newConversationId);
          return updatedMessages;
        });

        setIsAtBottom(true);
        InteractionManager.runAfterInteractions(() => {
          if (flatListRef.current) {
            console.log("Scrolling to bottom after sending attachment");
            flatListRef.current.scrollToEnd({ animated: true });
          }
        });
      } catch (error) {
        console.error("Error sending attachment:", error);
        Alert.alert("Attachment Failed", "Unable to send attachment. Please try again.");

        setMessages((prevMessages) => {
          const now = Date.now();
          const updatedMessages = prevMessages.filter(
            (msg) =>
              msg.id !== tempId &&
              msg.temp_id !== tempId &&
              !(msg.attachment && msg.attachment === file.uri) &&
              now - new Date(msg.timestamp).getTime() <= CACHE_EXPIRATION_MS &&
              msg.conversation_id === (conversationId || `temp_${shopId}`)
          );
          console.log("Removing failed temp attachment message:", tempId);
          cacheMessages(updatedMessages, conversationId || `temp_${shopId}`);
          return updatedMessages;
        });
      }
    },
    [userId, shopId, sessionId, conversationId]
  );

  // Handle keyboard
  useEffect(() => {
    const keyboardDidShow = Keyboard.addListener("keyboardDidShow", () => {
      if (messages.length > 0) {
        setIsAtBottom(true);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    });
    return () => keyboardDidShow.remove();
  }, [messages]);

  // Render message item
  const MessageItem = memo(
    ({ item, userId, sessionId }) => {
      console.log("renderItem item:", JSON.stringify(item));
      const isImage =
        item.type === "image" ||
        (item.attachment &&
          !item.type?.includes("video") &&
          !item.type?.includes("pdf") &&
          item.attachment.match(/\.(jpg|jpeg|png|gif)(\?|$)/i));
      const isVideo =
        item.type === "video" ||
        (item.attachment &&
          !item.type?.includes("image") &&
          !item.type?.includes("pdf") &&
          item.attachment.match(/\.mp4(\?|$)/i));
      const isPdf = item.type === "pdf";
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


  // Scroll to bottom on mount or when messages load
  useEffect(() => {
    if (!loading && messages.length > 0) {
      InteractionManager.runAfterInteractions(() => {
        console.log('Scrolling to last message on messages load');
        flatListRef.current?.scrollToEnd({ animated: false });
      });
    }
  }, [loading, messages]);

  // Handle input focus to ensure last message is visible
  const handleInputFocus = () => {
    if (messages.length > 0) {
      setIsAtBottom(true);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
        console.log('Scrolled to bottom on input focus');
      }, 100);
    }
  };

  // Handle keyboard show for scroll stability and input visibility
  useEffect(() => {
    const keyboardDidShow = Keyboard.addListener('keyboardDidShow', () => {
      if (messages.length > 0) {
        setIsAtBottom(true);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
          console.log('Keyboard shown, scrolled to bottom');
        }, 100);
      }
    });

    return () => {
      keyboardDidShow.remove();
    };
  }, [messages]);

  // Handle scroll to detect bottom
  const handleScroll = (event) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const isCloseToBottom =
      contentSize.height - contentOffset.y - layoutMeasurement.height < 150;
    setIsAtBottom(isCloseToBottom);
  };

  // Handle scrollToIndex failure
  const onScrollToIndexFailed = (info) => {
    console.warn('scrollToIndex failed:', info);
    InteractionManager.runAfterInteractions(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#E3F2FD", }} edges={["top", "left", "right"]}>
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
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <MaterialIcons name="arrow-back" size={26} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerText}>{name}</Text>
            <View style={styles.headerSpacer} />
          </View>

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
                    onPress={() => {
                      fetchMessages(sessionId, userId);
                    }}
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
                  onPress={() => {
                    fetchMessages(sessionId, userId);
                  }}
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

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              value={inputMessage}
              onChangeText={setInputMessage}
              onFocus={handleInputFocus}
            />
            <TouchableOpacity
              onPress={() => setMenuVisible(true)}
              style={styles.menuButton}
            >
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
};

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
    fontSize: 18,
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
    backgroundColor: "rgba(0, 0, 0, 0.5)",
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

export default StartConversation;