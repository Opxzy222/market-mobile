import React from "react";
import { View, Image } from "react-native";
import Svg, { Circle } from "react-native-svg";

const StatusRing = ({ totalStatuses, viewedStatuses, imageUri }) => {
  const radius = 30; // Radius of the outer circle
  const strokeWidth = 4; // Thickness of the ring
  const circumference = 2 * Math.PI * radius; // Full circle length
  const segmentGap = 10; // Space between segments
  const segmentLength = (circumference - segmentGap * totalStatuses) / totalStatuses;

  return (
    <View style={{ width: 70, height: 70, justifyContent: "center", alignItems: "center" }}>
      <Svg width={70} height={70} viewBox="0 0 70 70">
        {[...Array(totalStatuses)].map((_, i) => {
          const isViewed = i < viewedStatuses;
          const strokeColor = isViewed ? "#A9A9A9" : "#25D366"; // Gray for viewed, Green for unviewed

          return (
            <Circle
              key={i}
              cx="35"
              cy="35"
              r={radius}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
              strokeDashoffset={-i * (segmentLength + segmentGap)}
              fill="none"
              strokeLinecap="round"
            />
          );
        })}
      </Svg>

      {/* Profile Picture */}
      <Image 
        source={{ uri: imageUri }} 
        style={{
          position: "absolute",
          width: 50,
          height: 50,
          borderRadius: 25,
        }}
      />
    </View>
  );
};

export default StatusRing;
