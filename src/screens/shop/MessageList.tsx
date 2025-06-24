import React, { useEffect, useState, useCallback, useRef, memo } from "react";
import {
  FlatList,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image, StatusBar
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, usePathname, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { storeData, getData } from "../../storage/storage";

const MessageList = () => {
  const [messages, setMessages] = useState([]);
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [activeTab, setActiveTab] = useState("All");
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const isMountedRef = useRef(true);
  const isFetchingRef = useRef(false);
  const mountCountRef = useRef(0);
  const router = useRouter();
  const pathname = usePathname();

  // Debug mount/unmount
  useEffect(() => {
    mountCountRef.current += 1;
    console.log(`MessageList mounted (count: ${mountCountRef.current}, pathname: ${pathname})`);
    return () => {
      isMountedRef.current = false;
      console.log(`MessageList unmounted (count: ${mountCountRef.current}, pathname: ${pathname})`);
    };
  }, [pathname]);

  // Fetch session ID
  const fetchSessionId = useCallback(async () => {
    try {
      const sessionIdString = await AsyncStorage.getItem("sessionToken");
      console.log("Fetched session ID");
      setSessionId(sessionIdString);
      return sessionIdString;
    } catch (error) {
      console.error("Error fetching session ID:", error);
      return null;
    }
  }, []);

  // Cache messages
  const cacheMessages = useCallback(async (messagesToCache) => {
    try {
      await storeData("message_list", JSON.stringify(messagesToCache));
      console.log("Messages cached");
    } catch (error) {
      console.error("Error caching messages:", error);
    }
  }, []);

  // Load cached messages
  const loadCachedMessages = useCallback(async () => {
    try {
      const cached = await getData("message_list");
      if (cached) {
        const parsed = JSON.parse(cached);
        console.log("Loaded cached messages (count:", parsed.length, ")");
        return parsed;
      }
      return [];
    } catch (error) {
      console.error("Error loading cached messages:", error);
      return [];
    }
  }, []);

  // Fetch messages from backend
  const fetchMessages = useCallback(
    async () => {
      if (!sessionId) {
        console.warn("Cannot fetch messages: sessionId is null");
        return;
      }
      if (isFetchingRef.current) {
        console.log("Fetch in progress, skipping...");
        return;
      }

      isFetchingRef.current = true;
      setLoading(true);
      setFetchError(false);

      try {
        console.log("Sending request to backend...");
        const response = await axios.get(
          "https://retail-alvinia-goza-f6a0e4f7.koyeb.app/message-list/",
          { headers: { Authorization: sessionId } }
        );
        const newMessages = response.data;
        if (isMountedRef.current) {
          console.log("Fetched messages (count:", newMessages.length, ")");
          setMessages(newMessages);
          await cacheMessages(newMessages);
          filterMessages(newMessages, activeTab);
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
        if (isMountedRef.current) setFetchError(true);
      } finally {
        if (isMountedRef.current) setLoading(false);
        isFetchingRef.current = false;
      }
    },
    [sessionId, cacheMessages, activeTab]
  );

  // Filter messages
  const filterMessages = useCallback((messagesToFilter, tab) => {
    if (!isMountedRef.current) return;
    let filtered = messagesToFilter;
    if (tab === "Space") {
      filtered = messagesToFilter.filter((msg) => msg.role === "seller");
    } else if (tab === "Customers") {
      filtered = messagesToFilter.filter((msg) => msg.role === "buyer");
    }
    setFilteredMessages(filtered);
    console.log(`Filtered messages for ${tab} (count: ${filtered.length})`);
  }, []);

  // Initialize messages on focus
  useFocusEffect(
    useCallback(() => {
      isMountedRef.current = true;
      const initializeMessages = async () => {
        setLoading(true);
        try {
          // Load cached messages first
          const cachedMessages = await loadCachedMessages();
          if (cachedMessages.length > 0 && isMountedRef.current) {
            setMessages(cachedMessages);
            filterMessages(cachedMessages, activeTab);
          }
          // Fetch fresh data from backend
          const session = await fetchSessionId();
          if (session && isMountedRef.current) {
            await fetchMessages();
          }
        } catch (error) {
          console.error("Error initializing messages:", error);
          if (isMountedRef.current) setFetchError(true);
        } finally {
          if (isMountedRef.current) setLoading(false);
        }
      };
      initializeMessages();
      return () => {
        isMountedRef.current = false;
      };
    }, [loadCachedMessages, fetchSessionId, fetchMessages])
  );

  // Handle tab change
  const handleTabChange = useCallback(
    (tab) => {
      console.log("Switching to tab:", tab);
      setActiveTab(tab);
      filterMessages(messages, tab);
    },
    [messages, filterMessages]
  );

  // Handle pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMessages();
    setRefreshing(false);
  }, [fetchMessages]);

  // Handle navigation to Conversation
  const handleMessageClick = useCallback(
    (message) => {
      console.log("Navigating to Conversation:", {
        conversation_id: message.conversation_id,
        shopId: message.shopId,
        role: message.role,
      });
      router.push({
        pathname: "shop/Conversation",
        params: {
          name: message.name,
          conversation_id: message.conversation_id,
          shop_id: message.shop_id,
          shop_is_active: message.shop_is_active.toString(),
          role: message.role,
          prevRoute: pathname,
          shopId: message.shopId
        },
      });
    },
    [router, pathname]
  );

  // Render message item
  const renderItem = useCallback(
    ({ item }) => {
      const isUnread = item.is_unread_by_receiver;
      const isDeleted = !item.shop_is_active;
      const formattedDate = new Date(item.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      return (
        <TouchableOpacity
          style={[
            styles.messageItem,
            isUnread && styles.unreadMessage,
            isDeleted && styles.deletedMessage,
          ]}
          onPress={() => handleMessageClick(item)}
          activeOpacity={0.85}
        >
          <Image
            source={{
              uri:
                item.profile_image ||
                "https://via.placeholder.com/58?text=Profile",
            }}
            style={[
              styles.profileImage,
              isUnread && styles.unreadProfileImage,
              isDeleted && styles.deletedProfileImage,
            ]}
            onError={(e) =>
              console.log("Image Load Error:", e.nativeEvent.error)
            }
            defaultSource={{ uri: "https://via.placeholder.com/58?text=Profile" }}
          />
          <View style={styles.textContainer}>
            <View style={styles.messageHeader}>
              <Text
                style={[
                  styles.name,
                  isUnread && styles.unreadText,
                  isDeleted && styles.deletedText,
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.name || "Unknown"}
                {isDeleted && " (Deleted)"}
              </Text>
              <Text
                style={[
                  styles.date,
                  isUnread && styles.unreadText,
                  isDeleted && styles.deletedText,
                ]}
              >
                {formattedDate}
              </Text>
            </View>
            <Text
              style={[
                styles.lastMessage,
                isUnread && styles.unreadText,
                isDeleted && styles.deletedText,
              ]}
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

  // Render navigation bar
  const renderNavBar = () => {
    const tabs = ["All", "Space", "Customers"];
    return (
      <View style={styles.navBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.navButton,
              activeTab === tab && styles.activeNavButton,
            ]}
            onPress={() => handleTabChange(tab)}
            accessibilityLabel={`${tab} Messages Tab`}
          >
            <Text
              style={[
                styles.navButtonText,
                activeTab === tab && styles.activeNavButtonText,
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <LinearGradient colors={["#E3F2FD", "#BBDEFB"]} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor='#2563EB' />
      <LinearGradient
        colors={["#3A7BD5", "#3A6073"]}
        style={styles.headerContainer}
      >
        <Text style={styles.header}>Messages</Text>
      </LinearGradient>

      {renderNavBar()}

      {loading && !filteredMessages.length ? (
        <View style={styles.statusBar}>
          <View style={styles.statusContent}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.statusText}>Loading Messages...</Text>
          </View>
        </View>
      ) : fetchError && !filteredMessages.length ? (
        <View style={[styles.statusBar, styles.errorBar]}>
          <View style={styles.statusContent}>
            <Text style={styles.statusText}>Failed to fetch messages</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => fetchMessages()}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : filteredMessages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.noMessages}>
            {activeTab === "Space"
              ? "No shop messages found"
              : activeTab === "Customers"
              ? "No customer messages found"
              : "No messages found"}
          </Text>
          <TouchableOpacity
            style={styles.retryButtonLarge}
            onPress={() => fetchMessages()}
          >
            <Text style={styles.retryButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredMessages}
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
  container: { flex: 1, backgroundColor: "#F7FAFC" },
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
  navBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  navButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  activeNavButton: { backgroundColor: "#3A7BD5" },
  navButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  activeNavButtonText: { color: "#FFFFFF" },
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
    marginBottom: 10,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 12,
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
  deletedMessage: {
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#D32F2F",
  },
  unreadProfileImage: { borderColor: "#007AFF" },
  deletedProfileImage: {
    borderColor: "#D32F2F",
    opacity: 0.6,
  },
  unreadText: {
    fontWeight: "bold",
    color: "#007AFF",
    fontSize: 16,
  },
  deletedText: {
    color: "#D32F2F",
    fontStyle: "italic",
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
  textContainer: { flex: 1 },
  messageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginRight: 8,
  },
  date: {
    fontSize: 12,
    color: "#666",
    minWidth: 60,
    textAlign: "right",
  },
  lastMessage: {
    fontSize: 15,
    color: "#444",
    opacity: 0.9,
  },
});

export default memo(MessageList);