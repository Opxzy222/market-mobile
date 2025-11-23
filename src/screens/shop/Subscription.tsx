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
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';

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

  const PLAN_DETAILS = {
    regular: {
      name: 'Regular Plan',
      price: '₦2,500/month',
      originalPrice: '₦5,000/month',
      discount: '50% Off',
      features: [
        'Ad-Free Experience',
        'Advanced Search Filters',
        'Send Media in Chat',
        'Interactive Map Access',
        'View Space Products',
      ],
    },
    standard: {
      name: 'Standard Plan',
      price: '₦5,000/month',
      originalPrice: '₦10,000/month',
      discount: '50% Off',
      features: [
        'All Regular Plan Features',
        'Enhanced Search Visibility',
        'Receipt Generation',
        'Post Media Content',
        'Update Media Stories',
      ],
    },
  };

  const PLAN_OPTIONS = [
    { label: 'Regular Plan - ₦2,500/month', value: 'regular' },
    { label: 'Standard Plan - ₦5,000/month', value: 'standard' },
  ];

  // Animation for swipe indicator
  const translateX = useSharedValue(0);
  React.useEffect(() => {
    translateX.value = withRepeat(
      withTiming(10, { duration: 500 }),
      -1,
      true
    );
  }, [translateX]);

  const animatedArrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const animatedDropdownStyle = useAnimatedStyle(() => ({
    opacity: dropdownOpacity.value,
    transform: [{ translateY: dropdownTranslateY.value }],
  }));

  const toggleDropdown = () => {
    setDropdownVisible(!dropdownVisible);
    dropdownOpacity.value = withTiming(dropdownVisible ? 0 : 1, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
    dropdownTranslateY.value = withTiming(dropdownVisible ? 20 : 0, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
  };

  const selectPlan = (value) => {
    setSelectedPlan(value);
    setDropdownVisible(false);
    dropdownOpacity.value = withTiming(0, { duration: 300 });
    dropdownTranslateY.value = withTiming(20, { duration: 300 });
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

      // SUCCESS: Save to subscription_cache
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30); // 30 days
      const endDateStr = endDate.toISOString().split('T')[0];

      const subscriptionData = {
        plan: selectedPlan,
        is_active: true,
        start_date: today,
        end_date: endDateStr,
      };

      await AsyncStorage.setItem('subscription_cache', JSON.stringify(subscriptionData));
      console.log('Subscription saved to cache:', subscriptionData);

      setModalMessage(message || 'Subscription successful!');
      setModalVisible(true);

      // Optional: Refresh balance & virtual account
      try {
        const balanceResponse = await api.get(`${API_BASE_URL}/payments/balance/`, {
          headers: { Authorization: token },
        });
        const { balance, virtual_account } = balanceResponse.data;
        await AsyncStorage.setItem('balance', balance.toString());
        if (virtual_account) {
          await AsyncStorage.setItem('dva_account_number', virtual_account.account_number);
          await AsyncStorage.setItem('dva_bank_name', virtual_account.bank_name);
          await AsyncStorage.setItem('dva_account_name', virtual_account.account_name);
        }
      } catch (balError) {
        console.warn('Failed to refresh balance:', balError);
      }

    } catch (error) {
      const message = error.response?.data?.message || 'Failed to purchase plan. Please try again.';
      if (message.toLowerCase().includes('insufficient balance')) {
        Alert.alert(
          'Insufficient Balance',
          'Please fund your account to proceed with this subscription.',
          [
            {
              text: 'OK',
              onPress: () => router.push({ pathname: '/(tabs)/account', params: { prevRoute: 'Subscription' } }),
            },
          ]
        );
      } else if (message.toLowerCase().includes('invalid plan')) {
        Alert.alert('Error', 'The selected plan is invalid. Please choose another plan.');
      } else {
        setModalMessage(message);
        setModalVisible(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = (event) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const cardWidth = 260;
    const index = Math.round(contentOffsetX / cardWidth);
    setCurrentCardIndex(index);
  };

  const renderDropdownItem = ({ item }) => (
    <TouchableOpacity
      style={styles.dropdownItem}
      onPress={() => selectPlan(item.value)}
      activeOpacity={0.7}
    >
      <Text style={styles.dropdownItemText}>{item.label}</Text>
      {selectedPlan === item.value && (
        <MaterialIcons name="check-circle" size={20} color="#3B82F6" />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
      <LinearGradient colors={['#E0F2FE', '#BFDBFE']} style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            accessibilityLabel="Go back"
            onPress={() => router.navigate("(tabs)/account")}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Subscription Plans</Text>
          <View style={styles.headerSpacer} />
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent}>
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
              style={styles.planScroll}
              contentContainerStyle={styles.planScrollContent}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              snapToInterval={260}
              decelerationRate="fast"
            >
              {Object.entries(PLAN_DETAILS).map(([planKey, plan], index) => (
                <Animated.View
                  key={planKey}
                  entering={FadeInDown.duration(400).delay(400 + index * 100)}
                  style={[styles.planCardOption, selectedPlan === planKey && styles.selectedPlanCard]}
                >
                  <TouchableOpacity
                    accessibilityLabel={`Select ${plan.name}`}
                    onPress={() => setSelectedPlan(planKey)}
                  >
                    <LinearGradient
                      colors={planKey === 'standard' ? ['#FFFFFF', '#BFDBFE'] : ['#FFFFFF', '#F3F4F6']}
                      style={styles.planCardGradient}
                    >
                      <View style={styles.planHeader}>
                        <Text style={styles.planCardTitle}>{plan.name}</Text>
                        {planKey === 'standard' && (
                          <View style={styles.premiumBadge}>
                            <Text style={styles.premiumBadgeText}>Business</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.planCardPrice}>{plan.price}</Text>
                      <Text style={styles.planCardOriginalPrice}>{plan.originalPrice}</Text>
                      <Text style={styles.planCardDiscount}>{plan.discount}</Text>
                      <View style={styles.featuresList}>
                        {plan.features.map((feature, idx) => (
                          <View key={idx} style={styles.featureItem}>
                            <MaterialIcons name="check-circle" size={20} color="#22C55E" />
                            <Text style={styles.featureText}>{feature}</Text>
                          </View>
                        ))}
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </ScrollView>
            <View style={styles.carouselDots}>
              {Object.keys(PLAN_DETAILS).map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    currentCardIndex === index ? styles.activeDot : styles.inactiveDot,
                  ]}
                />
              ))}
            </View>
            <Animated.View entering={FadeInDown.duration(400).delay(600)} style={styles.dropdownTriggerContainer}>
              <TouchableOpacity
                style={styles.dropdownTrigger}
                onPress={toggleDropdown}
                activeOpacity={0.7}
              >
                <Text style={styles.dropdownTriggerText}>
                  {selectedPlan ? PLAN_OPTIONS.find(opt => opt.value === selectedPlan)?.label : 'Select a Plan'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
            <Modal
              animationType="none"
              transparent
              visible={dropdownVisible}
              onRequestClose={() => setDropdownVisible(false)}
            >
              <TouchableOpacity
                style={styles.dropdownOverlay}
                onPress={() => setDropdownVisible(false)}
                activeOpacity={1}
              >
                <Animated.View style={[styles.dropdownContainer, animatedDropdownStyle]}>
                  <FlatList
                    data={PLAN_OPTIONS}
                    renderItem={renderDropdownItem}
                    keyExtractor={(item) => item.value}
                    style={styles.dropdownList}
                    contentContainerStyle={styles.dropdownListContent}
                  />
                </Animated.View>
              </TouchableOpacity>
            </Modal>
            <Animated.View entering={FadeInDown.duration(400).delay(700)}>
              <TouchableOpacity
                accessibilityLabel="Subscribe to selected plan"
                style={[styles.purchaseButton, !selectedPlan && styles.disabledButton]}
                onPress={purchasePlan}
                disabled={loading || !selectedPlan}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#1E40AF', '#3B82F6']}
                  style={styles.buttonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.buttonText}>Subscribe Now</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </View>

          <Modal
            animationType="fade"
            transparent
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <Animated.View entering={FadeInDown.duration(400)} style={styles.modalContent}>
                <Text style={styles.modalTitle}>Subscription Status</Text>
                <Text style={styles.modalText}>{modalMessage}</Text>
                <Pressable
                  style={styles.modalButton}
                  onPress={() => setModalVisible(false)}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#1E40AF', '#3B82F6']}
                    style={styles.modalButtonGradient}
                  >
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

// ... [styles unchanged, full list below]

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    paddingBottom: 64,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2A44',
    marginBottom: 16,
    textAlign: 'center',
  },
  planInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  planInfoText: {
    flex: 1,
  },
  planLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 8,
  },
  planValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2A44',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2A44',
    marginVertical: 16,
    textAlign: 'center',
  },
  planInstruction: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4B5563',
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  swipeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  swipeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginLeft: 8,
  },
  planContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  planScroll: {
    marginBottom: 16,
  },
  planScrollContent: {
    flexDirection: 'row',
    paddingRight: 16,
  },
  planCardOption: {
    width: 260,
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedPlanCard: {
    borderColor: '#1E40AF',
    transform: [{ scale: 1.02 }],
  },
  planCardGradient: {
    padding: 20,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  planCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2A44',
  },
  premiumBadge: {
    backgroundColor: '#FBBF24',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  premiumBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2A44',
  },
  planCardPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2A44',
    marginBottom: 4,
    textAlign: 'center',
  },
  planCardOriginalPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    textDecorationLine: 'line-through',
    textAlign: 'center',
  },
  planCardDiscount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22C55E',
    marginBottom: 12,
    textAlign: 'center',
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    color: '#1F2A44',
    flex: 1,
    lineHeight: 20,
  },
  carouselDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#1E40AF',
  },
  inactiveDot: {
    backgroundColor: '#D1D5DB',
  },
  dropdownTriggerContainer: {
    marginBottom: 16,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownTriggerText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2A44',
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '90%',
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  dropdownList: {
    borderRadius: 12,
  },
  dropdownListContent: {
    paddingVertical: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dropdownItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2A44',
  },
  purchaseButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2A44',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  modalButton: {
    borderRadius: 12,
    overflow: 'hidden',
    width: '100%',
  },
  modalButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default Subscription;