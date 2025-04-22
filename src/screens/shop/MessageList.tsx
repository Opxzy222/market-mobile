import React, { useEffect, useState, useCallback, memo } from "react";
import {
  FlatList,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, usePathname } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { storeData, getData } from "../../storage/storage";

const MessageList = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false); // Start false for cached data
  const [fetchError, setFetchError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Fetch session ID
  const fetchSessionId = useCallback(async () => {
    try {
      const sessionIdString = await AsyncStorage.getItem("sessionToken");
      console.log("Fetched session ID:", sessionIdString);
      setSessionId(sessionIdString);
      return sessionIdString;
    } catch (error) {
      console.error("Error fetching session ID:", error);
      return null;
    }
  }, []);

  // Cache messages
  const cacheMessages = useCallback(async (messagesToCache: any[]) => {
    try {
      console.log("Caching messages:", {
        messageCount: messagesToCache.length,
        messages: messagesToCache.map((msg) => ({
          id: msg.id,
          name: msg.name,
          conversation_id: msg.conversation_id,
        })),
      });
      await storeData("message_list", JSON.stringify(messagesToCache));
      console.log("Message list cached successfully");
    } catch (error) {
      console.error("Error caching messages:", error);
    }
  }, []);

  // Load cached messages
  const loadCachedMessages = useCallback(async (): Promise<any[]> => {
    try {
      console.log("Loading cached messages...");
      const cached = await getData("message_list");
      if (cached) {
        const parsed = JSON.parse(cached);
        console.log("Loaded cached messages:", {
          messageCount: parsed.length,
          messages: parsed.map((msg: any) => ({
            id: msg.id,
            name: msg.name,
            conversation_id: msg.conversation_id,
          })),
        });
        return parsed;
      } else {
        console.log("No cached messages found");
      }
    } catch (error) {
      console.error("Error loading cached messages:", error);
    }
    return [];
  }, []);

  // Fetch messages from backend
  const fetchMessages = useCallback(async () => {
    if (!sessionId) {
      console.warn("Cannot fetch messages: sessionId is null");
      return;
    }

    setLoading(true);
    setFetchError(false);

    try {
      console.log("Fetching messages from API...");
      const response = await axios.get(
        "https://retail-alvinia-goza-f6a0e4f7.koyeb.app/message-list/",
        {
          headers: {
            Authorization: sessionId,
          },
        }
      );

      const newMessages = response.data;
      console.log("API response:", {
        messageCount: newMessages.length,
        messages: newMessages.map((msg: any) => ({
          id: msg.id,
          name: msg.name,
          conversation_id: msg.conversation_id,
        })),
      });

      setMessages(newMessages); // Update message list
      await cacheMessages(newMessages); // Update cache
    } catch (error) {
      console.error("Error fetching messages:", error);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [sessionId, cacheMessages]);

  // Load cached messages on mount
  useEffect(() => {
    const initializeMessages = async () => {
      try {
        const cachedMessages = await loadCachedMessages();
        setMessages(cachedMessages); // Display cached data immediately
      } catch (error) {
        console.error("Error initializing messages:", error);
      }
    };

    initializeMessages();
  }, [loadCachedMessages]);

  // Fetch sessionId and messages on every screen focus
  useFocusEffect(
    useCallback(() => {
      const getSessionAndFetchMessages = async () => {
        const session = await fetchSessionId();
        if (session) {
          await fetchMessages();
        }
      };

      getSessionAndFetchMessages();
      return () => {
        console.log("Screen unfocused");
      };
    }, [fetchSessionId, fetchMessages])
  );

  // Handle pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMessages();
    setRefreshing(false);
  }, [fetchMessages]);

  // Handle navigation to Conversation screen
  const handleMessageClick = useCallback(
    (message: any) => {
      console.log("Navigating to Conversation:", {
        name: message.name,
        conversation_id: message.conversation_id,
        shop_id: message.shop_id,
      });
      router.push({
        pathname: "shop/Conversation",
        params: {
          name: message.name,
          conversation_id: message.conversation_id,
          shop_id: message.shop_id,
          prevRoute: pathname,
        },
      });
    },
    [router, pathname]
  );

  // Render message item
  const renderItem = useCallback(
    ({ item }: { item: any }) => {
      const isUnread = !item.status;
      const formattedDate = new Date(item.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      return (
        <TouchableOpacity
          style={[styles.messageItem, isUnread && styles.unreadMessage]}
          onPress={() => handleMessageClick(item)}
          activeOpacity={0.85}
        >
          <Image
            source={{
              uri:
                item.profile_image ||
                "https://via.placeholder.com/58?text=Profile",
            }}
            style={[styles.profileImage, isUnread && styles.unreadProfileImage]}
            onError={(e) =>
              console.log("Image Load Error:", e.nativeEvent.error)
            }
          />
          <View style={styles.textContainer}>
            <View style={styles.messageHeader}>
              <Text style={[styles.name, isUnread && styles.unreadText]}>
                {item.name || "Unknown"}
              </Text>
              <Text style={[styles.date, isUnread && styles.unreadText]}>
                {formattedDate}
              </Text>
            </View>
            <Text
              style={[styles.lastMessage, isUnread && styles.unreadText]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.last_message || (item.attachment ? "📎 Media" : "No message")}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [handleMessageClick]
  );

  return (
    <LinearGradient colors={["#E3F2FD", "#BBDEFB"]} style={styles.container}>
      <LinearGradient
        colors={["#3A7BD5", "#3A6073"]}
        style={styles.headerContainer}
      >
        <Text style={styles.header}>Messages</Text>
      </LinearGradient>

      {(loading || fetchError) && (
        <View style={[styles.statusBar, fetchError ? styles.errorBar : styles.loadingBar]}>
          {loading && (
            <View style={styles.statusContent}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.statusText}>Updating Messages...</Text>
            </View>
          )}
          {fetchError && (
            <View style={styles.statusContent}>
              <Text style={styles.statusText}>Failed to fetch messages</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={fetchMessages}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {messages.length === 0 && !loading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.noMessages}>No messages found</Text>
          {fetchError && (
            <TouchableOpacity
              style={styles.retryButtonLarge}
              onPress={fetchMessages}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={renderItem}
          contentContainerStyle={styles.messageList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7FAFC",
  },
  headerContainer: {
    paddingVertical: 45,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  header: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
  },
  statusBar: {
    padding: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)", // Glassmorphism translucent white
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 8, // Slight offset from header
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)", // Subtle border for depth
  },
  loadingBar: {
    backgroundColor: "transparent", // Gradient handled by LinearGradient
  },
  errorBar: {
    backgroundColor: "rgba(211, 47, 47, 0.9)", // Translucent red for errors
    borderColor: "rgba(211, 47, 47, 0.3)",
  },
  statusContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  statusText: {
    color: "#333", // Dark text for contrast
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
  retryButtonLarge: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 16,
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
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noMessages: {
    fontSize: 18,
    color: "#888",
    textAlign: "center",
  },
  messageList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 12, // Space for statusBar
  },
  messageItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  unreadMessage: {
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  unreadProfileImage: {
    borderColor: "#007AFF",
  },
  unreadText: {
    fontWeight: "bold",
    color: "#007AFF",
    fontSize: 16,
  },
  profileImage: {
    width: 58,
    height: 58,
    borderRadius: 29,
    marginRight: 14,
    borderWidth: 3,
    borderColor: "#3A7BD5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  textContainer: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
    alignItems: "center",
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  date: {
    fontSize: 12,
    color: "#666",
  },
  lastMessage: {
    fontSize: 15,
    color: "#444",
    opacity: 0.9,
  },
});

export default memo(MessageList);