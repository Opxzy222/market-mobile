import React, { useCallback, useEffect, memo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StatusBar,
  Alert,
  ActivityIndicator,
  useColorScheme,
  Platform,
  Dimensions,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  FadeInUp,
} from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { Image } from "expo-image";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import YoutubePlayer from "react-native-youtube-iframe";

// Constants
const COLORS = {
  primary: "#1E3A8A",
  accent: "#FCD34D",
  background: "#F9FAFB",
  cardBackground: "#FFFFFF",
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  white: "#FFFFFF",
  gradientStart: "#4B6CB7",
  gradientEnd: "#8B5CF6",
  goldAccent: "#D4A017",
  statusBar: "#4B6CB7",
  headerBg: "#3A7BD5",
  fabBg: "#4A5ABA",
  darkBackground: "#1F2937",
  darkCardBackground: "#374151",
  darkTextPrimary: "#F9FAFB",
  darkTextSecondary: "#D1D5DB",
  youtubeRed: "#FF0000",
};

const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

const { width } = Dimensions.get("window");

// FeatureCard component (unchanged)
const FeatureCard = memo(({ icon, title, description }) => {
  const scale = useSharedValue(1);
  const shadowOpacity = useSharedValue(0.1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: shadowOpacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { stiffness: 400, damping: 20 });
    shadowOpacity.value = withTiming(0.3, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { stiffness: 400, damping: 20 });
    shadowOpacity.value = withTiming(0.1, { duration: 100 });
  };

  return (
    <TouchableOpacity
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.9}
      accessibilityLabel={`${title} card`}
    >
      <Animated.View style={[styles.featureCard, animatedStyle]}>
        <LinearGradient
          colors={[COLORS.gradientStart, COLORS.accent]}
          style={styles.featureIconContainer}
        >
          <MaterialIcons name={icon} size={28} color={COLORS.white} />
        </LinearGradient>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
});

// Updated VideoCard component for advanced look
const VideoCard = memo(({ title, videoId, index, onPlay }) => {
  const scale = useSharedValue(1);
  const shadowOpacity = useSharedValue(0.1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: shadowOpacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { stiffness: 400, damping: 20 });
    shadowOpacity.value = withTiming(0.3, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { stiffness: 400, damping: 20 });
    shadowOpacity.value = withTiming(0.1, { duration: 100 });
  };

  if (!videoId || typeof videoId !== "string") {
    console.warn(`Invalid videoId for ${title}:`, videoId);
    return null;
  }

  return (
    <Animated.View
      entering={FadeInUp.duration(500).delay(index * 100)}
      style={[styles.videoCard, animatedStyle]}
    >
      <TouchableOpacity
        onPress={() => onPlay(videoId)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        accessibilityLabel={`Play ${title} video`}
      >
        <LinearGradient
          colors={["rgba(255,255,255,0.8)", "rgba(245,245,245,0.9)"]}
          style={styles.videoCardGradient}
        >
          <View style={styles.thumbnailContainer}>
            <Image
              source={{ uri: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` }}
              style={styles.thumbnail}
              contentFit="cover"
              cachePolicy="memory-disk"
              accessibilityLabel={`${title} thumbnail`}
            />
            <View style={styles.playButtonOverlay}>
              <MaterialIcons name="play-circle-filled" size={40} color={COLORS.youtubeRed} />
            </View>
          </View>
          <View style={styles.videoCardContent}>
            <Text style={styles.videoTitle}>{title}</Text>
            <Text style={styles.videoDescription}>Tap to watch tutorial</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
});

const Homepage = () => {
  const router = useRouter();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [videoVisible, setVideoVisible] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const buttonScale = useSharedValue(1);
  const fabScale = useSharedValue(1);
  const heroImageScale = useSharedValue(1.05);
  const pulseScale = useSharedValue(1);
  const arrowPulse = useSharedValue(1); // For sliding cue animation

  // Check session when the screen is focused
  useFocusEffect(
    useCallback(() => {
      const checkSession = async () => {
        try {
          const token = await AsyncStorage.getItem("sessionToken");
          console.log("Session token checked:", token);
          setSessionToken(token);
        } catch (error) {
          console.error("Session check error:", error);
          Alert.alert("Error", "Unable to verify session. Please try again.");
        } finally {
          setIsLoading(false);
        }
      };

      checkSession();

      return () => {
        // Optional cleanup if needed
      };
    }, [])
  );

  useEffect(() => {
    const initialize = async () => {
      await SplashScreen.preventAutoHideAsync();
      console.log("EXPO_PUBLIC_HOW_TO_SELL:", process.env.EXPO_PUBLIC_HOW_TO_SELL);
      console.log("EXPO_PUBLIC_HOW_TO_BUY:", process.env.EXPO_PUBLIC_HOW_TO_BUY);
      await SplashScreen.hideAsync();
    };

    initialize();

    heroImageScale.value = withTiming(1, {
      duration: 1000,
      easing: Easing.out(Easing.exp),
    });

    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Animation for sliding cue arrow
    arrowPulse.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const handlePlayVideo = useCallback(async (videoId: string) => {
    if (!videoId || typeof videoId !== "string") {
      Alert.alert("Error", "No valid video ID provided.");
      return;
    }

    try {
      setCurrentVideoId(videoId);
      setIsVideoLoading(true);
      setVideoVisible(true);
    } catch (error) {
      console.error("Video load error:", error);
      Alert.alert("Error", "Failed to load video.");
      setVideoVisible(false);
      setIsVideoLoading(false);
    }
  }, []);

  const handleCloseVideo = () => {
    setVideoVisible(false);
    setCurrentVideoId(null);
    setIsVideoLoading(false);
  };

  const handleExplorePress = useCallback(() => {
    if (!sessionToken) {
      console.log("No session token, redirecting to login");
      router.replace("/login");
      return;
    }
    console.log("Session token found, navigating to shop");
    router.replace("/(tabs)/shop");
  }, [sessionToken, router]);

  const handleGetStarted = useCallback(() => {
    if (!sessionToken) {
      console.log("No session token, redirecting to RequestToken");
      router.push("/RequestToken");
      return;
    }
    console.log("Session token found, navigating to shop");
    router.push("/(tabs)/shop");
  }, [sessionToken, router]);

  const handleButtonPressIn = () => {
    buttonScale.value = withSpring(0.93, { stiffness: 400, damping: 20 });
  };

  const handleButtonPressOut = () => {
    buttonScale.value = withSpring(1, { stiffness: 400, damping: 20 });
  };

  const handleFabPressIn = () => {
    fabScale.value = withSpring(0.93, { stiffness: 400, damping: 20 });
  };

  const handleFabPressOut = () => {
    fabScale.value = withSpring(1, { stiffness: 400, damping: 20 });
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const fabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  const heroImageAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heroImageScale.value }],
  }));

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const arrowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: arrowPulse.value }],
  }));

  const features = [
    { icon: "location-on", title: "Nearby Businesses", description: "Discover local shops." },
    { icon: "store", title: "Trusted Listings", description: "Verified businesses." },
    { icon: "search", title: "Easy Discovery", description: "Browse with ease." },
  ];

  const videoTutorials = [
    {
      title: "How to Set up Business Space",
      videoId: process.env.EXPO_PUBLIC_HOW_TO_BUY || "Bj8cHbYaASc",
    },
    {
      title: "How to Find Seller on Gogo",
      videoId: process.env.EXPO_PUBLIC_HOW_TO_SELL || "Bj8cHbYaASc",
    },
  ].filter(item => item.videoId && typeof item.videoId === "string");

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.statusBar} />
        <ActivityIndicator size="large" color={COLORS.white} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.headerBrand}>
            <Image
              source={require("../../assets/images/icon1.png")}
              style={styles.headerLogo}
              contentFit="contain"
              accessibilityLabel="Gogo Marketplace Logo"
            />
            <Text style={styles.headerTitle}>Gogo Digital Market</Text>
          </View>
        </View>

        <View style={styles.heroSection}>
          <Animated.View style={[styles.heroImageContainer, heroImageAnimatedStyle]}>
            <Image
              source={require("../../assets/images/homestart.jpg")}
              style={styles.heroImage}
              contentFit="cover"
              cachePolicy="memory-disk"
              accessibilityLabel="Marketplace hero image"
            />
            <LinearGradient
              colors={["rgba(0,0,0,0.3)", "rgba(0,0,0,0.6)"]}
              style={styles.heroGradientOverlay}
            />
          </Animated.View>
          <View style={styles.heroOverlay}>
            <View style={styles.textContainer}>
              <Text style={styles.heroTitle}>Discover Local Businesses</Text>
              <Text style={styles.heroSubtitle}>
                Explore a curated selection of products and services from trusted sellers.
              </Text>
            </View>
            <Animated.View
              style={[styles.heroButtonContainer, buttonAnimatedStyle, pulseAnimatedStyle]}
            >
              <TouchableOpacity
                style={styles.heroButton}
                onPress={handleExplorePress}
                onPressIn={handleButtonPressIn}
                onPressOut={handleButtonPressOut}
                accessibilityLabel="Start exploring button"
              >
                <LinearGradient
                  colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                  style={styles.heroButtonGradient}
                >
                  <Text style={styles.heroButtonText}>Start Exploring</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>

        {/* Separate "How to Use Gogo" Section */}
        <View style={styles.howToSection}>
          <Text style={styles.sectionTitle}>How to Use Gogo</Text>
          <View style={styles.carouselContainer}>
            <FlatList
              data={videoTutorials}
              renderItem={({ item, index }) => (
                <VideoCard
                  title={item.title}
                  videoId={item.videoId}
                  index={index}
                  onPlay={handlePlayVideo}
                />
              )}
              keyExtractor={(item) => item.title}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.videoList}
              snapToAlignment="center"
              snapToInterval={200 + SPACING.md}
              decelerationRate="fast"
              initialNumToRender={2}
              style={styles.videoFlatList}
            />
          </View>
          {videoTutorials.length > 1 && (
            <Animated.View style={[styles.swipeCue, arrowAnimatedStyle]}>
              <Text style={styles.swipeCueText}>Swipe to explore</Text>
              <MaterialIcons name="arrow-forward" size={20} color={COLORS.textSecondary} />
            </Animated.View>
          )}
        </View>

        {/* Separate "Why Choose Gogo?" Section */}
        <View style={styles.whyChooseSection}>
          <Text style={styles.sectionTitle}>Why Choose Gogo?</Text>
          <View style={styles.carouselContainer}>
            <FlatList
              data={features}
              renderItem={({ item }) => (
                <FeatureCard
                  icon={item.icon}
                  title={item.title}
                  description={item.description}
                />
              )}
              keyExtractor={(item) => item.title}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featureList}
              snapToAlignment="center"
              snapToInterval={200 + SPACING.md}
              decelerationRate="fast"
              initialNumToRender={3}
              style={styles.featureFlatList}
            />
          </View>
          {features.length > 1 && (
            <Animated.View style={[styles.swipeCue, arrowAnimatedStyle]}>
              <Text style={styles.swipeCueText}>Swipe to explore</Text>
              <MaterialIcons name="arrow-forward" size={20} color={COLORS.textSecondary} />
            </Animated.View>
          )}
        </View>

        <LinearGradient
          colors={[COLORS.background, "#E5E7EB"]}
          style={styles.footerSection}
        >
          <Text style={styles.footerTitle}>Join the Gogo Community</Text>
          <Text style={styles.footerSubtitle}>
            Connect with local businesses for exclusive offers and insights.
          </Text>
          <Animated.View style={[styles.footerButtonContainer, buttonAnimatedStyle]}>
            <TouchableOpacity
              style={styles.footerButton}
              onPress={handleGetStarted}
              onPressIn={handleButtonPressIn}
              onPressOut={handleButtonPressOut}
              accessibilityLabel="Get started button"
            >
              <LinearGradient
                colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                style={styles.footerButtonGradient}
              >
                <Text style={styles.footerButtonText}>Get Started</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </LinearGradient>
      </ScrollView>

      {videoVisible && currentVideoId && (
        <View style={styles.videoModal}>
          {isVideoLoading && (
            <View style={styles.videoLoadingContainer}>
              <ActivityIndicator size="large" color={COLORS.youtubeRed} />
              <Text style={styles.videoLoadingText}>Loading video...</Text>
            </View>
          )}
          <YoutubePlayer
            height={300}
            width={width * 0.9}
            play={videoVisible}
            videoId={currentVideoId}
            onReady={() => setIsVideoLoading(false)}
            onChangeState={(event) => {
              if (event === "ended" || event === "paused") {
                setVideoVisible(false);
                setCurrentVideoId(null);
                setIsVideoLoading(false);
              }
            }}
            onError={(error) => {
              console.error("YouTube playback error:", error);
              Alert.alert("Error", "Failed to play video.");
              setVideoVisible(false);
              setIsVideoLoading(false);
            }}
          />
          <TouchableOpacity
            onPress={handleCloseVideo}
            style={styles.videoCloseButton}
            accessibilityLabel="Close video"
          >
            <MaterialIcons name="close" size={28} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      )}

      <Animated.View style={[styles.fab, fabAnimatedStyle]}>
        <TouchableOpacity
          style={styles.fabButton}
          onPress={handleExplorePress}
          onPressIn={handleFabPressIn}
          onPressOut={handleFabPressOut}
          accessibilityLabel="Quick search button"
        >
          <MaterialIcons name="search" size={28} color={COLORS.white} />
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  darkContainer: {
    backgroundColor: COLORS.darkBackground,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.primary,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: COLORS.headerBg,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  headerBrand: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerLogo: {
    width: 40,
    height: 40,
    marginRight: SPACING.sm,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.white,
    letterSpacing: 1,
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  heroSection: {
    height: 340,
    width: "100%",
    position: "relative",
    marginBottom: SPACING.lg,
    borderRadius: SPACING.xl,
    overflow: "hidden",
  },
  heroImageContainer: {
    flex: 1,
    borderRadius: SPACING.xl,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  heroOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl,
    zIndex: 2,
  },
  textContainer: {
    backgroundColor: "rgba(17, 24, 39, 0.6)",
    padding: SPACING.lg,
    borderRadius: SPACING.lg,
    alignItems: "center",
    marginBottom: SPACING.xl,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: "700",
    color: COLORS.white,
    textAlign: "center",
    marginBottom: SPACING.sm,
    letterSpacing: -0.5,
    lineHeight: 36,
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  heroSubtitle: {
    fontSize: 16,
    color: COLORS.white,
    textAlign: "center",
    marginBottom: SPACING.xl,
    lineHeight: 24,
    opacity: 0.9,
    maxWidth: "80%",
  },
  heroButtonContainer: {
    width: "80%",
    alignItems: "center",
  },
  heroButton: {
    width: "100%",
    borderRadius: SPACING.xl,
    overflow: "hidden",
    elevation: 4,
  },
  heroButtonGradient: {
    paddingVertical: SPACING.lg,
    alignItems: "center",
  },
  heroButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.white,
    letterSpacing: 1,
  },
  howToSection: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xxl,
    backgroundColor: COLORS.cardBackground,
    borderRadius: SPACING.xl,
    marginHorizontal: SPACING.sm,
    marginBottom: SPACING.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  whyChooseSection: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xxl,
    backgroundColor: COLORS.cardBackground,
    borderRadius: SPACING.xl,
    marginHorizontal: SPACING.sm,
    marginBottom: SPACING.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  carouselContainer: {
    marginBottom: SPACING.lg,
  },
  videoList: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  videoFlatList: {
    height: 220,
  },
  videoCard: {
    width: 180,
    marginRight: SPACING.lg,
    borderRadius: SPACING.lg,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  videoCardGradient: {
    padding: SPACING.md,
  },
  thumbnailContainer: {
    position: "relative",
    width: "100%",
    height: 100,
    borderRadius: SPACING.md,
    overflow: "hidden",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  playButtonOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  videoCardContent: {
    padding: SPACING.sm,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  videoDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  swipeCue: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: SPACING.sm,
  },
  swipeCueText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginRight: SPACING.xs,
  },
  featuresSection: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.xl,
    textAlign: "center",
    letterSpacing: 1,
  },
  featureList: {
    paddingHorizontal: SPACING.sm,
  },
  featureFlatList: {
    height: 200,
  },
  featureCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: SPACING.lg,
    padding: SPACING.md,
    width: 180,
    alignItems: "center",
    marginRight: SPACING.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  featureIconContainer: {
    borderRadius: 50,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    elevation: 3,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
    textAlign: "center",
  },
  featureDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
  footerSection: {
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
    alignItems: "center",
    borderTopLeftRadius: SPACING.xl,
    borderTopRightRadius: SPACING.xl,
    backgroundColor: COLORS.cardBackground,
  },
  footerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
    textAlign: "center",
  },
  footerSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: SPACING.xxl,
    lineHeight: 22,
    maxWidth: "85%",
  },
  footerButtonContainer: {
    width: "80%",
  },
  footerButton: {
    width: "100%",
    borderRadius: SPACING.xl,
    overflow: "hidden",
    elevation: 4,
  },
  footerButtonGradient: {
    paddingVertical: SPACING.lg,
    alignItems: "center",
  },
  footerButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.white,
    letterSpacing: 1,
  },
  fab: {
    position: "absolute",
    right: SPACING.lg,
    bottom: SPACING.lg + 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabButton: {
    backgroundColor: COLORS.fabBg,
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
  },
  videoModal: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  videoCloseButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 20,
    right: 20,
    padding: 10,
    zIndex: 1100,
  },
  videoLoadingContainer: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1050,
  },
  videoLoadingText: {
    color: COLORS.white,
    fontSize: 16,
    marginTop: SPACING.sm,
  },
});

export default memo(Homepage);