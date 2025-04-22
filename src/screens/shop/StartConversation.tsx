import React, { useCallback, useEffect, useState, useRef } from "react";
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
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { storeData, getData, initializeDatabase } from "../../storage/storage";
import SendImage from "../../components/shop/SendImage";
import SendVideo from "../../components/shop/SendVideo";
import SendPDF from "../../components/shop/SendPdf";
import ChatImage from "../../components/shop/ChatImage";
import ChatVideo from "../../components/shop/ChatVideo";

const isWeb = Constants.platform?.web;

const StartConversation = () => {
  const [userId, setUserId] = useState<number | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const flatListRef = useRef<FlatList | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const receivedMessagesRef = useRef(new Set<number>());
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const isScreenFocused = useRef(false);
  const lastCacheAttempt = useRef<number>(0);
  const params = useLocalSearchParams();
  const { shopId, name } = params;
  const router = useRouter();
  const [senderId, setSenderId] = useState<number | null>(null);
  const [shopOwner, setShopOwner] = useState<number | null>(null);

  // Initialize database
  useEffect(() => {
    const setupDatabase = async () => {
      try {
        console.log("Initializing database...");
        await initializeDatabase();
        console.log("Database initialized in StartConversation");
      } catch (error) {
        console.error("Failed to initialize database:", error);
      }
    };
    setupDatabase();
  }, []);

  // Fetch session ID
  useEffect(() => {
    const fetchSessionId = async () => {
      try {
        const sessionIdString = await AsyncStorage.getItem("sessionToken");
        console.log("Fetched session ID:", sessionIdString);
        setSessionId(sessionIdString);
      } catch (error) {
        console.error("Error fetching session ID:", error);
      }
    };
    fetchSessionId();
  }, []);

  // Fetch user ID
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const userIdString = await AsyncStorage.getItem("user_id");
        console.log("Fetched user ID:", userIdString);
        if (userIdString) {
          setUserId(parseInt(userIdString, 10));
        }
      } catch (error) {
        console.error("Error fetching user ID:", error);
      }
    };
    fetchUserId();
  }, []);

  // Load cached conversationId and messages
  useEffect(() => {
    const loadCachedData = async () => {
      if (!shopId) return;
      try {
        const cachedId = await AsyncStorage.getItem(`conversation_id_${shopId}`);
        console.log("Loaded cached conversationId:", cachedId, "for shopId:", shopId);
        if (cachedId) {
          setConversationId(cachedId);
          const cachedMessages = await loadCachedMessages(cachedId);
          console.log("Setting messages from cache:", {
            messageCount: cachedMessages.length,
            messages: cachedMessages.map((msg) => ({
              id: msg.id,
              content: msg.content,
              type: msg.type,
            })),
          });
          setMessages(cachedMessages);
          setMessagesLoaded(!!cachedMessages.length);
        }
      } catch (error) {
        console.error("Error loading cached data:", error);
      }
    };
    loadCachedData();
  }, [shopId]);

  // Handle screen focus for marking messages as read and scrolling
  useFocusEffect(
    useCallback(() => {
      console.log("Screen focused, conversationId:", conversationId);
      isScreenFocused.current = true;
      if (conversationId && messages.length > 0) {
        markMessagesAsRead();
        // Scroll to last message on focus
        InteractionManager.runAfterInteractions(() => {
          if (messages.length > 0 && !loading) {
            console.log("Scrolling to last message on screen focus");
            flatListRef.current?.scrollToEnd({ animated: false });
          }
        });
      }
      if (
        !messages.length &&
        conversationId &&
        Date.now() - lastCacheAttempt.current > 1000
      ) {
        console.log("No messages loaded, attempting to reload cache");
        lastCacheAttempt.current = Date.now();
        loadCachedMessages(conversationId).then((cachedMessages) => {
          console.log("Reloaded cached messages on focus:", {
            messageCount: cachedMessages.length,
          });
          setMessages(cachedMessages);
          setMessagesLoaded(!!cachedMessages.length);
        });
      }
      return () => {
        console.log("Screen unfocused");
        isScreenFocused.current = false;
      };
    }, [conversationId, messages, loading])
  );

  // Cache messages
  const cacheMessages = async (messagesToCache: any[], localConversationId: string) => {
    const cacheKey = `messages_${localConversationId}`;
    try {
      console.log("Caching messages:", {
        key: cacheKey,
        messageCount: messagesToCache.length,
        messages: messagesToCache.map((msg) => ({
          id: msg.id,
          content: msg.content,
          type: msg.type,
          pending: msg.pending,
        })),
      });
      await storeData(cacheKey, JSON.stringify(messagesToCache));
      console.log("Messages cached for conversation:", localConversationId, "Key:", cacheKey);
    } catch (error) {
      console.error("Error caching messages:", error);
      throw error;
    }
  };

  // Load cached messages
  const loadCachedMessages = async (localConversationId: string): Promise<any[]> => {
    const cacheKey = `messages_${localConversationId}`;
    try {
      console.log("Loading cached messages for key:", cacheKey);
      const cached = await getData(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        console.log("Loaded cached messages:", {
          key: cacheKey,
          messageCount: parsed.length,
          messages: parsed.map((msg: any) => ({
            id: msg.id,
            content: msg.content,
            type: msg.type,
            pending: msg.pending,
          })),
        });
        parsed.forEach((msg: any) => receivedMessagesRef.current.add(Number(msg.id)));
        return parsed;
      } else {
        console.log("No cached messages found for key:", cacheKey);
      }
    } catch (error) {
      console.error("Error loading cached messages:", error);
    }
    return [];
  };

  // Fetch messages
  const fetchMessages = async () => {
    if (!userId || !shopId) {
      console.warn("Cannot fetch messages: userId or shopId missing", { userId, shopId });
      return;
    }

    console.log("Starting fetchMessages, userId:", userId, "shopId:", shopId);
    setLoading(true);
    setFetchError(false);
    receivedMessagesRef.current.clear();

    try {
      console.log("Fetching messages from API...");
      const response = await axios.get(
        `https://retail-alvinia-goza-f6a0e4f7.koyeb.app/messages/?user_id=${userId}&shop_id=${shopId}`
      );

      console.log("API response:", response.data);
      console.log("Fetched messages:", response.data.messages?.length || 0);

      const newConversationId = String(response.data.conversation_id);
      console.log("Setting conversationId:", newConversationId);
      setConversationId(newConversationId);

      try {
        await AsyncStorage.setItem(`conversation_id_${shopId}`, newConversationId);
        console.log("Cached conversationId:", newConversationId, "for shopId:", shopId);
      } catch (error) {
        console.error("Error caching conversationId:", error);
      }

      if (response.data.messages?.length > 0) {
        const firstMessage = response.data.messages[0];
        console.log(
          "Setting senderId:",
          firstMessage.sender_user_id,
          "shopOwner:",
          firstMessage.receiver_id
        );
        setSenderId(firstMessage.sender_user_id);
        setShopOwner(firstMessage.receiver_id);
      }

      const uniqueMessages = response.data.messages.filter(
        (msg: any) => !receivedMessagesRef.current.has(Number(msg.id))
      );

      console.log("Unique messages:", uniqueMessages.length);
      uniqueMessages.forEach((msg: any) =>
        receivedMessagesRef.current.add(Number(msg.id))
      );

      const normalizedMessages = uniqueMessages.map((msg: any) => {
        let normalizedType = msg.type || msg.msg_type || "text";
        if (
          normalizedType === "photo" ||
          normalizedType === "image/jpeg" ||
          normalizedType === "image/png" ||
          normalizedType === "jpg" ||
          normalizedType === "jpeg" ||
          normalizedType === "png"
        ) {
          normalizedType = "image";
        } else if (
          normalizedType === "video/mp4" ||
          normalizedType === "mp4" ||
          normalizedType === "video" ||
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

        return {
          ...msg,
          id: Number(msg.id),
          type: normalizedType,
          name: msg.attachment?.split("/").pop(),
        };
      });

      setMessages((prev) => {
        const merged = [
          ...prev.filter(
            (msg) => !normalizedMessages.some((newMsg: any) => newMsg.id === msg.id)
          ),
          ...normalizedMessages,
        ].sort((a, b) => a.id - b.id);
        console.log("Setting merged messages:", {
          messageCount: merged.length,
          messages: merged.map((msg) => ({
            id: msg.id,
            content: msg.content,
            type: msg.type,
          })),
        });
        cacheMessages(merged, newConversationId).catch((error) =>
          console.error("Failed to cache merged messages:", error)
        );
        setMessagesLoaded(true);
        return merged;
      });

      if (isScreenFocused.current && uniqueMessages.length > 0) {
        console.log("Marking messages as read after fetch");
        markMessagesAsRead(newConversationId);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      setFetchError(true);
    } finally {
      console.log("Fetch complete, setting loading to false");
      setLoading(false);
    }
  };

  // Trigger fetch on userId and shopId
  useEffect(() => {
    if (userId && shopId) {
      fetchMessages();
    }
  }, [userId, shopId]);

  // Mark messages as read
  const markMessagesAsRead = async (localConversationId: string = conversationId!) => {
    if (!localConversationId || !sessionId || messages.length === 0) {
      console.warn("Cannot mark messages as read:", {
        conversationId: localConversationId,
        sessionId,
        messageCount: messages.length,
      });
      return;
    }

    try {
      console.log("Marking messages as read for conversationId:", localConversationId);
      await axios.post(
        "https://retail-alvinia-goza-f6a0e4f7.koyeb.app/mark-messages-read/",
        { conversation_id: localConversationId },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: sessionId,
          },
        }
      );
      console.log("Messages marked as read");
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

    const tempMessage = {
      id: Date.now(),
      sender_id: userId,
      shop_id: shopId,
      content: inputMessage,
      timestamp: new Date().toISOString(),
      type: "text",
      read: false,
      pending: true,
    };

    setMessages((prevMessages) => {
      const newMessages = [...prevMessages, tempMessage];
      console.log("Adding temp message:", tempMessage.id);
      if (conversationId) {
        cacheMessages(newMessages, conversationId).catch((error) =>
          console.error("Failed to cache temp message:", error)
        );
      }
      return newMessages;
    });

    try {
      console.log("Sending HTTP message:", inputMessage);
      const response = await axios.post(
        "https://retail-alvinia-goza-f6a0e4f7.koyeb.app/messages/",
        {
          sender_id: userId,
          shop_id: shopId,
          content: inputMessage,
        }
      );

      const serverMessage = {
        ...response.data,
        id: Number(response.data.id),
        type: "text",
        read: false,
        name: response.data.attachment?.split("/").pop(),
      };

      setMessages((prevMessages) => {
        const updatedMessages = prevMessages
          .filter((msg) => msg.id !== tempMessage.id)
          .concat(serverMessage);
        console.log("Replacing temp message with server message:", serverMessage.id);
        cacheMessages(updatedMessages, response.data.conversation_id).catch((error) =>
          console.error("Failed to cache server message:", error)
        );
        return updatedMessages;
      });

      console.log("Setting conversationId from HTTP response:", response.data.conversation_id);
      setConversationId(String(response.data.conversation_id));
      try {
        await AsyncStorage.setItem(`conversation_id_${shopId}`, String(response.data.conversation_id));
        console.log("Cached conversationId:", response.data.conversation_id, "for shopId:", shopId);
      } catch (error) {
        console.error("Error caching conversationId:", error);
      }
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
        const updatedMessages = prevMessages.filter((msg) => msg.id !== tempMessage.id);
        console.log("Removing failed temp message:", tempMessage.id);
        if (conversationId) {
          cacheMessages(updatedMessages, conversationId).catch((error) =>
            console.error("Failed to cache after failed message:", error)
          );
        }
        return updatedMessages;
      });
      Alert.alert("Message Failed", "Unable to send message. Please try again.");
    }
  };

  // WebSocket connection
  useEffect(() => {
    if (!conversationId) {
      console.warn("Cannot connect WebSocket: conversationId is null");
      return;
    }

    console.log("Connecting WebSocket for conversationId:", conversationId);
    const connectWebSocket = () => {
      const websocketUrl = `wss://retail-alvinia-goza-f6a0e4f7.koyeb.app/ws/chat/${conversationId}/`;
      websocketRef.current = new WebSocket(websocketUrl);

      websocketRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("WebSocket received:", data);

        if (data.type === "read_update") {
          setMessages((prevMessages) => {
            const updatedMessages = prevMessages.map((msg) =>
              data.message_ids.includes(msg.id) ? { ...msg, read: true } : msg
            );
            console.log("Updating read status for messages:", data.message_ids);
            cacheMessages(updatedMessages, conversationId).catch((error) =>
              console.error("Failed to cache read update:", error)
            );
            return updatedMessages;
          });
        } else {
          let messageId = Number(data.message_id);
          let tempId = Number(data.temp_id);

          if (!messageId || isNaN(messageId)) {
            console.warn("⚠️ Received invalid message ID, ignoring...");
            return;
          }

          if (receivedMessagesRef.current.has(messageId)) {
            console.log(`Message ${messageId} already processed, skipping...`);
            return;
          }

          receivedMessagesRef.current.add(messageId);

          let normalizedType = data.msg_type || data.type || "text";
          if (
            normalizedType === "photo" ||
            normalizedType === "image/jpeg" ||
            normalizedType === "image/png" ||
            normalizedType === "jpg" ||
            normalizedType === "jpeg" ||
            normalizedType === "png"
          ) {
            normalizedType = "image";
          } else if (
            normalizedType === "video/mp4" ||
            normalizedType === "mp4" ||
            normalizedType === "video" ||
            normalizedType?.toLowerCase().includes("video")
          ) {
            normalizedType = "video";
          } else if (normalizedType === "application/pdf") {
            normalizedType = "pdf";
          }

          if (data.attachment) {
            const lowerAttachment = data.attachment.toLowerCase();
            if (lowerAttachment.match(/\.(jpg|jpeg|png|gif)$/)) {
              normalizedType = "image";
            } else if (lowerAttachment.match(/\.mp4$/)) {
              normalizedType = "video";
            } else if (lowerAttachment.match(/\.pdf$/)) {
              normalizedType = "pdf";
            }
          }

          setMessages((prevMessages) => {
            const existingIndex = tempId
              ? prevMessages.findIndex((msg) => msg.id === tempId)
              : -1;

            let updatedMessages;
            if (existingIndex !== -1) {
              updatedMessages = [...prevMessages];
              updatedMessages[existingIndex] = {
                ...prevMessages[existingIndex],
                id: messageId,
                attachment:
                  data.attachment || prevMessages[existingIndex].attachment,
                content: data.message || null,
                type: normalizedType,
                pending: false,
                name: data.attachment?.split("/").pop(),
              };
              console.log("Replacing temp message with WebSocket message:", messageId);
            } else {
              updatedMessages = [
                ...prevMessages,
                {
                  id: messageId,
                  content: data.message || null,
                  sender_id: data.sender_id,
                  timestamp: data.timestamp || new Date().toISOString(),
                  attachment: data.attachment || null,
                  type: normalizedType,
                  read: false,
                  name: data.attachment?.split("/").pop(),
                },
              ];
              console.log("Adding new WebSocket message:", messageId);
            }
            cacheMessages(updatedMessages, conversationId).catch((error) =>
              console.error("Failed to cache WebSocket message:", error)
            );
            return updatedMessages;
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
            markMessagesAsRead();
          }
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
      console.log("Closing WebSocket...");
      websocketRef.current?.close();
    };
  }, [conversationId, messages]);

  // Send message via WebSocket
  const handleSendMessage = useCallback(() => {
    if (!inputMessage.trim() || !websocketRef.current || !conversationId) {
      console.warn("Cannot send WebSocket message:", {
        inputMessage: !!inputMessage.trim(),
        websocket: !!websocketRef.current,
        conversationId,
      });
      return;
    }

    const tempId = Date.now();

    setMessages((prevMessages) => {
      const newMessages = [
        ...prevMessages,
        {
          id: tempId,
          content: inputMessage,
          sender_id: userId,
          timestamp: new Date().toISOString(),
          attachment: null,
          type: "text",
          read: false,
          pending: true,
        },
      ];
      console.log("Adding temp WebSocket message:", tempId);
      cacheMessages(newMessages, conversationId).catch((error) =>
        console.error("Failed to cache WebSocket temp message:", error)
      );
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
        const updatedMessages = prevMessages.filter((msg) => msg.id !== tempId);
        console.log("Removing failed WebSocket temp message:", tempId);
        cacheMessages(updatedMessages, conversationId).catch((error) =>
          console.error("Failed to cache after failed WebSocket message:", error)
        );
        return updatedMessages;
      });
    }
  }, [inputMessage, userId, conversationId, messages]);

  // Send attachment
  const handleSendAttachment = useCallback(
    async (file: any, type: string) => {
      if (!file?.uri || !conversationId) {
        console.error("Invalid file or conversation ID:", {
          fileUri: file?.uri,
          conversationId,
        });
        return;
      }

      const tempId = Date.now();
      const normalizedType =
        type === "photo" ? "image" : type === "video" ? "video" : "pdf";

      setMessages((prevMessages) => {
        const newMessages = [
          ...prevMessages,
          {
            id: tempId,
            content: null,
            sender_id: userId,
            timestamp: new Date().toISOString(),
            attachment: file.uri,
            type: normalizedType,
            read: false,
            pending: true,
            name: file.name,
          },
        ];
        console.log("Adding temp attachment message:", tempId);
        cacheMessages(newMessages, conversationId).catch((error) =>
          console.error("Failed to cache attachment message:", error)
        );
        return newMessages;
      });

      const formData = new FormData();
      formData.append("sender_id", String(userId));
      formData.append("shop_id", String(shopId));
      formData.append("conversation_id", conversationId);

      let newFile;

      try {
        if (file.uri.startsWith("blob:")) {
          console.log("Processing blob URI for attachment");
          const response = await fetch(file.uri);
          if (!response.ok) throw new Error("Failed to fetch blob data");

          const blob = await response.blob();
          newFile = new File([blob], file.name || `file_${Date.now()}`, {
            type: blob.type || "application/octet-stream",
          });
        } else {
          newFile = {
            uri: file.uri.startsWith("file://") ? file.uri : `file://${file.uri}`,
            type:
              type === "photo"
                ? "image/jpeg"
                : type === "video"
                ? "video/mp4"
                : "application/pdf",
            name:
              file.name ||
              `file_${Date.now()}.${
                type === "photo" ? "jpg" : type === "video" ? "mp4" : "pdf"
              }`,
          };
        }

        formData.append("file", newFile as any);

        console.log("Uploading attachment:", newFile.name);
        const response = await axios.post(
          `https://retail-alvinia-goza-f6a0e4f7.koyeb.app/upload/${conversationId}/`,
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          }
        );

        const data = response.data;
        if (!data.file_url) throw new Error("File upload failed");
        console.log("Attachment uploaded, file_url:", data.file_url);

        websocketRef.current?.send(
          JSON.stringify({
            sender_id: userId,
            conversation_id: conversationId,
            type: normalizedType,
            timestamp: new Date().toISOString(),
            content: null,
            attachment: data.file_url,
            temp_id: tempId,
          })
        );
        setIsAtBottom(true);
        InteractionManager.runAfterInteractions(() => {
          if (messages.length > 0) {
            console.log("Scrolling to bottom after attachment upload");
            flatListRef.current?.scrollToEnd({ animated: true });
          }
        });
      } catch (error) {
        console.error("Error uploading file:", error);
        Alert.alert("Upload Failed", "Failed to upload file. Please try again.");

        setMessages((prevMessages) => {
          const updatedMessages = prevMessages.filter((msg) => msg.id !== tempId);
          console.log("Removing failed attachment message:", tempId);
          cacheMessages(updatedMessages, conversationId).catch((error) =>
            console.error("Failed to cache after failed attachment:", error)
          );
          return updatedMessages;
        });
      }
    },
    [userId, shopId, conversationId, messages]
  );

  // Scroll to bottom on mount or when messages load
  useEffect(() => {
    if (!loading && messages.length > 0) {
      InteractionManager.runAfterInteractions(() => {
        console.log("Scrolling to last message on messages load");
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
        console.log("Scrolled to bottom on input focus");
      }, 100);
    }
  };

  // Handle keyboard show for scroll stability and input visibility
  useEffect(() => {
    const keyboardDidShow = Keyboard.addListener("keyboardDidShow", () => {
      if (messages.length > 0) {
        setIsAtBottom(true);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
          console.log("Keyboard shown, scrolled to bottom");
        }, 100);
      }
    });

    return () => {
      keyboardDidShow.remove();
    };
  }, [messages]);

  // Handle scroll to detect bottom
  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const isCloseToBottom =
      contentSize.height - contentOffset.y - layoutMeasurement.height < 150;
    setIsAtBottom(isCloseToBottom);
  };

  // Handle scrollToIndex failure
  const onScrollToIndexFailed = (info: any) => {
    console.warn("scrollToIndex failed:", info);
    InteractionManager.runAfterInteractions(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    });
  };

  // Render message item
  const renderItem = useCallback(
    ({ item }: { item: any }) => {
      const isImage = item.type === "image";
      const isVideo = item.type === "video";
      const isPdf = item.type === "pdf";
      const isImageFallback =
        item.attachment &&
        !isImage &&
        !isVideo &&
        !isPdf &&
        item.attachment.match(/\.(jpg|jpeg|png|gif)$/i);
      const isVideoFallback =
        item.attachment &&
        !isImage &&
        !isVideo &&
        !isPdf &&
        item.attachment.match(/\.mp4$/i);

      console.log("Render item:", {
        id: item.id,
        type: item.type,
        attachment: item.attachment,
        pending: item.pending,
        name: item.name,
      });

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
                item.sender_id === userId
                  ? { alignSelf: "flex-end" }
                  : { alignSelf: "flex-start" },
              ]}
            >
              {isImage || isImageFallback ? (
                <View style={item.pending ? styles.pendingContainer : null}>
                  <ChatImage
                    uri={
                      item.pending
                        ? item.attachment
                        : `https://retail-alvinia-goza-f6a0e4f7.koyeb.app${item.attachment}`
                    }
                  />
                  {item.pending && (
                    <View style={styles.loadingOverlay}>
                      <Text style={styles.loadingText}>Uploading...</Text>
                    </View>
                  )}
                </View>
              ) : isVideo || isVideoFallback ? (
                <View style={item.pending ? styles.pendingContainer : null}>
                  <ChatVideo
                    uri={
                      item.pending
                        ? item.attachment
                        : `https://retail-alvinia-goza-f6a0e4f7.koyeb.app${item.attachment}`
                    }
                    name={item.name}
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
    [userId]
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior="padding"
      keyboardVerticalOffset={
        Platform.OS === "ios" ? (StatusBar.currentHeight || 0) + 60 : 0
      }
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.replace("((tabs)/placeholder)")}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={24} color="#007BFF" />
          </TouchableOpacity>
          <Text style={styles.headerText}>{name}</Text>
        </View>

        {(loading || fetchError) && (
          <View
            style={[styles.statusBar, fetchError ? styles.errorBar : styles.loadingBar]}
          >
            {loading && (
              <View style={styles.statusContent}>
                <ActivityIndicator size="small" color="#fff" />
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
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
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
  headerText: {
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 60,
  },
  statusBar: {
    padding: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingBar: {
    backgroundColor: "#007BFF",
  },
  errorBar: {
    backgroundColor: "#D32F2F",
  },
  statusContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusText: {
    color: "#fff",
    fontSize: 14,
    marginLeft: 8,
  },
  retryButton: {
    backgroundColor: "#fff",
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginLeft: 12,
  },
  retryButtonText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "600",
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
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
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
  closeTouchable: {
    alignSelf: "center",
    marginTop: 10,
  },
});

export default StartConversation;