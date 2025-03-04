import React, { useEffect, useState, useCallback } from "react";
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

const MessageList = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const router = useRouter();
  const pathname = usePathname();

  const fetchSessionId = async () => {
    try {
      const sessionIdString = await AsyncStorage.getItem("sessionToken");
      setSessionId(sessionIdString);
    } catch (error) {
      console.error("Error fetching user ID:", error);
    }
  };

  const fetchMessages = async () => {
    if (!sessionId) return;

    setLoading(true);
    try {
      const response = await axios.get("https://172.27.243.94:8000/message-list/", {
        headers: {
          Authorization: sessionId,
        },
      });
      setMessages(response.data);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const getSessionAndFetchMessages = async () => {
        await fetchSessionId();
        if (sessionId) {
          fetchMessages();
        }
      };

      getSessionAndFetchMessages();
    }, [sessionId])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMessages();
    setRefreshing(false);
  };

  const handleMessageClick = (message) => {
    router.push({
      pathname: "shop/Conversation",
      params: {
        name: message.name,
        conversation_id: message.conversation_id,
        shop_id: message.shop_id,
        prevRoute: pathname,
      },
    });
  };

  return (
    <LinearGradient colors={["#E3F2FD", "#BBDEFB"]} style={styles.container}>
      <LinearGradient
        colors={["#3A7BD5", "#3A6073"]}
        style={styles.headerContainer}
      >
        <Text style={styles.header}>Messages</Text>
      </LinearGradient>

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
      ) : messages.length === 0 ? (
        <Text style={styles.noMessages}>No messages found</Text>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.messageItem}
              onPress={() => handleMessageClick(item)}
              activeOpacity={0.85}
            >
              <Image
                source={{
                  uri: item.profile_image || "https://your-default-image-url.com/default-profile.png",
                }}
                style={styles.profileImage}
                onError={(e) => console.log("Image Load Error:", e.nativeEvent.error)}
              />

              <View style={styles.textContainer}>
                <View style={styles.messageHeader}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.date}>{new Date(item.date).toLocaleDateString()}</Text>
                </View>
                <Text style={styles.lastMessage} numberOfLines={1} ellipsizeMode="tail">
                  {item.last_message}
                </Text>
              </View>
            </TouchableOpacity>
          )}
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
  loader: {
    marginTop: 50,
  },
  noMessages: {
    fontSize: 16,
    color: "#888",
    textAlign: "center",
    marginTop: 20,
  },
  messageItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20, 
    padding: 16, 
    marginHorizontal: 16,
    marginVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 10, 
    elevation: 5,
  },
  profileImage: {
    width: 58, 
    height: 58,
    borderRadius: 30,
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
    fontSize: 18, 
    fontWeight: "bold",
    color: "#2C3E50",
  },
  date: {
    fontSize: 13, 
    color: "#7B8D93",
    fontWeight: "600",
  },
  lastMessage: {
    fontSize: 15, 
    color: "#444",
    opacity: 0.9,
  },
});

export default MessageList;
