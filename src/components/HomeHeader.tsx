import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';

const screenWidth = Dimensions.get('window').width;

export default function Header() {
  const router = useRouter();

  // Placeholder for authentication logic
  const isSignedIn = false; // Replace with real authentication state

  return (
    <View style={styles.header}>
      {!isSignedIn && (
        <TouchableOpacity
          style={styles.signInButton}
          onPress={() => {
            router.push('/login'); // Navigate to the sign-in screen
          }}
        >
          <Text style={styles.signInText}>Sign In</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: screenWidth, // Ensure it covers the full width
    height: 60, // Reduced height to make it more compact
    backgroundColor: '#3498db',
    flexDirection: 'row', // Align items horizontally
    justifyContent: 'flex-end', // Push items to the far ends
    alignItems: 'center', // Center items vertically
    paddingHorizontal: 20, // Add padding to the sides
    zIndex: 1000,
  },
  
  signInButton: {
    backgroundColor: '#87CEFA',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  signInText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
