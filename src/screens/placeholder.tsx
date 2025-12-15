// app/shop/IDVerificationScreen.tsx — Native QoreID SDK Integration
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
  Alert,
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
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { launchQoreID } from '@qore-id/react-native-qoreid-sdk';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const IDVerificationScreen = () => {
  const router = useRouter();

  const [isPending, setIsPending] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'success' | null>(null);

  const pulse = useSharedValue(1);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.6 + 0.4 * Math.sin(Date.now() / 500),
    transform: [{ scale: pulse.value }],
  }));

  // Pulse animation when loading or pending
  useEffect(() => {
    if (isLaunching || isPending) {
      pulse.value = withRepeat(
        withTiming(1.15, { duration: 1200, easing: Easing.out(Easing.quad) }),
        -1,
        true
      );
    } else {
      pulse.value = 1;
    }
  }, [isLaunching, isPending]);

  // Check if already pending on screen load
  useEffect(() => {
    AsyncStorage.getItem('pending_qoreid_verification').then((value) => {
      if (value === 'true') {
        setIsPending(true);
      }
    });
  }, []);

  // Listen to QoreID SDK events
  useEffect(() => {
    const unsubscribe = launchQoreID.events((result: any) => {
      console.log('QoreID SDK Event:', result);

      // Any event from SDK means user has started or completed the flow
      if (result?.status === 'success' || result?.event === 'verification_completed') {
        // Optional: immediate success (rare for NIN — usually via webhook)
        setVerificationStatus('success');
        AsyncStorage.removeItem('pending_qoreid_verification');
      } else if (result?.event === 'verification_failed' || result?.status === 'failed') {
        // Handle real failure (not transient)
        Toast.show({
          type: 'error',
          text1: 'Verification Failed',
          text2: 'Please try again later',
        });
        setIsLaunching(false);
      } else {
        // Any other event (started, submitted, closed, transient error) → go to pending
        goToPendingState();
      }
    });

    return () => unsubscribe();
  }, []);

  const goToPendingState = async () => {
    setIsLaunching(false);
    setIsPending(true);
    await AsyncStorage.setItem('pending_qoreid_verification', 'true');

    Toast.show({
      type: 'info',
      text1: 'Verification in Progress',
      text2: 'We are processing your identity with NIMC',
    });
  };

  const startVerification = async () => {
    setIsLaunching(true);

    try {
      const userString = await AsyncStorage.getItem('user'); // Adjust if you store user differently
      const user = userString ? JSON.parse(userString) : null;

      if (!user) {
        Toast.show({ type: 'error', text1: 'Error', text2: 'User data not found' });
        setIsLaunching(false);
        return;
      }

      const uniqueRef = `ref_${user.id}_${Date.now()}`;

      await launchQoreID({
        clientId: 'YOUR_CLIENT_ID_HERE', // Replace with your actual QoreID client ID
        customerReference: uniqueRef,

        // Use ONE of these based on your QoreID setup
        // productCode: 12345, // If using workflow mode
        flowId: '', // Recommended for direct NIN + face

        applicantData: {
          firstname: user.firstname || '',
          lastname: user.lastname || '',
          phone: user.phone || '',
          email: user.email || '',
        },

        // Optional: restrict OCR document types
        ocrAcceptedDocuments: [
          'DRIVERS_LICENSE_NGA',
          'VOTERS_CARD_NGA',
          'NIN_SLIP_NGA',
          'PASSPORT_NGA',
        ],
      });

      // If launch succeeds without error, go to pending
      goToPendingState();
    } catch (error: any) {
      console.error('QoreID Launch Error:', error);
      setIsLaunching(false);

      // Handle known transient error gracefully
      if (error?.message?.includes('invalid verification ID 0')) {
        goToPendingState(); // It's actually progressing!
      } else {
        Toast.show({
          type: 'error',
          text1: 'Unable to Start Verification',
          text2: 'Please check your connection and try again',
        });
      }
    }
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
            <Text style={styles.subtitle}>
              Your identity is being verified with NIMC.
            </Text>
            <Text style={{ ...styles.info, marginTop: 20, lineHeight: 24 }}>
              This can take 10 minutes to a few hours.{'\n'}
              We'll send you a push notification when it's complete.{'\n'}
              Please do not retry — it's already processing.
            </Text>

            <TouchableOpacity
              onPress={() => router.replace('/home')}
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

  // === SUCCESS SCREEN (Triggered by webhook + push notification elsewhere) ===
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

            <TouchableOpacity
              onPress={() => router.replace('/home')}
              style={styles.actionButton}
            >
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

  // === MAIN SCREEN (Start Verification) ===
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#E3F2FD', '#BBDEFB']} style={styles.gradient}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back-ios" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Identity Verification</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.card}>
          {isLaunching && (
            <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.advancedOverlay}>
              <View style={styles.overlayCard}>
                <Animated.View style={[styles.pulseRing, pulseStyle]} />
                <ActivityIndicator size="large" color="#60a5fa" />
                <Text style={styles.overlayTitle}>Launching Secure Verification</Text>
                <Text style={styles.overlaySubtitle}>
                  Please keep the app open{'\n'}
                  and allow camera access when prompted
                </Text>
              </View>
            </Animated.View>
          )}

          <MaterialIcons name="security" size={90} color="#3b82f6" />
          <Text style={styles.title}>Secure Identity Verification</Text>
          <Text style={styles.subtitle}>Verify your identity using QoreID & NIMC</Text>

          <Animated.View style={styles.buttonWrapper}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={startVerification}
              disabled={isLaunching}
              style={styles.startButton}
            >
              <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.gradientButton}>
                <Text style={styles.startButtonText}>
                  {isLaunching ? 'Launching...' : 'Start Verification'}
                </Text>
                {!isLaunching && (
                  <MaterialIcons name="arrow-forward-ios" size={20} color="#fff" style={{ marginLeft: 8 }} />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <Text style={styles.info}>
            Takes 30–90 seconds • Uses front camera • Good lighting required
          </Text>
        </View>
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