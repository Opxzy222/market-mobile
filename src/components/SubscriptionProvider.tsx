import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SubscriptionContextType {
  subscription: any;
  subscriptionStatus: string | null;
  loading: boolean;
  userId: number | null;
  refreshSubscription: () => void; // Function to manually refresh
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  subscription: null,
  subscriptionStatus: null,
  loading: true,
  userId: null,
  refreshSubscription: () => {},
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
        setLoading(false);
        return;
      }

      const parsedUserId = parseInt(userIdString, 10);
      if (isNaN(parsedUserId)) {
        setLoading(false);
        return;
      }
      setUserId(parsedUserId);

      const lastRefresh = await AsyncStorage.getItem(LAST_REFRESH_KEY);
      const lastRefreshTime = lastRefresh ? parseInt(lastRefresh, 10) : 0;
      const currentTime = Date.now();

      // Check if 10 minutes have passed since last refresh
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
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data)); // Cache subscription
        await AsyncStorage.setItem(LAST_REFRESH_KEY, currentTime.toString()); // Update last refresh time
      } else {
        setSubscription(null);
      }
    } catch (error) {
      console.error("Error fetching subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  // Function to manually refresh the subscription (if 10 minutes have passed)
  const refreshSubscription = async () => {
    setLoading(true);
    await fetchUserIdAndSubscription(true);
  };

  useEffect(() => {
    loadFromCache();
    fetchUserIdAndSubscription(); // Fetch only if needed
  }, []);

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        subscriptionStatus: subscription ? (subscription.is_active ? subscription.plan : "inactive") : null,
        loading,
        userId,
        refreshSubscription, // Expose function for manual refresh
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export { SubscriptionContext };
export default SubscriptionProvider;