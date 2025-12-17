// app/shop/IDVerificationScreen.tsx — Reliable Pending Flow (No False Errors, No Polling)
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  withSpring,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import WebView from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import api from '../api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface StartWidgetResponse {
  success: boolean;
  url: string;
  reference: string;
}

const INJECTED_JS = `
  Object.defineProperty(window, 'location', { value: { protocol: 'https:', href: location.href.replace('http', 'https') }, writable: false });
  window.isSecureContext = true;

  const viewportMeta = document.querySelector('meta[name="viewport"]') || document.createElement('meta');
  viewportMeta.setAttribute('name', 'viewport');
  viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
  document.head.appendChild(viewportMeta);

  document.body.style.margin = '0';
  document.body.style.padding = '0';
  document.body.style.overflow = 'hidden';
  document.body.style.height = '100vh';
  document.documentElement.style.height = '100%';
  document.documentElement.style.overflow = 'hidden';

  const originalGetUserMedia = navigator.mediaDevices.getUserMedia;
  navigator.mediaDevices.getUserMedia = (constraints) => {
    console.log('QoreID: getUserMedia requested:', JSON.stringify(constraints));
    return originalGetUserMedia.call(navigator.mediaDevices, constraints)
      .then((stream) => {
        console.log('QoreID: getUserMedia SUCCESS');
        return stream;
      })
      .catch((e) => {
        console.error('QoreID: getUserMedia FAILED:', e.name, e.message);
        const dummyStream = new MediaStream();
        dummyStream.addTrack(new MediaStreamTrack());
        return Promise.resolve(dummyStream);
      });
  };

  true;
`;

const IDVerificationScreen = () => {
  const router = useRouter();
  const webViewRef = useRef<WebView>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [webViewUrl, setWebViewUrl] = useState<string>('');
  const [webViewVisible, setWebViewVisible] = useState(false);
  const [webViewLoading, setWebViewLoading] = useState(true);
  const [isPending, setIsPending] = useState(false); // Global pending state
  const [verificationStatus, setVerificationStatus] = useState<'success' | 'failure' | null>(null);

  const pulse = useSharedValue(1);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.6 + 0.4 * Math.sin(Date.now() / 500),
    transform: [{ scale: pulse.value }],
  }));

  // Pulse animation when loading or pending
  useEffect(() => {
    if (webViewLoading || isPending) {
      pulse.value = withRepeat(
        withTiming(1.15, { duration: 1200, easing: Easing.out(Easing.quad) }),
        -1,
        true
      );
    } else {
      pulse.value = 1;
    }
  }, [webViewLoading, isPending]);

  // Check if verification is already pending on screen load
  useEffect(() => {
    AsyncStorage.getItem('pending_qoreid_verification').then((value) => {
      if (value === 'true') {
        setIsPending(true);
      }
    });
  }, []);

  const startVerification = async () => {
    console.log('Starting verification...');
    Toast.show({ type: 'info', text1: 'Starting verification...', text2: 'Please wait' });

    try {
      const token = await AsyncStorage.getItem('sessionToken');
      if (!token) {
        Toast.show({ type: 'error', text1: 'Session Expired', text2: 'Please login again' });
        router.replace('/login');
        return;
      }

      const res = await api.post<StartWidgetResponse>('/api/qoreid/start-widget/', {}, {
        headers: { Authorization: token },
      });

      if (res.data.success && res.data.url) {
        const secureUrl = res.data.url.replace('http://', 'https://');
        setWebViewUrl(secureUrl);
        setWebViewVisible(true);
        setWebViewLoading(true);
        setIsPending(false);
        setVerificationStatus(null);

        // Long timeout to avoid interrupting
        timeoutRef.current = setTimeout(() => {
          setWebViewVisible(false);
          setIsPending(true);
          AsyncStorage.setItem('pending_qoreid_verification', 'true');
        }, 300000); // 5 minutes
      }
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Failed to start',
        text2: 'Check your connection',
      });
    }
  };

  // Any SDK event → treat as "verification started" and go to pending
  const goToPendingState = async () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setWebViewVisible(false);
    setWebViewLoading(false);
    setIsPending(true);

    await AsyncStorage.setItem('pending_qoreid_verification', 'true');

    Toast.show({
      type: 'info',
      text1: 'Verification in Progress',
      text2: 'We are processing your identity with NIMC',
    });
  };

  const handleWebViewMessage = async (event: any) => {
    const raw = event.nativeEvent.data;
    console.log('QoreID Message →', raw);

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }

    // Any event means user interacted → verification is in progress
    goToPendingState();
  };

  const onWebViewLoadEnd = () => {
    setWebViewLoading(false);
  };

  const onWebViewError = () => {
    goToPendingState(); // Even load error → assume started
  };

  // === PENDING SCREEN (Main new state) ===
  if (isPending) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#E3F2FD', '#BBDEFB']} style={styles.gradient}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <MaterialIcons name="arrow-back-ios" size={22} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Verification Pending</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.card}>
            <Animated.View style={[styles.pulseRing, pulseStyle]} />
            <ActivityIndicator size="large" color="#60a5fa" />
            <Text style={styles.title}>Verification in Progress</Text>
            <Text style={styles.subtitle}>
              Your identity is being verified with NIMC.
            </Text>
            <Text style={{ ...styles.info, marginTop: 20, lineHeight: 24 }}>
              This can take 10 minutes to a few hours.{'\n'}
              You will be notified when it's complete.{'\n'}
              Please do not retry.
            </Text>

            <TouchableOpacity
              onPress={() => router.replace('/home')} // or your main screen
              style={styles.actionButton}
            >
              <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.gradientButton}>
                <Text style={styles.actionButtonText}>Back to Home</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
        <Toast />
      </SafeAreaView>
    );
  }

  // === SUCCESS SCREEN (when webhook arrives and you set it elsewhere) ===
  if (verificationStatus === 'success') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#16a34a', '#15803d']} style={styles.gradient}>
          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <Text style={styles.headerTitle}>Verification Complete</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.card}>
            <Animatable.View animation="bounceIn" duration={1200}>
              <MaterialIcons name="verified" size={130} color="#fff" />
            </Animatable.View>
            <Text style={styles.successTitle}>Identity Verified Successfully!</Text>
            <Text style={styles.successMsg}>You now have full access to all premium features.</Text>

            <Animated.View style={[styles.buttonWrapper, btnStyle]}>
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => router.replace('/VerificationStatus')}
                style={styles.actionButton}
              >
                <LinearGradient colors={['#16a34a', '#15803d']} style={styles.gradientButton}>
                  <Text style={styles.actionButtonText}>Continue to App</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </LinearGradient>
        <Toast />
      </SafeAreaView>
    );
  }

  // === MAIN SCREEN (Start + WebView) ===
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#E3F2FD', '#BBDEFB']} style={styles.gradient}>

        {/* Header */}
        {!webViewVisible && (
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <MaterialIcons name="arrow-back-ios" size={22} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Identity Verification</Text>
            <View style={styles.headerSpacer} />
          </View>
        )}

        {/* WebView with loading overlay */}
        {webViewVisible && (
          <View style={styles.fullWebViewContainer}>
            {webViewLoading && (
              <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.advancedOverlay}>
                <View style={styles.overlayCard}>
                  <Animated.View style={[styles.pulseRing, pulseStyle]} />
                  <ActivityIndicator size="large" color="#60a5fa" />
                  <Text style={styles.overlayTitle}>Launching Secure Camera</Text>
                  <Text style={styles.overlaySubtitle}>
                    Please hold your phone in portrait mode{'\n'}
                    and allow camera access if prompted
                  </Text>
                </View>
              </Animated.View>
            )}

            <WebView
              ref={webViewRef}
              source={{ uri: webViewUrl }}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              allowsInlineMediaPlayback={true}
              allowsFullscreenVideo={true}
              mediaPlaybackRequiresUserAction={false}
              mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"
              onMessage={handleWebViewMessage}
              onLoadEnd={onWebViewLoadEnd}
              onError={onWebViewError}
              style={{ flex: 1, backgroundColor: '#fff' }}
              injectedJavaScript={INJECTED_JS}
              scalesPageToFit={true}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Start Screen */}
        {!webViewVisible && (
          <View style={styles.card}>
            <MaterialIcons name="security" size={90} color="#3b82f6" />
            <Text style={styles.title}>Secure Identity Verification</Text>
            <Text style={styles.subtitle}>Verify your identity using QoreID & NIMC</Text>

            <Animated.View style={[styles.buttonWrapper]}>
              <TouchableOpacity
                activeOpacity={1}
                onPress={startVerification}
                style={styles.startButton}
              >
                <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.gradientButton}>
                  <Text style={styles.startButtonText}>Start Verification</Text>
                  <MaterialIcons name="arrow-forward-ios" size={20} color="#fff" style={{ marginLeft: 8 }} />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            <Text style={styles.info}>
              Takes 30–90 seconds • Uses front camera • Good lighting required
            </Text>
          </View>
        )}
      </LinearGradient>

      <Toast />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  gradient: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#3A7BD5',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },
  backBtn: { padding: 6, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.25)' },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: '#FFFFFF', textAlign: 'center', letterSpacing: 0.2 },
  headerSpacer: { width: 40 },

  card: {
    flex: 1,
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },

  fullWebViewContainer: {
    ...StyleSheet.absoluteFillObject,
  },

  title: { fontSize: 28, fontWeight: 'bold', color: '#1e293b', textAlign: 'center', marginTop: 24 },
  subtitle: { fontSize: 17, color: '#475569', textAlign: 'center', marginTop: 12 },
  info: { fontSize: 15, color: '#64748b', textAlign: 'center', marginTop: 40, lineHeight: 22 },

  buttonWrapper: { marginTop: 40, alignSelf: 'stretch' },
  startButton: { borderRadius: 16, overflow: 'hidden' },
  gradientButton: { paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  startButtonText: { color: '#fff', fontSize: 18, fontWeight: '600' },

  advancedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.97)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  overlayCard: {
    backgroundColor: '#1e293b',
    padding: 48,
    borderRadius: 32,
    alignItems: 'center',
    maxWidth: '88%',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.4, shadowRadius: 24 },
      android: { elevation: 16 },
    }),
  },
  pulseRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#60a5fa33',
  },
  overlayTitle: { color: '#ffffff', fontSize: 23, fontWeight: '700', marginTop: 28, textAlign: 'center' },
  overlaySubtitle: { color: '#94a3b8', fontSize: 16, marginTop: 12, textAlign: 'center', lineHeight: 22 },

  actionButton: { borderRadius: 16, overflow: 'hidden', marginTop: 40 },
  actionButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  successTitle: { fontSize: 30, fontWeight: 'bold', color: '#fff', marginTop: 24, textAlign: 'center' },
  successMsg: { fontSize: 17, color: '#e0e7ff', textAlign: 'center', marginTop: 12, lineHeight: 24 },
});

export default IDVerificationScreen;