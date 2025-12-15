import React, { useCallback, useEffect, memo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StatusBar,
  ActivityIndicator,
  Platform,
  Dimensions,
  Modal, Image
} from "react-native";
import { useRouter, useFocusEffect, SplashScreen } from "expo-router";  // ← Updated import
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  FadeInDown,
} from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { SafeAreaView } from "react-native-safe-area-context";
import YoutubePlayer from "react-native-youtube-iframe";

// Prevent the splash screen from auto-hiding until we hide it manually
SplashScreen.preventAutoHideAsync();

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
  statusBar: "#4B6CB7",
  headerBg: "#3A7BD5",
  fabBg: "#4A5ABA",
  youtubeRed: "#FFC107",
  buyerAccent: "#3B82F6",
  sellerAccent: "#f97316",
};

const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
const { width } = Dimensions.get("window");

// FeatureCard — UNCHANGED
const FeatureCard = memo(({ icon, title, description }) => {
  const scale = useSharedValue(1);
  const shadowOpacity = useSharedValue(0.1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: shadowOpacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95);
    shadowOpacity.value = withTiming(0.3);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
    shadowOpacity.value = withTiming(0.1);
  };

  return (
    <TouchableOpacity onPressIn={handlePressIn} onPressOut={handlePressOut} activeOpacity={0.9}>
      <Animated.View style={[styles.featureCard, animatedStyle]}>
        <LinearGradient colors={[COLORS.gradientStart, COLORS.accent]} style={styles.featureIconContainer}>
          <MaterialIcons name={icon} size={28} color={COLORS.white} />
        </LinearGradient>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
});

// NEW PREMIUM ROLE CARD — FITS PERFECTLY SIDE BY SIDE
const RoleCard = memo(({ title, subtitle, icon, accentColor, onPress }) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View entering={FadeInDown.springify().damping(18)}>
      <TouchableOpacity
        activeOpacity={0.95}
        onPressIn={() => scale.value = withSpring(0.97)}
        onPressOut={() => scale.value = withSpring(1)}
        onPress={onPress}
        style={styles.roleCardTouchable}
      >
        <Animated.View style={[styles.premiumRoleCard, animatedStyle]}>
          {/* Frosted Glass Effect */}
          <View style={styles.glassLayer} />
          <LinearGradient colors={["transparent", `${accentColor}10`]} style={StyleSheet.absoluteFill} />

          {/* Top Accent Bar */}
          <LinearGradient colors={[accentColor, `${accentColor}CC`]} style={styles.accentBar} />

          <View style={styles.cardContent}>
            {/* Icon */}
            <View style={styles.iconContainer}>
              <LinearGradient colors={[accentColor, `${accentColor}E6`]} style={styles.iconCircle}>
                <MaterialIcons name={icon} size={56} color="#fff" />
              </LinearGradient>
            </View>

            {/* Text */}
            <Text style={styles.roleTitle}>{title}</Text>
            <Text style={styles.roleSubtitle}>{subtitle}</Text>

            {/* CTA Button */}
            <View style={styles.ctaContainer}>
              <LinearGradient colors={[accentColor, `${accentColor}CC`]} style={styles.ctaButton}>
                <MaterialIcons name="play-arrow" size={22} color="#fff" />
                <Text style={styles.ctaText}>Watch Tutorials</Text>
              </LinearGradient>
            </View>
          </View>

          {/* Bottom Glow */}
          <LinearGradient colors={["transparent", `${accentColor}08`]} style={styles.bottomGlow} />
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
});

// Modal Video Item — UNCHANGED
const TutorialVideoItem = memo(({ title, videoId, onPlay }) => (
  <TouchableOpacity onPress={() => onPlay(videoId)} style={styles.tutorialItem}>
    <View style={styles.tutorialThumb}>
      <Image
  source={{ uri: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` }}
  style={styles.tutorialThumbImg}
  resizeMode="cover"
/>
      <View style={styles.tutorialPlayOverlay}>
        <MaterialIcons name="play-circle-filled" size={48} color={COLORS.youtubeRed} />
      </View>
    </View>
    <Text style={styles.tutorialItemTitle} numberOfLines={2}>{title}</Text>
  </TouchableOpacity>
));

const Homepage = () => {
  const router = useRouter();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalVideos, setModalVideos] = useState<any[]>([]);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [videoVisible, setVideoVisible] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(false);

  const heroScale = useSharedValue(1.05);
  const pulse = useSharedValue(1);

  const buyerTutorials = [
    { title: "How to find sellers", videoId: process.env.EXPO_PUBLIC_BUYER_BROWSE || "dQw4w9WgXcQ" },
    { title: "How To Engage Business Space", videoId: process.env.EXPO_PUBLIC_BUYER_CONTACT || "dQw4w9WgXcQ" },
    { title: "Place & Track Orders", videoId: process.env.EXPO_PUBLIC_HOW_TO_BUY || "dQw4w9WgXcQ" },
  ].filter(v => v.videoId);

  const sellerTutorials = [
    { title: "Set Up Your Space", videoId: process.env.EXPO_PUBLIC_SELLER_CREATE || "Bj8cHbYaASc" },
    { title: "Manage Your Space", videoId: process.env.EXPO_PUBLIC_SELLER_MANAGE || "Bj8cHbYaASc" },
    { title: "Manage Orders & Messages", videoId: process.env.EXPO_PUBLIC_HOW_TO_SELL || "Bj8cHbYaASc" },
  ].filter(v => v.videoId);

  const features = [
    { icon: "location-on", title: "Nearby Businesses", description: "Discover local shops." },
    { icon: "store", title: "Trusted Listings", description: "Verified businesses." },
    { icon: "search", title: "Easy Discovery", description: "Browse with ease." },
  ];

  useFocusEffect(useCallback(() => {
    const check = async () => {
      const token = await AsyncStorage.getItem("sessionToken");
      setSessionToken(token);
      setIsLoading(false);
    };
    check();
  }, []));

  // Hide splash only when initial loading is done
  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  // Animations
  useEffect(() => {
    heroScale.value = withTiming(1, { duration: 1200 });
    pulse.value = withRepeat(withSequence(withTiming(1.06, { duration: 1400 }), withTiming(1, { duration: 1400 })), -1, true);
  }, []);

  const openTutorials = (title: string, videos: any[]) => {
    setModalTitle(title);
    setModalVideos(videos);
    setModalVisible(true);
  };

  const handlePlayVideo = (videoId: string) => {
    setCurrentVideoId(videoId);
    setIsVideoLoading(true);
    setVideoVisible(true);
    setModalVisible(false);
  };

  const handleExplorePress = () => !sessionToken ? router.replace("/login") : router.replace("/(tabs)/shop");
  const handleGetStarted = () => !sessionToken ? router.push("/RequestToken") : router.push("/(tabs)/shop");

  const heroAnim = useAnimatedStyle(() => ({ transform: [{ scale: heroScale.value }] }));
  const pulseAnim = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  if (isLoading) {
    // Optional: show a minimal loading view while splash is still visible
    return null;
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor="#3A7BD5" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ... REST OF YOUR JSX UNCHANGED ... */}
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerBrand}>
            <Image
  source={require("../../assets/images/icon1.png")}
  style={styles.headerLogo}
  resizeMode="contain"
/>
            <Text style={styles.headerTitle}>Gogo Digital Market</Text>
          </View>
        </View>

        {/* Hero */}
        <View style={styles.heroSection}>
          <Animated.View style={[styles.heroImageContainer, heroAnim]}>
            <Image
  source={require("../../assets/images/homestart.jpg")}
  style={styles.heroImage}
  resizeMode="cover"
/>
            <LinearGradient colors={["rgba(0,0,0,0.3)", "rgba(0,0,0,0.6)"]} style={styles.heroGradientOverlay} />
          </Animated.View>
          <View style={styles.heroOverlay}>
            <View style={styles.textContainer}>
              <Text style={styles.heroTitle}>Discover Local Businesses</Text>
              <Text style={styles.heroSubtitle}>Buy or sell — connect with your community</Text>
            </View>
            <Animated.View style={[styles.heroButtonContainer, pulseAnim]}>
              <TouchableOpacity style={styles.heroButton} onPress={handleExplorePress}>
                <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientEnd]} style={styles.heroButtonGradient}>
                  <Text style={styles.heroButtonText}>Start Exploring</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>

        {/* How to Use Section */}
        <View style={styles.howToUseSection}>
          <Text style={styles.howToUseTitle}>How to Use Gogo</Text>
          <Text style={styles.howToUseSubtitle}>Get started in seconds</Text>

          <View style={styles.roleCardsRow}>
            <RoleCard
              title="I'm a Buyer"
              subtitle="Shop from local sellers"
              icon="shopping-bag"
              accentColor={COLORS.buyerAccent}
              onPress={() => openTutorials("How to Buy on Gogo", buyerTutorials)}
            />
            <RoleCard
              title="I'm a Seller"
              subtitle="Grow your business locally"
              icon="storefront"
              accentColor={COLORS.sellerAccent}
              onPress={() => openTutorials("How to Sell on Gogo", sellerTutorials)}
            />
          </View>
        </View>

        {/* Why Choose Section */}
        <View style={styles.whyChooseSection}>
          <Text style={styles.sectionTitle}>Why Choose Gogo?</Text>
          <View style={styles.carouselContainer}>
            <FlatList
              data={features}
              renderItem={({ item }) => (
                <FeatureCard icon={item.icon} title={item.title} description={item.description} />
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
            <Animated.View style={styles.swipeCue}>
              <Text style={styles.swipeCueText}>Swipe to explore</Text>
              <MaterialIcons name="arrow-forward" size={20} color={COLORS.textSecondary} />
            </Animated.View>
          )}
        </View>

        <LinearGradient colors={[COLORS.background, "#E5E7EB"]} style={styles.footerSection}>
          <Text style={styles.footerTitle}>Join the Gogo Community</Text>
          <Text style={styles.footerSubtitle}>Connect locally. Buy & sell with trust.</Text>
          <TouchableOpacity style={styles.footerButton} onPress={handleGetStarted}>
            <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientEnd]} style={styles.footerButtonGradient}>
              <Text style={styles.footerButtonText}>Get Started</Text>
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>
      </ScrollView>

      {/* Modals unchanged */}
      <Modal visible={modalVisible} transparent animationType="slide">
        {/* ... modal content ... */}
      </Modal>

      {videoVisible && currentVideoId && (
        {/* ... video player ... */}
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // ... ALL ORIGINAL STYLES UNCHANGED EXCEPT BELOW ...

  howToUseSection: {
    paddingHorizontal: SPACING.lg, // Reduced from xl
    paddingVertical: SPACING.xxl,
    backgroundColor: COLORS.cardBackground,
    marginHorizontal: SPACING.xs, // Reduced margin
    marginBottom: SPACING.lg,
    borderRadius: SPACING.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 10,
  },
  howToUseTitle: { fontSize: 28, fontWeight: "800", textAlign: "center", color: COLORS.textPrimary, marginBottom: SPACING.sm },
  howToUseSubtitle: { fontSize: 16, textAlign: "center", color: COLORS.textSecondary, marginBottom: SPACING.xl },

  // Fixed: Cards now fit perfectly side-by-side
  roleCardsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: SPACING.md, // Controlled gap
  },
  roleCardTouchable: {
    flex: 1,
    maxWidth: (width - SPACING.lg * 2 - SPACING.md) / 2, // Exact half width minus padding & gap
  },

  premiumRoleCard: {
    height: 280,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 26,
    overflow: "hidden",
    elevation: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    borderWidth: 1.2,
    borderColor: "rgba(255,255,255,0.6)",
  },
  glassLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  accentBar: { height: 8 },
  cardContent: {
    flex: 1,
    padding: SPACING.lg,
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: SPACING.md,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    elevation: 12,
  },
  roleTitle: {
    fontSize: 23,
    fontWeight: "800",
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  roleSubtitle: {
    fontSize: 14.5,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  ctaContainer: {
    marginTop: SPACING.md,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 28,
    elevation: 8,
  },
  ctaText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
    marginLeft: SPACING.xs,
  },
  bottomGlow: { height: 50 },

  // ALL OTHER STYLES BELOW ARE YOUR ORIGINAL ONES (unchanged)
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.primary },
  scrollContent: { paddingBottom: SPACING.xxl },
  header: { flexDirection: "row", alignItems: "center", paddingVertical: 16, paddingHorizontal: 16, backgroundColor: COLORS.headerBg, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4 },
  headerBrand: { flexDirection: "row", alignItems: "center" },
  headerLogo: { width: 40, height: 40, marginRight: SPACING.sm },
  headerTitle: { fontSize: 26, fontWeight: "800", color: COLORS.white, letterSpacing: 1 },
  heroSection: { height: 340, width: "100%", position: "relative", marginBottom: SPACING.lg, borderRadius: SPACING.xl, overflow: "hidden" },
  heroImageContainer: { flex: 1, borderRadius: SPACING.xl },
  heroImage: { width: "100%", height: "100%" },
  heroGradientOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 1 },
  heroOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "flex-end", alignItems: "center", paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xxl, zIndex: 2 },
  textContainer: { backgroundColor: "rgba(17, 24, 39, 0.6)", padding: SPACING.lg, borderRadius: SPACING.lg, alignItems: "center", marginBottom: SPACING.xl },
  heroTitle: { fontSize: 30, fontWeight: "700", color: COLORS.white, textAlign: "center", marginBottom: SPACING.sm },
  heroSubtitle: { fontSize: 16, color: COLORS.white, textAlign: "center", marginBottom: SPACING.xl, lineHeight: 24, opacity: 0.9, maxWidth: "80%" },
  heroButtonContainer: { width: "80%", alignItems: "center" },
  heroButton: { width: "100%", borderRadius: SPACING.xl, overflow: "hidden", elevation: 4 },
  heroButtonGradient: { paddingVertical: SPACING.lg, alignItems: "center" },
  heroButtonText: { fontSize: 16, fontWeight: "600", color: COLORS.white, letterSpacing: 1 },

  whyChooseSection: { paddingHorizontal: SPACING.xl, paddingVertical: SPACING.xxl, backgroundColor: COLORS.cardBackground, borderRadius: SPACING.xl, marginHorizontal: SPACING.sm, marginBottom: SPACING.lg, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  carouselContainer: { marginBottom: SPACING.lg },
  featureList: { paddingHorizontal: SPACING.sm },
  featureFlatList: { height: 200 },
  featureCard: { backgroundColor: COLORS.cardBackground, borderRadius: SPACING.lg, padding: SPACING.md, width: 180, alignItems: "center", marginRight: SPACING.lg, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, borderWidth: 1, borderColor: "rgba(0,0,0,0.03)" },
  featureIconContainer: { borderRadius: 50, padding: SPACING.md, marginBottom: SPACING.sm, elevation: 3 },
  featureTitle: { fontSize: 16, fontWeight: "600", color: COLORS.textPrimary, marginBottom: SPACING.xs, textAlign: "center" },
  featureDescription: { fontSize: 13, color: COLORS.textSecondary, textAlign: "center", lineHeight: 18 },
  swipeCue: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: SPACING.sm },
  swipeCueText: { fontSize: 14, color: COLORS.textSecondary, marginRight: SPACING.xs },
  sectionTitle: { fontSize: 24, fontWeight: "700", color: COLORS.textPrimary, marginBottom: SPACING.xl, textAlign: "center", letterSpacing: 1 },

  footerSection: { paddingVertical: SPACING.xxl, paddingHorizontal: SPACING.xl, alignItems: "center", borderTopLeftRadius: SPACING.xl, borderTopRightRadius: SPACING.xl },
  footerTitle: { fontSize: 22, fontWeight: "700", color: COLORS.textPrimary, marginBottom: SPACING.lg, textAlign: "center" },
  footerSubtitle: { fontSize: 15, color: COLORS.textSecondary, marginBottom: SPACING.xxl, lineHeight: 22, maxWidth: "85%", textAlign: "center" },
  footerButton: { width: "80%", borderRadius: SPACING.xl, overflow: "hidden", elevation: 4 },
  footerButtonGradient: { paddingVertical: SPACING.lg, alignItems: "center" },
  footerButtonText: { fontSize: 16, fontWeight: "600", color: COLORS.white, letterSpacing: 1 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center", padding: SPACING.lg },
  modalContent: { backgroundColor: "#fff", borderRadius: SPACING.xl, maxHeight: "88%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: SPACING.lg, backgroundColor: COLORS.primary, borderTopLeftRadius: SPACING.xl, borderTopRightRadius: SPACING.xl },
  modalHeaderTitle: { fontSize: 22, fontWeight: "700", color: "#fff" },
  tutorialGrid: { padding: SPACING.lg },
  tutorialItem: { flex: 1, margin: SPACING.sm, maxWidth: "48%" },
  tutorialThumb: { height: 130, borderRadius: SPACING.lg, overflow: "hidden" },
  tutorialThumbImg: { width: "100%", height: "100%" },
  tutorialPlayOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.45)" },
  tutorialItemTitle: { marginTop: SPACING.sm, fontSize: 15, fontWeight: "600", textAlign: "center", color: COLORS.textPrimary },

  videoModal: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.97)", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  videoCloseButton: { position: "absolute", top: Platform.OS === "ios" ? 50 : 20, right: 20, padding: 10, zIndex: 1100 },
  videoLoadingContainer: { position: "absolute", justifyContent: "center", alignItems: "center", zIndex: 1050 },
  videoLoadingText: { color: COLORS.white, fontSize: 16, marginTop: SPACING.sm },
});

export default memo(Homepage);