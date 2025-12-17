import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Animated, { FadeInUp, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

type VerificationStatusType = 'not_started' | 'pending' | 'verified' | 'failed';

interface StatusData {
  phoneVerified: boolean;
  idVerificationStatus: VerificationStatusType;
}

const VerificationStatusScreen = () => {
  const [status, setStatus] = useState<StatusData>({
    phoneVerified: false,
    idVerificationStatus: 'not_started',
  });
  const router = useRouter();

  const loadVerificationStatus = useCallback(async () => {
    try {
      const sessionToken = await AsyncStorage.getItem('sessionToken');
      if (!sessionToken) {
        Toast.show({ type: 'error', text1: 'Error', text2: 'Please log in again.' });
        router.push('/login');
        return;
      }

      // Load phone verification (old flag)
      const phoneVerifiedStr = await AsyncStorage.getItem('phone_verified');
      const isPhoneVerified = phoneVerifiedStr ? JSON.parse(phoneVerifiedStr) : false;

      // Load new ID verification status
      const idStatusStr = await AsyncStorage.getItem('verification_status');
      const idVerificationStatus: VerificationStatusType = 
        (idStatusStr as VerificationStatusType) || 'not_started';

      setStatus({
        phoneVerified: !!isPhoneVerified,
        idVerificationStatus,
      });
    } catch (error) {
      console.error('Error loading verification status:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load status. Please try again.',
      });
      setStatus({ phoneVerified: false, idVerificationStatus: 'not_started' });
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      loadVerificationStatus();
    }, [loadVerificationStatus])
  );

  const handlePhoneVerification = () => {
    if (status.phoneVerified) {
      Toast.show({
        type: 'success',
        text1: 'Already Verified',
        text2: 'Your phone number is already verified.',
      });
      return;
    }
    router.push('/PhoneVerification');
  };

  const handleIDVerification = () => {
    if (!status.phoneVerified) {
      Toast.show({
        type: 'error',
        text1: 'Phone Verification Required',
        text2: 'Please verify your phone number first.',
      });
      return;
    }

    if (status.idVerificationStatus === 'verified') {
      Toast.show({
        type: 'success',
        text1: 'Already Verified',
        text2: 'Your identity is already verified.',
      });
      return;
    }

    if (status.idVerificationStatus === 'pending') {
      Toast.show({
        type: 'info',
        text1: 'Verification in Progress',
        text2: 'Please wait. We are processing your ID with NIMC.',
      });
      return;
    }

    if (status.idVerificationStatus === 'failed') {
      Toast.show({
        type: 'error',
        text1: 'Previous Attempt Failed',
        text2: 'You can try verifying your ID again.',
      });
    }

    // Only allow navigation if not_started or failed
    router.push('/IDVerification');
  };

  // Helper to get ID verification UI state
  const getIDStatusConfig = () => {
    switch (status.idVerificationStatus) {
      case 'verified':
        return {
          icon: 'check-circle',
          color: '#10B981',
          title: 'ID Verification',
          subtitle: 'Verified',
          gradient: ['#D1FAE5', '#A7F3D0'],
        };
      case 'pending':
        return {
          icon: 'schedule',
          color: '#F59E0B',
          title: 'ID Verification in Progress',
          subtitle: 'Processing with NIMC...',
          gradient: ['#FFFBEB', '#FEF3C7'],
          showSpinner: true,
        };
      case 'failed':
        return {
          icon: 'error-outline',
          color: '#EF4444',
          title: 'ID Verification Failed',
          subtitle: 'Tap to retry',
          gradient: ['#FEE2E2', '#FECACA'],
        };
      default: // not_started
        return {
          icon: 'badge',
          color: '#6B7280',
          title: 'ID Verification',
          subtitle: 'Verify your identity with NIN or ID',
          gradient: ['#F3F4F6', '#E5E7EB'],
        };
    }
  };

  const idConfig = getIDStatusConfig();

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#3A7BD5" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={26} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Verification Status</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Content */}
        <Animated.View style={styles.contentContainer} entering={FadeInUp.duration(500)}>
          <Animated.Text style={styles.subtitle} entering={FadeInUp.duration(500).delay(200)}>
            Complete the steps below to fully secure and activate your account
          </Animated.Text>

          <Animated.View style={styles.card} entering={FadeInDown.duration(600).delay(300)}>
            {/* Phone Verification */}
            <TouchableOpacity
              style={[styles.statusItem, status.phoneVerified && styles.statusItemSuccess]}
              onPress={handlePhoneVerification}
              disabled={status.phoneVerified}
            >
              <LinearGradient
                colors={status.phoneVerified ? ['#D1FAE5', '#A7F3D0'] : ['#F3F4F6', '#E5E7EB']}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.statusContent}>
                <View style={styles.statusIconContainer}>
                  <Animated.View entering={ZoomIn.duration(400).delay(400)}>
                    <MaterialIcons
                      name={status.phoneVerified ? 'check-circle' : 'phone'}
                      size={32}
                      color={status.phoneVerified ? '#10B981' : '#6B7280'}
                    />
                  </Animated.View>
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.statusText}>Phone Verification</Text>
                  <Text style={styles.statusSubText}>
                    {status.phoneVerified ? 'Verified ✓' : 'Verify your phone number'}
                  </Text>
                </View>
                {status.phoneVerified && (
                  <MaterialIcons name="check" size={28} color="#10B981" />
                )}
              </View>
            </TouchableOpacity>

            {/* ID Verification */}
            <TouchableOpacity
              style={[
                styles.statusItem,
                (status.idVerificationStatus === 'verified' || status.idVerificationStatus === 'pending') && styles.statusItemSuccess,
                !status.phoneVerified && styles.statusItemLocked,
              ]}
              onPress={handleIDVerification}
              disabled={status.idVerificationStatus === 'verified' || status.idVerificationStatus === 'pending' || !status.phoneVerified}
            >
              <LinearGradient
                colors={idConfig.gradient}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.statusContent}>
                <View style={styles.statusIconContainer}>
                  <Animated.View entering={ZoomIn.duration(400).delay(600)}>
                    {idConfig.showSpinner ? (
                      <ActivityIndicator size={28} color="#F59E0B" />
                    ) : (
                      <MaterialIcons
                        name={idConfig.icon}
                        size={32}
                        color={idConfig.color}
                      />
                    )}
                  </Animated.View>
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.statusText}>{idConfig.title}</Text>
                  <Text style={styles.statusSubText}>{idConfig.subtitle}</Text>
                </View>
                {status.idVerificationStatus === 'verified' && (
                  <MaterialIcons name="check" size={28} color="#10B981" />
                )}
                {status.idVerificationStatus === 'pending' && (
                  <ActivityIndicator size={24} color="#F59E0B" />
                )}
              </View>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    backgroundColor: '#3A7BD5',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  backButton: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  headerTitle: {
    fontSize: 21,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
    marginRight: -40,
  },
  headerSpacer: {
    width: 50,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 32,
    flex: 1,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  statusItem: {
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  statusItemSuccess: {
    opacity: 1,
  },
  statusItemLocked: {
    opacity: 0.6,
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  statusIconContainer: {
    width: 50,
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: 16,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  statusSubText: {
    fontSize: 14.5,
    color: '#64748B',
    marginTop: 4,
  },
});

export default VerificationStatusScreen;