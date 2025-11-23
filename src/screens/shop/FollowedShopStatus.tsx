import React, {
  useCallback,
  useState,
  useEffect,
  useRef,
  useMemo,
} from "react";
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
import api from "../../api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import StatusRing from "../../components/shop/StatusRing";
import StatusViewer from "../../components/shop/StatusViewer";
import ShopPostsFeed from "../../components/shop/ShopPostsFeed";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

const BACKEND_URL = "";
const FALLBACK_IMAGE = "https://via.placeholder.com/150";

const FollowedShopStatusScreen = () => {
  const router = useRouter();

  // === SEPARATE UNVIEWED & VIEWED GROUPS (WHATSAPP STYLE) ===
  const [unviewedGroups, setUnviewedGroups] = useState([]); // shops with at least 1 unviewed
  const [viewedGroups, setViewedGroups] = useState([]);     // fully viewed shops
  const [followedPosts, setFollowedPosts] = useState([]);
  const [nearbyPosts, setNearbyPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const isMountedRef = useRef(true);

  // === INSTANT VIEWER STATE ===
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);
  const [viewerFlattenedStatuses, setViewerFlattenedStatuses] = useState([]);
  const [viewerKey, setViewerKey] = useState(0);

  // === TRACK CURRENTLY VIEWING SHOP FOR INSTANT RING UPDATE ===
  const [currentlyViewingShopId, setCurrentlyViewingShopId] = useState(null);

  // Utility to validate Backblaze B2 URLs
  const validateUrl = (url) => {
    if (!url || typeof url !== "string") return null;
    return url;
  };

  // === FETCH COMBINED FEED WITH PERFECT WHATSAPP SORTING ===
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

      const response = await api.get(
        `${BACKEND_URL}/combined-feed/?user_id=${userId}`,
        {
          headers: { Authorization: `Bearer ${userIdString}` },
          timeout: 35000,
        }
      );

      const { statuses: fetchedStatuses, followed_posts, nearby_posts } = response.data;

      // Group statuses by shop
      const grouped = {};

      fetchedStatuses
        .filter((status) => status && status.shop)
        .forEach((status) => {
          const shopId = status.shop.id;
          if (!grouped[shopId]) {
            grouped[shopId] = {
              shopId,
              shop: status.shop.name,
              shopImage: validateUrl(status.shop.image) || FALLBACK_IMAGE,
              statuses: [],
              hasUnviewed: false,
            };
          }
          grouped[shopId].statuses.push({
            ...status,
            media: validateUrl(status.media),
            thumbnail_url: validateUrl(status.thumbnail_url),
            shop: {
              ...status.shop,
              image: validateUrl(status.shop.image),
            },
          });
          if (!status.viewed) {
            grouped[shopId].hasUnviewed = true;
          }
        });

      // Sort statuses inside each shop: oldest → newest
      Object.values(grouped).forEach((group) => {
        group.statuses.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      });

      const groups = Object.values(grouped);

      // UNVIEWED: Sort by LATEST unviewed status (WhatsApp behavior)
      const unviewed = groups
        .filter((g) => g.hasUnviewed)
        .sort((a, b) => {
          const latestUnviewedA = [...a.statuses].reverse().find((s) => !s.viewed)?.created_at || 0;
          const latestUnviewedB = [...b.statuses].reverse().find((s) => !s.viewed)?.created_at || 0;
          return new Date(latestUnviewedB) - new Date(latestUnviewedA); // newest unviewed first
        });

      // VIEWED: Sort by latest status overall
      const viewed = groups
        .filter((g) => !g.hasUnviewed)
        .sort((a, b) => {
          const latestA = a.statuses[a.statuses.length - 1]?.created_at || 0;
          const latestB = b.statuses[b.statuses.length - 1]?.created_at || 0;
          return new Date(latestB) - new Date(latestA);
        });

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
        setUnviewedGroups(unviewed);
        setViewedGroups(viewed);
        setFollowedPosts(transformPosts(followed_posts));
        setNearbyPosts(transformPosts(nearby_posts));
        setCurrentlyViewingShopId(null);
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
    const interval = setInterval(fetchData, 15 * 60 * 1000);
    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchData]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
      return () => {};
    }, [fetchData])
  );

  const handleRefresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // === PARTIAL VIEW UPDATE (INSTANT RING PROGRESS) ===
  const handleSingleStatusViewed = useCallback((statusId, shopId) => {
    setUnviewedGroups(prev => prev.map(group => 
      group.shopId === shopId 
        ? {
            ...group,
            statuses: group.statuses.map(s => 
              s.id === statusId ? { ...s, viewed: true } : s
            ),
            hasUnviewed: group.statuses.some(s => s.id !== statusId && !s.viewed)
          }
        : group
    ));

    setViewedGroups(prev => prev.map(group => 
      group.shopId === shopId 
        ? {
            ...group,
            statuses: group.statuses.map(s => 
              s.id === statusId ? { ...s, viewed: true } : s
            )
          }
        : group
    ));
  }, []);

  // === HANDLE WHEN A SHOP IS FULLY VIEWED (MOVE TO END) ===
  const handleStatusViewed = useCallback(
    (viewedStatusGroup) => {
      const shopId = viewedStatusGroup.statuses[0].shop.id;

      setCurrentlyViewingShopId(null);

      // Remove from unviewed
      setUnviewedGroups((prev) => prev.filter((g) => g.shopId !== shopId));

      // Add/move to viewed groups
      setViewedGroups((prev) => {
        const exists = prev.find((g) => g.shopId === shopId);
        const newStatuses = viewedStatusGroup.statuses.map((s) => ({ ...s, viewed: true }));

        let updated;
        if (exists) {
          updated = prev.map((g) =>
            g.shopId === shopId
              ? {
                  ...g,
                  hasUnviewed: false,
                  statuses: [...g.statuses, ...newStatuses]
                    .filter((s, i, self) => self.findIndex((t) => t.id === s.id) === i)
                    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
                }
              : g
          );
        } else {
          updated = [
            ...prev,
            {
              shop: viewedStatusGroup.shop,
              shopId,
              shopImage: viewedStatusGroup.statuses[0].shop.image || FALLBACK_IMAGE,
              statuses: newStatuses,
              hasUnviewed: false,
            },
          ];
        }

        // Re-sort viewed groups by latest status
        return updated.sort((a, b) => {
          const latestA = a.statuses[a.statuses.length - 1]?.created_at || 0;
          const latestB = b.statuses[b.statuses.length - 1]?.created_at || 0;
          return new Date(latestB) - new Date(latestA);
        });
      });
    },
    []
  );

  const handleCloseViewer = useCallback(() => {
    setViewerOpen(false);
    setViewerInitialIndex(0);
    setViewerFlattenedStatuses([]);
    setCurrentlyViewingShopId(null);
    setViewerKey((k) => k + 1);
  }, []);

  const getTimeAgo = useCallback((createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now - created;

    if (isNaN(diffMs) || diffMs < 0) return "Just now";

    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMins / 60);

    if (diffSeconds < 60) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
    return `${Math.floor(diffHours / 24)} day${Math.floor(diffHours / 24) === 1 ? "" : "s"} ago`;
  }, []);

  // === REGENERATE MEDIA URLS (KEPT 100% ORIGINAL) ===
  const regenerateMediaUrl = useCallback(
    async (statusId, type) => {
      console.log(`Regenerating ${type} URL for status ID ${statusId}`);
      try {
        if (type === "image") {
          const shopId =
            unviewedGroups.find((group) => group.statuses.some((s) => s.id === statusId))?.shopId ||
            viewedGroups.find((group) => group.statuses.some((s) => s.id === statusId))?.shopId;
          if (!shopId) return null;
          const response = await api.get(
            `${BACKEND_URL}/shops/regenerate-image-url/?shop_id=${shopId}`,
            { headers: { Authorization: `Bearer ${userId}` } }
          );
          const { image_url } = response.data;
          setUnviewedGroups((prev) =>
            prev.map((group) => ({
              ...group,
              shopImage: group.shopId === shopId ? image_url : group.shopImage,
              statuses: group.statuses.map((s) =>
                s.id === statusId ? { ...s, shop: { ...s.shop, image: image_url } } : s
              ),
            }))
          );
          setViewedGroups((prev) =>
            prev.map((group) => ({
              ...group,
              shopImage: group.shopId === shopId ? image_url : group.shopImage,
              statuses: group.statuses.map((s) =>
                s.id === statusId ? { ...s, shop: { ...s.shop, image: image_url } } : s
              ),
            }))
          );
          return image_url;
        } else {
          const response = await api.get(
            `${BACKEND_URL}/statuses/regenerate-url/?status_id=${statusId}`,
            { headers: { Authorization: `Bearer ${userId}` } }
          );
          const { media, thumbnail_url } = response.data;
          setUnviewedGroups((prev) =>
            prev.map((group) => ({
              ...group,
              statuses: group.statuses.map((s) =>
                s.id === statusId ? { ...s, media, thumbnail_url } : s
              ),
            }))
          );
          setViewedGroups((prev) =>
            prev.map((group) => ({
              ...group,
              statuses: group.statuses.map((s) =>
                s.id === statusId ? { ...s, media, thumbnail_url } : s
              ),
            }))
          );
          return { media, thumbnail_url };
        }
      } catch (error) {
        console.error(`Error regenerating ${type} URL:`, error);
        return null;
      }
    },
    [userId, unviewedGroups, viewedGroups]
  );

  const regeneratePostMediaUrl = useCallback(
    async (postId, shopId, mediaIndex, type) => {
      // unchanged — your original implementation goes here
      // (you had "// unchanged" — left as placeholder)
    },
    [userId]
  );

  const handlePostThumbnailError = useCallback(
    async (postId, shopId, mediaIndex) => {
      await regeneratePostMediaUrl(postId, shopId, mediaIndex, "media");
    },
    [regeneratePostMediaUrl]
  );

  // === FLATTENED STATUSES FOR VIEWER (unviewed first → viewed) ===
  const flattenedStatuses = useMemo(() => {
    return [...unviewedGroups, ...viewedGroups].flatMap((group) =>
      group.statuses.map((s) => ({
        ...s,
        shop: {
          ...s.shop,
          image: group.shopImage,
        },
      }))
    );
  }, [unviewedGroups, viewedGroups]);

  // === OPEN VIEWER — START AT FIRST UNVIEWED (WHATSAPP LOGIC) ===
  const handleOpenViewer = useCallback(
    (groupIndex) => {
      const allGroups = [...unviewedGroups, ...viewedGroups];
      if (groupIndex < 0 || groupIndex >= allGroups.length) return;

      const selectedGroup = allGroups[groupIndex];
      if (!selectedGroup?.statuses?.length) return;

      const firstUnviewed = selectedGroup.statuses.find((s) => !s.viewed);
      const startStatus = firstUnviewed || selectedGroup.statuses[0];

      const correctInitialIndex = flattenedStatuses.findIndex(
        (s) => s.id === startStatus.id && s.shop?.id === selectedGroup.shopId
      );

      if (correctInitialIndex === -1) {
        console.warn("Start status not found in flattened list");
        return;
      }

      console.log(
        `Opening viewer: Shop "${selectedGroup.shop}" → Start ID ${startStatus.id} at global index ${correctInitialIndex}`
      );

      setCurrentlyViewingShopId(selectedGroup.shopId);
      setViewerFlattenedStatuses(flattenedStatuses);
      setViewerInitialIndex(correctInitialIndex);
      setViewerOpen(true);
      setViewerKey((k) => k + 1);
    },
    [flattenedStatuses, unviewedGroups, viewedGroups]
  );

  // === RENDER STATUS ITEM WITH INSTANT UPDATES ===
  const renderStatusItem = useCallback(
    ({ item }) => {
      const allGroups = [...unviewedGroups, ...viewedGroups];
      const actualIndex = allGroups.findIndex((g) => g.shopId === item.shopId);
      const latestStatus = item.statuses[0];
      let thumbnailUri = FALLBACK_IMAGE;
      if (latestStatus.media_type === "image" && latestStatus.media) {
        thumbnailUri = validateUrl(latestStatus.media) || FALLBACK_IMAGE;
      } else if (latestStatus.media_type === "video") {
        thumbnailUri = validateUrl(latestStatus.thumbnail_url) || validateUrl(latestStatus.shop.image) || FALLBACK_IMAGE;
      } else if (latestStatus.media_type === "text" && latestStatus.shop?.image) {
        thumbnailUri = validateUrl(latestStatus.shop.image) || FALLBACK_IMAGE;
      }

      const timeAgo = latestStatus.created_at ? getTimeAgo(latestStatus.created_at) : "N/A";

      const isCurrentlyViewing = currentlyViewingShopId === item.shopId;
      const hasUnviewed = item.hasUnviewed && !isCurrentlyViewing;
      const viewedCount = isCurrentlyViewing
        ? item.statuses.filter(s => s.viewed).length
        : item.statuses.filter(s => s.viewed).length;

      return (
        <TouchableOpacity
          onPress={() => handleOpenViewer(actualIndex)}
          style={styles.statusItem}
          activeOpacity={0.9}
        >
          <StatusRing
            imageUri={thumbnailUri}
            totalStatuses={item.statuses.length}
            viewedStatuses={hasUnviewed ? viewedCount : item.statuses.length}
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
    [handleOpenViewer, getTimeAgo, regenerateMediaUrl, unviewedGroups, viewedGroups, currentlyViewingShopId]
  );

  const keyExtractor = useCallback((item) => item.shopId.toString(), []);

  const allShops = [...unviewedGroups, ...viewedGroups];

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
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          {allShops.length > 0 && (
            <Animated.View entering={FadeInDown.duration(400).springify()}>
              <Text style={styles.subHeader}>Stories</Text>
              <View style={styles.statusWrapper}>
                <FlatList
                  horizontal
                  data={allShops}
                  renderItem={renderStatusItem}
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
                    router.push({
                      pathname: "/shop/ShopPostsScreen",
                      params: { posts: JSON.stringify(followedPosts), type: "followed" },
                    });
                  }}
                >
                  <LinearGradient
                    colors={["#007bff", "#25D366"]}
                    style={styles.seeMoreGradient}
                  >
                    <Text style={styles.seeMoreText}>See More</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
              <ShopPostsFeed
                posts={followedPosts.slice(0, 6)}
                showDistance={false}
                onSeeMore={() => {
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
                    router.push({
                      pathname: "/shop/ShopPostsScreen",
                      params: { posts: JSON.stringify(nearbyPosts), type: "nearby" },
                    });
                  }}
                >
                  <LinearGradient
                    colors={["#007bff", "#25D366"]}
                    style={styles.seeMoreGradient}
                  >
                    <Text style={styles.seeMoreText}>See More</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
              <ShopPostsFeed
                posts={nearbyPosts.slice(0, 6)}
                showDistance
                onSeeMore={() => {
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

          {allShops.length === 0 &&
            followedPosts.length === 0 &&
            nearbyPosts.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No stories or posts available</Text>
              </View>
            )}
        </ScrollView>
      )}

      {/* STATUS VIEWER */}
      {viewerOpen && viewerFlattenedStatuses.length > 0 && (
        <StatusViewer
          key={viewerKey}
          visible={viewerOpen}
          statuses={viewerFlattenedStatuses}
          initialIndex={viewerInitialIndex}
          onClose={handleCloseViewer}
          onStatusViewed={handleStatusViewed}
          onSingleStatusViewed={handleSingleStatusViewed}  // ← INSTANT PROGRESS
          userId={userId}
          authToken={userId?.toString()}
        />
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