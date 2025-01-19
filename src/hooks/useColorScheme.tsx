import { useState, useEffect } from 'react';
import { Appearance } from 'react-native';

export function useColorScheme() {
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setColorScheme(colorScheme);
    });

    // Set the initial color scheme based on the system's preference
    setColorScheme(Appearance.getColorScheme() || 'light');

    return () => {
      subscription.remove();
    };
  }, []);

  return colorScheme;
}
