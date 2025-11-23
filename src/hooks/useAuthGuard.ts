// hooks/useAuthGuard.ts
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useAuthGuard = () => {
  const router = useRouter();

  useEffect(() => {
    const check = async () => {
      const token = await AsyncStorage.getItem('sessionToken');
      if (!token) {
        router.replace('/login');
      }
    };
    check();
  }, [router]);
};