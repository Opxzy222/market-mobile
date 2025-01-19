// ReviewForm.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
} from 'react-native';
import StarRating from 'react-native-star-rating-widget';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ReviewForm = ({ shopId, onReviewSubmitted }) => {
  const [rating, setRating] = useState(1);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const fetchUserId = async () => {
      const userIdString = await AsyncStorage.getItem('user_id');
      setUserId(parseInt(userIdString, 10));
    };
    fetchUserId();
  }, []);

  const handleSubmit = async () => {
    if (!comment) {
      setError('Comment cannot be empty.');
      return;
    }

    const formData = new FormData();
    formData.append('shop', shopId);
    formData.append('user', userId); // Replace with actual user ID logic
    formData.append('rating', rating);
    formData.append('comment', comment);

    try {
      const response = await axios.post(
        'https://172.27.243.94:8000/shops/reviews/submit/',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      onReviewSubmitted(response.data);
      setRating(1);
      setComment('');
      setError('');
    } catch (error) {
      Alert.alert('Error', 'Failed to submit review.');
      console.error('Error submitting review:', error);
    }
  };

  return (
    <View style={styles.form}>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Comment</Text>
        <TextInput
          style={[styles.textInput, error && styles.errorInput]}
          value={comment}
          onChangeText={(text) => setComment(text)}
          placeholder="Write your review here..."
          multiline
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Rating</Text>
        <StarRating
          rating={rating}
          onChange={(newRating) => setRating(newRating)}
          starSize={30}
          color="#ffd700"
          maxStars={5}
          enableHalfStar={false}
        />
      </View>
      <Button title="Submit Review" onPress={handleSubmit} />
    </View>
  );
};

const styles = StyleSheet.create({
  form: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  errorInput: {
    borderColor: '#ff4d4d',
  },
  errorText: {
    color: '#ff4d4d',
    marginTop: 4,
    fontSize: 12,
  },
});

export default ReviewForm;
