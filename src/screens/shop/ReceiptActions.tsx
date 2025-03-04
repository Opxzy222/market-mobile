import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, usePathname } from 'expo-router';

const ReceiptActions = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { shopId, prevRoute } = params;
  const pathname = usePathname();

  return (
    <View style={styles.container}>
      {/* Header Section */}
        <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.replace(prevRoute || '((tabs)/myshop)')}
              style={styles.backButton}
            >
              <MaterialIcons name="arrow-back" size={24} color="#007BFF" />
            </TouchableOpacity>    
          </View>

      {/* Buttons Section */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => router.push({ pathname: '/shop/ShopReceipts', params: { shopId: shopId, prevRoute: pathname } })}
        >
          <MaterialIcons name="receipt" size={28} color="#795548" />
          <Text style={styles.buttonText}>Shop Receipts</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => router.push({ pathname: '/shop/GenerateReceipt', params: { shopId, prevRoute: pathname } })}
        >
          <MaterialIcons name="post-add" size={28} color="#4caf50" />
          <Text style={styles.buttonText}>Generate Receipt</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => router.push({ pathname: '/shop/GenerateReceipt', params: { shopId } })}
        >
          <MaterialIcons name="gesture" size={28} color="#9e9e9e" />
          <Text style={styles.buttonText}>Shop Signature</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 10,
  },
  backButton: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  buttonsContainer: {
    alignItems: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 12,
  },
});

export default ReceiptActions;
