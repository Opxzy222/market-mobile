import React, { useCallback, useEffect, useState, useRef } from 'react';
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
  StatusBar, Image
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { storeData, getData, initializeDatabase } from '../../storage/storage';
import SendImage from '../../components/shop/SendImage';
import SendVideo from '../../components/shop/SendVideo';
import SendPDF from '../../components/shop/SendPdf';
import ChatImage from '../../components/shop/ChatImage';
import ChatVideo from '../../components/shop/ChatVideo';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from "expo-linear-gradient";

const isWeb = Constants.platform?.web;



const StartConversation = () => {
  const [userId, setUserId] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
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

  const params = useLocalSearchParams();
  const { shopId, name } = params;
  const router = useRouter();

  // Initialize database
  useEffect(() => {
    const setupDatabase = async () => {
      try {
        console.log('Initializing database...');
        await initializeDatabase();
        console.log('Database initialized in StartConversation');
      } catch (error) {
        console.error('Failed to initialize database:', error);
      }
    };
    setupDatabase();
  }, []);

  // Load session data, cached conversationId, and messages, then fetch if necessary
  useEffect(() => {
    const loadData = async () => {
      if (!shopId) return;

      try {
        // Load sessionId and userId
        const [sessionIdString, userIdString] = await Promise.all([
          AsyncStorage.getItem('sessionToken'),
          AsyncStorage.getItem('user_id'),
        ]);
        console.log('Fetched session ID:', sessionIdString, 'user ID:', userIdString);
        setSessionId(sessionIdString);
        if (userIdString) {
          setUserId(parseInt(userIdString, 10));
        }

        // Load cached conversationId
        const cachedId = await AsyncStorage.getItem(`conversation_id_${shopId}`);
        console.log('Loaded cached conversationId:', cachedId, 'for shopId:', shopId);
        if (cachedId) {
          setConversationId(cachedId);
          setConversationStarted(true);
          const cachedMessages = await loadCachedMessages(cachedId);
          console.log('Setting messages from cache:', {
            messageCount: cachedMessages.length,
            messages: cachedMessages.map((msg) => ({
              id: msg.id,
              content: msg.content,
              type: msg.type,
              thumbnail_url: msg.thumbnail_url,
            })),
          });
          setMessages(cachedMessages);
          setMessagesLoaded(!!cachedMessages.length);
        }

        // Fetch messages if no cached conversationId and not already fetched
        if (!cachedId && sessionIdString && userIdString && !hasFetchedMessages.current) {
          hasFetchedMessages.current = true;
          await fetchMessages(sessionIdString, parseInt(userIdString, 10));
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();
  }, [shopId]);

  // Handle screen focus for marking messages as read and scrolling
  useFocusEffect(
    useCallback(() => {
      console.log('Screen focused, conversationId:', conversationId);
      isScreenFocused.current = true;
      if (conversationId && messages.length > 0) {
        markMessagesAsRead();
        InteractionManager.runAfterInteractions(() => {
          if (messages.length > 0 && !loading) {
            console.log('Scrolling to last message on screen focus');
            flatListRef.current?.scrollToEnd({ animated: false });
          }
        });
      }
      return () => {
        console.log('Screen unfocused');
        isScreenFocused.current = false;
      };
    }, [conversationId, messages, loading])
  );

  // Cache messages
  const cacheMessages = async (messagesToCache, localConversationId) => {
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
    }
  };

  // Load cached messages
  const loadCachedMessages = async (localConversationId) => {
    const cacheKey = `messages_${localConversationId}`;
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

  // Fetch messages
  const fetchMessages = async (sessionId, userId) => {
    if (!userId || !shopId || !sessionId) {
      console.warn('Cannot fetch messages: missing required params', { userId, shopId, sessionId });
      return;
    }

    console.log('Starting fetchMessages, userId:', userId, 'shopId:', shopId);
    setLoading(true);
    setFetchError(false);
    receivedMessagesRef.current.clear();

    try {
      const response = await axios.get(
        `https://retail-alvinia-goza-f6a0e4f7.koyeb.app/messages/?user_id=${userId}&shop_id=${shopId}`,
        { headers: { Authorization: sessionId } }
      );

      console.log('API response:', response.data);
      console.log('Fetched messages:', response.data.messages?.length || 0);

      const newConversationId = response.data.conversation_id ? String(response.data.conversation_id) : null;
      console.log('Setting conversationId:', newConversationId);
      setConversationId(newConversationId);

      if (newConversationId) {
        await AsyncStorage.setItem(`conversation_id_${shopId}`, newConversationId);
        console.log('Cached conversationId:', newConversationId, 'for shopId:', shopId);
        setConversationStarted(true);
      }

      if (response.data.messages?.length > 0) {
        console.log(
          'Setting senderId:',
          response.data.messages[0].sender_user_id,
          'shopOwner:',
          response.data.messages[0].receiver_id
        );
        setSenderId(response.data.messages[0].sender_user_id);
        setShopOwner(response.data.messages[0].receiver_id);
      }

      const uniqueMessages = response.data.messages.filter(
        (msg) => !receivedMessagesRef.current.has(Number(msg.id))
      );

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
            (msg) => !normalizedMessages.some((newMsg) => newMsg.id === msg.id || (newMsg.attachment && newMsg.attachment === msg.attachment))
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
        if (newConversationId) {
          cacheMessages(merged, newConversationId);
        }
        setMessagesLoaded(true);
        return merged;
      });

      if (isScreenFocused.current && uniqueMessages.length > 0) {
        console.log('Marking messages as read after fetch');
        markMessagesAsRead(newConversationId);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      setFetchError(true);
    } finally {
      console.log('Fetch complete, setting loading to false');
      setLoading(false);
    }
  };

  // Mark messages as read
  const markMessagesAsRead = async (localConversationId = conversationId) => {
    if (!localConversationId || !sessionId || messages.length === 0) {
      console.warn('Cannot mark messages as read:', {
        conversationId: localConversationId,
        sessionId,
        messageCount: messages.length,
      });
      return;
    }

    try {
      console.log('Marking messages as read for conversationId:', localConversationId);
      await axios.post(
        'https://retail-alvinia-goza-f6a0e4f7.koyeb.app/mark-messages-read/',
        { conversation_id: localConversationId },
        { headers: { 'Content-Type': 'application/json', Authorization: sessionId } }
      );
      console.log('Messages marked as read');
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Send message via HTTP (fallback for starting conversation)
  const sendMessage = async () => {
    if (!inputMessage.trim()) {
      console.warn('Cannot send empty message');
      return;
    }

    const tempId = Date.now();
    const tempMessage = {
      id: tempId,
      sender_id: userId,
      shop_id: shopId,
      content: inputMessage,
      timestamp: new Date().toISOString(),
      type: 'text',
      read: false,
      pending: true,
      attachment: null,
      thumbnail_url: null,
    };

    setMessages((prevMessages) => {
      const newMessages = [...prevMessages, tempMessage];
      console.log('Adding temp message:', tempId);
      if (conversationId) {
        cacheMessages(newMessages, conversationId);
      }
      return newMessages;
    });

    try {
      console.log('Sending HTTP message:', inputMessage);
      const response = await axios.post(
        'https://retail-alvinia-goza-f6a0e4f7.koyeb.app/messages/',
        { sender_id: userId, shop_id: shopId, content: inputMessage },
        { headers: { Authorization: sessionId } }
      );

      const newConversationId = String(response.data.conversation_id);
      setConversationId(newConversationId);
      setConversationStarted(true);
      await AsyncStorage.setItem(`conversation_id_${shopId}`, newConversationId);
      console.log('Cached conversationId:', newConversationId, 'for shopId:', shopId);

      const serverMessage = {
        ...response.data,
        id: Number(response.data.id),
        type: 'text',
        read: false,
        pending: false,
        name: response.data.attachment?.split('/').pop(),
        attachment: response.data.attachment
          ? response.data.attachment.replace(/conversation_attachments/g, 'chat_attachments')
          : null,
        thumbnail_url: response.data.thumbnail_url
          ? response.data.thumbnail_url.replace(/conversation_thumbnails/g, 'chat_thumbnails')
          : null,
      };

      setMessages((prevMessages) => {
        const updatedMessages = [
          ...prevMessages.filter((msg) => msg.id !== tempId && !(msg.attachment && msg.attachment === serverMessage.attachment)),
          serverMessage,
        ].sort((a, b) => a.id - b.id);
        console.log('Replacing temp message with server message:', serverMessage.id);
        cacheMessages(updatedMessages, newConversationId);
        return updatedMessages;
      });

      setSenderId(response.data.sender_user_id);
      setShopOwner(response.data.receiver_id);

      setInputMessage('');
      setIsAtBottom(true);
      InteractionManager.runAfterInteractions(() => {
        if (messages.length > 0) {
          console.log('Scrolling to bottom after sending HTTP message');
          flatListRef.current?.scrollToEnd({ animated: true });
        }
      });
      setMessagesLoaded(true);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prevMessages) => {
        const updatedMessages = prevMessages.filter((msg) => msg.id !== tempId);
        console.log('Removing failed temp message:', tempId);
        if (conversationId) {
          cacheMessages(updatedMessages, conversationId);
        }
        return updatedMessages;
      });
      Alert.alert('Message Failed', 'Unable to send message. Please try again.');
    }
  };

  // WebSocket connection
  useEffect(() => {
    if (!conversationId) {
      console.warn('Cannot connect WebSocket: conversationId is null', { conversationId });
      return;
    }

    console.log('Connecting WebSocket for conversationId:', conversationId);
    const connectWebSocket = () => {
      const websocketUrl = `wss://retail-alvinia-goza-f6a0e4f7.koyeb.app/ws/chat/${conversationId}/`;
      websocketRef.current = new WebSocket(websocketUrl);

      websocketRef.current.onopen = () => {
        console.log('WebSocket connected');
      };

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
              data.message_ids.includes(Number(msg.id)) ? { ...msg, read: true } : msg
            );
            console.log('Updating read status for messages:', data.message_ids);
            cacheMessages(updatedMessages, conversationId);
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
            const existingIndex = prevMessages.findIndex(
              (msg) => msg.id === tempId || (msg.attachment && msg.attachment === attachmentPath && msg.type === normalizedType)
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
            cacheMessages(updatedMessages, conversationId);
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

      websocketRef.current.onclose = (event) => {
        console.log('WebSocket closed:', { code: event.code, reason: event.reason });
        setTimeout(connectWebSocket, 3000); // Reconnect after 3 seconds
      };
    };

    connectWebSocket();

    return () => {
      console.log('Closing WebSocket...');
      websocketRef.current?.close();
    };
  }, [conversationId]);

  // Send message via WebSocket
  const handleSendMessage = useCallback(() => {
    if (!inputMessage.trim()) {
      console.warn('Cannot send empty message');
      return;
    }

    if (!websocketRef.current || !conversationId || websocketRef.current.readyState !== WebSocket.OPEN) {
      console.warn('Cannot send WebSocket message: WebSocket not ready', {
        inputMessage: !!inputMessage.trim(),
        websocket: !!websocketRef.current,
        conversationId,
        readyState: websocketRef.current?.readyState,
      });
      return sendMessage(); // Fallback to HTTP if WebSocket not ready
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
      cacheMessages(newMessages, conversationId);
      return newMessages;
    });

    try {
      console.log('Sending WebSocket message:', inputMessage);
      websocketRef.current.send(
        JSON.stringify({
          content: inputMessage,
          temp_id: tempId,
          sender_id: userId,
          conversation_id: conversationId,
          timestamp: new Date().toISOString(),
        })
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
        cacheMessages(updatedMessages, conversationId);
        return updatedMessages;
      });
    }
  }, [inputMessage, userId, conversationId, messages, sendMessage]);

  // Send attachment
  const handleSendAttachment = useCallback(
    async (file, type) => {
      if (!file?.uri || !userId || !shopId) {
        console.error('Invalid file, userId, or shopId:', {
          fileUri: file?.uri,
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
        cacheMessages(newMessages, conversationId || `temp_${shopId}`);
        return newMessages;
      });

      const formData = new FormData();
      formData.append('sender_id', String(userId));
      formData.append('shop_id', String(shopId));

      let newFile;

      try {
        if (file.uri.startsWith('blob:')) {
          console.log('Processing blob URI for attachment');
          const response = await fetch(file.uri);
          if (!response.ok) throw new Error('Failed to fetch blob data');

          const blob = await response.blob();
          newFile = new File([blob], file.name || `file_${Date.now()}`, {
            type: blob.type || 'application/octet-stream',
          });
        } else {
          newFile = {
            uri: file.uri.startsWith('file://') ? file.uri : `file://${file.uri}`,
            type:
              type === 'photo'
                ? 'image/jpeg'
                : type === 'video'
                ? 'video/mp4'
                : 'application/pdf',
            name:
              file.name ||
              `file_${Date.now()}.${type === 'photo' ? 'jpg' : type === 'video' ? 'mp4' : 'pdf'}`,
          };
        }

        formData.append('file', newFile);

        console.log('Uploading attachment:', newFile.name);
        const response = await axios.post(
          `https://retail-alvinia-goza-f6a0e4f7.koyeb.app/upload-conversation/`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );

        const data = response.data;
        if (!data.file_url) throw new Error('File upload failed');
        console.log('Attachment uploaded:', {
          file_url: data.file_url,
          thumbnail_url: data.thumbnail_url,
          conversation_id: data.conversation_id,
        });

        // Set conversationId if not already set
        if (!conversationId) {
          setConversationId(String(data.conversation_id));
          setConversationStarted(true);
          await AsyncStorage.setItem(`conversation_id_${shopId}`, String(data.conversation_id));
          console.log('Cached conversationId:', data.conversation_id, 'for shopId:', shopId);
        }

        setMessages((prevMessages) => {
          const filteredMessages = prevMessages.filter(
            (msg) => msg.id !== tempId && !(msg.attachment && msg.attachment === data.file_url)
          );
          const updatedMessages = [
            ...filteredMessages,
            {
              id: Number(data.message_id || tempId),
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
              name: newFile.name,
            },
          ].sort((a, b) => a.id - b.id);
          console.log('Updated messages with uploaded attachment:', { messageId: data.message_id || tempId });
          cacheMessages(updatedMessages, data.conversation_id);
          return updatedMessages;
        });

        if (websocketRef.current) {
          websocketRef.current.send(
            JSON.stringify({
              sender_id: userId,
              conversation_id: data.conversation_id,
              type: 'message',
              timestamp: new Date().toISOString(),
              content: null,
              attachment: data.file_url,
              thumbnail_url: data.thumbnail_url,
              temp_id: tempId,
              message_id: data.message_id || tempId,
            })
          );
        }
        setIsAtBottom(true);
        InteractionManager.runAfterInteractions(() => {
          if (messages.length > 0) {
            console.log('Scrolling to bottom after attachment upload');
            flatListRef.current?.scrollToEnd({ animated: true });
          }
        });
      } catch (error) {
        console.error('Error uploading file:', error);
        Alert.alert('Upload Failed', 'Failed to upload file. Please try again.');

        setMessages((prevMessages) => {
          const updatedMessages = prevMessages.filter((msg) => msg.id !== tempId);
          console.log('Removing failed attachment message:', tempId);
          cacheMessages(updatedMessages, conversationId || `temp_${shopId}`);
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
              style={[
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
    <SafeAreaView style={{ flex: 1, backgroundColor: "#E3F2FD", }} edges={["top", "left", "right"]}>
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