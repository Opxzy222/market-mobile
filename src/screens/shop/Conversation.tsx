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
  Image
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
  const [inputMessage, setInputMessage] = useState('');
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

  const params = useLocalSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { conversation_id, shop_id, prevRoute, name, shop_is_active, shopId } = params;
  const isShopActive = shop_is_active === 'true';

  // Initialize database
  useEffect(() => {
    const setupDatabase = async () => {
      try {
        console.log('Initializing database...');
        await initializeDatabase();
        console.log('Database initialized');
      } catch (error) {
        console.error('Failed to initialize database:', error);
      }
    };
    setupDatabase();
  }, []);

  // Load session and user ID
  useEffect(() => {
    const loadSessionData = async () => {
      try {
        const [sessionIdString, userIdString] = await Promise.all([
          AsyncStorage.getItem('sessionToken'),
          AsyncStorage.getItem('user_id'),
        ]);
        console.log('Fetched session ID:', sessionIdString, 'user ID:', userIdString);
        setSessionId(sessionIdString);
        if (userIdString) {
          setUserId(parseInt(userIdString, 10));
        }
      } catch (error) {
        console.error('Error loading session data:', error);
      }
    };
    loadSessionData();
  }, []);

  // Load cached messages
  const loadCachedMessages = async () => {
    const cacheKey = `messages_${conversation_id}`;
    try {
      console.log('Loading cached messages for key:', cacheKey);
      const cached = await getData(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        console.log('Loaded cached messages:', {
          key: cacheKey,
          messageCount: parsed.length,
          messages: parsed.map((msg) => ({
            id: msg.id,
            content: msg.content,
            type: msg.type,
            attachment: msg.attachment,
            thumbnail_url: msg.thumbnail_url,
            pending: msg.pending,
          })),
        });
        parsed.forEach((msg) => receivedMessagesRef.current.add(Number(msg.id)));
        return parsed;
      }
      console.log('No cached messages found for key:', cacheKey);
    } catch (error) {
      console.error('Error loading cached messages:', error);
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
        console.error('Error loading cached data:', error);
      }
    };
    loadCachedData();
  }, [conversation_id]);

  // Cache messages
  const cacheMessages = async (messagesToCache, localConversationId = conversation_id) => {
    const cacheKey = `messages_${localConversationId}`;
    try {
      console.log('Caching messages:', {
        key: cacheKey,
        messageCount: messagesToCache.length,
        messages: messagesToCache.map((msg) => ({
          id: msg.id,
          content: msg.content,
          type: msg.type,
          attachment: msg.attachment,
          thumbnail_url: msg.thumbnail_url,
          pending: msg.pending,
        })),
      });
      await storeData(cacheKey, JSON.stringify(messagesToCache));
      console.log('Messages cached for conversation:', localConversationId);
    } catch (error) {
      console.error('Error caching messages:', error);
      throw error;
    }
  };

  // Fetch messages
  const fetchMessages = async () => {
    if (!conversation_id || !sessionId) {
      console.warn('Cannot fetch messages: missing conversation_id or sessionId', {
        conversation_id,
        sessionId,
      });
      return;
    }

    console.log('Starting fetchMessages, conversationId:', conversation_id);
    setLoading(true);
    setFetchError(false);

    try {
      console.log('Fetching messages from API...');
      const response = await axios.get(
        `https://retail-alvinia-goza-f6a0e4f7.koyeb.app/conversation/?conversation_id=${conversation_id}`,
        {
          headers: { Authorization: sessionId },
          params: { limit: 50 },
        },
      );

      console.log('API response:', { messageCount: response.data.length });

      if (response.data.length > 0) {
        console.log(
          'Setting senderId:',
          response.data[0].sender_user_id,
          'shopOwner:',
          response.data[0].receiver_id,
        );
        setSenderId(response.data[0].sender_user_id);
        setShopOwner(response.data[0].receiver_id);
      }

      // Deduplicate by id and attachment
      const uniqueMessages = response.data.reduce((acc, msg) => {
        const key = `${msg.id}-${msg.attachment || ''}`;
        if (!acc.some((m) => `${m.id}-${m.attachment || ''}` === key)) {
          acc.push(msg);
        }
        return acc;
      }, []).filter((msg) => !receivedMessagesRef.current.has(Number(msg.id)));

      console.log('Unique messages:', uniqueMessages.length);
      uniqueMessages.forEach((msg) => receivedMessagesRef.current.add(Number(msg.id)));

      const normalizedMessages = uniqueMessages.map((msg) => {
        let normalizedType = msg.type || msg.msg_type || 'text';
        if (
          normalizedType === 'photo' ||
          normalizedType === 'image/jpeg' ||
          normalizedType === 'image/png' ||
          normalizedType === 'jpg' ||
          normalizedType === 'jpeg' ||
          normalizedType === 'png'
        ) {
          normalizedType = 'image';
        } else if (
          normalizedType === 'video/mp4' ||
          normalizedType === 'mp4' ||
          normalizedType === 'video' ||
          normalizedType?.toLowerCase().includes('video')
        ) {
          normalizedType = 'video';
        } else if (normalizedType === 'application/pdf') {
          normalizedType = 'pdf';
        }

        if (msg.attachment) {
          const lowerAttachment = msg.attachment.toLowerCase();
          if (lowerAttachment.match(/\.(jpg|jpeg|png|gif)$/)) {
            normalizedType = 'image';
          } else if (lowerAttachment.match(/\.mp4$/)) {
            normalizedType = 'video';
          } else if (lowerAttachment.match(/\.pdf$/)) {
            normalizedType = 'pdf';
          }
        }

        const attachmentPath = msg.attachment
          ? msg.attachment.replace(/conversation_attachments/g, 'chat_attachments')
          : null;
        const thumbnailPath = msg.thumbnail_url
          ? msg.thumbnail_url.replace(/conversation_thumbnails/g, 'chat_thumbnails')
          : null;

        return {
          ...msg,
          id: Number(msg.id),
          type: normalizedType,
          name: msg.attachment?.split('/').pop(),
          attachment: attachmentPath,
          thumbnail_url: thumbnailPath,
          pending: !!(msg.pending === true || msg.pending === 'true'),
          read: !!(msg.read === true || msg.read === 'true'),
        };
      });

      setMessages((prev) => {
        const merged = [
          ...prev.filter(
            (msg) => !normalizedMessages.some((newMsg) => newMsg.id === msg.id || (newMsg.attachment && newMsg.attachment === msg.attachment)),
          ),
          ...normalizedMessages,
        ].sort((a, b) => a.id - b.id);
        console.log('Setting merged messages:', {
          messageCount: merged.length,
          messages: merged.map((msg) => ({
            id: msg.id,
            content: msg.content,
            type: msg.type,
            attachment: msg.attachment,
            thumbnail_url: msg.thumbnail_url,
            pending: msg.pending,
          })),
        });
        cacheMessages(merged).catch((error) =>
          console.error('Failed to cache merged messages:', error),
        );
        setMessagesLoaded(true);
        return merged;
      });

      if (isScreenFocused.current && uniqueMessages.length > 0) {
        console.log('Marking messages as read after fetch');
        markMessagesAsRead();
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      setFetchError(true);
    } finally {
      console.log('Fetch complete, setting loading to false');
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
    if (!conversation_id || !sessionId || messages.length === 0) {
      console.warn('Cannot mark messages as read:', {
        conversation_id,
        sessionId,
        messageCount: messages.length,
      });
      return;
    }

    try {
      console.log('Marking messages as read for conversationId:', conversation_id);
      await axios.post(
        'https://retail-alvinia-goza-f6a0e4f7.koyeb.app/mark-messages-read/',
        { conversation_id },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: sessionId,
          },
        },
      );
      console.log('Messages marked as read');
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // WebSocket connection
  useEffect(() => {
    if (!conversation_id) {
      console.warn('Cannot connect WebSocket: conversation_id is null');
      return;
    }

    console.log('Connecting WebSocket for conversationId:', conversation_id);
    const connectWebSocket = () => {
      const websocketUrl = `wss://retail-alvinia-goza-f6a0e4f7.koyeb.app/ws/chat/${conversation_id}/`;
      websocketRef.current = new WebSocket(websocketUrl);

      websocketRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('WebSocket received:', {
          message_id: data.message_id,
          temp_id: data.temp_id,
          attachment: data.attachment,
          thumbnail_url: data.thumbnail_url,
          type: data.type,
        });

        if (data.type === 'read_update') {
          setMessages((prevMessages) => {
            const updatedMessages = prevMessages.map((msg) =>
              data.message_ids.includes(Number(msg.id)) ? { ...msg, read: true } : msg,
            );
            console.log('Updating read status for messages:', data.message_ids);
            cacheMessages(updatedMessages).catch((error) =>
              console.error('Failed to cache read update:', error),
            );
            return updatedMessages;
          });
        } else {
          let messageId = Number(data.message_id);
          let tempId = Number(data.temp_id);

          if (!messageId || isNaN(messageId)) {
            console.warn('Invalid message ID, ignoring:', messageId);
            return;
          }

          if (receivedMessagesRef.current.has(messageId)) {
            console.log(`Message ${messageId} already processed, skipping...`);
            return;
          }

          receivedMessagesRef.current.add(messageId);

          let normalizedType = data.msg_type || data.type || 'text';
          if (
            normalizedType === 'photo' ||
            normalizedType === 'image/jpeg' ||
            normalizedType === 'image/png' ||
            normalizedType === 'jpg' ||
            normalizedType === 'jpeg' ||
            normalizedType === 'png'
          ) {
            normalizedType = 'image';
          } else if (
            normalizedType === 'video/mp4' ||
            normalizedType === 'mp4' ||
            normalizedType === 'video' ||
            normalizedType?.toLowerCase().includes('video')
          ) {
            normalizedType = 'video';
          } else if (normalizedType === 'application/pdf') {
            normalizedType = 'pdf';
          }

          if (data.attachment) {
            const lowerAttachment = data.attachment.toLowerCase();
            if (lowerAttachment.match(/\.(jpg|jpeg|png|gif)$/)) {
              normalizedType = 'image';
            } else if (lowerAttachment.match(/\.mp4$/)) {
              normalizedType = 'video';
            } else if (lowerAttachment.match(/\.pdf$/)) {
              normalizedType = 'pdf';
            }
          }

          const attachmentPath = data.attachment
            ? data.attachment.replace(/conversation_attachments/g, 'chat_attachments')
            : null;
          const thumbnailPath = data.thumbnail_url
            ? data.thumbnail_url.replace(/conversation_thumbnails/g, 'chat_thumbnails')
            : null;

          setMessages((prevMessages) => {
            // Check for duplicates by attachment
            const existingIndex = prevMessages.findIndex(
              (msg) =>
                msg.id === tempId ||
                (msg.attachment && msg.attachment === attachmentPath && msg.type === normalizedType),
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
                name: data.attachment?.split('/').pop() || updatedMessages[existingIndex].name,
              };
              console.log('Replacing existing message:', { oldId: prevMessages[existingIndex].id, newId: messageId });
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
                  name: data.attachment?.split('/').pop(),
                },
              ];
              console.log('Adding new WebSocket message:', messageId);
            }
            cacheMessages(updatedMessages).catch((error) =>
              console.error('Failed to cache WebSocket message:', error),
            );
            return updatedMessages;
          });

          if (isAtBottom) {
            InteractionManager.runAfterInteractions(() => {
              if (messages.length > 0) {
                console.log('Scrolling to bottom after WebSocket message');
                flatListRef.current?.scrollToEnd({ animated: true });
              }
            });
          }

          if (isScreenFocused.current) {
            console.log('Marking messages as read after WebSocket message');
            markMessagesAsRead();
          }
        }
      };

      websocketRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      websocketRef.current.onclose = () => {
        console.log('WebSocket closed');
      };
    };

    connectWebSocket();

    return () => {
      console.log('Closing WebSocket...');
      websocketRef.current?.close();
    };
  }, [conversation_id, messages]);

  // Send message via WebSocket
  const handleSendMessage = useCallback(() => {
    if (!isShopActive) {
      Alert.alert('Cannot Send', 'This shop is no longer active.');
      return;
    }

    if (!inputMessage.trim() || !websocketRef.current || !conversation_id) {
      console.warn('Cannot send WebSocket message:', {
        inputMessage: !!inputMessage.trim(),
        websocket: !!websocketRef.current,
        conversation_id,
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
          thumbnail_url: null,
          type: 'text',
          read: false,
          pending: true,
        },
      ];
      console.log('Adding temp WebSocket message:', tempId);
      cacheMessages(newMessages).catch((error) =>
        console.error('Failed to cache WebSocket temp message:', error),
      );
      return newMessages;
    });

    try {
      console.log('Sending WebSocket message:', inputMessage);
      websocketRef.current.send(
        JSON.stringify({
          content: inputMessage,
          temp_id: tempId,
          sender_id: userId,
          conversation_id: conversation_id,
          timestamp: new Date().toISOString(),
        }),
      );
      setInputMessage('');
      setIsAtBottom(true);
      InteractionManager.runAfterInteractions(() => {
        if (messages.length > 0) {
          console.log('Scrolling to bottom after sending WebSocket message');
          flatListRef.current?.scrollToEnd({ animated: true });
        }
      });
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Message Failed', 'Unable to send message. Please try again.');

      setMessages((prevMessages) => {
        const updatedMessages = prevMessages.filter((msg) => msg.id !== tempId);
        console.log('Removing failed WebSocket temp message:', tempId);
        cacheMessages(updatedMessages).catch((error) =>
          console.error('Failed to cache after failed WebSocket message:', error),
        );
        return updatedMessages;
      });
    }
  }, [inputMessage, userId, conversation_id, messages, isShopActive]);

  // Send attachment
  const handleSendAttachment = useCallback(
    async (file, type) => {
      if (!isShopActive) {
        Alert.alert('Cannot Send', 'This shop is no longer active.');
        return;
      }

      if (!file?.uri || !conversation_id || !userId || !shopId) {
        console.error('Invalid file, conversation ID, userId, or shopId:', {
          fileUri: file?.uri,
          conversation_id,
          userId,
          shopId,
        });
        return;
      }

      const tempId = Date.now();
      const normalizedType =
        type === 'photo' ? 'image' : type === 'video' ? 'video' : 'pdf';

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
            name: file.name,
          },
        ];
        console.log('Adding temp attachment message:', tempId);
        cacheMessages(newMessages).catch((error) =>
          console.error('Failed to cache attachment message:', error),
        );
        return newMessages;
      });

      const formData = new FormData();
      formData.append('sender_id', String(userId));
      formData.append('shop_id', String(shopId));
      formData.append('conversation_id', conversation_id);

      try {
        const fileName =
          file.name ||
          `file_${Date.now()}.${type === 'photo' ? 'jpg' : type === 'video' ? 'mp4' : 'pdf'}`;
        let fileUri = file.uri;

        let mimeType;
        if (type === 'video') {
          mimeType = 'video/mp4';
        } else if (type === 'pdf') {
          mimeType = 'application/pdf';
        } else if (type === 'photo') {
          const extension = fileName.toLowerCase().split('.').pop();
          mimeType =
            extension === 'png' ? 'image/png' : extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : 'image/jpeg';
        }

        if (Platform.OS === 'ios' && !fileUri.startsWith('file://')) {
          fileUri = `file://${fileUri}`;
          console.log('Normalized iOS URI:', fileUri);
        }

        console.log('Preparing file for FormData:', {
          uri: fileUri,
          name: fileName,
          type: mimeType,
          platform: Platform.OS,
        });

        formData.append('file', {
          uri: fileUri,
          type: mimeType,
          name: fileName,
        });

        console.log('Uploading attachment:', fileName);
        const response = await axios.post(
          `https://retail-alvinia-goza-f6a0e4f7.koyeb.app/upload/${conversation_id}/`,
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data', Authorization: sessionId },
            timeout: 30000,
          },
        );

        const data = response.data;
        if (!data.file_url) throw new Error('File upload failed');
        console.log('Attachment uploaded:', {
          file_url: data.file_url,
          thumbnail_url: data.thumbnail_url,
          message_id: data.message_id,
        });

        setMessages((prevMessages) => {
          // Remove any duplicates by attachment
          const filteredMessages = prevMessages.filter(
            (msg) => msg.id !== tempId && !(msg.attachment && msg.attachment === data.file_url),
          );
          const updatedMessages = [
            ...filteredMessages,
            {
              id: Number(data.message_id),
              content: null,
              sender_id: userId,
              timestamp: new Date().toISOString(),
              attachment: data.file_url.replace(/conversation_attachments/g, 'chat_attachments'),
              type: normalizedType,
              thumbnail_url: data.thumbnail_url
                ? data.thumbnail_url.replace(/conversation_thumbnails/g, 'chat_thumbnails')
                : null,
              read: false,
              pending: false,
              name: fileName,
            },
          ];
          console.log('Updated messages with uploaded attachment:', { messageId: data.message_id });
          cacheMessages(updatedMessages).catch((error) =>
            console.error('Failed to cache updated attachment message:', error),
          );
          return updatedMessages;
        });

        if (websocketRef.current) {
          websocketRef.current.send(
            JSON.stringify({
              sender_id: userId,
              conversation_id: conversation_id,
              type: 'message',
              timestamp: new Date().toISOString(),
              content: null,
              attachment: data.file_url,
              thumbnail_url: data.thumbnail_url,
              temp_id: tempId,
              message_id: data.message_id,
            }),
          );
        }
        setIsAtBottom(true);
        InteractionManager.runAfterInteractions(() => {
          if (messages.length > 0) {
            console.log('Scrolling to bottom after attachment upload');
            flatListRef.current?.scrollToEnd({ animated: false });
          }
        });
      } catch (error) {
        console.error('Upload error:', {
          message: error.message,
          stack: error.stack,
          response: error.response?.data,
          status: error.response?.status,
        });
        Alert.alert('Upload Failed', 'Failed to upload file. Please try again.');

        setMessages((prevMessages) => {
          const updatedMessages = prevMessages.filter((msg) => msg.id !== tempId);
          console.log('Removed failed attachment message:', tempId);
          cacheMessages(updatedMessages).catch((error) =>
            console.error('Failed to cache after failed attachment:', error),
          );
          return updatedMessages;
        });
      }
    },
    [userId, shopId, conversation_id, messages, isShopActive, sessionId],
  );

  // Handle screen focus
  useFocusEffect(
    useCallback(() => {
      console.log('Screen focused, conversationId:', conversation_id);
      isScreenFocused.current = true;
      if (conversation_id && messages.length > 0) {
        markMessagesAsRead();
        InteractionManager.runAfterInteractions(() => {
          if (!loading && messages.length > 0) {
            console.log('Scrolling to last message on screen focus');
            flatListRef.current?.scrollToEnd({ animated: false });
          }
        });
      }
      return () => {
        console.log('Screen unfocused');
        isScreenFocused.current = false;
      };
    }, [conversation_id, messages, loading]),
  );

  // Scroll to bottom on messages load
  useEffect(() => {
    if (!loading && messages.length > 0) {
      InteractionManager.runAfterInteractions(() => {
        console.log('Scrolling to last message on messages load');
        flatListRef.current?.scrollToEnd({ animated: false });
      });
    }
  }, [loading, messages.length]);

  // Handle input focus
  const handleInputFocus = () => {
    if (!isShopActive) return;
    if (messages.length > 0) {
      setIsAtBottom(true);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
        console.log('Scrolled to bottom on input focus');
      }, 100);
    }
  };

  // Handle keyboard
  useEffect(() => {
    const keyboardDidShow = Keyboard.addListener('keyboardDidShow', () => {
      if (!isShopActive) return;
      if (messages.length > 0) {
        setIsAtBottom(true);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
          console.log('Keyboard shown, scrolled to bottom');
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
    console.warn('scrollToIndex failed:', info);
    InteractionManager.runAfterInteractions(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    });
  };

  // Render message item
  const renderItem = useCallback(
    ({ item }) => {
      const isImage = item.type === 'image';
      const isVideo = item.type === 'video';
      const isPdf = item.type === 'pdf';
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

      console.log('Render item:', {
        id: item.id,
        type: item.type,
        attachment: item.attachment,
        thumbnail_url: item.thumbnail_url,
        pending: item.pending,
        pendingType: typeof item.pending,
        name: item.name,
        full_thumbnail_uri: item.thumbnail_url ? `https://retail-alvinia-goza-f6a0e4f7.koyeb.app${item.thumbnail_url}` : null,
      });

      const formattedTime = new Date(item.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      const mediaUri = item.pending
        ? item.attachment
        : item.attachment
        ? `https://retail-alvinia-goza-f6a0e4f7.koyeb.app${item.attachment.replace(/conversation_attachments/g, 'chat_attachments')}`
        : null;

      const thumbnailUri = item.thumbnail_url
        ? `https://retail-alvinia-goza-f6a0e4f7.koyeb.app${item.thumbnail_url.replace(/conversation_thumbnails/g, 'chat_thumbnails')}`
        : null;

      return (
        <View style={styles.messageWrapper}>
          {item.attachment ? (
            <View
              style={[ // Fixed: Added curly braces around style array
                styles.mediaContainer,
                item.sender_id === userId ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' },
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
                    pending={!!(item.pending === true || item.pending === 'true')}
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
                    name={item.read ? 'done-all' : 'done'}
                    size={18}
                    color={item.read ? '#007BFF' : 'gray'}
                    style={styles.checkmark}
                  />
                )}
              </View>
            </View>
          ) : (
            <View
              style={[ // Fixed: Added curly braces around style array
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
                      name={item.read ? 'done-all' : 'done'}
                      size={18}
                      color={item.read ? '#007BFF' : 'gray'}
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
  );

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
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
              onPress={() => router.replace(prevRoute || "((tabs)/placeholder)")}
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