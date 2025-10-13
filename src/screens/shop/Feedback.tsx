// app/shop/Feedback.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gpkffwjenljkiyjnuldl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdwa2Zmd2plbmxqa2l5am51bGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNzkzNDEsImV4cCI6MjA3NTc1NTM0MX0.elswjg5HN_Y3Lv2vyTskcQJhmg5KM3uGfgtVkea-MQk';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const FeedbackScreen = () => {
  const router = useRouter();
  const { prevRoute } = useLocalSearchParams<{ prevRoute: string }>();
  const [rating, setRating] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('');

  const handleStarPress = (star: number) => {
    setRating(star);
  };

  const handleSubmit = async () => {
    if (rating === 0 && !feedback.trim()) {
      Alert.alert('Incomplete', 'Please provide a rating or feedback.');
      return;
    }
    try {
      const userId = await AsyncStorage.getItem('userId') || 'anonymous';
      const { error } = await supabase
        .from('feedback')
        .insert([{ user_id: userId, rating, comment: feedback.trim() || null }]);
      if (error) throw error;
      Alert.alert('Thank you!', 'Your feedback has been saved.');
      setRating(0);
      setFeedback('');
      router.back();
    } catch (error) {
      console.error('Supabase error:', error);
      Alert.alert('Error', 'Failed to save feedback. Please try again.');
    }
  };

  const renderStars = () => (
    <View style={styles.starsContainer}>
      {Array.from({ length: 5 }, (_, i) => (
        <TouchableOpacity key={i} onPress={() => handleStarPress(i + 1)}>
          <MaterialIcons
            name={i < rating ? 'star' : 'star-border'}
            size={32}
            color={i < rating ? '#FFD700' : '#E0E0E0'}
          />
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <LinearGradient colors={['#E3F2FD', '#BBDEFB']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={26} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Give Feedback</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.content}>
        <Text style={styles.label}>How would you rate the app?</Text>
        {renderStars()}
        <Text style={styles.ratingText}>Rating: {rating}/5</Text>
        <Text style={styles.label}>Your thoughts (optional)</Text>
        <TextInput
          style={styles.textArea}
          multiline
          numberOfLines={4}
          placeholder="Tell us what you love or how we can improve..."
          value={feedback}
          onChangeText={setFeedback}
        />
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Submit Feedback</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#3A7BD5',
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  backButton: {
    padding: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    flex: 1,
  },
  headerSpacer: {
    width: 42,
  },
  content: { padding: 20 },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, marginTop: 20 },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  ratingText: { textAlign: 'center', fontSize: 16, marginBottom: 20 },
  textArea: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});

export default FeedbackScreen;