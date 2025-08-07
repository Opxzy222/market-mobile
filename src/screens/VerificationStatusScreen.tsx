import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInDown, ZoomIn } from 'react-native-reanimated';

const VerificationStatusScreen = () => {
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [userVerified, setUserVerified] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadVerificationStatus = async () => {
      try {
        const phoneVerifiedStr = await AsyncStorage.getItem('phone_verified');
        const userVerifiedStr = await AsyncStorage.getItem('user_verified');
        setPhoneVerified(phoneVerifiedStr ? JSON.parse(phoneVerifiedStr) : false);
        setUserVerified(userVerifiedStr ? JSON.parse(userVerifiedStr) : false);
      } catch (error) {
        Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load verification status.' });
        console.error(error);
      }
    };
    loadVerificationStatus();
  }, []);

  const handlePhoneVerification = () => {
    if (phoneVerified) {
      Toast.show({
        type: 'success',
        text1: 'Already Verified',
        text2: 'Your phone number is already verified.',
      });
      return;
    }
    router.push({ pathname: '/PhoneVerification' });
  };

  const handleIDVerification = () => {
    if (userVerified) {
      Toast.show({
        type: 'success',
        text1: 'Already Verified',
        text2: 'Your ID is already verified.',
      });
      return;
    }
    if (!phoneVerified) {
      Toast.show({
        type: 'error',
        text1: 'Phone Verification Required',
        text2: 'Please verify your phone number first.',
      });
      return;
    }
    router.push({ pathname: '/IDVerification' });
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={26} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Verification Status</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Content */}
        <Animated.View style={styles.contentContainer} entering={FadeInUp.duration(500)}>
          <Animated.Text style={styles.subtitle} entering={FadeInUp.duration(500).delay(200)}>
            Complete the steps below to secure your account
          </Animated.Text>
          <Animated.View style={styles.card} entering={FadeInDown.duration(500).delay(300)}>
            {/* Phone Verification */}
            <TouchableOpacity
              style={[styles.statusItem, phoneVerified && styles.statusItemDisabled]}
              onPress={handlePhoneVerification}
              disabled={phoneVerified}
            >
              <View style={styles.statusContent}>
                <View style={styles.statusIconContainer}>
                  <Animated.View entering={ZoomIn.duration(400).delay(400)}>
                    <MaterialIcons
                      name={phoneVerified ? 'check-circle' : 'phone'}
                      size={28}
                      color={phoneVerified ? '#10B981' : '#6B7280'}
                    />
                  </Animated.View>
                </View>
                <View>
                  <Text style={styles.statusText}>Phone Verification</Text>
                  <Text style={styles.statusSubText}>
                    {phoneVerified ? 'Verified' : 'Verify your phone number'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* ID Verification */}
            <TouchableOpacity
              style={[styles.statusItem, (userVerified || !phoneVerified) && styles.statusItemDisabled]}
              onPress={handleIDVerification}
              disabled={userVerified || !phoneVerified}
            >
              <View style={styles.statusContent}>
                <View style={styles.statusIconContainer}>
                  <Animated.View entering={ZoomIn.duration(400).delay(500)}>
                    <MaterialIcons
                      name={userVerified ? 'check-circle' : 'badge'}
                      size={28}
                      color={userVerified ? '#10B981' : !phoneVerified ? '#D1D5DB' : '#6B7280'}
                    />
                  </Animated.View>
                </View>
                <View>
                  <Text style={styles.statusText}>ID Verification</Text>
                  <Text style={styles.statusSubText}>
                    {userVerified ? 'Verified' : !phoneVerified ? 'Requires phone verification' : 'Verify your identity'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Continue Button */}
            
          </Animated.View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5', // Maintained original background color
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#3A7BD5',
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  backButton: {
    padding: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 42,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 32,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    fontFamily: 'System', // Suggest 'Inter_800ExtraBold' or 'Poppins_ExtraBold'
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#6B7280',
    marginBottom: 24,
    fontFamily: 'System', // Suggest 'Inter_Regular' or 'Poppins_Regular'
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  statusItemDisabled: {
    opacity: 0.7,
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIconContainer: {
    marginRight: 16,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'System', // Suggest 'Inter_SemiBold' or 'Poppins_SemiBold'
  },
  statusSubText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6B7280',
    fontFamily: 'System', // Suggest 'Inter_Regular' or 'Poppins_Regular'
  },
  button: {
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'System', // Suggest 'Inter_SemiBold' or 'Poppins_SemiBold'
  },
});

export default VerificationStatusScreen;