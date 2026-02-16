import { useRouter } from "expo-router";
import React from "react";
import { Button, StyleSheet, Text, View } from "react-native";

export default function Home() {
  const router = useRouter();
  
  return (
    <View style={styles.container}>
      <Text style={styles.text}>🕉 Panchkroshi Home</Text>
      <Text>This is working!</Text>
      <Button title="Go to Map" onPress={() => router.push('/(tabs)')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  text: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
});
