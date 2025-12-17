// app/shop/IDVerificationScreen.tsx
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

// Most reliable injected JS for WebView camera/biometrics
const INJECTED_JS = `
  // Force secure context (essential for getUserMedia in Android WebView)
  Object.defineProperty(window, 'location', { 
    value: { 
      protocol: 'https:', 
      href: location.href.replace(/^http:/, 'https:') 
    }, 
    writable: false 
  });
  window.isSecureContext = true;

  // Critical viewport for full-screen biometric modal
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
  } else {
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
    document.head.appendChild(meta);
  }

  // Full-screen lock – prevents blank/black areas
  document.body.style.margin = '0';
  document.body.style.padding = '0';
  document.body.style.overflow = 'hidden';
  document.body.style.height = '100vh';
  document.body.style.width = '100vw';
  document.documentElement.style.height = '100%';
  document.documentElement.style.width = '100%';
  document.documentElement.style.overflow = 'hidden';
  document.documentElement.style.margin = '0';
  document.documentElement.style.padding = '0';

  // Camera debug logging
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = function(constraints) {
      console.log('QoreID: getUserMedia requested', JSON.stringify(constraints));
      return originalGetUserMedia(constraints)
        .then(stream => {
          console.log('QoreID: Camera access GRANTED');
          return stream;
        })
        .catch(err => {
          console.error('QoreID: Camera access FAILED', err.name, err.message);
          throw err;
        });
    };
  }

  true;
`;

const IDVerificationScreen = () => {
  const router = useRouter();
  const webViewRef = useRef<WebView>(null);

  const [webViewUrl, setWebViewUrl] = useState<string>('');
  const [reference, setReference] = useState<string>('');
  const [webViewVisible, setWebViewVisible] = useState(false);
  const [webViewLoading, setWebViewLoading] = useState(true);
  const [isPending, setIsPending] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'success' | 'failure' | null>(null);

  const pulse = useSharedValue(1);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.6 + 0.4 * Math.sin(Date.now() / 500),
    transform: [{ scale: pulse.value }],
  }));

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

  // Clear stale pending flag on screen open
  useEffect(() => {
    AsyncStorage.getItem('pending_qoreid_verification').then((value) => {
      if (value === 'true') {
        AsyncStorage.removeItem('pending_qoreid_verification');
      }
    });
  }, []);

  const startVerification = async () => {
    console.log('Starting QoreID verification...');
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

      if (!res.data.success || !res.data.url || !res.data.reference) {
        Toast.show({ type: 'error', text1: 'Failed to start', text2: 'Invalid response from server' });
        return;
      }

      const secureUrl = res.data.url.replace('http://', 'https://');
      setWebViewUrl(secureUrl);
      setReference(res.data.reference);
      setWebViewVisible(true);
      setWebViewLoading(true);
      setIsPending(false);
      setVerificationStatus(null);
    } catch (err: any) {
      console.error('Failed to start verification:', err);
      Toast.show({
        type: 'error',
        text1: 'Connection Error',
        text2: 'Please check your internet and try again',
      });
    }
  };

  // Immediately set pending in AsyncStorage + local state after successful submission
  const setPendingImmediately = async () => {
    setIsPending(true);
    await AsyncStorage.setItem('pending_qoreid_verification', 'true');
    Toast.show({
      type: 'info',
      text1: 'Verification Submitted',
      text2: 'We are processing your identity with NIMC. This may take a few minutes.',
    });
    setWebViewVisible(false);
    setWebViewLoading(false);
  };

  // Notify backend of verification status change (to be implemented next)
  const notifyBackendStatus = async (status: 'pending' | 'verified' | 'failed') => {
    try {
      const token = await AsyncStorage.getItem('sessionToken');
      await api.post('/api/qoreid/update-status/', {
        verification_status: status,
      }, {
        headers: { Authorization: token },
      });
      console.log('Backend notified of status:', status);
    } catch (err) {
      console.error('Failed to notify backend of status:', err);
      // Do not block UI – backend will get final status from webhook anyway
    }
  };

  const handleWebViewMessage = async (event: any) => {
    const raw = event.nativeEvent.data;
    console.log('QoreID Raw Message:', raw);

    let data;
    try {
      data = JSON.parse(raw);
      console.log('QoreID Event:', data.event);
      console.log('QoreID Payload:', JSON.stringify(data.detail, null, 2));
    } catch (e) {
      console.log('Non-JSON message:', raw);
      return;
    }

    if (!data.event) return;

    switch (data.event) {
      case 'qoreid:verificationSubmitted':
        const payload = data.detail || {};
        const status = (payload.status || '').toLowerCase();

        // ALWAYS set pending immediately on any submission (prevents retry)
        await setPendingImmediately();

        // Notify backend of pending state
        await notifyBackendStatus('pending');

        if (['successful', 'verified', 'complete'].includes(status)) {
          Toast.show({ type: 'success', text1: 'Verified Instantly!' });
          setVerificationStatus('success');
          await AsyncStorage.removeItem('pending_qoreid_verification');
          await notifyBackendStatus('verified');
        }
        // For pending/in_progress: already handled above
        // For failure: still marked as pending (webhook will update to 'failed' later)
        break;

      case 'qoreid:verificationError':
        // Even on SDK error, mark as pending (user already submitted)
        await setPendingImmediately();
        await notifyBackendStatus('pending');

        const errMsg = data.detail?.data?.message || data.detail?.message || 'Unable to complete biometrics. Please try again later.';
        Toast.show({ type: 'error', text1: 'Biometrics Issue', text2: errMsg });
        setWebViewVisible(false);
        break;

      case 'qoreid:verificationClosed':
        // User closed manually after submission → keep pending
        if (isPending) {
          Toast.show({ type: 'info', text1: 'Verification in Progress', text2: 'We are still processing your submission' });
        } else {
          Toast.show({ type: 'info', text1: 'Verification Closed', text2: 'You can try again anytime' });
        }
        setWebViewVisible(false);
        break;

      default:
        // Any other event after submission → keep pending
        if (!isPending) {
          await setPendingImmediately();
          await notifyBackendStatus('pending');
        }
    }
  };

  const onWebViewLoadEnd = () => {
    console.log('WebView finished loading');
    setWebViewLoading(false);
  };

  const onWebViewError = (syntheticEvent: any) => {
    console.error('WebView error:', syntheticEvent.nativeEvent);
    Toast.show({ type: 'error', text1: 'Failed to Load', text2: 'Check internet and try again' });
    setWebViewVisible(false);
  };

  // === PENDING SCREEN ===
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
            <Text style={styles.subtitle}>Your identity is being verified with NIMC.</Text>
            <Text style={{ ...styles.info, marginTop: 20, lineHeight: 24 }}>
              This can take 10 minutes to a few hours.{'\n'}
              You will be notified when it's complete.{'\n'}
              Please do not retry.
            </Text>

            <TouchableOpacity onPress={() => router.replace('/home')} style={styles.actionButton}>
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

  // === SUCCESS SCREEN ===
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

            <TouchableOpacity onPress={() => router.replace('/VerificationStatus')} style={styles.actionButton}>
              <LinearGradient colors={['#16a34a', '#15803d']} style={styles.gradientButton}>
                <Text style={styles.actionButtonText}>Continue to App</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
        <Toast />
      </SafeAreaView>
    );
  }

  // === MAIN SCREEN ===
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#E3F2FD', '#BBDEFB']} style={styles.gradient}>
        {!webViewVisible && (
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <MaterialIcons name="arrow-back-ios" size={22} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Identity Verification</Text>
            <View style={styles.headerSpacer} />
          </View>
        )}

        {webViewVisible && (
          <View style={{ flex: 1 }}>
            {webViewLoading && (
              <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.advancedOverlay}>
                <View style={styles.overlayCard}>
                  <Animated.View style={[styles.pulseRing, pulseStyle]} />
                  <ActivityIndicator size="large" color="#60a5fa" />
                  <Text style={styles.overlayTitle}>Launching Secure Camera</Text>
                  <Text style={styles.overlaySubtitle}>
                    Please hold your phone in portrait mode{'\n'}
                    and allow camera access when prompted
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
              mixedContentMode="compatibility"
              onMessage={handleWebViewMessage}
              onLoadEnd={onWebViewLoadEnd}
              onError={onWebViewError}
              onHttpError={(e) => console.error('HTTP Error:', e.nativeEvent)}
              style={{ flex: 1, backgroundColor: '#fff' }}
              injectedJavaScript={INJECTED_JS}
              scalesPageToFit={false}
              scrollEnabled={false}
              androidLayerType="hardware"
            />
          </View>
        )}

        {!webViewVisible && (
          <View style={styles.card}>
            <MaterialIcons name="security" size={90} color="#3b82f6" />
            <Text style={styles.title}>Secure Identity Verification</Text>
            <Text style={styles.subtitle}>Verify your identity using QoreID</Text>

            <View style={styles.buttonWrapper}>
              <TouchableOpacity activeOpacity={0.9} onPress={startVerification} style={styles.startButton}>
                <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.gradientButton}>
                  <Text style={styles.startButtonText}>Start Verification</Text>
                  <MaterialIcons name="arrow-forward-ios" size={20} color="#fff" style={{ marginLeft: 8 }} />
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <Text style={styles.info}>
              Takes few minutes • Uses front camera • Good lighting required
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