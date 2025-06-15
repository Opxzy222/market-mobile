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
  TouchableWithoutFeedback,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
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
    <LinearGradient colors={['#E3F2FD', '#BBDEFB']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.planCard}>
          <Text style={styles.cardTitle}>Your Current Plan</Text>
          <View style={styles.planInfo}>
            <MaterialIcons name="card-membership" size={24} color="#5A8DEE" />
            <View>
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
          <TouchableOpacity
            style={styles.planDetailsButton}
            onPress={() => setPlanDetailsModal(true)}
          >
            <Text style={styles.planDetailsButtonText}>View Plan Details</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.purchaseButton, !selectedPlan && styles.disabledButton]}
            onPress={purchasePlan}
            disabled={loading || !selectedPlan}
          >
            <LinearGradient
              colors={['#5A8DEE', '#7B9FFF']}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Processing...' : 'Purchase Plan'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <Modal
          animationType="slide"
          transparent
          visible={planDetailsModal}
          onRequestClose={() => setPlanDetailsModal(false)}
        >
          <TouchableWithoutFeedback onPress={() => setPlanDetailsModal(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <ScrollView style={styles.planModalContent}>
                  <Text style={styles.modalTitle}>Plan Comparison</Text>
                  <View style={styles.tableContainer}>
                    <View style={styles.tableRow}>
                      <Text
                        style={[styles.tableHeader, styles.featureColumn]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        Feature
                      </Text>
                      <Text
                        style={[styles.tableHeader, styles.planColumn]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        Regular
                      </Text>
                      <Text
                        style={[styles.tableHeader, styles.planColumn]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        Standard
                      </Text>
                      <Text
                        style={[styles.tableHeader, styles.planColumn]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        Premium
                      </Text>
                    </View>
                    {allFeatures.map((feature) => (
                      <View key={feature} style={styles.tableRow}>
                        <Text
                          style={[styles.tableCell, styles.featureColumn]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {feature}
                        </Text>
                        <View style={[styles.tableCell, styles.planColumn]}>
                          {PLAN_DETAILS.regular.included.includes(feature) ? (
                            <MaterialIcons name="check-circle" size={20} color="#28A745" />
                          ) : (
                            <MaterialIcons name="cancel" size={20} color="#DC3545" />
                          )}
                        </View>
                        <View style={[styles.tableCell, styles.planColumn]}>
                          {PLAN_DETAILS.standard.included.includes(feature) ? (
                            <MaterialIcons name="check-circle" size={20} color="#28A745" />
                          ) : (
                            <MaterialIcons name="cancel" size={20} color="#DC3545" />
                          )}
                        </View>
                        <View style={[styles.tableCell, styles.planColumn]}>
                          {PLAN_DETAILS.premium.included.includes(feature) ? (
                            <MaterialIcons name="check-circle" size={20} color="#28A745" />
                          ) : (
                            <MaterialIcons name="cancel" size={20} color="#DC3545" />
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                  <TouchableOpacity style={styles.closeButton}>
                    <LinearGradient
                      colors={['#5A8DEE', '#7B9FFF']}
                      style={styles.closeButtonGradient}
                    >
                      <Text style={styles.closeButtonText}>Close</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </ScrollView>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        <Modal
          animationType="fade"
          transparent
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalText}>{modalMessage}</Text>
              <Pressable
                style={styles.modalButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>OK</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2A3A4E',
    marginBottom: 15,
    textAlign: 'center',
  },
  planInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  planLabel: {
    fontSize: 14,
    color: '#7A869A',
    fontWeight: '500',
  },
  planValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2A3A4E',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2A3A4E',
    marginTop: 30,
    marginBottom: 15,
  },
  planContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  picker: {
    height: 50,
    marginBottom: 15,
    borderRadius: 8,
    backgroundColor: '#F7F9FC',
  },
  pickerItem: {
    fontSize: 16,
    color: '#2A3A4E',
  },
  planDetailsButton: {
    backgroundColor: '#F7F9FC',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  planDetailsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5A8DEE',
  },
  purchaseButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonGradient: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  planModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2A3A4E',
    marginBottom: 20,
    textAlign: 'center',
  },
  tableContainer: {
    borderWidth: 1,
    borderColor: '#E8ECEF',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECEF',
  },
  tableHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2A3A4E',
    padding: 10,
    textAlign: 'center',
    backgroundColor: '#F7F9FC',
  },
  tableCell: {
    fontSize: 14,
    color: '#2A3A4E',
    padding: 10,
    textAlign: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureColumn: {
    flex: 3,
    textAlign: 'left',
  },
  planColumn: {
    flex: 1,
  },
  closeButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 20,
    alignSelf: 'center',
  },
  closeButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  modalText: {
    fontSize: 16,
    color: '#2A3A4E',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: '#5A8DEE',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignSelf: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

export default Subscription;