import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, StatusBar, Modal } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import api from '../../api';
import { Provider, Button, Switch } from "react-native-paper";
import DatePicker from "react-native-date-picker";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { SafeAreaView } from "react-native-safe-area-context";

// Adjust the import path for CheckmarkModal based on your project structure
import CheckmarkModal from "@/components/shop/ModalComponent";

interface OpeningHours {
  [key: string]: { open: string | null; close: string | null };
}

export default function WorkingHours() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const shopId = typeof params.shopId === "string" ? params.shopId : undefined;

  const [is24_7, setIs24_7] = useState<boolean>(false);
  const [openingHours, setOpeningHours] = useState<OpeningHours>({});
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<"open" | "close" | null>(null);
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);
  const [tempTime, setTempTime] = useState<Date>(new Date());
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [sameAsMonday, setSameAsMonday] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (shopId) {
      fetchWorkingHours();
    }
  }, [shopId]);

  useEffect(() => {
    console.log("showTimePicker changed:", showTimePicker);
  }, [showTimePicker]);

  useEffect(() => {
    console.log("is24_7 changed:", is24_7);
  }, [is24_7]);

  const fetchWorkingHours = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/shop/${shopId}/working-hours/`
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

      setIs24_7(data.is_24_7 || false);
      setOpeningHours(updatedHours);
    } catch (error) {
      console.error("Error fetching working hours:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateWorkingHours = async () => {
    if (!shopId) return;
    setIsLoading(true);
    try {
      const formattedHours = {
        is_24_7: is24_7,
        monday: {
          open: is24_7 ? null : openingHours.Monday?.open || null,
          close: is24_7 ? null : openingHours.Monday?.close || null,
          closed: is24_7 ? false : !openingHours.Monday?.open && !openingHours.Monday?.close,
        },
        tuesday: {
          open: is24_7 ? null : openingHours.Tuesday?.open || null,
          close: is24_7 ? null : openingHours.Tuesday?.close || null,
          closed: is24_7 ? false : !openingHours.Tuesday?.open && !openingHours.Tuesday?.close,
        },
        wednesday: {
          open: is24_7 ? null : openingHours.Wednesday?.open || null,
          close: is24_7 ? null : openingHours.Wednesday?.close || null,
          closed: is24_7 ? false : !openingHours.Wednesday?.open && !openingHours.Wednesday?.close,
        },
        thursday: {
          open: is24_7 ? null : openingHours.Thursday?.open || null,
          close: is24_7 ? null : openingHours.Thursday?.close || null,
          closed: is24_7 ? false : !openingHours.Thursday?.open && !openingHours.Thursday?.close,
        },
        friday: {
          open: is24_7 ? null : openingHours.Friday?.open || null,
          close: is24_7 ? null : openingHours.Friday?.close || null,
          closed: is24_7 ? false : !openingHours.Friday?.open && !openingHours.Friday?.close,
        },
        saturday: {
          open: is24_7 ? null : openingHours.Saturday?.open || null,
          close: is24_7 ? null : openingHours.Saturday?.close || null,
          closed: is24_7 ? false : !openingHours.Saturday?.open && !openingHours.Saturday?.close,
        },
        sunday: {
          open: is24_7 ? null : openingHours.Sunday?.open || null,
          close: is24_7 ? null : openingHours.Sunday?.close || null,
          closed: is24_7 ? false : !openingHours.Sunday?.open && !openingHours.Sunday?.close,
        },
      };

      console.log("Sending formattedHours:", JSON.stringify(formattedHours, null, 2));
      await api.post(
        `/shop/${shopId}/working-hours/`,
        formattedHours
      );
      setShowSuccessModal(true);
      setTimeout(() => setShowSuccessModal(false), 2000);
    } catch (error) {
      console.error("Error updating working hours:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmTime = useCallback((selectedDate: Date) => {
    console.log("DatePicker selectedDate:", selectedDate);
    if (selectedDate && selectedDay && selectedType) {
      const adjustedDate = new Date(selectedDate.getTime() + 1 * 60 * 60 * 1000); // Adjust for WAT (UTC+1)
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
    setShowTimePicker(false);
  }, [selectedDay, selectedType]);

  const parseTimeToDate = (timeString: string | null): Date => {
    if (!timeString || !/^\d{2}:\d{2}:\d{2}$/.test(timeString)) {
      return new Date(new Date().setHours(9, 0, 0, 0));
    }
    return new Date(`1970-01-01T${timeString}Z`);
  };

  const applySameAsMonday = () => {
    console.log("applySameAsMonday called");
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
    console.log("toggleClosed called for:", day);
    setOpeningHours((prev) => ({
      ...prev,
      [day]: prev[day]?.open || prev[day]?.close ? { open: null, close: null } : { open: "09:00:00", close: "17:00:00" },
    }));
  };

  if (!shopId) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.container}>
          <Text style={styles.errorText}>Error: Shop ID not provided.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor="#3A7BD5" />
      <ScrollView scrollEnabled={!showTimePicker}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={26} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Shop Profile</Text>
          <View style={styles.headerSpacer} />
        </View>
        <Provider>
          <ScrollView contentContainerStyle={styles.container} scrollEnabled={!showTimePicker}>
            {isLoading && (
              <View style={styles.loadingContainer}>
                <Text style={styles.infoText}>Loading...</Text>
              </View>
            )}
            <View style={styles.heading}>
              <Text style={styles.label}>24/7 Open</Text>
              <Switch
                value={is24_7}
                onValueChange={() => {
                  setIs24_7(!is24_7);
                  if (!is24_7) {
                    setOpeningHours({
                      Monday: { open: null, close: null },
                      Tuesday: { open: null, close: null },
                      Wednesday: { open: null, close: null },
                      Thursday: { open: null, close: null },
                      Friday: { open: null, close: null },
                      Saturday: { open: null, close: null },
                      Sunday: { open: null, close: null },
                    });
                  }
                }}
              />
            </View>

            {is24_7 ? (
              <View style={styles.infoContainer}>
                <Text style={styles.infoText}>Business is open 24/7. No specific hours needed.</Text>
              </View>
            ) : (
              <>
                <Button
                  mode="outlined"
                  onPress={() => {
                    console.log("Same as Monday button clicked");
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
                            console.log("Open time button clicked for:", day);
                            if (!isClosed) {
                              setSelectedDay(day);
                              setSelectedType("open");
                              setTempTime(
                                openingHours[day]?.open
                                  ? parseTimeToDate(openingHours[day].open)
                                  : new Date(new Date().setHours(9, 0, 0, 0))
                              );
                              setShowTimePicker(true);
                              console.log("showTimePicker set to true for open");
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
                            console.log("Close time button clicked for:", day);
                            if (!isClosed) {
                              setSelectedDay(day);
                              setSelectedType("close");
                              setTempTime(
                                openingHours[day]?.close
                                  ? parseTimeToDate(openingHours[day].close)
                                  : new Date(new Date().setHours(17, 0, 0, 0))
                              );
                              setShowTimePicker(true);
                              console.log("showTimePicker set to true for close");
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

            <Modal
              visible={showTimePicker}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setShowTimePicker(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.datePickerContainer}>
                  <DatePicker
                    date={tempTime}
                    mode="time"
                    is24Hour={true}
                    onDateChange={setTempTime}
                    minuteInterval={5}
                    theme="auto"
                  />
                  <View style={styles.modalButtonContainer}>
                    <Button
                      mode="contained"
                      onPress={() => handleConfirmTime(tempTime)}
                      style={[styles.modalButton, styles.confirmButton]}
                      labelStyle={styles.buttonLabel}
                    >
                      Confirm
                    </Button>
                    <Button
                      mode="outlined"
                      onPress={() => setShowTimePicker(false)}
                      style={[styles.modalButton, styles.cancelButton]}
                      labelStyle={styles.buttonLabel}
                    >
                      Cancel
                    </Button>
                  </View>
                </View>
              </View>
            </Modal>

            <Button
              mode="contained"
              onPress={updateWorkingHours}
              style={styles.updateButton}
              labelStyle={[styles.buttonLabel, { color: "#FFFFFF" }]}
              disabled={isLoading}
              loading={isLoading}
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
    padding: 20,
    backgroundColor: "#F0F4F8",
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
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: "#10B981",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C2526",
    fontFamily: "System",
  },
  dayContainer: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: "#3B82F6",
  },
  closedDay: {
    backgroundColor: "#FFF1F1",
    borderLeftColor: "#EF4444",
  },
  closedDayText: {
    color: "#EF4444",
    fontWeight: "600",
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C2526",
    marginBottom: 12,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  timeButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#F1F5F9",
    borderColor: "#D1D5DB",
    opacity: 0.7,
  },
  timeText: {
    fontSize: 14,
    color: "#1C2526",
    fontWeight: "500",
    textAlign: "center",
  },
  disabledText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  updateButton: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#10B981",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  sameAsMondayButton: {
    borderRadius: 12,
    borderColor: "#BFDBFE",
    backgroundColor: "#FFFFFF",
    marginBottom: 20,
    paddingVertical: 10,
    borderWidth: 2,
  },
  buttonLabel: {
    fontWeight: "600",
    fontSize: 15,
    color: "#1C2526",
  },
  infoContainer: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: "#10B981",
  },
  infoText: {
    fontSize: 15,
    color: "#1C2526",
    fontWeight: "500",
  },
  errorText: {
    fontSize: 15,
    color: "#EF4444",
    textAlign: "center",
    marginTop: 20,
    fontWeight: "500",
  },
  loadingContainer: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: "#FBBF24",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  datePickerContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  modalButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    width: "100%",
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 8,
    borderRadius: 10,
  },
  confirmButton: {
    backgroundColor: "#10B981",
  },
  cancelButton: {
    borderColor: "#BFDBFE",
    borderWidth: 2,
  },
});