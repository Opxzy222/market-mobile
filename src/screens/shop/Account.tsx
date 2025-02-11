import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useLocalSearchParams, usePathname } from "expo-router";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

const Account = () => {
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accountBalance, setAccountBalance] = useState(0);
  const [accountNumber, setAccountNumber] = useState("**** **** **** 1234");
  const pathname = usePathname()

  const router = useRouter();
  const params = useLocalSearchParams();
  const { prevRoute } = params;

  useEffect(() => {
    const fetchUserData = async () => {
      const userIdString = await AsyncStorage.getItem("user_id");
      if (userIdString) {
        setUserId(parseInt(userIdString, 10));
      }
      setTimeout(() => {
        setAccountBalance(2500.75);
        setLoading(false);
      }, 1500);
    };

    fetchUserData();
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.replace(prevRoute || "((tabs)/shop)")}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={26} color="#007BFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account</Text>
      </View>

      {/* Account Details */}
      <View style={styles.accountCard}>
        <Text style={styles.accountLabel}>Account Number</Text>
        <Text style={styles.accountNumber}>{accountNumber}</Text>

        <Text style={styles.balanceLabel}>Available Balance</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#007BFF" />
        ) : (
          <Text style={styles.balance}>${accountBalance.toFixed(2)}</Text>
        )}
      </View>

      {/* Options */}
      <View style={styles.optionsContainer}>
        <TouchableOpacity style={styles.optionCard} onPress={() =>
                  router.push({ pathname: 'shop/CustomerReceipts', params: { prevRoute: pathname } })}>
          <MaterialIcons name="receipt-long" size={26} color="#333" />
          <Text style={styles.optionText}>Receipts</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionCard}>
          <MaterialIcons name="sync-alt" size={26} color="#333" />
          <Text style={styles.optionText}>Transactions</Text>
        </TouchableOpacity>
      </View>

      {/* Subscription Plans Section */}
      <Text style={styles.subscriptionTitle}>Subscription Plans</Text>

      <View style={styles.subscriptionContainer}>
        {/* Standard Plan */}
        <TouchableOpacity style={styles.subscriptionCard}>
          <MaterialIcons name="star-border" size={28} color="#007BFF" />
          <View style={styles.planDetails}>
            <Text style={styles.planTitle}>Standard Plan</Text>
            <Text style={styles.planPrice}>$9.99/month</Text>
          </View>
        </TouchableOpacity>

        {/* Premium Plan */}
        <TouchableOpacity style={[styles.subscriptionCard, styles.premiumCard]}>
          <MaterialIcons name="star" size={28} color="#FFD700" />
          <View style={styles.planDetails}>
            <Text style={[styles.planTitle, styles.premiumText]}>Premium Plan</Text>
            <Text style={[styles.planPrice, styles.premiumText]}>$19.99/month</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6F9",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#dcdcdc",
    elevation: 3,
  },
  backButton: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#007BFF",
  },

  accountCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
    marginTop: 20,
    alignItems: "center",
  },
  accountLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  accountNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginVertical: 5,
  },
  balanceLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
    marginTop: 10,
  },
  balance: {
    fontSize: 24,
    fontWeight: "700",
    color: "#007BFF",
    marginTop: 5,
  },

  optionsContainer: {
    marginTop: 30,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  optionText: {
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 10,
    color: "#333",
  },

  subscriptionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginTop: 30,
    marginBottom: 10,
  },
  subscriptionContainer: {
    flexDirection: "column",
  },
  subscriptionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
  },
  premiumCard: {
    backgroundColor: "#007BFF",
  },
  planDetails: {
    marginLeft: 10,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  planPrice: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  premiumText: {
    color: "#fff",
  },
});

export default Account;
