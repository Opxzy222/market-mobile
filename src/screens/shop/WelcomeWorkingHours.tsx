import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router"; 
import axios from "axios";
import { Provider, Button, Switch } from "react-native-paper";
import { TimePickerModal } from "react-native-paper-dates";
import { Ionicons } from "@expo/vector-icons";
import CheckmarkModal from "@/components/shop/ModalComponent";
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeWorkingHours() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { shopId } = params;
  
  const [is24_7, setIs24_7] = useState(false);
  const [expandedDay, setExpandedDay] = useState(null);
  const [openingHours, setOpeningHours] = useState({});
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    fetchWorkingHours();
  }, []);

  const fetchWorkingHours = async () => {
    try {
      const response = await axios.get(`https://127.0.0.1:8000/shop/${shopId}/working-hours/`);
      const data = response.data;
      setIs24_7(data.is_24_7);
      setOpeningHours({
        Monday: data.monday,
        Tuesday: data.tuesday,
        Wednesday: data.wednesday,
        Thursday: data.thursday,
        Friday: data.friday,
        Saturday: data.saturday,
        Sunday: data.sunday,
      });
    } catch (error) {
      console.error("Error fetching working hours:", error);
    }
  };

  const updateWorkingHours = async () => {
  try {
    const formattedHours = {
      is_24_7: is24_7,
      ...Object.fromEntries(
        Object.entries(openingHours).flatMap(([day, times]) => [
          [`${day.toLowerCase()}_open`, times?.open || null],
          [`${day.toLowerCase()}_close`, times?.close || null],
        ])
      ),
    };

    await axios.post(`https://127.0.0.1:8000/shop/${shopId}/working-hours/`, formattedHours);

    // Show success modal
    setShowSuccessModal(true);

    // Navigate after modal has been shown for 2 seconds
    setTimeout(() => {
      setShowSuccessModal(false);
      router.push({ pathname: "/shop/UpdateProduct", params: { shop_id: shopId } });
    }, 2000);

  } catch (error) {
    console.error("Error updating working hours:", error);
  }
};

  const handleConfirmTime = ({ hours, minutes }) => {
    if (selectedDay && selectedType) {
      const newTime = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00`;
      setOpeningHours((prev) => ({
        ...prev,
        [selectedDay]: {
          ...prev[selectedDay],
          [selectedType]: newTime,
        },
      }));
    }
    setShowTimePicker(false);
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
    <Provider>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.label}>24/7 Open</Text>
          <Switch value={is24_7} onValueChange={() => setIs24_7(!is24_7)} />
        </View>

        {!is24_7 && (
          <>
            <Button mode="outlined" onPress={() => setExpandedDay(expandedDay ? null : "all")}>
              {expandedDay ? "Hide Opening Hours" : "Set Opening Hours"}
            </Button>

            {expandedDay && Object.keys(openingHours).map((day) => (
              <View key={day} style={styles.dayContainer}>
                <TouchableOpacity style={styles.dayHeader} onPress={() => setExpandedDay(expandedDay === day ? null : day)}>
                  <Text style={styles.dayLabel}>{day}</Text>
                  <Ionicons name={expandedDay === day ? "chevron-up" : "chevron-down"} size={18} color="black" />
                </TouchableOpacity>

                {expandedDay === day && (
                  <View style={styles.timeRow}>
                    <TouchableOpacity onPress={() => { setSelectedDay(day); setSelectedType("open"); setShowTimePicker(true); }}>
                      <Text>{openingHours[day]?.open || "Select Time"}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { setSelectedDay(day); setSelectedType("close"); setShowTimePicker(true); }}>
                      <Text>{openingHours[day]?.close || "Select Time"}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </>
        )}

        <TimePickerModal visible={showTimePicker} onDismiss={() => setShowTimePicker(false)} onConfirm={handleConfirmTime} />
        <Button mode="contained" onPress={updateWorkingHours} style={styles.updateButton}>Save Changes</Button>

        {/* Success Checkmark Modal */}
        <CheckmarkModal visible={showSuccessModal} message="Working hours updated!" />
      </View>
    </Provider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  label: { fontSize: 16, fontWeight: "bold" },
  dayContainer: { marginTop: 10 },
  dayHeader: { flexDirection: "row", justifyContent: "space-between", padding: 10, backgroundColor: "#f0f0f0" },
  dayLabel: { fontSize: 16 },
  timeRow: { flexDirection: "row", justifyContent: "space-around", marginTop: 10 },
  updateButton: { marginTop: 20 },
});
