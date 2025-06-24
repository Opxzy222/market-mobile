import { View, Text } from "react-native";
import Homepage from "@/screens/homepage";
import React from "react";

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text>Error: {this.state.error?.toString()}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function Index() {
  console.log("Rendering Index");
  return (
    <View style={{ flex: 1 }}>
      <ErrorBoundary>
        <Homepage />
      </ErrorBoundary>
    </View>
  );
}