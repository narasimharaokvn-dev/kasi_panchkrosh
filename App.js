import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, Vibration, View } from "react-native";
import MapView, { Marker, Polygon } from "react-native-maps";

const GOOGLE_MAPS_API_KEY = "AIzaSyCH19VklE4PFysGcHqp7Qc0gwr8PDeulEs";

export default function App() {
  const [userLocation, setUserLocation] = useState(null);
  const [statusText, setStatusText] = useState("");
  const [daysInside, setDaysInside] = useState(0);
  const [locationName, setLocationName] = useState("");
  const [searchResult, setSearchResult] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchedLocation, setSearchedLocation] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [showResultPicker, setShowResultPicker] = useState(false);

  const kasiBoundary = [
    { latitude: 25.2950, longitude: 83.0100 },
    { latitude: 25.2750, longitude: 83.0400 },
    { latitude: 25.2900, longitude: 83.0600 },
    { latitude: 25.3300, longitude: 83.0500 },
    { latitude: 25.3620, longitude: 83.0100 },
    { latitude: 25.3600, longitude: 82.9800 },
    { latitude: 25.3400, longitude: 82.9500 },
    { latitude: 25.3100, longitude: 82.9400 },
    { latitude: 25.2950, longitude: 82.9600 },
    { latitude: 25.2950, longitude: 82.9900 },
  ];

  function isInside(point, vs) {
    let x = point.latitude, y = point.longitude;
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      let xi = vs[i].latitude, yi = vs[i].longitude;
      let xj = vs[j].latitude, yj = vs[j].longitude;
      let intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  const incrementDayCounter = async () => {
    const today = new Date().toDateString();
    const lastDate = await AsyncStorage.getItem("lastDate");
    if (lastDate !== today) {
      let count = parseInt((await AsyncStorage.getItem("daysInside")) || "0") || 0;
      count++;
      await AsyncStorage.setItem("daysInside", count.toString());
      await AsyncStorage.setItem("lastDate", today);
      setDaysInside(count);
    } else {
      let count = parseInt((await AsyncStorage.getItem("daysInside")) || "0") || 0;
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
    const point = { latitude: location.coords.latitude, longitude: location.coords.longitude };
    setUserLocation(point);
    const inside = isInside(point, kasiBoundary);
    if (inside) {
      setStatusText("🕉️ You are inside Panchkroshi Boundary");
      await incrementDayCounter();
    } else {
      setStatusText("⚠️ Outside Panchkroshi Boundary!");
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
      const query = encodeURIComponent(locationName);
      const googleUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}+Varanasi&key=${GOOGLE_MAPS_API_KEY}&region=in`;
      const response = await fetch(googleUrl);
      const data = await response.json();
      if (data.status === "OK" && data.results && data.results.length > 0) {
        const results = data.results.slice(0, 5).map((place) => ({
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
        const osmResponse = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}+Varanasi&format=json&limit=5`, {
          headers: { 'User-Agent': 'KasiPanchkroshApp/1.0' }
        });
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

  const selectLocation = (location) => {
    const point = { latitude: parseFloat(location.lat), longitude: parseFloat(location.lon) };
    setSearchedLocation(point);
    setShowResultPicker(false);
    const inside = isInside(point, kasiBoundary);
    if (inside) {
      setSearchResult(`✅ ${location.display_name}\n\nIS within the Panchkroshi Boundary!`);
    } else {
      setSearchResult(`⚠️ ${location.display_name}\n\nis OUTSIDE the Panchkroshi Boundary.`);
    }
  };

  useEffect(() => {
    (async () => {
      let count = parseInt((await AsyncStorage.getItem("daysInside")) || "0") || 0;
      setDaysInside(count);
      
      // Start watching location
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 10000, // Check every 10 seconds
            distanceInterval: 50, // Or when moved 50 meters
          },
          (location) => {
            const point = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            };
            setUserLocation(point);
            
            const inside = isInside(point, kasiBoundary);
            const wasInside = statusText.includes("inside");
            
            // Alert only when crossing OUT of boundary
            if (wasInside && !inside) {
              Alert.alert(
                "⚠️ Boundary Alert",
                "You have moved outside the Panchkroshi Boundary!",
                [{ text: "OK" }]
              );
              Vibration.vibrate([0, 500, 200, 500]); // Pattern vibration
            }
            
            if (inside) {
              setStatusText("🕉️ You are inside Panchkroshi Boundary");
            } else {
              setStatusText("⚠️ Outside Panchkroshi Boundary!");
            }
          }
        );
      }
    })();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <Text style={styles.title}>🕉 Panchkroshi Yatra Boundary</Text>
        <TouchableOpacity style={styles.button} onPress={getLiveLocation}>
          <Text style={styles.buttonText}>Check My Location</Text>
        </TouchableOpacity>
        <Text style={styles.status}>{statusText}</Text>
        <Text style={styles.counter}>Days Inside: {daysInside}</Text>
        <View style={styles.searchContainer}>
          <TextInput style={styles.input} placeholder="Search location..." value={locationName} onChangeText={setLocationName} onSubmitEditing={searchLocationByName} />
          {locationName.length > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={() => { setLocationName(""); setSearchResult(""); setSearchedLocation(null); setSearchResults([]); setShowResultPicker(false); }}>
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={[styles.button, styles.searchButton]} onPress={searchLocationByName} disabled={isSearching}>
          {isSearching ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Search</Text>}
        </TouchableOpacity>
        {searchResult ? <Text style={styles.resultText}>{searchResult}</Text> : null}
        {showResultPicker && searchResults.length > 0 && (
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerTitle}>Select the correct location:</Text>
            {searchResults.map((result, index) => (
              <TouchableOpacity key={index} style={styles.pickerItem} onPress={() => selectLocation(result)}>
                <Text style={styles.pickerText} numberOfLines={2}>{result.display_name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
      <MapView style={styles.map} initialRegion={{ latitude: 25.3109, longitude: 83.0107, latitudeDelta: 0.35, longitudeDelta: 0.35 }} showsUserLocation={true}>
        <Polygon coordinates={kasiBoundary} strokeColor="red" fillColor="rgba(255,0,0,0.2)" strokeWidth={3} />
        {userLocation && <Marker coordinate={userLocation} title="Your Location" pinColor="blue" />}
        {searchedLocation && <Marker coordinate={searchedLocation} title="Searched Location" pinColor="green" />}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topSection: { backgroundColor: "white", paddingBottom: 5 },
  title: { fontSize: 18, fontWeight: "bold", textAlign: "center", marginTop: 45, marginBottom: 10 },
  button: { backgroundColor: "#4B0082", margin: 15, marginTop: 5, marginBottom: 5, padding: 12, borderRadius: 10 },
  searchButton: { backgroundColor: "#FF6347" },
  buttonText: { color: "white", textAlign: "center", fontWeight: "bold" },
  status: { textAlign: "center", fontSize: 14, marginVertical: 3 },
  counter: { textAlign: "center", fontSize: 14, marginBottom: 8, fontWeight: "bold" },
  searchContainer: { position: "relative", marginHorizontal: 15, marginBottom: 5 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10, paddingRight: 40, fontSize: 14, backgroundColor: "white" },
  clearButton: { position: "absolute", right: 10, top: 10, width: 24, height: 24, justifyContent: "center", alignItems: "center", backgroundColor: "#ddd", borderRadius: 12 },
  clearButtonText: { fontSize: 16, color: "#666", fontWeight: "bold" },
  resultText: { textAlign: "center", fontSize: 13, marginHorizontal: 15, marginBottom: 5, padding: 8, backgroundColor: "#f0f0f0", borderRadius: 5 },
  pickerContainer: { marginHorizontal: 15, marginBottom: 10, backgroundColor: "#fff", borderRadius: 8, borderWidth: 1, borderColor: "#ddd", maxHeight: 200 },
  pickerTitle: { fontSize: 13, fontWeight: "bold", padding: 10, backgroundColor: "#f5f5f5", borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  pickerItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },
  pickerText: { fontSize: 12, color: "#333" },
  map: { flex: 1 },
});
