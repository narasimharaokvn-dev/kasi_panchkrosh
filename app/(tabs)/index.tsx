import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, Vibration } from "react-native";
import MapView, { Marker, Polygon } from "react-native-maps";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function HomeScreen() {
  const [userLocation, setUserLocation] = useState<any>(null);
  const [statusText, setStatusText] = useState("");
  const [daysInside, setDaysInside] = useState(0);

  // Sacred Inner Kasi Boundary (Refined Polygon)
  const kasiBoundary = [
    { latitude: 25.3565, longitude: 82.9580 },
    { latitude: 25.3400, longitude: 82.9900 },
    { latitude: 25.3100, longitude: 83.0200 },
    { latitude: 25.2800, longitude: 82.9900 },
    { latitude: 25.2684, longitude: 82.9582 },
    { latitude: 25.2750, longitude: 82.8500 },
    { latitude: 25.2900, longitude: 82.7200 },
    { latitude: 25.3050, longitude: 82.6800 },
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
        x <
          ((xj - xi) * (y - yi)) / (yj - yi) + xi;

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

  useEffect(() => {
    (async () => {
      let count =
        parseInt((await AsyncStorage.getItem("daysInside")) || "0") || 0;
      setDaysInside(count);
    })();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🕉 Kasi Sacred Boundary</Text>

      <TouchableOpacity style={styles.button} onPress={getLiveLocation}>
        <Text style={styles.buttonText}>Check My Location</Text>
      </TouchableOpacity>

      <Text style={styles.status}>{statusText}</Text>
      <Text style={styles.counter}>Days Stayed Inside: {daysInside}</Text>

      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 25.3109,
          longitude: 83.0107,
          latitudeDelta: 0.25,
          longitudeDelta: 0.25,
        }}
        showsUserLocation={true}
      >
        <Polygon
          coordinates={kasiBoundary}
          strokeColor="red"
          fillColor="rgba(255,0,0,0.2)"
          strokeWidth={3}
        />
        {userLocation && <Marker coordinate={userLocation} />}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 45,
  },
  button: {
    backgroundColor: "#4B0082",
    margin: 15,
    padding: 14,
    borderRadius: 10,
  },
  buttonText: {
    color: "white",
    textAlign: "center",
    fontWeight: "bold",
  },
  status: {
    textAlign: "center",
    fontSize: 16,
    marginVertical: 5,
  },
  counter: {
    textAlign: "center",
    fontSize: 16,
    marginBottom: 5,
    fontWeight: "bold",
  },
  map: {
    flex: 1,
  },
});
