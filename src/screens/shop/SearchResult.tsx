import { useState, useEffect, useMemo, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  Modal,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Slider from "@react-native-community/slider";
import Ionicons from "react-native-vector-icons/Ionicons";
import SubscriptionProvider, { SubscriptionContext } from "../../components/SubscriptionProvider";
import SubscriptionRequired from "@/components/RequiredSubscription";
import { SafeAreaView } from 'react-native-safe-area-context';

const screenWidth = Dimensions.get("window").width;

const SearchResults = () => {
  const params = useLocalSearchParams();
  const { subscriptionStatus, loading } = useContext(SubscriptionContext);
  const { prevRoute } = params;
  const searchResults = useMemo(() => {
    try {
      return params.searchResults ? JSON.parse(params.searchResults) : [];
    } catch (error) {
      console.error('Error parsing searchResults:', error);
      return [];
    }
  }, [params.searchResults]);

  console.log('searchResults:', searchResults);

  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [subscriptionModalVisible, setSubscriptionModalVisible] = useState(false);

  // Temporary filter states
  const [tempMinRating, setTempMinRating] = useState(0);
  const [tempMaxRating, setTempMaxRating] = useState(5);
  const [tempMinDistance, setTempMinDistance] = useState(0);
  const [tempMaxDistance, setTempMaxDistance] = useState(50);

  // Actual filter states
  const [minRating, setMinRating] = useState(0);
  const [maxRating, setMaxRating] = useState(5);
  const [minDistance, setMinDistance] = useState(0);
  const [maxDistance, setMaxDistance] = useState(50);
  const [filteredResults, setFilteredResults] = useState(searchResults);

  const allDistancesNull = useMemo(
    () => Array.isArray(searchResults) && searchResults.length > 0 && searchResults.every((shop) => shop?.distance == null),
    [searchResults]
  );

  useEffect(() => {
    setMinRating(0);
    setMaxRating(5);
    setMinDistance(0);
    setMaxDistance(50);
    setFilteredResults(Array.isArray(searchResults) ? searchResults : []);
  }, [searchResults]);

  useEffect(() => {
    if (!Array.isArray(searchResults)) {
      console.warn('searchResults is not an array:', searchResults);
      setFilteredResults([]);
      return;
    }

    const results = searchResults.filter((shop) => {
      if (!shop || typeof shop !== 'object') return false;

      const rating = shop.average_rating ?? 0;
      const distance = shop.distance ?? null;

      const ratingCheck = rating >= minRating && rating <= maxRating;
      let distanceCheck = true;

      if (!allDistancesNull && distance !== null) {
        distanceCheck = distance >= minDistance && distance <= maxDistance;
      }

      return ratingCheck && distanceCheck;
    });

    console.log('Filtered results:', results);
    setFilteredResults(results);
  }, [minRating, maxRating, minDistance, maxDistance, searchResults, allDistancesNull]);

  const handleFilterPress = () => {
    if (["regular", "standard", "premium"].includes(subscriptionStatus)) {
      setModalVisible(true);
    } else {
      setSubscriptionModalVisible(true);
    }
  };

  const applyFilters = () => {
    setMinRating(tempMinRating);
    setMaxRating(tempMaxRating);

    if (!allDistancesNull) {
      setMinDistance(tempMinDistance);
      setMaxDistance(tempMaxDistance);
    }

    setModalVisible(false);
  };

  const resetFilters = () => {
    setTempMinRating(0);
    setTempMaxRating(5);
    setMinRating(0);
    setMaxRating(5);

    if (!allDistancesNull) {
      setTempMinDistance(0);
      setTempMaxDistance(50);
      setMinDistance(0);
      setMaxDistance(50);
    }

    setFilteredResults(Array.isArray(searchResults) ? searchResults : []);
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#007BFF" style={styles.loader} />;
  }

  const renderShopCard = ({ item }) => (
    <LinearGradient colors={["rgba(255,255,255,0.6)", "rgba(240,240,240,0.4)"]} style={styles.shopCard}>
      <View style={styles.imageContainer}>
        {(item.average_rating !== null || item.verified) && (
          <View style={styles.ratingContainer}>
            {item.verified && (
              <View style={styles.verifiedBadge}>
                <MaterialIcons name="verified" size={14} color="#0FA958" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
            {item.average_rating !== null && (
              <View style={styles.ratingBadge}>
                <MaterialIcons name="star" size={14} color="#FFD700" />
                <Text style={styles.ratingText}>{item.average_rating}</Text>
              </View>
            )}
          </View>
        )}
        {item.image ? (
          <Image source={{ uri: `https://retail-alvinia-goza-f6a0e4f7.koyeb.app${item.image}` }} style={styles.shopImage} />
        ) : (
          <View style={styles.noImageContainer}>
            <Text style={styles.noImageText}>No Image</Text>
          </View>
        )}
      </View>
      <View style={styles.detailsContainer}>
        <Text style={styles.shopName}>{item.name || "Unnamed Shop"}</Text>
        <View style={styles.row}>
          <MaterialIcons name="store" size={18} color="#4CAF50" />
          <Text style={styles.shopAddress}>{item.address || "No Address"}</Text>
        </View>
        <View style={styles.row}>
          <MaterialIcons name="place" size={18} color="#555" />
          <Text style={styles.shopDistance}>
            Distance: {item.distance !== null && item.distance !== undefined ? `${item.distance} km` : "N/A"}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.goToShopButton}
        onPress={() => {
          router.push({
            pathname: '/shop/shop-page',
            params: { shopId: item.id },
          });
        }}
      >
        <Text style={styles.buttonText}>Go to Space</Text>
      </TouchableOpacity>
    </LinearGradient>
  );

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient colors={["#F5F5F5", "#E0E0E0"]} style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={26} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Search Results</Text>
          <View style={styles.headerSpacer} />
        </View>
        <TouchableOpacity onPress={handleFilterPress} style={styles.filterContainer}>
          <Ionicons name="filter-outline" size={20} color="#007BFF" style={styles.filterIcon} />
          <Text style={styles.filterText}>Filter</Text>
        </TouchableOpacity>
        <FlatList
          data={filteredResults}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderShopCard}
          ListEmptyComponent={<Text style={styles.noResults}>No shops found.</Text>}
        />
      </LinearGradient>
      <Modal visible={subscriptionModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <SubscriptionRequired onClose={() => setSubscriptionModalVisible(false)} />
            <TouchableOpacity onPress={() => setSubscriptionModalVisible(false)} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal visible={modalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior="padding" style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.filterTitle}>Filter Options</Text>
              <View style={styles.sliderContainer}>
                <Text style={styles.sliderLabel}>Min Rating: {tempMinRating.toFixed(1)}</Text>
                <Slider
                  minimumValue={0}
                  maximumValue={5}
                  step={1}
                  value={tempMinRating}
                  onValueChange={setTempMinRating}
                  style={styles.slider}
                />
              </View>
              <View style={styles.sliderContainer}>
                <Text style={styles.sliderLabel}>Max Rating: {tempMaxRating.toFixed(1)}</Text>
                <Slider
                  minimumValue={0}
                  maximumValue={5}
                  step={1}
                  value={tempMaxRating}
                  onValueChange={setTempMaxRating}
                  style={styles.slider}
                />
              </View>
              {!allDistancesNull && (
                <>
                  <View style={styles.sliderContainer}>
                    <Text style={styles.sliderLabel}>Min Distance: {tempMinDistance.toFixed(1)} km</Text>
                    <Slider
                      minimumValue={0}
                      maximumValue={50}
                      step={0.1}
                      value={tempMinDistance}
                      onValueChange={setTempMinDistance}
                      style={styles.slider}
                    />
                  </View>
                  <View style={styles.sliderContainer}>
                    <Text style={styles.sliderLabel}>Max Distance: {tempMaxDistance.toFixed(1)} km</Text>
                    <Slider
                      minimumValue={0}
                      maximumValue={50}
                      step={0.1}
                      value={tempMaxDistance}
                      onValueChange={setTempMaxDistance}
                      style={styles.slider}
                    />
                  </View>
                </>
              )}
              {allDistancesNull && (
                <Text style={styles.noDistanceText}>Distance filtering unavailable for this search.</Text>
              )}
              <View style={styles.buttonRow}>
                <TouchableOpacity onPress={resetFilters} style={styles.resetButton}>
                  <Text style={styles.resetButtonText}>Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={applyFilters} style={styles.applyButton}>
                  <Text style={styles.applyButtonText}>Apply Filters</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
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
  shopCard: {
    borderRadius: 18,
    padding: 16,
    marginVertical: 10,
    marginHorizontal: 16,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  ratingContainer: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#222",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#FFD700",
    marginLeft: 4,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3FCEF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#0FA958",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
    marginRight: 6,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#0FA958",
    marginLeft: 4,
  },
  imageContainer: {
    marginBottom: 12,
  },
  shopImage: {
    width: 110,
    height: 110,
    borderRadius: 14,
    resizeMode: "cover",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  noImageContainer: {
    width: 110,
    height: 110,
    borderRadius: 14,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  noImageText: {
    fontSize: 15,
    color: "#888",
  },
  shopName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 6,
  },
  detailsContainer: {
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  shopAddress: {
    fontSize: 15,
    color: "#444",
    marginLeft: 6,
  },
  shopDistance: {
    fontSize: 15,
    color: "#444",
    marginLeft: 6,
  },
  goToShopButton: {
    backgroundColor: "#007BFF",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 28,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#FFF",
    textTransform: "uppercase",
  },
  noResults: {
    textAlign: "center",
    fontSize: 18,
    color: "#AAA",
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalContent: {
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 16,
    width: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  closeButton: {
    marginTop: 15,
    padding: 10,
    backgroundColor: "#007BFF",
    borderRadius: 5,
    width: "60%",
    alignItems: "center",
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  filterTitle: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
    color: "#333",
  },
  sliderContainer: {
    marginBottom: 15,
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 5,
    color: "#444",
  },
  slider: {
    width: "100%",
  },
  applyButton: {
    backgroundColor: "#007BFF",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  applyButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFF",
  },
  resetButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#DC3545",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    shadowColor: "#DC3545",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  resetButtonText: {
    color: "#DC3545",
    fontSize: 16,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  filterContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    marginTop: 10,
    top: 0,
    width: "100%",
    zIndex: 10,
  },
  filterIcon: {
    marginRight: 6,
  },
  filterText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
  },
  noDistanceText: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginBottom: 10,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default (props) => (
  <SubscriptionProvider>
    <SearchResults {...props} />
  </SubscriptionProvider>
);