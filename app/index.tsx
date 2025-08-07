import { AppRegistry } from 'react-native';
import { View, Text } from 'react-native';
import Homepage from '@/screens/homepage';
import React from 'react';
import Toast from 'react-native-toast-message';

// Define app name manually (from app.json)
const appName = 'market-mobile';

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Error: {this.state.error?.toString()}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function Index() {
  console.log('Rendering Index');

  return (
    <View style={{ flex: 1 }}>
      <ErrorBoundary>
        <Homepage />
      </ErrorBoundary>
      <Toast />
    </View>
  );
}

// Register the main app
AppRegistry.registerComponent(appName, () => Index);