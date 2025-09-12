import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

const SubscriptionRequired = () => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Exclusive Feature Alert 🚀</Text>
      <Text style={styles.description}>
        This feature is exclusive to our subscribers.
        Unlock the best experience with a tailored subscription plan—upgrade now!
      </Text>
      <TouchableOpacity 
        style={styles.button} 
        onPress={() => router.push('/shop/Subscription')}
      >
        <Text style={styles.buttonText}>View Subscription Plans</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 10,
    textAlign: 'flex-start',
  },
  description: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'flex-start',
    marginBottom: 20,
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SubscriptionRequired;
