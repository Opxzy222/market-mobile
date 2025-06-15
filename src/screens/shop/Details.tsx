import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter, usePathname } from "expo-router";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

const Details = () => {
  const router = useRouter();
  const { shopId, prevRoute } = useLocalSearchParams();
  const pathname = usePathname();

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
      <LinearGradient colors={["#E3F2FD", "#BBDEFB"]} style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.replace(prevRoute || "((tabs)/myshop)")}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={26} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Space Settings</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={styles.option}
            onPress={() =>
              router.push({
                pathname: "/shop/ShopProfile",
                params: { shopId, prevRoute: pathname },
              })
            }
          >
            <View style={styles.iconWrapper}>
              <MaterialIcons name="edit" size={28} color="#007AFF" />
            </View>
            <Text style={styles.text}>Edit Profile</Text>
            <MaterialIcons
              name="chevron-right"
              size={28}
              color="#A0A0A0"
              style={styles.chevron}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.option}
            onPress={() =>
              router.push({
                pathname: "/shop/WorkingHours",
                params: { shopId, prevRoute: pathname },
              })
            }
          >
            <View style={styles.iconWrapper}>
              <MaterialIcons name="access-time" size={28} color="#007AFF" />
            </View>
            <Text style={styles.text}>Working Hours</Text>
            <MaterialIcons
              name="chevron-right"
              size={28}
              color="#A0A0A0"
              style={styles.chevron}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.option}
            onPress={() =>
              router.push({
                pathname: "/shop/NotificationSettings",
                params: { shopId, prevRoute: pathname },
              })
            }
          >
            <View style={styles.iconWrapper}>
              <MaterialIcons name="notifications-none" size={28} color="#007AFF" />
            </View>
            <Text style={styles.text}>Notification Settings</Text>
            <MaterialIcons
              name="chevron-right"
              size={28}
              color="#A0A0A0"
              style={styles.chevron}
            />
          </TouchableOpacity>
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
    flex: 1,
    textAlign: "center",
  },
  headerSpacer: {
    width: 42,
  },
  optionsContainer: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 0.5,
    borderColor: "rgba(0, 0, 0, 0.05)",
  },
  iconWrapper: {
    width: 48,
    height: 48,
    backgroundColor: "#EBF5FF",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  text: {
    fontSize: 19,
    fontWeight: "600",
    color: "#1A1A1A",
    flex: 1,
  },
  chevron: {
    opacity: 0.8,
  },
});

export default Details;