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
import { storeData, getData, initializeDatabase } from "../../storage/storage";
import SendImage from "../../components/shop/SendImage";
import SendVideo from "../../components/shop/SendVideo";
import SendPDF from "../../components/shop/SendPdf";
import ChatImage from "../../components/shop/ChatImage";
import ChatVideo from "../../components/shop/ChatVideo";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

const isWeb = Constants.platform?.web;

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
  const lastMessagesLength = useRef(0); // Track message length to avoid unnecessary scrolls

  const params = useLocalSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { conversation_id, shop_id, prevRoute, name, shop_is_active, shopId } = params;
  const isShopActive = shop_is_active === "true";

  // Initialize database
  useEffect(() => {
    const setupDatabase = async () => {
      try {
        await initializeDatabase();
      } catch (error) {
        console.error("Failed to initialize database:", error);
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

  // Load cached messages
  const loadCachedMessages = async () => {
    const cacheKey = `messages_${conversation_id}`;
    try {
      const cached = await getData(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        parsed.forEach((msg) => receivedMessagesRef.current.add(Number(msg.id)));
        return parsed;
      }
    } catch (error) {
      console.error("Error loading cached messages:", error);
    }
    return [];
  };

  useEffect(() => {
    const loadCachedData = async () => {
      if (!conversation_id) return;
      try {
        const cachedMessages = await loadCachedMessages();
        setMessages(cachedMessages);
        setMessagesLoaded(!!cachedMessages.length);
      } catch (error) {
        console.error("Error loading cached data:", error);
      }
    };
    loadCachedData();
  }, [conversation_id]);

  // Cache messages
  const cacheMessages = async (messagesToCache, localConversationId = conversation_id) => {
    const cacheKey = `messages_${localConversationId}`;
    try {
      await storeData(cacheKey, JSON.stringify(messagesToCache));
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

      const uniqueMessages = response.data
        .reduce((acc, msg) => {
          const key = `${msg.id}-${msg.attachment || ""}`;
          if (!acc.some((m) => `${m.id}-${m.attachment || ""}` === key)) {
            acc.push(msg);
          }
          return acc;
        }, [])
        .filter((msg) => !receivedMessagesRef.current.has(Number(msg.id)));

      uniqueMessages.forEach((msg) => receivedMessagesRef.current.add(Number(msg.id)));

      const normalizedMessages = uniqueMessages.map((msg) => {
        let normalizedType = msg.type || msg.msg_type || "text";
        if (
          ["photo", "image/jpeg", "image/png", "jpg", "jpeg", "png"].includes(
            normalizedType
          )
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
          ? msg.thumbnail_url.replace(
              /conversation_thumbnails/g,
              "chat_thumbnails"
            )
          : null;

        return {
          ...msg,
          id: Number(msg.id),
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
                  (newMsg.attachment &&
                    newMsg.attachment === msg.attachment)
              )
          ),
          ...normalizedMessages,
        ].sort((a, b) => a.id - b.id);
        cacheMessages(merged);
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

  // WebSocket connection with debouncing
  useEffect(() => {
    if (!conversation_id) return;

    const connectWebSocket = () => {
      const websocketUrl = `wss://retail-alvinia-goza-f6a0e4f7.koyeb.app/ws/chat/${conversation_id}/`;
      websocketRef.current = new WebSocket(websocketUrl);

      websocketRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "read_update") {
          setMessages((prevMessages) => {
            const updatedMessages = prevMessages.map((msg) =>
              data.message_ids.includes(Number(msg.id))
                ? { ...msg, read: true }
                : msg
            );
            cacheMessages(updatedMessages);
            return updatedMessages;
          });
        } else {
          let messageId = Number(data.message_id);
          let tempId = Number(data.temp_id);

          if (!messageId || isNaN(messageId)) return;

          if (receivedMessagesRef.current.has(messageId)) return;

          receivedMessagesRef.current.add(messageId);

          let normalizedType = data.msg_type || data.type || "text";
          if (
            ["photo", "image/jpeg", "image/png", "jpg", "jpeg", "png"].includes(
              normalizedType
            )
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

          const attachmentPath = data.attachment
            ? data.attachment.replace(/conversation_attachments/g, "chat_attachments")
            : null;
          const thumbnailPath = data.thumbnail_url
            ? data.thumbnail_url.replace(
                /conversation_thumbnails/g,
                "chat_thumbnails"
              )
            : null;

          setMessages((prevMessages) => {
            const existingIndex = prevMessages.findIndex(
              (msg) =>
                msg.id === tempId ||
                (msg.attachment &&
                  msg.attachment === attachmentPath &&
                  msg.type === normalizedType)
            );

            let updatedMessages;
            if (existingIndex !== -1) {
              updatedMessages = [...prevMessages];
              updatedMessages[existingIndex] = {
                ...updatedMessages[existingIndex],
                id: messageId,
                attachment: attachmentPath || updatedMessages[existingIndex].attachment,
                content: data.message || null,
                type: normalizedType,
                thumbnail_url: thumbnailPath || updatedMessages[existingIndex].thumbnail_url,
                pending: false,
                read: false,
                name: data.attachment?.split("/").pop() || updatedMessages[existingIndex].name,
              };
            } else {
              updatedMessages = [
                ...prevMessages,
                {
                  id: messageId,
                  content: data.message || null,
                  sender_id: data.sender_id,
                  timestamp: data.timestamp || new Date().toISOString(),
                  attachment: attachmentPath,
                  type: normalizedType,
                  thumbnail_url: thumbnailPath,
                  read: false,
                  pending: false,
                  name: data.attachment?.split("/").pop(),
                },
              ];
            }
            cacheMessages(updatedMessages);
            return updatedMessages;
          });

          if (isAtBottom) {
            InteractionManager.runAfterInteractions(() => {
              if (messages.length > 0) {
                flatListRef.current?.scrollToEnd({ animated: true });
              }
            });
          }

          if (isScreenFocused.current) {
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
      websocketRef.current?.close();
    };
  }, [conversation_id]);

  // Send message via WebSocket
  const handleSendMessage = useCallback(() => {
    if (!isShopActive) {
      Alert.alert("Cannot Send", "This shop is no longer active.");
      return;
    }

    if (!inputMessage.trim() || !websocketRef.current || !conversation_id) return;

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
          thumbnail_url: null,
          type: "text",
          read: false,
          pending: true,
        },
      ];
      cacheMessages(newMessages);
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
        const updatedMessages = prevMessages.filter((msg) => msg.id !== tempId);
        cacheMessages(updatedMessages);
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
            thumbnail_url: null,
            read: false,
            pending: true,
            name: file.name || `file_${tempId}`,
          },
        ];
        cacheMessages(newMessages);
        return newMessages;
      });

      try {
        const formData = new FormData();
        formData.append("sender_id", String(userId));
        formData.append("shop_id", String(shopId));
        formData.append("conversation_id", conversation_id);

        const fileName =
          file.name ||
          `file_${Date.now()}.${type === "photo" ? "jpg" : type === "video" ? "mp4" : "pdf"}`;
        let fileUri = file.uri;

        let mimeType = file.type || (type === "video" ? "video/mp4" : type === "pdf" ? "application/pdf" : "image/jpeg");

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
          const filteredMessages = prevMessages.filter(
            (msg) => msg.id !== tempId && !(msg.attachment && msg.attachment === data.file_url)
          );
          const updatedMessages = [
            ...filteredMessages,
            {
              id: Number(data.message_id),
              content: null,
              sender_id: userId,
              timestamp: new Date().toISOString(),
              attachment: data.file_url.replace(/conversation_attachments/g, "chat_attachments"),
              type: normalizedType,
              thumbnail_url: data.thumbnail_url
                ? data.thumbnail_url.replace(/conversation_thumbnails/g, "chat_thumbnails")
                : null,
              read: false,
              pending: false,
              name: fileName,
            },
          ];
          cacheMessages(updatedMessages);
          return updatedMessages;
        });

        if (websocketRef.current) {
          websocketRef.current.send(
            JSON.stringify({
              sender_id: userId,
              conversation_id: conversation_id,
              type: "message",
              timestamp: new Date().toISOString(),
              content: null,
              attachment: data.file_url,
              thumbnail_url: data.thumbnail_url,
              temp_id: tempId,
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
          const updatedMessages = prevMessages.filter((msg) => msg.id !== tempId);
          cacheMessages(updatedMessages);
          return updatedMessages;
        });
      }
    },
    [userId, shopId, conversation_id, messages, isShopActive, sessionId]
  );

  // Handle screen focus with optimized logic
  useFocusEffect(
    useCallback(() => {
      isScreenFocused.current = true;
      if (conversation_id && messages.length > 0 && messages.length !== lastMessagesLength.current) {
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
    }, [conversation_id, messages.length, loading])
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

  // Render message item
  const renderItem = useCallback(
    ({ item }) => {
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

      const formattedTime = new Date(item.timestamp).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      const mediaUri = item.pending
        ? item.attachment
        : item.attachment
        ? `https://retail-alvinia-goza-f6a0e4f7.koyeb.app${item.attachment.replace(/conversation_attachments/g, "chat_attachments")}`
        : null;

      const thumbnailUri = item.thumbnail_url
        ? `https://retail-alvinia-goza-f6a0e4f7.koyeb.app${item.thumbnail_url.replace(/conversation_thumbnails/g, "chat_thumbnails")}`
        : null;

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
                  <ChatImage uri={mediaUri} />
                  {item.pending && (
                    <View style={styles.loadingOverlay}>
                      <Text style={styles.loadingText}>Uploading...</Text>
                    </View>
                  )}
                </View>
              ) : isVideo || isVideoFallback ? (
                <View style={item.pending ? styles.pendingContainer : null}>
                  <ChatVideo
                    uri={mediaUri}
                    name={item.name}
                    thumbnailUrl={thumbnailUri}
                    pending={!!(item.pending === true || item.pending === "true")}
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
                <Text style={styles.attachmentText}>
                  PDF Document: {item.name}
                </Text>
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
                item.sender_id === userId
                  ? styles.userMessage
                  : styles.shopMessage,
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
    [userId, sessionId]
  )

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
              onPress={() => router.navigate("(tabs)/placeholder")}
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
                <Text style={styles.headerText}>{name}</Text>
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