import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, usePathname } from 'expo-router';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import api from '../../api';

const Account = () => {
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [virtualAccount, setVirtualAccount] = useState(null);
  const [subscription, setSubscription] = useState({ plan: null, end_date: null });
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      try {
        const userIdString = await AsyncStorage.getItem('user_id');
        const token = await AsyncStorage.getItem('sessionToken');
        if (userIdString && token) {
          setUserId(parseInt(userIdString, 10));
          const response = await api.get(`/payments/balance/`, {
            headers: { Authorization: token },
          });
          const { balance, virtual_account, subscription } = response.data;
          setBalance(balance);
          setVirtualAccount(virtual_account);
          setSubscription(subscription);

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
        }
      } catch (error) {
        console.error('Error fetching balance:', error);
        Alert.alert('Error', 'Failed to load account details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
      
      {/* LinearGradient as absolute background */}
      <LinearGradient colors={['#E3F2FD', '#BBDEFB']} style={StyleSheet.absoluteFillObject} />

      {/* Scrollable content with proper flex */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Account Details Card */}
        <View style={styles.accountCard}>
          {loading && !virtualAccount && !balance ? (
            <ActivityIndicator size="large" color="#5A8DEE" style={styles.loader} />
          ) : (
            <>
              {virtualAccount ? (
                <>
                  <View style={styles.accountInfo}>
                    <MaterialIcons name="account-balance" size={24} color="#5A8DEE" />
                    <View>
                      <Text style={styles.accountLabel}>Account Number</Text>
                      <Text style={styles.accountValue}>{virtualAccount.account_number}</Text>
                    </View>
                  </View>
                  <View style={styles.accountInfo}>
                    <MaterialIcons name="person" size={24} color="#5A8DEE" />
                    <View>
                      <Text style={styles.accountLabel}>Account Name</Text>
                      <Text style={styles.accountValue}>{virtualAccount.account_name}</Text>
                    </View>
                  </View>
                  <View style={styles.accountInfo}>
                    <MaterialIcons name="business" size={24} color="#5A8DEE" />
                    <View>
                      <Text style={styles.accountLabel}>Bank Name</Text>
                      <Text style={styles.accountValue}>{virtualAccount.bank_name}</Text>
                    </View>
                  </View>
                  <View style={styles.balanceContainer}>
                    <MaterialIcons name="account-balance-wallet" size={24} color="#5A8DEE" />
                    <View>
                      <Text style={styles.accountLabel}>Available Balance</Text>
                      <Text style={styles.balance}>₦{balance.toFixed(2)}</Text>
                    </View>
                  </View>
                  <Text style={styles.instruction}>
                    To top up your balance, transfer funds to your virtual account above using any bank.
                  </Text>
                </>
              ) : (
                <View style={styles.noAccountContainer}>
                  <Text style={styles.noAccountText}>
                    No virtual account assigned. Please verify your ID to get one.
                  </Text>
                  <TouchableOpacity
                    style={styles.verifyButton}
                    onPress={() => router.push({ pathname: 'Verify', params: { prevRoute: pathname } })}
                  >
                    <Text style={styles.verifyButtonText}>Verify ID</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>

        {/* Navigation Options */}
        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() =>
              router.push({
                pathname: 'cart/BuyerPODashboard',
                params: {
                  prevRoute: pathname,
                  currentPlan: subscription.plan || 'none',
                  endDate: subscription.end_date || 'N/A',
                },
              })
            }
          >
            <MaterialIcons name="card-membership" size={24} color="#5A8DEE" />
            <Text style={styles.optionText}>Order</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() =>
              router.push({ pathname: 'shop/CustomerReceipts', params: { prevRoute: pathname } })
            }
          >
            <MaterialIcons name="receipt-long" size={24} color="#5A8DEE" />
            <Text style={styles.optionText}>View Receipts</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionCard}
            onPress={() =>
              router.push({
                pathname: 'shop/Subscription',
                params: {
                  prevRoute: pathname,
                  currentPlan: subscription.plan || 'none',
                  endDate: subscription.end_date || 'N/A',
                },
              })
            }
          >
            <MaterialIcons name="card-membership" size={24} color="#5A8DEE" />
            <Text style={styles.optionText}>Subscription</Text>
          </TouchableOpacity>

        </View>

        {/* Extra bottom padding so last item is fully visible */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 60, // Critical: gives space at bottom
    flexGrow: 1,
  },
  accountCard: {
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
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  subscriptionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E8ECEF',
  },
  accountLabel: {
    fontSize: 14,
    color: '#7A869A',
    fontWeight: '500',
  },
  accountValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2A3A4E',
    marginTop: 2,
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E8ECEF',
  },
  balance: {
    fontSize: 20,
    fontWeight: '700',
    color: '#5A8DEE',
    marginTop: 2,
  },
  instruction: {
    fontSize: 14,
    color: '#7A869A',
    textAlign: 'center',
    marginTop: 15,
    lineHeight: 20,
  },
  noAccountContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  noAccountText: {
    fontSize: 16,
    color: '#2A3A4E',
    textAlign: 'center',
    marginBottom: 15,
  },
  verifyButton: {
    backgroundColor: '#5A8DEE',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  verifyButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  optionsContainer: {
    marginTop: 30,
    marginBottom: 20,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2A3A4E',
    marginLeft: 10,
  },
  loader: {
    marginVertical: 20,
  },
});

export default Account;