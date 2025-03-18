import React from "react";
import { View, Image, Dimensions } from "react-native";
import Lightbox from "react-native-lightbox-v2";

export default function ChatImage({ uri }) {
  const screenWidth = Dimensions.get("window").width;
  const screenHeight = Dimensions.get("window").height;

  return (
    <View>
      <Lightbox
        renderContent={() => (
          <Image
            source={{ uri }}
            style={{
              width: screenWidth,
              height: screenHeight,
              resizeMode: "contain",
            }}
          />
        )}
      >
        <Image
          source={{ uri }}
          style={{ width: 150, height: 150, borderRadius: 10 }}
        />
      </Lightbox>
    </View>
  );
}
