import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, usePathname } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInUp } from "react-native-reanimated";


const ReceiptActions = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { shopId, prevRoute } = params;
  const pathname = usePathname();

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor='#2563EB' />
      <LinearGradient colors={["#F7FAFC", "#E3F2FD"]} style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.replace(prevRoute || "/(tabs)/myshop")}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={26} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Receipt Actions</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.buttonsContainer}>
          <Animated.View entering={FadeInUp.delay(100)}>
            <TouchableOpacity
              style={styles.button}
              onPress={() =>
                router.push({
                  pathname: "/shop/GenerateReceipt",
                  params: { shopId, prevRoute: pathname },
                })
              }
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={["#4CAF50", "#388E3C"]}
                style={styles.buttonGradient}
              >
                <MaterialIcons name="post-add" size={30} color="#FFFFFF" />
                <Text style={styles.buttonText}>Generate Receipt</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
          <Animated.View entering={FadeInUp.delay(200)}>
            <TouchableOpacity
              style={styles.button}
              onPress={() =>
                router.push({
                  pathname: "/shop/ShopReceipts",
                  params: { shopId, prevRoute: pathname },
                })
              }
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={["#795548", "#5D4037"]}
                style={styles.buttonGradient}
              >
                <MaterialIcons name="receipt" size={30} color="#FFFFFF" />
                <Text style={styles.buttonText}>Receipts</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
    flex: 1,
  },
  headerSpacer: {
    width: 42,
  },
  buttonsContainer: {
    flex: 1,
    alignItems: "center",
    padding: 16,
  },
  button: {
    width: "93%",
    maxWidth: 400,
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginLeft: 12,
  },
});

export default ReceiptActions;