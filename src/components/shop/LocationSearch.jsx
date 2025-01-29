import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import axios from "axios";
import { SelectList } from "react-native-dropdown-select-list";

const LocationSearch = ({ onSearch }) => {
  const [locations, setLocations] = useState([]);
  const [childLocations, setChildLocations] = useState([]);
  const [grandChildLocations, setGrandChildLocations] = useState([]);

  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedChildLocation, setSelectedChildLocation] = useState(null);
  const [selectedGrandChildLocation, setSelectedGrandChildLocation] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    const fetchTopLevelLocations = async () => {
      try {
        const response = await axios.post("https://172.27.243.94:8000/location/states/");
        setLocations(response.data.locations.map(loc => ({ key: loc.id, value: loc.name })));
      } catch (error) {
        console.error("Error fetching locations:", error);
      }
    };
    fetchTopLevelLocations();
  }, []);

  const handleLocationChange = async (selectedOption) => {
    setSelectedLocation(selectedOption);
    setSelectedChildLocation(null);
    setSelectedGrandChildLocation(null);
    setChildLocations([]);
    setGrandChildLocations([]);

    try {
      const formData = new FormData();
      formData.append("parent_id", selectedOption);

      const response = await axios.post(
        "https://172.27.243.94:8000/location/children/",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setChildLocations(response.data.locations.map(loc => ({ key: loc.id, value: loc.name })));
    } catch (error) {
      console.error("Error fetching child locations:", error);
    }
  };

  const handleChildLocationChange = async (selectedOption) => {
    setSelectedChildLocation(selectedOption);
    setSelectedGrandChildLocation(null);
    setGrandChildLocations([]);

    try {
      const formData = new FormData();
      formData.append("parent_id", selectedOption);

      const response = await axios.post(
        "https://172.27.243.94:8000/location/children/",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setGrandChildLocations(response.data.locations.map(loc => ({ key: loc.id, value: loc.name })));
    } catch (error) {
      console.error("Error fetching grandchild locations:", error);
    }
  };

  const handleGrandChildLocationChange = (selectedOption) => {
    setSelectedGrandChildLocation(selectedOption);
  };

  const handleSearch = async () => {
    setFormErrors({});
    const locationId = selectedGrandChildLocation || selectedChildLocation || selectedLocation;

    if (!locationId) {
      setFormErrors(prev => ({ ...prev, location: "Please select a location" }));
      return;
    }
    if (!searchTerm.trim()) {
      setFormErrors(prev => ({ ...prev, searchTerm: "Please enter a search term" }));
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get("https://172.27.243.94:8000/location/search/", {
        params: { location_id: locationId, input: searchTerm.trim() }
      });

      onSearch(response.data);
    } catch (error) {
      console.error("Error fetching search results:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Search for Places</Text>

        <Text style={styles.label}>Select Location</Text>
        <SelectList
          setSelected={handleLocationChange}
          data={locations}
          placeholder="Select State"
          save="key"
          boxStyles={styles.dropdown}
        />
        {formErrors.location && <Text style={styles.error}>{formErrors.location}</Text>}

        {selectedLocation && (
          <>
            <Text style={styles.label}>Select Local Government</Text>
            <SelectList
              setSelected={handleChildLocationChange}
              data={childLocations}
              placeholder="Select LGA"
              save="key"
              boxStyles={styles.dropdown}
            />
          </>
        )}

        {selectedChildLocation && (
          <>
            <Text style={styles.label}>Select Town/Area</Text>
            <SelectList
              setSelected={handleGrandChildLocationChange}
              data={grandChildLocations}
              placeholder="Select Locality"
              save="key"
              boxStyles={styles.dropdown}
            />
          </>
        )}

        <Text style={styles.label}>Search Term</Text>
        <TextInput
          style={styles.input}
          placeholder="What are you looking for?"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        {formErrors.searchTerm && <Text style={styles.error}>{formErrors.searchTerm}</Text>}

        <TouchableOpacity style={styles.searchButton} onPress={handleSearch} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.searchButtonText}>Search</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
    textAlign: "center",
  },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#555",
    marginBottom: 6,
  },
  dropdown: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E5E7EB",
    borderRadius: 8,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#F8FAFC",
    marginBottom: 12,
    fontSize: 16,
  },
  error: {
    color: "red",
    fontSize: 12,
    marginBottom: 8,
  },
  searchButton: {
    backgroundColor: "#007bff",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  searchButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default LocationSearch;
