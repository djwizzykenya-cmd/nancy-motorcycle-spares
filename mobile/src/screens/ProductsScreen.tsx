import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator
} from "react-native";
import apiClient from "../services/api";

export default function ProductsScreen() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await apiClient.get("/products");
      setProducts(response.data.data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Products</Text>
      {products.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            Products list coming soon...
          </Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item: any) => item.id}
          renderItem={({ item }: { item: any }) => (
            <View style={styles.productCard}>
              <Text style={styles.productName}>{item.name}</Text>
              <Text style={styles.productPrice}>KES {item.price}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f4f8",
    padding: 16
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    marginTop: 20
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  emptyText: {
    fontSize: 16,
    color: "#6b7280"
  },
  productCard: {
    backgroundColor: "white",
    padding: 12,
    marginBottom: 12,
    borderRadius: 8
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937"
  },
  productPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4f46e5",
    marginTop: 4
  }
});
