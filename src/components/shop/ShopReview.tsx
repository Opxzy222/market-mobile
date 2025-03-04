import React, { useState } from "react";
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import StarRating from "react-native-star-rating-widget";

const ShopReview = ({ reviews = [] }) => {
  console.log("heya", reviews);

  // Group reviews by user and sort by created_at (latest first)
  const reviewsByUser = reviews.reduce((acc, review) => {
    const { reviewer__fullname } = review;
    if (!acc[reviewer__fullname]) {
      acc[reviewer__fullname] = [];
    }
    acc[reviewer__fullname].push(review);
    return acc;
  }, {});

  const groupedReviews = Object.entries(reviewsByUser).map(([reviewer, userReviews]) => {
    const sortedReviews = userReviews.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
    return {
      reviewer,
      latestReview: sortedReviews[0],
      olderReviews: sortedReviews.slice(1),
    };
  });

  // State to track expanded reviews
  const [expandedReviewers, setExpandedReviewers] = useState({});

  const toggleShowMore = (reviewer) => {
    setExpandedReviewers((prev) => ({
      ...prev,
      [reviewer]: !prev[reviewer],
    }));
  };

  return (
    <ScrollView contentContainerStyle={styles.reviewsContainer}>
      {groupedReviews.length > 0 ? (
        groupedReviews.map(({ reviewer, latestReview, olderReviews }) => (
          <View style={styles.reviewContainer} key={latestReview.id}>
            {/* Latest Review */}
            <View style={styles.reviewHeader}>
              <Text style={styles.reviewerName}>{reviewer}</Text>
              <StarRating
                rating={latestReview.rating}
                onChange={() => {}}
                starSize={20}
                enableSwiping={false}
                color="#ffd700"
              />
            </View>
            <Text style={styles.reviewComment}>{latestReview.comment}</Text>

            {/* Show More / Hide Older Reviews - Only if there are older reviews */}
            {olderReviews.length > 0 && (
              <TouchableOpacity onPress={() => toggleShowMore(reviewer)}>
                <Text style={styles.viewMoreText}>
                  {expandedReviewers[reviewer] ? "Hide Older Reviews" : "View More Reviews"}
                </Text>
              </TouchableOpacity>
            )}

            {/* Older Reviews (only visible when expanded) */}
            {expandedReviewers[reviewer] &&
              olderReviews.map((oldReview) => (
                <View style={styles.oldReview} key={oldReview.id}>
                  <Text style={styles.oldReviewComment}>{oldReview.comment}</Text>
                </View>
              ))}
          </View>
        ))
      ) : (
        <Text style={styles.noReviewsText}>No reviews yet.</Text>
      )}
    </ScrollView>
  );
};

// Styles
const styles = StyleSheet.create({
  reviewsContainer: {
    padding: 10,
  },
  reviewContainer: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: "#f9f9f9",
    borderRadius: 5,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  reviewerName: {
    fontWeight: "bold",
    fontSize: 16,
  },
  reviewComment: {
    fontSize: 14,
    color: "#333",
  },
  viewMoreText: {
    color: "#007bff",
    marginTop: 5,
  },
  oldReview: {
    marginTop: 5,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: "#ddd",
  },
  oldReviewComment: {
    fontSize: 13,
    color: "#666",
  },
  noReviewsText: {
    textAlign: "center",
    fontSize: 14,
    color: "#777",
  },
});

export default ShopReview;
