import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, Vibration, View } from "react-native";
import MapView, { Marker, Polygon } from "react-native-maps";

const GOOGLE_MAPS_API_KEY = "AIzaSyCH19VklE4PFysGcHqp7Qc0gwr8PDeulEs";

export default function HomeScreen() {
  const [userLocation, setUserLocation] = useState<any>(null);
  const [statusText, setStatusText] = useState("");
  const [daysInside, setDaysInside] = useState(0);
  const [locationName, setLocationName] = useState("");
  const [searchResult, setSearchResult] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchedLocation, setSearchedLocation] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResultPicker, setShowResultPicker] = useState(false);

  // Sacred Kasi Inner Boundary (Compact - core sacred area only)
  // This is the inner sacred zone, NOT the full Panchkroshi route
  // Panchkroshi route is the OUTER boundary walked by pilgrims
  const kasiBoundary = [
    { latitude: 25.3300, longitude: 83.0050 }, // North
    { latitude: 25.3200, longitude: 83.0200 }, // Northeast
    { latitude: 25.3100, longitude: 83.0250 }, // East
    { latitude: 25.3000, longitude: 83.0200 }, // Southeast
    { latitude: 25.2950, longitude: 83.0050 }, // South
    { latitude: 25.3000, longitude: 82.9900 }, // Southwest
    { latitude: 25.3100, longitude: 82.9800 }, // West
    { latitude: 25.3200, longitude: 82.9900 }, // Northwest
  ];

  function isInside(point: any, vs: any) {
    let x = point.latitude,
      y = point.longitude;
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      let xi = vs[i].latitude,
        yi = vs[i].longitude;
      let xj = vs[j].latitude,
        yj = vs[j].longitude;

      let intersect =
        yi > y !== yj > y &&
        x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

      if (intersect) inside = !inside;
    }
    return inside;
  }

  const incrementDayCounter = async () => {
    const today = new Date().toDateString();
    const lastDate = await AsyncStorage.getItem("lastDate");

    if (lastDate !== today) {
      let count =
        parseInt((await AsyncStorage.getItem("daysInside")) || "0") || 0;
      count++;
      await AsyncStorage.setItem("daysInside", count.toString());
      await AsyncStorage.setItem("lastDate", today);
      setDaysInside(count);
    } else {
      let count =
        parseInt((await AsyncStorage.getItem("daysInside")) || "0") || 0;
      setDaysInside(count);
    }
  };

  const getLiveLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Location permission required");
      return;
    }

    let location = await Location.getCurrentPositionAsync({});
    const point = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };

    setUserLocation(point);

    const inside = isInside(point, kasiBoundary);

    if (inside) {
      setStatusText("🕉️ You are inside Sacred Kasi Limits");
      await incrementDayCounter();
    } else {
      setStatusText("⚠️ Outside Sacred Kasi Boundary!");
      Vibration.vibrate(1200);
    }
  };

  const searchLocationByName = async () => {
    if (!locationName.trim()) {
      Alert.alert("Please enter a location name");
      return;
    }

    setIsSearching(true);
    setSearchResult("");
    setSearchedLocation(null);
    setSearchResults([]);

    try {
      // Try Google Places API first
      const query = encodeURIComponent(locationName);
      const googleUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}+Varanasi&key=${GOOGLE_MAPS_API_KEY}&region=in`;
      
      const response = await fetch(googleUrl);
      const data = await response.json();

      if (data.status === "OK" && data.results && data.results.length > 0) {
        const results = data.results.slice(0, 5).map((place: any) => ({
          lat: place.geometry.location.lat,
          lon: place.geometry.location.lng,
          display_name: `${place.name}, ${place.formatted_address}`,
          name: place.name
        }));

        if (results.length === 1) {
          selectLocation(results[0]);
        } else {
          setSearchResults(results);
          setShowResultPicker(true);
        }
      } else {
        // Fallback to OpenStreetMap
        const osmResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${query}+Varanasi&format=json&limit=5`,
          {
            headers: {
              'User-Agent': 'KasiPanchkroshApp/1.0'
            }
          }
        );
        const osmData = await osmResponse.json();

        if (osmData && osmData.length > 0) {
          if (osmData.length === 1) {
            selectLocation(osmData[0]);
          } else {
            setSearchResults(osmData);
            setShowResultPicker(true);
          }
        } else {
          setSearchResult("❌ Location not found. Try: temple name, ghat name, or area name.");
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to search location: " + error);
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  const selectLocation = (location: any) => {
    const point = {
      latitude: parseFloat(location.lat),
      longitude: parseFloat(location.lon),
    };

    setSearchedLocation(point);
    setShowResultPicker(false);

    const inside = isInside(point, kasiBoundary);

    if (inside) {
      setSearchResult(
        `✅ ${location.display_name}\n\nIS within the Sacred Kasi Boundary!`
      );
    } else {
      setSearchResult(
        `⚠️ ${location.display_name}\n\nis OUTSIDE the Sacred Kasi Boundary.`
      );
    }
  };

  useEffect(() => {
    (async () => {
      let count =
        parseInt((await AsyncStorage.getItem("daysInside")) || "0") || 0;
      setDaysInside(count);
    })();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <Text style={styles.title}>🕉 Kasi Sacred Boundary</Text>

        <TouchableOpacity style={styles.button} onPress={getLiveLocation}>
          <Text style={styles.buttonText}>Check My Location</Text>
        </TouchableOpacity>

        <Text style={styles.status}>{statusText}</Text>
        <Text style={styles.counter}>Days Inside: {daysInside}</Text>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.input}
            placeholder="Search location..."
            value={locationName}
            onChangeText={setLocationName}
            onSubmitEditing={searchLocationByName}
          />
          {locationName.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                setLocationName("");
                setSearchResult("");
                setSearchedLocation(null);
                setSearchResults([]);
                setShowResultPicker(false);
              }}
            >
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity 
          style={[styles.button, styles.searchButton]} 
          onPress={searchLocationByName}
          disabled={isSearching}
        >
          {isSearching ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Search</Text>
          )}
        </TouchableOpacity>

        {searchResult ? (
          <Text style={styles.resultText}>{searchResult}</Text>
        ) : null}

        {showResultPicker && searchResults.length > 0 && (
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerTitle}>Select the correct location:</Text>
            {searchResults.map((result, index) => (
              <TouchableOpacity
                key={index}
                style={styles.pickerItem}
                onPress={() => selectLocation(result)}
              >
                <Text style={styles.pickerText} numberOfLines={2}>{result.display_name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 25.3109,
          longitude: 83.0107,
          latitudeDelta: 0.35,
          longitudeDelta: 0.35,
        }}
        showsUserLocation={true}
      >
        <Polygon
          coordinates={kasiBoundary}
          strokeColor="red"
          fillColor="rgba(255,0,0,0.2)"
          strokeWidth={3}
        />
        {userLocation && <Marker coordinate={userLocation} title="Your Location" pinColor="blue" />}
        {searchedLocation && (
          <Marker 
            coordinate={searchedLocation} 
            title="Searched Location" 
            pinColor="green"
          />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topSection: {
    backgroundColor: "white",
    paddingBottom: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 45,
    marginBottom: 10,
  },
  button: {
    backgroundColor: "#4B0082",
    margin: 15,
    marginTop: 5,
    marginBottom: 5,
    padding: 12,
    borderRadius: 10,
  },
  searchButton: {
    backgroundColor: "#FF6347",
  },
  buttonText: {
    color: "white",
    textAlign: "center",
    fontWeight: "bold",
  },
  status: {
    textAlign: "center",
    fontSize: 14,
    marginVertical: 3,
  },
  counter: {
    textAlign: "center",
    fontSize: 14,
    marginBottom: 8,
    fontWeight: "bold",
  },
  searchContainer: {
    position: "relative",
    marginHorizontal: 15,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    paddingRight: 40,
    fontSize: 14,
    backgroundColor: "white",
  },
  clearButton: {
    position: "absolute",
    right: 10,
    top: 10,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ddd",
    borderRadius: 12,
  },
  clearButtonText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "bold",
  },
  resultText: {
    textAlign: "center",
    fontSize: 13,
    marginHorizontal: 15,
    marginBottom: 5,
    padding: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 5,
  },
  pickerContainer: {
    marginHorizontal: 15,
    marginBottom: 10,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    maxHeight: 200,
  },
  pickerTitle: {
    fontSize: 13,
    fontWeight: "bold",
    padding: 10,
    backgroundColor: "#f5f5f5",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  pickerItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  pickerText: {
    fontSize: 12,
    color: "#333",
  },
  map: {
    flex: 1,
  },
});
