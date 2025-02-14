import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { 
  View, 
  Text, 
  Image, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  Modal, 
  TextInput, 
  Button,
  ActivityIndicator
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { format } from "date-fns";
import StatusViewer from "../../components/shop/ShopStatusViewer";

const BACKEND_URL = "https://172.27.243.94:8000";

const StatusScreen = () => {
  const [statuses, setStatuses] = useState([]);
  const [isPosting, setIsPosting] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentStatusIndex, setCurrentStatusIndex] = useState(null);

  const params = useLocalSearchParams();
  const { shopId } = params;

  useEffect(() => {
    fetchStatuses();
  }, [shopId]);

  useFocusEffect(
    useCallback(() => {
      fetchStatuses();
    }, [shopId])
  );

  const fetchStatuses = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/shop/${shopId}/active_status/`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      setStatuses(data.statuses || []);
    } catch (error) {
      console.error("Error fetching statuses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostStatus = async () => {
    if (!statusText) return;
    try {
      const formData = new FormData();
      formData.append("text", statusText);
      await fetch(`${BACKEND_URL}/shop/${shopId}/status/`, {
        method: "POST",
        body: formData,
      });
      setStatusText("");
      setIsPosting(false);
      fetchStatuses(); 
    } catch (error) {
      console.error("Error posting status:", error);
    }
  };

  const handleViewStatus = (index) => {
    setCurrentStatusIndex(index);
  };

  const handleCloseViewer = () => {
    setCurrentStatusIndex(null);
  };

  const renderStatusItem = ({ item, index }) => (
    <TouchableOpacity onPress={() => handleViewStatus(index)} style={styles.statusItem}>
      <Image source={{ uri: item.image }} style={[styles.avatar, styles.unreadBorder]} />
      <View>
        <Text style={styles.name}>{item.shop}</Text>
        <Text style={styles.time}>{format(new Date(item.created_at), "MMMM d, h:mm a")}</Text>
        <Text style={styles.views}>Views: {item.views_count}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Status</Text>

      {/* My Status */}
      <TouchableOpacity style={styles.myStatus} onPress={() => setIsPosting(true)}>
        <Image source={{ uri: "https://randomuser.me/api/portraits/lego/1.jpg" }} style={styles.avatar} />
        <View>
          <Text style={styles.name}>My Status</Text>
          <Text style={styles.time}>{statuses.length > 0 ? "Tap to view" : "No updates"}</Text>
        </View>
      </TouchableOpacity>

      {/* Recent Updates */}
      <Text style={styles.subHeader}>Recent Updates</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#25D366" />
      ) : (
        <FlatList 
          data={statuses} 
          renderItem={renderStatusItem}
          keyExtractor={(item) => item.id.toString()} 
        />
      )}

      {/* Modal for posting a new status */}
      <Modal visible={isPosting} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>Post a new status</Text>
            <TextInput
              style={styles.textInput}
              placeholder="What's on your mind?"
              value={statusText}
              onChangeText={setStatusText}
            />
            <View style={styles.buttonRow}>
              <Button title="Cancel" onPress={() => setIsPosting(false)} />
              <Button title="Post" onPress={handlePostStatus} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Status Viewer Modal */}
      {currentStatusIndex !== null && (
        <StatusViewer 
          statuses={statuses} 
          initialIndex={currentStatusIndex} 
          onClose={handleCloseViewer} 
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 15 },
  header: { fontSize: 22, fontWeight: "bold", marginBottom: 10 },
  myStatus: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  subHeader: { fontSize: 18, fontWeight: "600", marginVertical: 10 },
  statusItem: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  avatar: { width: 50, height: 50, borderRadius: 50, marginRight: 10 },
  unreadBorder: { borderWidth: 2, borderColor: "#25D366" },
  name: { fontSize: 16, fontWeight: "bold" },
  time: { fontSize: 14, color: "gray" },
  views: { fontSize: 12, color: "gray" },
  modalContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: { width: "80%", backgroundColor: "#fff", padding: 20, borderRadius: 10 },
  modalHeader: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  textInput: { borderWidth: 1, borderColor: "#ccc", borderRadius: 5, padding: 10, width: "100%", marginBottom: 10 },
  buttonRow: { flexDirection: "row", justifyContent: "space-between" }
});

export default StatusScreen;
