import React, { useCallback, useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import StatusRing from "../../components/shop/StatusRing";
import StatusViewer from "../../components/shop/StatusViewer";
import ShopPostsFeed from "../../components/shop/ShopPostsFeed";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

const FollowedShopStatusScreen = () => {
  const router = useRouter();
  const [statuses, setStatuses] = useState([]);
  const [viewedStatuses, setViewedStatuses] = useState([]);
  const [followedPosts, setFollowedPosts] = useState([]);
  const [nearbyPosts, setNearbyPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentStatusIndex, setCurrentStatusIndex] = useState(null);
  const [userId, setUserId] = useState(null);
  const isMountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setRefreshing(true);
      const userIdString = await AsyncStorage.getItem("user_id");
      if (!userIdString) {
        console.warn("No user_id found in AsyncStorage");
        return;
      }

      const userId = parseInt(userIdString, 10);
      setUserId(userId);

      // Fetch statuses
      const statusResponse = await axios.get(
        `https://retail-alvinia-goza-f6a0e4f7.koyeb.app/statuses/?user_id=${userId}`
      );
      const fetchedStatuses = Array.isArray(statusResponse.data.statuses)
        ? statusResponse.data.statuses
        : [];

      // Sort statuses by created_at in descending order (newest first)
      const groupedStatuses = fetchedStatuses
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .reduce((acc, status) => {
          if (!status || !status.shop) return acc;
          if (!acc[status.shop.id]) acc[status.shop.id] = [];
          acc[status.shop.id].push(status);
          return acc;
        }, {});

      // Ensure each shop's statuses are sorted by created_at (newest first)
      const groupedArray = Object.keys(groupedStatuses).map((shopId) => ({
        shop: groupedStatuses[shopId][0].shop.name,
        shopId,
        statuses: groupedStatuses[shopId].sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        ),
      }));

      const unviewed = groupedArray.filter((group) =>
        group.statuses.some((s) => !s.viewed)
      );
      const viewed = groupedArray.filter((group) =>
        group.statuses.every((s) => s.viewed)
      );

      if (isMountedRef.current) {
        setStatuses(unviewed);
        setViewedStatuses(viewed);
      }

      // Fetch posts
      const postsResponse = await axios.get(
        `https://retail-alvinia-goza-f6a0e4f7.koyeb.app/shop-posts/?user_id=${userId}&page=1&page_size=20`
      );

      const transformPosts = (posts) =>
        Array.isArray(posts)
          ? posts.map((post, index) => ({
              id: post.id ?? `post-${index}-${Date.now()}`,
              ...post,
              media: Array.isArray(post.media)
                ? post.media.map((item) => ({
                    url: item.url || "",
                    thumbnail_url: item.thumbnail_url || "",
                    type: item.type || "image",
                  }))
                : [],
            }))
          : [];

      if (isMountedRef.current) {
        setFollowedPosts(transformPosts(postsResponse.data.followed_posts));
        setNearbyPosts(transformPosts(postsResponse.data.nearby_posts));
      }
    } catch (error) {
      console.error("Error fetching data:", error.response?.data || error.message);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
      if (__DEV__) console.log("FollowedShopStatusScreen focused");
      return () => {
        if (__DEV__) console.log("FollowedShopStatusScreen unfocused");
      };
    }, [fetchData])
  );

  const handleRefresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  const handleStatusViewed = useCallback(
    async (viewedStatusGroup) => {
      const statusIds = viewedStatusGroup.statuses.map((s) => s.id);
      setStatuses((prev) =>
        prev.filter((group) => group.shopId !== viewedStatusGroup.statuses[0].shop.id)
      );
      setViewedStatuses((prev) => {
        const existingGroup = prev.find(
          (group) => group.shopId === viewedStatusGroup.statuses[0].shop.id
        );
        if (existingGroup) {
          return prev.map((group) =>
            group.shopId === viewedStatusGroup.statuses[0].shop.id
              ? { ...group, statuses: [...group.statuses, ...viewedStatusGroup.statuses] }
              : group
          );
        }
        return [
          ...prev,
          {
            shop: viewedStatusGroup.shop,
            shopId: viewedStatusGroup.statuses[0].shop.id,
            statuses: viewedStatusGroup.statuses.map((s) => ({ ...s, viewed: true })),
          },
        ];
      });

      try {
        for (const statusId of statusIds) {
          await axios.post(
            `https://retail-alvinia-goza-f6a0e4f7.koyeb.app/statuses/${statusId}/view/`,
            { user_id: userId }
          );
        }
      } catch (error) {
        console.error("Error marking status as viewed:", error);
        fetchData();
      }
    },
    [userId, fetchData]
  );

  const handleOpenViewer = useCallback((index) => {
    setCurrentStatusIndex(index);
  }, []);

  const handleCloseViewer = useCallback(() => {
    setCurrentStatusIndex(null);
  }, []);

  const getTimeAgo = useCallback((createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now - created;

    if (isNaN(diffMs) || diffMs < 0) {
      return "Just now";
    }

    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMins / 60);

    if (diffSeconds < 60) {
      return "Just now";
    }
    if (diffMins < 60) {
      return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
    }
    if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
    }
    return `${Math.floor(diffHours / 24)} day${Math.floor(diffHours / 24) === 1 ? "" : "s"} ago`;
  }, []);

  const renderStatusItem = useCallback(
    ({ item, index, isViewed }) => {
      const latestStatus = item.statuses[0];
      let thumbnailUri = "https://via.placeholder.com/150";
      if (latestStatus.media_type === "image" && latestStatus.media_url) {
        thumbnailUri = latestStatus.media_url;
      } else if (latestStatus.media_type === "video" && latestStatus.thumbnail_url) {
        thumbnailUri = latestStatus.thumbnail_url;
      } else if (latestStatus.media_type === "text" && latestStatus.shop?.image) {
        thumbnailUri = latestStatus.shop.image;
      } else if (latestStatus.media_type === "text") {
        thumbnailUri = "https://via.placeholder.com/150?text=Text";
      }
      const timeAgo = latestStatus.created_at ? getTimeAgo(latestStatus.created_at) : "N/A";

      return (
        <TouchableOpacity
          onPress={() => handleOpenViewer(index)}
          style={styles.statusItem}
          activeOpacity={0.9}
        >
          <StatusRing
            imageUri={thumbnailUri}
            totalStatuses={item.statuses.length}
            viewedStatuses={isViewed ? item.statuses.length : item.statuses.filter((s) => s.viewed).length}
          />
          <View style={styles.textContainer}>
            <Text style={styles.statusName}>{item.shop}</Text>
            <Text style={styles.statusTime}>{timeAgo}</Text>
          </View>
        </TouchableOpacity>
      );
    },
    [handleOpenViewer, getTimeAgo]
  );

  const keyExtractor = useCallback(
    (item) => item.statuses[0].id?.toString() ?? `status-${Math.random()}`,
    []
  );

  // Flatten statuses for StatusViewer
  const flattenedStatuses = [...statuses, ...viewedStatuses].reduce((acc, group) => {
    return [...acc, ...group.statuses];
  }, []);

  return (
    <LinearGradient
      colors={["#E3F2FD", "#BBDEFB"]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#2563EB" translucent />
      {loading ? (
        <ActivityIndicator size="large" color="#25D366" style={styles.loader} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          {(statuses.length > 0 || viewedStatuses.length > 0) && (
            <Animated.View entering={FadeInDown.duration(400).springify()}>
              <Text style={styles.subHeader}>Stories</Text>
              <View style={styles.statusWrapper}>
                <FlatList
                  horizontal
                  data={[...statuses, ...viewedStatuses]}
                  renderItem={({ item, index }) =>
                    renderStatusItem({
                      item,
                      index,
                      isViewed: viewedStatuses.some((group) => group.shopId === item.shopId),
                    })
                  }
                  keyExtractor={keyExtractor}
                  contentContainerStyle={styles.statusList}
                  showsHorizontalScrollIndicator={false}
                />
                <LinearGradient
                  colors={["transparent", "#D6E4FF"]}
                  style={styles.fadeEffect}
                />
              </View>
            </Animated.View>
          )}

          {followedPosts.length > 0 && (
            <Animated.View entering={FadeInDown.duration(400).delay(100).springify()}>
              <View style={styles.sectionHeader}>
                <Text style={styles.subHeader}>Latest Posts</Text>
                <TouchableOpacity
                  style={styles.seeMoreButton}
                  onPress={() => {
                    console.log("Navigating to ShopPostsScreen with followed posts");
                    router.push({
                      pathname: "/shop/ShopPostsScreen",
                      params: { posts: JSON.stringify(followedPosts), type: "followed" },
                    });
                  }}
                >
                  <LinearGradient
                    colors={["#007bff", "#25D366"]}
                    style={styles.seeMoreGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.seeMoreText}>See More</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" style={styles.seeMoreArrow} />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
              <ShopPostsFeed
                posts={followedPosts.slice(0, 6)}
                showDistance={false}
                onSeeMore={() => {
                  console.log("Followed Posts See More clicked");
                  router.push({
                    pathname: "/shop/ShopPostsScreen",
                    params: { posts: JSON.stringify(followedPosts), type: "followed" },
                  });
                }}
                hasMore={followedPosts.length > 6}
              />
            </Animated.View>
          )}

          {nearbyPosts.length > 0 && (
            <Animated.View entering={FadeInDown.duration(400).delay(200).springify()}>
              <View style={styles.sectionHeader}>
                <Text style={styles.subHeader}>Nearby Posts</Text>
                <TouchableOpacity
                  style={styles.seeMoreButton}
                  onPress={() => {
                    console.log("Navigating to ShopPostsScreen with nearby posts");
                    router.push({
                      pathname: "/shop/ShopPostsScreen",
                      params: { posts: JSON.stringify(nearbyPosts), type: "nearby" },
                    });
                  }}
                >
                  <LinearGradient
                    colors={["#007bff", "#25D366"]}
                    style={styles.seeMoreGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.seeMoreText}>See More</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" style={styles.seeMoreArrow} />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
              <ShopPostsFeed
                posts={nearbyPosts.slice(0, 6)}
                showDistance
                onSeeMore={() => {
                  console.log("Nearby Posts See More clicked");
                  router.push({
                    pathname: "/shop/ShopPostsScreen",
                    params: { posts: JSON.stringify(nearbyPosts), type: "nearby" },
                  });
                }}
                hasMore={nearbyPosts.length > 6}
              />
            </Animated.View>
          )}

          {statuses.length === 0 &&
            viewedStatuses.length === 0 &&
            followedPosts.length === 0 &&
            nearbyPosts.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No stories or posts available</Text>
              </View>
            )}
        </ScrollView>
      )}

      {currentStatusIndex !== null && (
        <>
          {console.log("Statuses passed to StatusViewer:", flattenedStatuses)}
          <StatusViewer
            statuses={flattenedStatuses}
            initialIndex={currentStatusIndex}
            onClose={handleCloseViewer}
            onStatusViewed={handleStatusViewed}
            visible={currentStatusIndex !== null}
            userId={userId}
          />
        </>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
  },
  scrollContainer: {
    paddingBottom: 120,
  },
  statusWrapper: {
    position: "relative",
    marginBottom: 24,
  },
  statusList: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    justifyContent: "flex-start",
  },
  statusItem: {
    flexDirection: "column",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    width: 90,
    height: 150,
    justifyContent: "space-between",
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 6,
  },
  statusName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1A1A",
    textAlign: "center",
    lineHeight: 16,
    maxWidth: "100%",
    fontFamily: "System",
  },
  statusTime: {
    fontSize: 11,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 4,
    fontWeight: "500",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 12,
    paddingHorizontal: 8,
  },
  subHeader: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1A1A1A",
    letterSpacing: 0.3,
    fontFamily: "System",
  },
  seeMoreButton: {
    borderRadius: 24,
    overflow: "hidden",
  },
  seeMoreGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 24,
  },
  seeMoreText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
    marginRight: 8,
  },
  seeMoreArrow: {
    marginLeft: 4,
  },
  fadeEffect: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 40,
    zIndex: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    fontStyle: "italic",
    fontWeight: "500",
    textAlign: "center",
  },
  loader: {
    flex: 1,
    justifyContent: "center",
  },
});

export default FollowedShopStatusScreen;