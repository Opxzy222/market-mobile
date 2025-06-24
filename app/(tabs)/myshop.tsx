// app/(tabs)/myshop.tsx
import React, { Component } from 'react';
import MyShop from '@/screens/shop/MyShop';
import { View, Text } from 'react-native';

class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View>
          <Text>Error in MyShop: {this.state.error?.toString()}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function MyShopScreen() {
  console.log('Rendering MyShopScreen');
  return (
    <ErrorBoundary>
      <MyShop />
    </ErrorBoundary>
  );
}