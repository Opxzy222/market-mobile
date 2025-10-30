// app/shop/Feedback.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedStyle,
} from 'react-native-reanimated';

const supabaseUrl = 'https://gpkffwjenljkiyjnuldl.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdwa2Zmd2plbmxqa2l5am51bGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNzkzNDEsImV4cCI6MjA3NTc1NTM0MX0.elswjg5HN_Y3Lv2vyTskcQJhmg5KM3uGfgtVkea-MQk';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Star colors
const STAR_FILLED = '#FFD700';   // Gold
const STAR_EMPTY  = '#4B5563';   // Deep dark gray (maximum visibility)

const FeedbackScreen = () => {
  const router = useRouter();
  const { prevRoute } = useLocalSearchParams<{ prevRoute: string }>();
  const [rating, setRating] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('');

  // Button press animation
  const btnScale = useSharedValue(1);
  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  const handleStarPress = (star: number) => setRating(star);

  const handleSubmit = async () => {
    if (rating === 0 && !feedback.trim()) {
      Alert.alert('Incomplete', 'Please provide a rating or feedback.');
      return;
    }
    try {
      const userId = (await AsyncStorage.getItem('userId')) || 'anonymous';
      const { error } = await supabase
        .from('feedback')
        .insert([{ user_id: userId, rating, comment: feedback.trim() || null }]);
      if (error) throw error;

      Alert.alert('Thank you!', 'Your feedback has been saved.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
      setRating(0);
      setFeedback('');
    } catch (err: any) {
      console.error('Supabase error:', err);
      Alert.alert('Error', 'Failed to save feedback. Please try again.');
    }
  };

  const renderStars = () => (
    <View style={styles.starsContainer}>
      {Array.from({ length: 5 }, (_, i) => {
        const filled = i < rating;
        return (
          <TouchableOpacity key={i} onPress={() => handleStarPress(i + 1)} activeOpacity={0.7}>
            <MaterialIcons
              name={filled ? 'star' : 'star-border'}
              size={38}
              color={filled ? STAR_FILLED : STAR_EMPTY}
              style={styles.star}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <LinearGradient colors={['#E3F2FD', '#BBDEFB']} style={styles.gradient}>
        {/* ---------- GLASS HEADER ---------- */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.navigate('(tabs)/profile')}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back-ios" size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Give Feedback</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* ---------- CARD CONTENT ---------- */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>How would you rate the app?</Text>
          {renderStars()}
          <Text style={styles.ratingLabel}>Rating: {rating} / 5</Text>

          <Text style={styles.sectionTitle}>Your thoughts</Text>
          <TextInput
            style={styles.textArea}
            multiline
            placeholder="Tell us what you love or how we can improve..."
            placeholderTextColor="#9CA3AF"
            value={feedback}
            onChangeText={setFeedback}
          />

          {/* ---------- SUBMIT BUTTON ---------- */}
          <Animated.View style={[styles.submitWrapper, btnStyle]}>
            <TouchableOpacity
              style={styles.submitButton}
              activeOpacity={1}
              onPressIn={() => (btnScale.value = withSpring(0.96))}
              onPressOut={() => (btnScale.value = withSpring(1))}
              onPress={handleSubmit}
            >
              <LinearGradient
                colors={['#4F46E5', '#7C3AED']}
                style={styles.submitGradient}
              >
                <Text style={styles.submitText}>Submit Feedback</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

/* ============================== STYLES ============================== */
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  gradient: { flex: 1 },

  /* ----- Header (Glass) ----- */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
     backgroundColor: '#3A7BD5',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
    }),
  },
  backBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  headerSpacer: { width: 40 },

  /* ----- Card ----- */
  card: {
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    marginTop: 12,
  },

  /* ----- Stars ----- */
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 12,
  },
  star: {
    marginHorizontal: 4,
  },

  ratingLabel: {
    textAlign: 'center',
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 16,
    fontWeight: '500',
  },

  /* ----- TextArea ----- */
  textArea: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1.2,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingTop: 14,
    fontSize: 16,
    color: '#111827',
    textAlignVertical: 'top',
    height: 110,
    marginBottom: 24,
  },

  /* ----- Submit Button ----- */
  submitWrapper: { alignSelf: 'stretch' },
  submitButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  submitGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

export default FeedbackScreen;