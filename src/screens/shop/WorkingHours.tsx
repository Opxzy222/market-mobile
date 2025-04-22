import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router"; 
import axios from "axios";
import { Provider, Button, Switch } from "react-native-paper";
import { TimePickerModal } from "react-native-paper-dates";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import CheckmarkModal from "@/components/shop/ModalComponent";

export default function WorkingHours() {
  const router = useRouter();
  const { shopId } = useLocalSearchParams();
  
  const [is24_7, setIs24_7] = useState(false);
  const [openingHours, setOpeningHours] = useState({});
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [sameAsMonday, setSameAsMonday] = useState(false);

  useEffect(() => {
    fetchWorkingHours();
  }, []);

  const fetchWorkingHours = async () => {
  try {
    const response = await axios.get(`https://retail-alvinia-goza-f6a0e4f7.koyeb.app/shop/${shopId}/working-hours/`);
    const data = response.data;

    const updatedHours = {
      Monday: data.monday?.open && data.monday?.close ? data.monday : { open: null, close: null },
      Tuesday: data.tuesday?.open && data.tuesday?.close ? data.tuesday : { open: null, close: null },
      Wednesday: data.wednesday?.open && data.wednesday?.close ? data.wednesday : { open: null, close: null },
      Thursday: data.thursday?.open && data.thursday?.close ? data.thursday : { open: null, close: null },
      Friday: data.friday?.open && data.friday?.close ? data.friday : { open: null, close: null },
      Saturday: data.saturday?.open && data.saturday?.close ? data.saturday : { open: null, close: null },
      Sunday: data.sunday?.open && data.sunday?.close ? data.sunday : { open: null, close: null },
    };

    setIs24_7(data.is_24_7);
    setOpeningHours(updatedHours);
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
          [`${day.toLowerCase()}_closed`, !times?.open && !times?.close] // Always include the closed flag
        ])
      ),
    };

    await axios.post(`https://retail-alvinia-goza-f6a0e4f7.koyeb.app/shop/${shopId}/working-hours/`, formattedHours);
    setShowSuccessModal(true);
    setTimeout(() => setShowSuccessModal(false), 2000);
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

  const applySameAsMonday = () => {
    if (openingHours.Monday) {
      setOpeningHours((prev) => {
        const updatedHours = { ...prev };
        Object.keys(updatedHours).forEach((day) => {
          if (day !== "Monday") {
            updatedHours[day] = { ...prev.Monday };
          }
        });
        return updatedHours;
      });
      setSameAsMonday(true);
    }
  };

  const toggleClosed = (day) => {
    setOpeningHours((prev) => ({
      ...prev,
      [day]: prev[day]?.open || prev[day]?.close ? { open: null, close: null } : { open: "09:00:00", close: "17:00:00" },
    }));
  };

  return (
    <ScrollView>
    <View>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#007BFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Shop Profile</Text>
      </View>
      <Provider>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.heading}>
            <Text style={styles.label}>24/7 Open</Text>
            <Switch value={is24_7} onValueChange={() => setIs24_7(!is24_7)} />
          </View>

          {!is24_7 && (
            <>
              <Button mode="outlined" onPress={applySameAsMonday}>Same as Monday</Button>
              {Object.keys(openingHours).map((day) => {
                const isClosed = !openingHours[day]?.open && !openingHours[day]?.close;
                return (
                  <View key={day} style={[styles.dayContainer, isClosed && styles.closedDay]}>
                    <Text style={[styles.dayLabel, isClosed && styles.closedDayText]}>
                      {day} {isClosed ? "(Closed)" : ""}
                    </Text>
                    <Switch value={isClosed} onValueChange={() => toggleClosed(day)} />
                    <View style={styles.timeRow}>
                      <TouchableOpacity 
                        style={styles.timeButton} 
                        onPress={() => { setSelectedDay(day); setSelectedType("open"); setShowTimePicker(true); }}
                        disabled={isClosed}
                      >
                        <Text style={isClosed ? styles.disabledText : styles.timeText}>
                          {openingHours[day]?.open || "Select Time"}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.timeButton} 
                        onPress={() => { setSelectedDay(day); setSelectedType("close"); setShowTimePicker(true); }}
                        disabled={isClosed}
                      >
                        <Text style={isClosed ? styles.disabledText : styles.timeText}>
                          {openingHours[day]?.close || "Select Time"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </>
          )}

          <TimePickerModal visible={showTimePicker} onDismiss={() => setShowTimePicker(false)} onConfirm={handleConfirmTime} />
          <Button mode="contained" onPress={updateWorkingHours} style={styles.updateButton}>Save Changes</Button>
          <CheckmarkModal visible={showSuccessModal} message="Working hours updated!" />
        </ScrollView>
      </Provider>
    </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  header: { 
    flexDirection: "row", 
    alignItems: "center", 
    padding: 16, 
    backgroundColor: "rgba(255, 255, 255, 0.3)", 
    elevation: 3, 
    borderBottomLeftRadius: 20, 
    borderBottomRightRadius: 20, 
    marginBottom: 20 
  },
  headerTitle: { fontSize: 22, fontWeight: "bold", marginLeft: 75, color: "black" },
  backButton: { borderRadius: 50, backgroundColor: "#E0E0E0", marginRight: 12 },
  heading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  label: { fontSize: 16, fontWeight: "bold" },
  dayContainer: { 
    marginTop: 10, 
    padding: 10, 
    borderRadius: 8, 
    backgroundColor: "white" 
  },
  closedDay: { backgroundColor: "#ffebee" },
  closedDayText: { color: "#d32f2f", fontWeight: "bold" },
  dayLabel: { fontSize: 16 },
  timeRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  timeButton: { padding: 8, borderRadius: 4 },
  timeText: { fontSize: 14 },
  disabledText: { color: "gray" },
  updateButton: { marginTop: 20 },
});

