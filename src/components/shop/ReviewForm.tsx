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
  const [rating, setRating] = useState(null); // Set rating to null by default
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [ratingError, setRatingError] = useState('');
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    const fetchSessionId = async () => {
      const sessionIdString = await AsyncStorage.getItem("sessionToken");
      setSessionId(sessionIdString);
    };

    fetchSessionId();
  }, []);

  const handleSubmit = async () => {
    setError('');
    setRatingError('');

    if (!comment) {
      setError('Comment cannot be empty.');
      return;
    }

    if (rating === null) {
      setRatingError('Please select a rating.');
      return;
    }

    const formData = new FormData();
    formData.append('shop', shopId);
    formData.append('rating', rating);
    formData.append('comment', comment);

    try {
      const response = await axios.post(
        'https://retail-alvinia-goza-f6a0e4f7.koyeb.app/shops/reviews/submit/',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: sessionId,
          },
        }
      );
      onReviewSubmitted(response.data);
      setRating(null); // Reset to null after submission
      setComment('');
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
          rating={rating ?? 0} // Display 0 stars when null
          onChange={(newRating) => setRating(newRating)}
          starSize={30}
          color="#ffd700"
          maxStars={5}
          enableHalfStar={false}
        />
        {ratingError ? <Text style={styles.errorText}>{ratingError}</Text> : null}
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
