import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, StatusBar } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import axios from "axios";
import { Provider, Button, Switch } from "react-native-paper";
import DateTimePicker from "@react-native-community/datetimepicker";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import CheckmarkModal from "@/components/shop/ModalComponent";
import { SafeAreaView } from "react-native-safe-area-context";

interface OpeningHours {
  [key: string]: { open: string | null; close: string | null };
}

export default function WorkingHours() {
  const router = useRouter();
  const { shopId } = useLocalSearchParams<{ shopId: string }>();

  const [is24_7, setIs24_7] = useState<boolean>(false);
  const [openingHours, setOpeningHours] = useState<OpeningHours>({});
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<"open" | "close" | null>(null);
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);
  const [tempTime, setTempTime] = useState<Date>(new Date());
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [sameAsMonday, setSameAsMonday] = useState<boolean>(false);

  useEffect(() => {
    fetchWorkingHours();
  }, []);

  const fetchWorkingHours = async () => {
    try {
      const response = await axios.get(
        `https://retail-alvinia-goza-f6a0e4f7.koyeb.app/shop/${shopId}/working-hours/`
      );
      const data = response.data;

      const updatedHours: OpeningHours = {
        Monday: data.monday?.open && data.monday?.close ? data.monday : { open: null, close: null },
        Tuesday: data.tuesday?.open && data.tuesday?.close ? data.tuesday : { open: null, close: null },
        Wednesday: data.wednesday?.open && data.wednesday?.close ? data.wednesday : { open: null, close: null },
        Thursday: data.thursday?.open && data.thursday?.close ? data.thursday : { open: null, close: null },
        Friday: data.friday?.open && data.friday?.close ? data.friday : { open: null, close: null },
        Saturday: data.saturday?.open && data.saturday?.close ? data.saturday : { open: null, close: null },
        Sunday: data.sunday?.open && data.sunday?.close ? data.sunday : { open: null, close: null },
      };

      setIs24_7(data.is_24_7 || false); // Ensure is_24_7 is boolean
      setOpeningHours(updatedHours);
    } catch (error) {
      console.error("Error fetching working hours:", error);
    }
  };

  const updateWorkingHours = async () => {
    try {
      const formattedHours = {
        is_24_7: is24_7, // Explicitly include is_24_7
        monday: {
          open: openingHours.Monday?.open || null,
          close: openingHours.Monday?.close || null,
          closed: !openingHours.Monday?.open && !openingHours.Monday?.close,
        },
        tuesday: {
          open: openingHours.Tuesday?.open || null,
          close: openingHours.Tuesday?.close || null,
          closed: !openingHours.Tuesday?.open && !openingHours.Tuesday?.close,
        },
        wednesday: {
          open: openingHours.Wednesday?.open || null,
          close: openingHours.Wednesday?.close || null,
          closed: !openingHours.Wednesday?.open && !openingHours.Wednesday?.close,
        },
        thursday: {
          open: openingHours.Thursday?.open || null,
          close: openingHours.Thursday?.close || null,
          closed: !openingHours.Thursday?.open && !openingHours.Thursday?.close,
        },
        friday: {
          open: openingHours.Friday?.open || null,
          close: openingHours.Friday?.close || null,
          closed: !openingHours.Friday?.open && !openingHours.Friday?.close,
        },
        saturday: {
          open: openingHours.Saturday?.open || null,
          close: openingHours.Saturday?.close || null,
          closed: !openingHours.Saturday?.open && !openingHours.Saturday?.close,
        },
        sunday: {
          open: openingHours.Sunday?.open || null,
          close: openingHours.Sunday?.close || null,
          closed: !openingHours.Sunday?.open && !openingHours.Sunday?.close,
        },
      };

      console.log("Sending formattedHours:", JSON.stringify(formattedHours, null, 2)); // Debug payload

      await axios.post(
        `https://retail-alvinia-goza-f6a0e4f7.koyeb.app/shop/${shopId}/working-hours/`,
        formattedHours
      );
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 2000);
    } catch (error) {
      console.error("Error updating working hours:", error);
    }
  };

  const handleConfirmTime = (event: any, selectedDate?: Date) => {
    console.log("DateTimePicker event:", event.type, selectedDate); // Debug
    setShowTimePicker(Platform.OS === "ios"); // Keep visible on iOS, hide on Android
    if (selectedDate && selectedDay && selectedType) {
      // Adjust for WAT (UTC+1) by adding 1 hour to avoid 1969 dates
      const adjustedDate = new Date(selectedDate.getTime() + 1 * 60 * 60 * 1000);
      const hours = adjustedDate.getUTCHours().toString().padStart(2, "0");
      const minutes = adjustedDate.getUTCMinutes().toString().padStart(2, "0");
      const newTime = `${hours}:${minutes}:00`;
      setOpeningHours((prev) => ({
        ...prev,
        [selectedDay]: {
          ...prev[selectedDay],
          [selectedType]: newTime,
        },
      }));
    }
  };

  const applySameAsMonday = () => {
    console.log("applySameAsMonday called"); // Debug
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

  const toggleClosed = (day: string) => {
    console.log("toggleClosed called for:", day); // Debug
    setOpeningHours((prev) => ({
      ...prev,
      [day]: prev[day]?.open || prev[day]?.close ? { open: null, close: null } : { open: "09:00:00", close: "17:00:00" },
    }));
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor='#2563EB' />
      <ScrollView>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={26} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Shop Profile</Text>
          <View style={styles.headerSpacer} />
        </View>
        <Provider>
          <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.heading}>
              <Text style={styles.label}>24/7 Open</Text>
              <Switch value={is24_7} onValueChange={() => setIs24_7(!is24_7)} />
            </View>

            {!is24_7 && (
              <>
                <Button
                  mode="outlined"
                  onPress={() => {
                    console.log("Same as Monday button clicked"); // Debug
                    applySameAsMonday();
                  }}
                  style={styles.sameAsMondayButton}
                  labelStyle={styles.buttonLabel}
                >
                  Same as Monday
                </Button>
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
                          style={[styles.timeButton, isClosed && styles.disabledButton]}
                          onPress={() => {
                            console.log("Open time button clicked for:", day); // Debug
                            if (!isClosed) {
                              setSelectedDay(day);
                              setSelectedType("open");
                              setTempTime(
                                openingHours[day]?.open
                                  ? new Date(`1970-01-01T${openingHours[day].open}`)
                                  : new Date()
                              );
                              setShowTimePicker(true);
                            }
                          }}
                          disabled={isClosed}
                        >
                          <Text style={isClosed ? styles.disabledText : styles.timeText}>
                            {openingHours[day]?.open || "Select Time"}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.timeButton, isClosed && styles.disabledButton]}
                          onPress={() => {
                            console.log("Close time button clicked for:", day); // Debug
                            if (!isClosed) {
                              setSelectedDay(day);
                              setSelectedType("close");
                              setTempTime(
                                openingHours[day]?.close
                                  ? new Date(`1970-01-01T${openingHours[day].close}`)
                                  : new Date()
                              );
                              setShowTimePicker(true);
                            }
                          }}
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

            {showTimePicker && (
              <DateTimePicker
                value={tempTime}
                mode="time"
                is24Hour={true}
                onChange={handleConfirmTime}
                minuteInterval={15}
                display={Platform.OS === "ios" ? "spinner" : "default"}
              />
            )}
            <Button
              mode="contained"
              onPress={updateWorkingHours}
              style={styles.updateButton}
              labelStyle={[styles.buttonLabel, { color: "#FFFFFF" }]}
            >
              Save Changes
            </Button>
            <CheckmarkModal visible={showSuccessModal} message="Working hours updated!" />
          </ScrollView>
        </Provider>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: "#F9FAFB",
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
  heading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2A44",
    fontFamily: "System",
  },
  dayContainer: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  closedDay: {
    backgroundColor: "#FFF1F1",
  },
  closedDayText: {
    color: "#EF4444",
    fontWeight: "600",
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2A44",
    marginBottom: 8,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  timeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  disabledButton: {
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
    opacity: 0.6,
  },
  timeText: {
    fontSize: 14,
    color: "#374151",
    textAlign: "center",
  },
  disabledText: {
    color: "#9CA3AF",
    fontSize: 14,
    textAlign: "center",
  },
  updateButton: {
    marginTop: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#3A7BD5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  sameAsMondayButton: {
    borderRadius: 8,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    marginBottom: 16,
  },
  buttonLabel: {
    fontWeight: "600",
  },
});