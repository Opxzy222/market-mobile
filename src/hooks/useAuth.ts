import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function useAuth() {
  const [user, setUser] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    (async () => {
      const userId = await AsyncStorage.getItem("user_id");
      const userName = await AsyncStorage.getItem("user_name");
      if (userId && userName) setUser({ id: userId, name: userName });
    })();
  }, []);

  const logout = async () => {
    await AsyncStorage.removeItem("user_id");
    await AsyncStorage.removeItem("user_name");
    setUser(null);
  };

  return { user, logout };
}
