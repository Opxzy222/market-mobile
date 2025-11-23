// hooks/useActivePO.ts
import { useEffect, useState } from 'react';
import api from '@/src/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

let cachedPOs: any[] = [];

export const useActivePOs = () => {
  const [pos, setPOs] = useState(cachedPOs);

  useEffect(() => {
    const load = async () => {
      const token = await AsyncStorage.getItem('sessionToken');
      if (!token) return;
      try {
        const res = await api.get('/po/buyer/list/', { headers: { Authorization: token } });
        const active = (res.data.pos || []).filter((p: any) =>
          ['proposed', 'countered', 'pickup_pending'].includes(p.status)
        );
        cachedPOs = active;
        setPOs(active);
      } catch (e) {}
    };
    load();
  }, []);

  const getActivePOForShop = (shopId: number) => 
    pos.find(p => p.shop_id === shopId);

  return { activePOs: pos, getActivePOForShop };
};