import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏍️ Nancy Motorcycle Spares</Text>
      <Text style={styles.subtitle}>
        Welcome to your motorcycle spares marketplace
      </Text>
      <View style={styles.feature}>
        <Text style={styles.featureIcon}>🛍️</Text>
        <Text style={styles.featureText}>Browse quality spares</Text>
      </View>
      <View style={styles.feature}>
        <Text style={styles.featureIcon}>💳</Text>
        <Text style={styles.featureText}>Secure checkout</Text>
      </View>
      <View style={styles.feature}>
        <Text style={styles.featureIcon}>🚚</Text>
        <Text style={styles.featureText}>Fast delivery to Kenya</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f4f8",
    padding: 20,
    justifyContent: "center"
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 10,
    textAlign: "center"
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    marginBottom: 30,
    textAlign: "center"
  },
  feature: {
    backgroundColor: "white",
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center"
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 12
  },
  featureText: {
    fontSize: 14,
    color: "#374151"
  }
});
