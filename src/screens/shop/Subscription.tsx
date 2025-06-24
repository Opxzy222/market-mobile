import React, { useState, useContext } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import { SafeAreaView } from "react-native-safe-area-context";
import SubscriptionProvider, { SubscriptionContext } from '../../components/SubscriptionProvider';

const Subscription = () => {
  const [selectedPlan, setSelectedPlan] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [planDetailsModal, setPlanDetailsModal] = useState(false);
  const { currentPlan, endDate } = useLocalSearchParams();
  const router = useRouter();
  const { refreshSubscription } = useContext(SubscriptionContext);

  const API_BASE_URL = 'https://retail-alvinia-goza-f6a0e4f7.koyeb.app';

  const PLAN_DETAILS = {
    regular: {
      included: ['Unlimited Transactions', 'Basic Analytics', 'Email Support'],
      excluded: ['Priority Support', 'Advanced Analytics', 'Custom Branding'],
    },
    standard: {
      included: ['Unlimited Transactions', 'Basic Analytics', 'Email Support', 'Priority Support'],
      excluded: ['Advanced Analytics', 'Custom Branding'],
    },
    premium: {
      included: [
        'Unlimited Transactions',
        'Basic Analytics',
        'Email Support',
        'Priority Support',
        'Advanced Analytics',
        'Custom Branding',
      ],
      excluded: [],
    },
  };

  const allFeatures = Array.from(
    new Set(
      Object.values(PLAN_DETAILS).flatMap((plan) => [
        ...plan.included,
        ...plan.excluded,
      ])
    )
  );

  const purchasePlan = async () => {
    if (!selectedPlan) {
      Alert.alert('Error', 'Please select a plan.');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('sessionToken');
      const response = await axios.post(
        `${API_BASE_URL}/payments/purchase/`,
        { plan: selectedPlan },
        {
          headers: {
            Authorization: token,
            'Content-Type': 'application/json',
          },
        }
      );
      setModalMessage(response.data.message);
      setModalVisible(true);

      // On success, refresh subscription and Account caches
      await refreshSubscription();
      const balanceResponse = await axios.get(`${API_BASE_URL}/payments/balance/`, {
        headers: { Authorization: token },
      });
      const { balance, virtual_account, subscription } = balanceResponse.data;
      await AsyncStorage.setItem('balance', balance.toString());
      if (virtual_account) {
        await AsyncStorage.setItem('dva_account_number', virtual_account.account_number);
        await AsyncStorage.setItem('dva_bank_name', virtual_account.bank_name);
        await AsyncStorage.setItem('dva_account_name', virtual_account.account_name);
      }
      if (subscription) {
        await AsyncStorage.setItem('subscription_plan', subscription.plan || '');
        await AsyncStorage.setItem('subscription_end_date', subscription.end_date || '');
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Error purchasing plan';
      if (message.toLowerCase().includes('insufficient balance')) {
        Alert.alert(
          'Insufficient Balance',
          'Please top up your account to purchase this plan.',
          [
            {
              text: 'OK',
              onPress: () => router.push({ pathname: '/(tabs)/account', params: { prevRoute: 'Subscription' } }),
            },
          ]
        );
      } else if (message.toLowerCase().includes('invalid plan')) {
        Alert.alert('Error', 'Selected plan is invalid. Please try again.');
      } else {
        setModalMessage(message);
        setModalVisible(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor='#2563EB' />
      <LinearGradient colors={['#E3F2FD', '#BBDEFB']} style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={26} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Subscription</Text>
          <View style={styles.headerSpacer} />
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.planCard}>
            <Text style={styles.cardTitle}>Your Current Plan</Text>
            <View style={styles.planInfo}>
              <MaterialIcons name="card-membership" size={24} color="#5A8DEE" />
              <View style={styles.planInfoText}>
                <Text style={styles.planLabel}>Plan</Text>
                <Text style={styles.planValue}>
                  {currentPlan && currentPlan !== 'none'
                    ? currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)
                    : 'None'}
                </Text>
                <Text style={styles.planLabel}>Expires On</Text>
                <Text style={styles.planValue}>{endDate !== 'N/A' ? endDate : 'N/A'}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Choose a Subscription Plan</Text>
          <View style={styles.planContainer}>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedPlan}
                onValueChange={(itemValue) => setSelectedPlan(itemValue)}
                style={styles.picker}
                itemStyle={styles.pickerItem}
              >
                <Picker.Item label="Select a plan" value="" />
                <Picker.Item label="Regular - ₦5,000/month" value="regular" />
                <Picker.Item label="Standard - ₦10,000/month" value="standard" />
                <Picker.Item label="Premium - ₦25,000/month" value="premium" />
              </Picker>
            </View>
            <TouchableOpacity
              style={styles.planDetailsButton}
              onPress={() => setPlanDetailsModal(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.planDetailsButtonText}>View Plan Details</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.purchaseButton, !selectedPlan && styles.disabledButton]}
              onPress={purchasePlan}
              disabled={loading || !selectedPlan}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#5A8DEE', '#7B9FFF']}
                style={styles.buttonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Purchase Plan</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <Modal
            animationType="fade"
            transparent
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Notification</Text>
                <Text style={styles.modalText}>{modalMessage}</Text>
                <Pressable
                  style={styles.modalButton}
                  onPress={() => setModalVisible(false)}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#5A8DEE', '#7B9FFF']}
                    style={styles.modalButtonGradient}
                  >
                    <Text style={styles.modalButtonText}>OK</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          </Modal>

          <Modal
            animationType="slide"
            transparent
            visible={planDetailsModal}
            onRequestClose={() => setPlanDetailsModal(false)}
          >
            <View style={styles.planModalOverlay}>
              <View style={styles.planModalContent}>
                <Text style={styles.modalTitle}>Plan Comparison</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.tableContainer}>
                    <View style={styles.tableRow}>
                      <Text style={[styles.tableHeader, styles.featureColumn]}>Feature</Text>
                      <Text style={[styles.tableHeader, styles.planColumn]}>Regular</Text>
                      <Text style={[styles.tableHeader, styles.planColumn]}>Standard</Text>
                      <Text style={[styles.tableHeader, styles.planColumn]}>Premium</Text>
                    </View>
                    {allFeatures.map((feature) => (
                      <View key={feature} style={styles.tableRow}>
                        <Text
                          style={[styles.tableCell, styles.featureColumn]}
                          numberOfLines={2}
                          ellipsizeMode="tail"
                        >
                          {feature}
                        </Text>
                        <View style={[styles.tableCell, styles.planColumn, styles.iconCell]}>
                          {PLAN_DETAILS.regular.included.includes(feature) ? (
                            <MaterialIcons name="check-circle" size={20} color="#28A745" />
                          ) : (
                            <MaterialIcons name="cancel" size={20} color="#DC3545" />
                          )}
                        </View>
                        <View style={[styles.tableCell, styles.planColumn, styles.iconCell]}>
                          {PLAN_DETAILS.standard.included.includes(feature) ? (
                            <MaterialIcons name="check-circle" size={20} color="#28A745" />
                          ) : (
                            <MaterialIcons name="cancel" size={20} color="#DC3545" />
                          )}
                        </View>
                        <View style={[styles.tableCell, styles.planColumn, styles.iconCell]}>
                          {PLAN_DETAILS.premium.included.includes(feature) ? (
                            <MaterialIcons name="check-circle" size={20} color="#28A745" />
                          ) : (
                          <MaterialIcons name="cancel" size={20} color="#DC3545" />
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                </ScrollView>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setPlanDetailsModal(false)}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#5A8DEE', '#7B9FFF']}
                    style={styles.closeButtonGradient}
                  >
                    <Text style={styles.closeButtonText}>Close</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: "#3A7BD5",
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  backButton: {
    padding: 5,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
  },
  headerSpacer: {
    width: 42,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1F36',
    marginBottom: 16,
    textAlign: 'center',
  },
  planInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
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
    color: '#1A1F36',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1F36',
    marginVertical: 20,
  },
  planContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  pickerContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  picker: {
    height: 50,
    color: '#1A1F36',
  },
  pickerItem: {
    fontSize: 16,
    color: '#1A1F36',
    fontWeight: '500',
  },
  planDetailsButton: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  planDetailsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5A8DEE',
  },
  purchaseButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  planModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  planModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    width: '100%',
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1F36',
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
    color: '#fff',
  },
  tableContainer: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    minHeight: 48,
  },
  tableHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1F36',
    paddingVertical: 12,
    paddingHorizontal: 8,
    textAlign: 'center',
    backgroundColor: '#F9FAFB',
  },
  tableCell: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureColumn: {
    width: 200,
    textAlign: 'left',
    paddingLeft: 16,
  },
  planColumn: {
    width: 80,
    textAlign: 'center',
  },
  iconCell: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 16,
    alignSelf: 'center',
    width: '50%',
  },
  closeButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default Subscription;