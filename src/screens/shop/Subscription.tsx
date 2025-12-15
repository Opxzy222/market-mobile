import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import api from '../../api';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

// Helper functions to safely read env variables
const getNumber = (key, fallback) => {
  const val = process.env[key];
  const num = parseInt(val, 10);
  return isNaN(num) ? fallback : num;
};

const getBool = (key, fallback = true) => {
  const val = process.env[key];
  return val === 'false' ? false : fallback;
};

// Dynamic pricing from .env.production — change anytime!
const regularPrice = getNumber('EXPO_PUBLIC_PLAN_REGULAR_PRICE', 2500);
const regularOriginal = getNumber('EXPO_PUBLIC_PLAN_REGULAR_ORIGINAL', 5000);
const regularDiscount = getNumber('EXPO_PUBLIC_PLAN_REGULAR_DISCOUNT', 50);
const regularEnabled = getBool('EXPO_PUBLIC_PLAN_REGULAR_ENABLED', true);

const standardPrice = getNumber('EXPO_PUBLIC_PLAN_STANDARD_PRICE', 5000);
const standardOriginal = getNumber('EXPO_PUBLIC_PLAN_STANDARD_ORIGINAL', 10000);
const standardDiscount = getNumber('EXPO_PUBLIC_PLAN_STANDARD_DISCOUNT', 50);
const standardEnabled = getBool('EXPO_PUBLIC_PLAN_STANDARD_ENABLED', true);

// Format helpers
const formatPrice = (amount) => `₦${amount.toLocaleString()}/month`;
const formatDiscount = (percent) => (percent > 0 ? `${percent}% Off` : null);

// Final dynamic plans
const PLAN_DETAILS = {
  regular: {
    name: 'Regular Plan',
    price: formatPrice(regularPrice),
    originalPrice: formatPrice(regularOriginal),
    discount: formatDiscount(regularDiscount),
    enabled: regularEnabled,
    features: [
      'Ad-Free Experience',
      'Advanced Search Filters',
      'Send Media in Chat & Order',
      'Interactive Map Access',
      'Unlimited Order Request',
    ],
  },
  standard: {
    name: 'Standard Plan',
    price: formatPrice(standardPrice),
    originalPrice: formatPrice(standardOriginal),
    discount: formatDiscount(standardDiscount),
    enabled: standardEnabled,
    features: [
      'All Regular Plan Features',
      'Enhanced Search Visibility',
      'Receipt Generation',
      'Post Media Content',
      'Update Media Stories',
      'Attach Image to Listing',
    ],
  },
};

// Only show enabled plans in UI
const DISPLAY_PLANS = Object.entries(PLAN_DETAILS)
  .filter(([_, plan]) => plan.enabled)
  .map(([key, plan]) => ({ key, ...plan }));

const PLAN_OPTIONS = DISPLAY_PLANS.map(plan => ({
  label: `${plan.name} - ${plan.price}`,
  value: plan.key,
}));

const Subscription = () => {
  const [selectedPlan, setSelectedPlan] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const { currentPlan, endDate } = useLocalSearchParams();
  const router = useRouter();
  const scrollViewRef = useRef(null);
  const dropdownOpacity = useSharedValue(0);
  const dropdownTranslateY = useSharedValue(20);

  const API_BASE_URL = '';

  // Swipe animation
  const translateX = useSharedValue(0);
  React.useEffect(() => {
    translateX.value = withRepeat(withTiming(10, { duration: 500 }), -1, true);
  }, []);

  const animatedArrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const animatedDropdownStyle = useAnimatedStyle(() => ({
    opacity: dropdownOpacity.value,
    transform: [{ translateY: dropdownTranslateY.value }],
  }));

  const toggleDropdown = () => {
    setDropdownVisible(!dropdownVisible);
    dropdownOpacity.value = withTiming(dropdownVisible ? 0 : 1, { duration: 300 });
    dropdownTranslateY.value = withTiming(dropdownVisible ? 20 : 0, { duration: 300 });
  };

  const selectPlan = (value) => {
    setSelectedPlan(value);
    setDropdownVisible(false);
    dropdownOpacity.value = withTiming(0);
    dropdownTranslateY.value = withTiming(20);
  };

  const purchasePlan = async () => {
    if (!selectedPlan) {
      Alert.alert('Error', 'Please select a subscription plan.');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('sessionToken');
      const response = await api.post(
        `${API_BASE_URL}/payments/purchase/`,
        { plan: selectedPlan },
        {
          headers: {
            Authorization: token,
            'Content-Type': 'application/json',
          },
        }
      );

      const { message } = response.data;

      const today = new Date().toISOString().split('T')[0];
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);
      const endDateStr = endDate.toISOString().split('T')[0];

      const subscriptionData = {
        plan: selectedPlan,
        is_active: true,
        start_date: today,
        end_date: endDateStr,
      };

      await AsyncStorage.setItem('subscription_cache', JSON.stringify(subscriptionData));

      setModalMessage(message || 'Subscription successful!');
      setModalVisible(true);

      // Refresh balance
      try {
        const balRes = await api.get(`${API_BASE_URL}/payments/balance/`, {
          headers: { Authorization: token },
        });
        const { balance, virtual_account } = balRes.data;
        await AsyncStorage.setItem('balance', balance.toString());
        if (virtual_account) {
          await AsyncStorage.setItem('dva_account_number', virtual_account.account_number);
          await AsyncStorage.setItem('dva_bank_name', virtual_account.bank_name);
          await AsyncStorage.setItem('dva_account_name', virtual_account.account_name);
        }
      } catch (e) {
        console.warn('Balance refresh failed');
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Purchase failed.';
      if (msg.toLowerCase().includes('insufficient')) {
        Alert.alert('Insufficient Balance', 'Please fund your wallet.', [
          { text: 'OK', onPress: () => router.push('/(tabs)/account') },
        ]);
      } else {
        setModalMessage(msg);
        setModalVisible(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = (event) => {
    const x = event.nativeEvent.contentOffset.x;
    const index = Math.round(x / 260);
    setCurrentCardIndex(index);
  };

  const renderDropdownItem = ({ item }) => (
    <TouchableOpacity style={styles.dropdownItem} onPress={() => selectPlan(item.value)}>
      <Text style={styles.dropdownItemText}>{item.label}</Text>
      {selectedPlan === item.value && <MaterialIcons name="check-circle" size={20} color="#3B82F6" />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#3A7BD5" />
      <LinearGradient colors={['#E0F2FE', '#BFDBFE']} style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.navigate("(tabs)/account")} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Subscription Plans</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Current Plan */}
          <Animated.View entering={FadeInDown.duration(400)} style={styles.planCard}>
            <Text style={styles.cardTitle}>Your Current Subscription</Text>
            <View style={styles.planInfo}>
              <MaterialIcons name="card-membership" size={24} color="#1E40AF" />
              <View style={styles.planInfoText}>
                <Text style={styles.planLabel}>Plan</Text>
                <Text style={styles.planValue}>
                  {currentPlan && currentPlan !== 'none'
                    ? currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)
                    : 'None'}
                </Text>
                <Text style={styles.planLabel}>Expiration Date</Text>
                <Text style={styles.planValue}>{endDate !== 'N/A' ? endDate : 'N/A'}</Text>
              </View>
            </View>
          </Animated.View>

          <Animated.Text entering={FadeInDown.duration(400).delay(100)} style={styles.sectionTitle}>
            Select a Subscription Plan
          </Animated.Text>
          <Animated.Text entering={FadeInDown.duration(400).delay(200)} style={styles.planInstruction}>
            Swipe to explore our plans and unlock premium features
          </Animated.Text>
          <Animated.View entering={FadeInDown.duration(400).delay(300)} style={styles.swipeIndicator}>
            <Animated.View style={animatedArrowStyle}>
              <MaterialIcons name="swipe" size={24} color="#1E40AF" />
            </Animated.View>
            <Text style={styles.swipeText}>Swipe to View Plans</Text>
          </Animated.View>

          <View style={styles.planContainer}>
            <ScrollView
              ref={scrollViewRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              snapToInterval={260}
              decelerationRate="fast"
            >
              {DISPLAY_PLANS.map((plan, index) => (
                <Animated.View
                  key={plan.key}
                  entering={FadeInDown.duration(400).delay(400 + index * 100)}
                  style={[styles.planCardOption, selectedPlan === plan.key && styles.selectedPlanCard]}
                >
                  <TouchableOpacity onPress={() => setSelectedPlan(plan.key)}>
                    <LinearGradient
                      colors={plan.key === 'standard' ? ['#FFFFFF', '#BFDBFE'] : ['#FFFFFF', '#F3F4F6']}
                      style={styles.planCardGradient}
                    >
                      <View style={styles.planHeader}>
                        <Text style={styles.planCardTitle}>{plan.name}</Text>
                        {plan.key === 'standard' && (
                          <View style={styles.premiumBadge}>
                            <Text style={styles.premiumBadgeText}>Business</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.planCardPrice}>{plan.price}</Text>
                      <Text style={styles.planCardOriginalPrice}>{plan.originalPrice}</Text>
                      {plan.discount && <Text style={styles.planCardDiscount}>{plan.discount}</Text>}
                      <View style={styles.featuresList}>
                        {plan.features.map((f, i) => (
                          <View key={i} style={styles.featureItem}>
                            <MaterialIcons name="check-circle" size={20} color="#22C55E" />
                            <Text style={styles.featureText}>{f}</Text>
                          </View>
                        ))}
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </ScrollView>

            <View style={styles.carouselDots}>
              {DISPLAY_PLANS.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, currentCardIndex === i ? styles.activeDot : styles.inactiveDot]}
                />
              ))}
            </View>

            {/* Dropdown */}
            <Animated.View entering={FadeInDown.duration(400).delay(600)} style={styles.dropdownTriggerContainer}>
              <TouchableOpacity style={styles.dropdownTrigger} onPress={toggleDropdown}>
                <Text style={styles.dropdownTriggerText}>
                  {selectedPlan
                    ? PLAN_OPTIONS.find(o => o.value === selectedPlan)?.label
                    : 'Select a Plan'}
                </Text>
                <MaterialIcons
                  name={dropdownVisible ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                  size={24}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </Animated.View>

            <Modal transparent visible={dropdownVisible} animationType="none">
              <TouchableOpacity style={styles.dropdownOverlay} activeOpacity={1} onPress={() => setDropdownVisible(false)}>
                <Animated.View style={[styles.dropdownContainer, animatedDropdownStyle]}>
                  <FlatList
                    data={PLAN_OPTIONS}
                    renderItem={renderDropdownItem}
                    keyExtractor={item => item.value}
                  />
                </Animated.View>
              </TouchableOpacity>
            </Modal>

            {/* Subscribe Button */}
            <Animated.View entering={FadeInDown.duration(400).delay(700)}>
              <TouchableOpacity
                style={[styles.purchaseButton, !selectedPlan && styles.disabledButton]}
                onPress={purchasePlan}
                disabled={loading || !selectedPlan}
              >
                <LinearGradient colors={['#1E40AF', '#3B82F6']} style={styles.buttonGradient}>
                  {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Subscribe Now</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Success Modal */}
          <Modal transparent visible={modalVisible} animationType="fade">
            <View style={styles.modalOverlay}>
              <Animated.View entering={FadeInDown.duration(400)} style={styles.modalContent}>
                <Text style={styles.modalTitle}>Subscription Status</Text>
                <Text style={styles.modalText}>{modalMessage}</Text>
                <Pressable style={styles.modalButton} onPress={() => setModalVisible(false)}>
                  <LinearGradient colors={['#1E40AF', '#3B82F6']} style={styles.modalButtonGradient}>
                    <Text style={styles.modalButtonText}>OK</Text>
                  </LinearGradient>
                </Pressable>
              </Animated.View>
            </View>
          </Modal>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  backButton: { padding: 5, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF', flex: 1, textAlign: 'center' },
  headerSpacer: { width: 42 },
  scrollContent: { paddingHorizontal: 16, paddingVertical: 24, paddingBottom: 64 },
  planCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 24, elevation: 6 },
  cardTitle: { fontSize: 22, fontWeight: '700', color: '#1F2A44', textAlign: 'center', marginBottom: 16 },
  planInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  planInfoText: { flex: 1 },
  planLabel: { fontSize: 14, color: '#6B7280', fontWeight: '500', marginTop: 8 },
  planValue: { fontSize: 16, fontWeight: '600', color: '#1F2A44', marginTop: 4 },
  sectionTitle: { fontSize: 24, fontWeight: '700', color: '#1F2A44', textAlign: 'center', marginVertical: 16 },
  planInstruction: { fontSize: 16, color: '#4B5563', textAlign: 'center', marginBottom: 16 },
  swipeIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  swipeText: { fontSize: 14, fontWeight: '600', color: '#1E40AF', marginLeft: 8 },
  planContainer: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, elevation: 6 },
  planCardOption: { width: 260, marginRight: 12, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  selectedPlanCard: { borderColor: '#1E40AF', transform: [{ scale: 1.02 }] },
  planCardGradient: { padding: 20 },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  planCardTitle: { fontSize: 20, fontWeight: '700', color: '#1F2A44' },
  premiumBadge: { backgroundColor: '#FBBF24', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  premiumBadgeText: { fontSize: 12, fontWeight: '600', color: '#1F2A44' },
  planCardPrice: { fontSize: 20, fontWeight: '700', color: '#1F2A44', textAlign: 'center' },
  planCardOriginalPrice: { fontSize: 14, color: '#6B7280', textDecorationLine: 'line-through', textAlign: 'center' },
  planCardDiscount: { fontSize: 14, fontWeight: '600', color: '#22C55E', textAlign: 'center', marginBottom: 12 },
  featuresList: { gap: 12 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontSize: 14, color: '#1F2A44', flex: 1 },
  carouselDots: { flexDirection: 'row', justifyContent: 'center', marginVertical: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, marginHorizontal: 4 },
  activeDot: { backgroundColor: '#1E40AF' },
  inactiveDot: { backgroundColor: '#D1D5DB' },
  dropdownTriggerContainer: { marginBottom: 16 },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 3,
  },
  dropdownTriggerText: { fontSize: 16, fontWeight: '500', color: '#1F2A44' },
  dropdownOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  dropdownContainer: { backgroundColor: '#FFF', borderRadius: 12, width: '90%', maxHeight: 200, elevation: 5 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  dropdownItemText: { fontSize: 16, fontWeight: '500', color: '#1F2A44' },
  purchaseButton: { borderRadius: 12, overflow: 'hidden' },
  disabledButton: { opacity: 0.5 },
  buttonGradient: { paddingVertical: 16, alignItems: 'center' },
  buttonText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFF', borderRadius: 16, padding: 24, width: '90%', alignItems: 'center', elevation: 8 },
  modalTitle: { fontSize: 22, fontWeight: '700', color: '#1F2A44', marginBottom: 16 },
  modalText: { fontSize: 16, color: '#4B5563', textAlign: 'center', marginBottom: 24 },
  modalButton: { borderRadius: 12, overflow: 'hidden', width: '100%' },
  modalButtonGradient: { paddingVertical: 14, alignItems: 'center' },
  modalButtonText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
});

export default Subscription;