import React from 'react';
import { View, ViewProps } from 'react-native';
import { useColorScheme } from 'react-native';

export function ThemedView({ children, style, ...props }) {
  const theme = useColorScheme();
  const backgroundColor = theme === 'dark' ? 'black' : 'white';

  return (
    <View style={[{ backgroundColor, flex: 1 }, style]} {...props}>
      {children}
    </View>
  );
}
