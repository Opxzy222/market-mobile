import React, { useCallback, useState, useEffect, useRef, useMemo } from "react";
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
  Alert,
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

const BACKEND_URL = "https://retail-alvinia-goza-f6a0e4f7.koyeb.app";
const FALLBACK_IMAGE = "https://via.placeholder.com/150";

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
  const [errorMessage, setErrorMessage] = useState(null);
  const isMountedRef = useRef(true);

  // Utility to validate Backblaze B2 URLs
  const validateUrl = (url) => {
    if (!url || typeof url !== "string") {
      return null;
    }
    return url;
  };

  // Fetch combined feed
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setRefreshing(true);
      setErrorMessage(null);
      const userIdString = await AsyncStorage.getItem("user_id");
      if (!userIdString) {
        console.warn("No user_id found in AsyncStorage");
        Alert.alert("Error", "User not logged in. Please log in again.");
        return;
      }

      const userId = parseInt(userIdString, 10);
      setUserId(userId);
      console.log("Using user_id for request:", userIdString);

      // Fetch combined feed
      const response = await axios.get(
        `${BACKEND_URL}/combined-feed/?user_id=${userId}`,
        {
          headers: { Authorization: `Bearer ${userIdString}` },
          timeout: 35000,
        }
      );

      const { statuses: fetchedStatuses, followed_posts, nearby_posts } = response.data;

      console.log("Fetched combined feed:", {
        statuses: JSON.stringify(fetchedStatuses, null, 2),
        followed_posts: JSON.stringify(followed_posts, null, 2),
        nearby_posts: JSON.stringify(nearby_posts, null, 2),
      });

      // Group statuses by shop
      const groupedStatuses = Array.isArray(fetchedStatuses)
        ? fetchedStatuses
            .filter((status) => status && status.shop)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .reduce((acc, status) => {
              if (!acc[status.shop.id]) {
                acc[status.shop.id] = {
                  shopId: status.shop.id,
                  shop: status.shop.name,
                  shopImage: validateUrl(status.shop.image) || FALLBACK_IMAGE,
                  statuses: [],
                  viewed: true,
                };
              }
              acc[status.shop.id].statuses.push({
                ...status,
                media: validateUrl(status.media),
                thumbnail_url: validateUrl(status.thumbnail_url),
                shop: {
                  ...status.shop,
                  image: validateUrl(status.shop.image),
                },
              });
              if (!status.viewed) {
                acc[status.shop.id].viewed = false;
              }
              return acc;
            }, {})
        : {};

      // Convert to array and split unviewed/viewed
      const groupedArray = Object.values(groupedStatuses).sort((a, b) =>
        new Date(b.statuses[0].created_at) - new Date(a.statuses[0].created_at)
      );
      const unviewed = groupedArray.filter((group) => !group.viewed);
      const viewed = groupedArray.filter((group) => group.viewed);

      // Transform posts
      const transformPosts = (posts) =>
        Array.isArray(posts)
          ? posts.map((post, index) => ({
              id: post.id ?? `post-${index}-${Date.now()}`,
              ...post,
              shop_image: validateUrl(post.shop_image) || "",
              media: Array.isArray(post.media)
                ? post.media.map((item) => ({
                    url: validateUrl(item.url) || "",
                    thumbnail_url: validateUrl(item.thumbnail_url) || "",
                    type: item.type || "image",
                  }))
                : [],
            }))
          : [];

      if (isMountedRef.current) {
        setStatuses(unviewed);
        setViewedStatuses(viewed);
        setFollowedPosts(transformPosts(followed_posts));
        setNearbyPosts(transformPosts(nearby_posts));
      }
    } catch (error) {
      console.error("Error fetching data:", error.response?.data || error.message);
      if (error.code === "ECONNABORTED" || error.message.includes("Network Error")) {
        setErrorMessage("Network error, please check your connection and try again.");
      } else {
        setErrorMessage("Failed to load content. Please try again later.");
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchData, 15 * 60 * 1000); // Refresh every 15 minutes
    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchData]);

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

  // Handle status viewed
  const handleStatusViewed = useCallback(
    async (viewedStatusGroup) => {
      const shopId = viewedStatusGroup.statuses[0].shop.id;
      console.log(`Statuses viewed for shop ${viewedStatusGroup.shop}:`, viewedStatusGroup.statuses);

      setStatuses((prev) => {
        const updatedStatuses = prev.map((group) => {
          if (group.shopId === shopId) {
            return {
              ...group,
              statuses: group.statuses.map((s) => ({
                ...s,
                viewed: true,
                media: validateUrl(s.media),
                thumbnail_url: validateUrl(s.thumbnail_url),
                shop: {
                  ...s.shop,
                  image: validateUrl(s.shop.image),
                },
              })),
              viewed: true,
            };
          }
          return group;
        }).filter((group) => !group.viewed); // Remove viewed groups from statuses
        return updatedStatuses.sort((a, b) => new Date(b.statuses[0].created_at) - new Date(a.statuses[0].created_at));
      });

      setViewedStatuses((prev) => {
        const existingGroup = prev.find((group) => group.shopId === shopId);
        const updatedStatuses = viewedStatusGroup.statuses.map((s) => ({
          ...s,
          viewed: true,
          media: validateUrl(s.media),
          thumbnail_url: validateUrl(s.thumbnail_url),
          shop: {
            ...s.shop,
            image: validateUrl(s.shop.image),
          },
        }));

        let newViewedStatuses;
        if (existingGroup) {
          newViewedStatuses = prev.map((group) =>
            group.shopId === shopId
              ? {
                  ...group,
                  statuses: [...group.statuses, ...updatedStatuses]
                    .filter((s, index, self) => self.findIndex((t) => t.id === s.id) === index) // Remove duplicates
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
                  viewed: true,
                }
              : group
          );
        } else {
          newViewedStatuses = [
            ...prev,
            {
              shop: viewedStatusGroup.shop,
              shopId,
              shopImage: validateUrl(viewedStatusGroup.statuses[0].shop.image) || FALLBACK_IMAGE,
              statuses: updatedStatuses,
              viewed: true,
            },
          ];
        }
        return newViewedStatuses.sort((a, b) => new Date(b.statuses[0].created_at) - new Date(a.statuses[0].created_at));
      });
    },
    []
  );

  // Handle opening StatusViewer
  const handleOpenViewer = useCallback(
    (index) => {
      const allGroups = [...statuses, ...viewedStatuses];
      if (index < 0 || index >= allGroups.length) {
        console.error("Invalid group index:", index);
        return;
      }
      const selectedGroup = allGroups[index];
      if (!selectedGroup || !selectedGroup.statuses || !selectedGroup.statuses.length) {
        console.error("No valid statuses for group:", index, selectedGroup);
        return;
      }
      const firstStatusId = selectedGroup.statuses[0].id;
      const flatIndex = flattenedStatuses.findIndex((s) => s.id === firstStatusId);
      if (flatIndex === -1) {
        console.error("Status ID not found in flattenedStatuses:", firstStatusId);
        return;
      }
      console.log(
        `Opening StatusViewer for shop ${selectedGroup.shop}, status ID ${firstStatusId}, flatIndex ${flatIndex}`
      );
      setCurrentStatusIndex(flatIndex);
    },
    [flattenedStatuses, statuses, viewedStatuses]
  );

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

  // Regenerate media URLs for statuses
  const regenerateMediaUrl = useCallback(
    async (statusId, type) => {
      console.log(`Regenerating ${type} URL for status ID ${statusId}`);
      try {
        if (type === "image") {
          const shopId =
            statuses.find((group) => group.statuses.some((s) => s.id === statusId))?.shopId ||
            viewedStatuses.find((group) => group.statuses.some((s) => s.id === statusId))?.shopId;
          if (!shopId) {
            console.error(`No shopId found for status ID ${statusId}`);
            return null;
          }
          const response = await axios.get(
            `${BACKEND_URL}/shops/regenerate-image-url/?shop_id=${shopId}`,
            {
              headers: { Authorization: `Bearer ${userId}` },
            }
          );
          const { image_url } = response.data;
          setStatuses((prev) =>
            prev.map((group) => ({
              ...group,
              shopImage: group.shopId === shopId ? image_url : group.shopImage,
              statuses: group.statuses.map((s) =>
                s.id === statusId ? { ...s, shop: { ...s.shop, image: image_url } } : s
              ),
            }))
          );
          setViewedStatuses((prev) =>
            prev.map((group) => ({
              ...group,
              shopImage: group.shopId === shopId ? image_url : group.shopImage,
              statuses: group.statuses.map((s) =>
                s.id === statusId ? { ...s, shop: { ...s.shop, image: image_url } } : s
              ),
            }))
          );
          console.log(`Regenerated shop image URL for status ID ${statusId}: ${image_url}`);
          return image_url;
        } else {
          const response = await axios.get(
            `${BACKEND_URL}/statuses/regenerate-url/?status_id=${statusId}`,
            {
              headers: { Authorization: `Bearer ${userId}` },
            }
          );
          const { media, thumbnail_url } = response.data;
          setStatuses((prev) =>
            prev.map((group) => ({
              ...group,
              statuses: group.statuses.map((s) =>
                s.id === statusId ? { ...s, media, thumbnail_url } : s
              ),
            }))
          );
          setViewedStatuses((prev) =>
            prev.map((group) => ({
              ...group,
              statuses: group.statuses.map((s) =>
                s.id === statusId ? { ...s, media, thumbnail_url } : s
              ),
            }))
          );
          console.log(`Regenerated media/thumbnail URL for status ID ${statusId}: ${media}, ${thumbnail_url}`);
          return { media, thumbnail_url };
        }
      } catch (error) {
        console.error(`Error regenerating ${type} URL for status ID ${statusId}:`, error.response?.data || error.message);
        return null;
      }
    },
    [userId, statuses, viewedStatuses]
  );

  // Regenerate post media URLs
  const regeneratePostMediaUrl = useCallback(
    async (postId, shopId, mediaIndex, type) => {
      console.log(`Regenerating ${type} URL for post ID ${postId}, media index ${mediaIndex}`);
      try {
        if (type === "shop_image") {
          if (!shopId) {
            console.error(`No shopId provided for post ID ${postId}`);
            return null;
          }
          const response = await axios.get(
            `${BACKEND_URL}/shops/regenerate-image-url/?shop_id=${shopId}`,
            {
              headers: { Authorization: `Bearer ${userId}` },
            }
          );
          const { image_url } = response.data;
          setFollowedPosts((prev) =>
            prev.map((post) =>
              post.id === postId ? { ...post, shop_image: image_url } : post
            )
          );
          setNearbyPosts((prev) =>
            prev.map((post) =>
              post.id === postId ? { ...post, shop_image: image_url } : post
            )
          );
          console.log(`Regenerated shop image URL for post ID ${postId}: ${image_url}`);
          return image_url;
        } else {
          const response = await axios.get(
            `${BACKEND_URL}/posts/regenerate-url/?post_id=${postId}&media_index=${mediaIndex}`,
            {
              headers: { Authorization: `Bearer ${userId}` },
            }
          );
          const { media_url, thumbnail_url } = response.data;
          setFollowedPosts((prev) =>
            prev.map((post) =>
              post.id === postId
                ? {
                    ...post,
                    media: post.media.map((item, idx) =>
                      idx === mediaIndex ? { ...item, url: media_url, thumbnail_url } : item
                    ),
                  }
                : post
            )
          );
          setNearbyPosts((prev) =>
            prev.map((post) =>
              post.id === postId
                ? {
                    ...post,
                    media: post.media.map((item, idx) =>
                      idx === mediaIndex ? { ...item, url: media_url, thumbnail_url } : item
                    ),
                  }
                : post
            )
          );
          console.log(`Regenerated media/thumbnail URL for post ID ${postId}: ${media_url}, ${thumbnail_url}`);
          return { media_url, thumbnail_url };
        }
      } catch (error) {
        console.error(`Error regenerating ${type} URL for post ID ${postId}:`, error.response?.data || error.message);
        return null;
      }
    },
    [userId]
  );

  // Handle post thumbnail errors
  const handlePostThumbnailError = useCallback(
    async (postId, shopId, mediaIndex) => {
      console.log(`Handling thumbnail error for post ID ${postId}, media index ${mediaIndex}`);
      const result = await regeneratePostMediaUrl(postId, shopId, mediaIndex, "media");
      if (result) {
        console.log(`Successfully regenerated thumbnail for post ID ${postId}`);
      } else {
        console.error(`Failed to regenerate thumbnail for post ID ${postId}`);
      }
    },
    [regeneratePostMediaUrl]
  );

  // Flattened statuses for StatusViewer
  const flattenedStatuses = useMemo(() => {
    return [...statuses, ...viewedStatuses]
      .map((group, groupIndex) => ({
        shopId: group.shopId,
        shop: group.shop,
        shopImage: group.shopImage,
        statuses: group.statuses,
        groupIndex,
      }))
      .flatMap((group) =>
        group.statuses.map((s) => ({
          ...s,
          groupIndex: group.groupIndex,
          shop: {
            ...s.shop,
            image: group.shopImage,
          },
        }))
      );
  }, [statuses, viewedStatuses]);

  // Render status item
  const renderStatusItem = useCallback(
    ({ item, index, isViewed }) => {
      const latestStatus = item.statuses[0];
      let thumbnailUri = FALLBACK_IMAGE;
      if (latestStatus.media_type === "image" && latestStatus.media) {
        thumbnailUri = validateUrl(latestStatus.media) || FALLBACK_IMAGE;
      } else if (latestStatus.media_type === "video") {
        thumbnailUri = validateUrl(latestStatus.thumbnail_url) || validateUrl(latestStatus.shop.image) || FALLBACK_IMAGE;
      } else if (latestStatus.media_type === "text" && latestStatus.shop?.image) {
        thumbnailUri = validateUrl(latestStatus.shop.image) || FALLBACK_IMAGE;
      }
      console.log(
        `Rendering status ID ${latestStatus.id}: type=${latestStatus.media_type}, thumbnailUri=${thumbnailUri}`
      );

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
            viewedStatuses={
              isViewed ? item.statuses.length : item.statuses.filter((s) => s.viewed).length
            }
            onError={() =>
              regenerateMediaUrl(
                latestStatus.id,
                latestStatus.media_type === "text" ? "image" : latestStatus.media_type === "video" ? "thumbnail" : "media"
              )
            }
          />
          <View style={styles.textContainer}>
            <Text style={styles.statusName}>{item.shop}</Text>
            <Text style={styles.statusTime}>{timeAgo}</Text>
          </View>
        </TouchableOpacity>
      );
    },
    [handleOpenViewer, getTimeAgo, regenerateMediaUrl]
  );

  const keyExtractor = useCallback(
    (item) => item.shopId.toString(),
    []
  );

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
      ) : errorMessage ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRefresh}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
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
                regenerateMediaUrl={regeneratePostMediaUrl}
                onThumbnailError={handlePostThumbnailError}
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
                regenerateMediaUrl={regeneratePostMediaUrl}
                onThumbnailError={handlePostThumbnailError}
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
          {console.log("Statuses passed to StatusViewer:", JSON.stringify(flattenedStatuses, null, 2))}
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
    marginRight: 15,
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: "#FF3B30",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#007bff",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default FollowedShopStatusScreen;