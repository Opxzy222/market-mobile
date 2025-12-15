// app/shop/IDVerificationScreen.tsx — QoreID Native SDK (Static API - Production Safe)
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  ActivityIndicator,
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
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { QoreIdSdk } from '@qore-id/react-native-qoreid-sdk'; // Static API
import api from '../api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface QoreIDConfigResponse {
  clientId: string;
  flowId?: string;
  productCode?: string;
  customerReference: string;
  userData?: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
}

const IDVerificationScreen = () => {
  const router = useRouter();

  const [isPending, setIsPending] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);

  const pulse = useSharedValue(1);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.6 + 0.4 * Math.sin(Date.now() / 500),
    transform: [{ scale: pulse.value }],
  }));

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

  // Check if verification is already pending on load
  useEffect(() => {
    AsyncStorage.getItem('pending_qoreid_verification').then((value) => {
      if (value === 'true') {
        setIsPending(true);
      }
    });
  }, []);

  // Listen to QoreID events using static method (production-safe)
  useEffect(() => {
    const callback = (result: any) => {
      console.log('QoreID SDK Result:', result);

      if (result?.status === 'success' || result?.event === 'verification_completed') {
        AsyncStorage.removeItem('pending_qoreid_verification');
        Toast.show({
          type: 'success',
          text1: 'Verification Successful!',
          text2: 'Your identity has been verified.',
        });
      } else if (result?.event === 'verification_failed' || result?.status === 'failed') {
        Toast.show({
          type: 'error',
          text1: 'Verification Failed',
          text2: 'Please try again later',
        });
        setIsLaunching(false);
        AsyncStorage.removeItem('pending_qoreid_verification');
      } else {
        // Any other event (started, submitted, closed, transient error) → pending
        goToPendingState();
      }
    };

    const unsubscribe = QoreIdSdk.events(callback);

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
    if (isPending) {
      Toast.show({
        type: 'info',
        text1: 'Already in Progress',
        text2: 'Your verification is being processed',
      });
      return;
    }

    setIsLaunching(true);

    try {
      const token = await AsyncStorage.getItem('sessionToken');
      if (!token) {
        Toast.show({ type: 'error', text1: 'Session Expired', text2: 'Please login again' });
        router.replace('/login');
        setIsLaunching(false);
        return;
      }

      const res = await api.post<QoreIDConfigResponse>('/api/qoreid/start-native/', {}, {
        headers: { Authorization: token },
      });

      const {
        clientId,
        flowId,
        productCode,
        customerReference,
        userData,
      } = res.data;

      if (!clientId) {
        throw new Error('Missing clientId from server');
      }

      // Pre-fill from backend userData if provided
      const applicantData = userData
        ? {
            firstName: userData.first_name || '',
            middleName: '',
            lastName: userData.last_name || '',
            phoneNumber: userData.phone || '',
            email: userData.email || '',
          }
        : {
            firstName: '',
            middleName: '',
            lastName: '',
            phoneNumber: '',
            email: '',
          };

      // Launch using static method — guaranteed to work in production
      QoreIdSdk.launch({
        clientId,
        flowId,
        productCode,
        customerReference,
        applicantData,

        // OCR enabled — allows document scanning fallback
        ocrAcceptedDocuments: [
          'NIN_SLIP_NGA',
          'DRIVERS_LICENSE_NGA',
          'VOTERS_CARD_NGA',
          'PASSPORT_NGA',
        ],
      });

      goToPendingState();
    } catch (error: any) {
      console.error('Failed to launch QoreID:', error);
      setIsLaunching(false);

      // Known transient error — treat as in progress
      if (error?.message?.includes('invalid verification ID')) {
        goToPendingState();
      } else {
        Toast.show({
          type: 'error',
          text1: 'Launch Failed',
          text2: error.message || 'Please try again later',
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
            <Text style={styles.subtitle}>Your identity is being verified with NIMC</Text>
            <Text style={{ ...styles.info, marginTop: 20, lineHeight: 24 }}>
              This can take 10 minutes to a few hours.{'\n'}
              We'll notify you when complete.{'\n'}
              Please do not retry.
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

  // === MAIN START SCREEN ===
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
            <Animated.View style={styles.advancedOverlay}>
              <View style={styles.overlayCard}>
                <Animated.View style={[styles.pulseRing, pulseStyle]} />
                <ActivityIndicator size="large" color="#60a5fa" />
                <Text style={styles.overlayTitle}>Launching Secure Verification</Text>
                <Text style={styles.overlaySubtitle}>
                  Please wait while we open the verification screen
                </Text>
              </View>
            </Animated.View>
          )}

          <MaterialIcons name="security" size={90} color="#3b82f6" />
          <Text style={styles.title}>Secure Identity Verification</Text>
          <Text style={styles.subtitle}>
            Verify using selfie + NIN or scan your ID document
          </Text>

          <View style={styles.buttonWrapper}>
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
          </View>

          <Text style={styles.info}>
            Selfie + NIN or scan ID • Good lighting required
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  backBtn: { padding: 6, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.25)' },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 16,
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
});

export default IDVerificationScreen;