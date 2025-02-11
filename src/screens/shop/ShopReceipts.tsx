import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from 'expo-router'; 
import * as FileSystem from "expo-file-system";
import * as WebBrowser from "expo-web-browser";

const ShopReceipts = () => {
    const [receipts, setReceipts] = useState([]);
    const [loading, setLoading] = useState(true);

    const params = useLocalSearchParams();
    const { shopId } = params;
    const router = useRouter();
    
    useEffect(() => {
        fetchReceipts();
    }, []);

    const fetchReceipts = async () => {
        try {
            const response = await fetch(`https://172.27.243.94:8000/shop/${shopId}/receipts/`);
            const data = await response.json();
            setReceipts(data.receipts);
        } catch (error) {
            console.error("Error fetching receipts:", error);
        } finally {
            setLoading(false);
        }
    };

    const viewReceipt = async (pdfUrl) => {
    try {
        await WebBrowser.openBrowserAsync(pdfUrl);
    } catch (error) {
        console.error("Error opening receipt:", error);
    }
};


    const renderItem = ({ item }) => (
        <View style={styles.receiptContainer}>
            <Text style={styles.receiptId}>Receipt ID: {item.receipt_id}</Text>
            <Text style={styles.date}>Date: {item.created_at}</Text>
            <TouchableOpacity onPress={() => viewReceipt(item.pdf_url)} style={styles.viewButton}>
                <Text style={styles.buttonText}>View Receipt</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.generateButton} onPress={() => router.push({ pathname: '/shop/GenerateReceipt', params: { shopId: shopId } })}>
                <Text style={styles.buttonText}>Generate Receipt</Text>
            </TouchableOpacity>
            {loading ? (
                <ActivityIndicator size="large" color="#007bff" />
            ) : (
                <FlatList data={receipts} keyExtractor={(item) => item.receipt_id} renderItem={renderItem} />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: "#f5f5f5",
    },
    title: {
        fontSize: 22,
        fontWeight: "bold",
        marginBottom: 16,
        textAlign: "center",
    },
    receiptContainer: {
        backgroundColor: "#fff",
        padding: 16,
        marginVertical: 8,
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    receiptId: {
        fontSize: 16,
        fontWeight: "bold",
    },
    date: {
        color: "#666",
        marginTop: 4,
    },
    viewButton: {
        backgroundColor: "#007bff",
        padding: 10,
        marginTop: 8,
        borderRadius: 8,
        alignItems: "center",
    },
    buttonText: {
        color: "#fff",
        fontWeight: "bold",
    },
    generateButton: {
        backgroundColor: "#28a745",
        padding: 14,
        marginTop: 16,
        borderRadius: 12,
        alignItems: "center",
    },
});

export default ShopReceipts;