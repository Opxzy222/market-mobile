// components/SubscriptionProvider.tsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SubscriptionContextType {
  subscription: any;
  subscriptionStatus: string | null;
  loading: boolean;
  userId: number | null;
  refreshSubscription: () => void;
  resetSubscription: () => void; // Add resetSubscription
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  subscription: null,
  subscriptionStatus: null,
  loading: true,
  userId: null,
  refreshSubscription: () => {},
  resetSubscription: () => {},
});

const CACHE_KEY = "subscription_cache";
const LAST_REFRESH_KEY = "last_subscription_refresh";
const REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes in milliseconds

const SubscriptionProvider = ({ children }) => {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);

  const loadFromCache = async () => {
    try {
      const cachedData = await AsyncStorage.getItem(CACHE_KEY);
      if (cachedData) {
        setSubscription(JSON.parse(cachedData));
      }
    } catch (error) {
      console.error("Error loading subscription from cache:", error);
    }
  };

  const fetchUserIdAndSubscription = async (forceRefresh = false) => {
    try {
      const userIdString = await AsyncStorage.getItem("user_id");
      if (!userIdString) {
        setSubscription(null);
        setUserId(null);
        setLoading(false);
        return;
      }

      const parsedUserId = parseInt(userIdString, 10);
      if (isNaN(parsedUserId)) {
        setSubscription(null);
        setUserId(null);
        setLoading(false);
        return;
      }
      setUserId(parsedUserId);

      const lastRefresh = await AsyncStorage.getItem(LAST_REFRESH_KEY);
      const lastRefreshTime = lastRefresh ? parseInt(lastRefresh, 10) : 0;
      const currentTime = Date.now();

      if (!forceRefresh && currentTime - lastRefreshTime < REFRESH_INTERVAL) {
        console.log("Using cached subscription data");
        setLoading(false);
        return;
      }

      console.log("Fetching Subscription from Backend");

      const response = await fetch(`https://retail-alvinia-goza-f6a0e4f7.koyeb.app/check-subscription/${parsedUserId}/`);
      const data = await response.json();
      console.log("Subscription Data:", data);

      if (response.ok && data?.is_active !== undefined) {
        setSubscription(data);
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
        await AsyncStorage.setItem(LAST_REFRESH_KEY, currentTime.toString());
      } else {
        setSubscription(null);
      }
    } catch (error) {
      console.error("Error fetching subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshSubscription = async () => {
    setLoading(true);
    await fetchUserIdAndSubscription(true);
  };

  const resetSubscription = useCallback(async () => {
    try {
      setSubscription(null);
      setUserId(null);
      setLoading(false);
      await AsyncStorage.multiRemove([CACHE_KEY, LAST_REFRESH_KEY]);
      console.log("SubscriptionProvider reset: cleared state and cache");
    } catch (error) {
      console.error("Error resetting subscription:", error);
    }
  }, []);

  useEffect(() => {
    loadFromCache();
    fetchUserIdAndSubscription();
  }, [userId]); // Add userId dependency to refetch on userId change

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        subscriptionStatus: subscription ? (subscription.is_active ? subscription.plan : "inactive") : null,
        loading,
        userId,
        refreshSubscription,
        resetSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export { SubscriptionContext };
export default SubscriptionProvider;