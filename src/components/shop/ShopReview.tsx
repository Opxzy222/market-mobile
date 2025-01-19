// ShopReview.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import StarRating from 'react-native-star-rating-widget';

const ShopReview = ({ reviews = [] }) => {
  return (
    <ScrollView contentContainerStyle={styles.reviewsContainer}>
      {reviews.length > 0 ? (
        reviews.map((review) => (
          <View style={styles.review} key={review.id}>
            <View style={styles.reviewHeader}>
              <Text style={styles.reviewerName}>{review.reviewer__fullname}</Text>
              <StarRating
                rating={review.rating}
                onChange={() => {}}
                starSize={20}
                enableSwiping={false}
                color="#ffd700"
              />
            </View>
            <Text style={styles.reviewComment}>{review.comment}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.noReviewsText}>No reviews yet.</Text>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  reviewsContainer: {
    padding: 16,
  },
  review: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewerName: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  reviewComment: {
    fontSize: 14,
    color: '#555',
  },
  noReviewsText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
  },
});

export default ShopReview;
