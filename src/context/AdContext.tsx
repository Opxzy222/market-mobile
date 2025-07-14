import React, { createContext, useContext, useEffect, useState } from "react";
import { InterstitialAd, AdEventType, TestIds } from "react-native-google-mobile-ads";
import AsyncStorage from "@react-native-async-storage/async-storage";

const INTERSTITIAL_AD_UNIT_ID = __DEV__
  ? TestIds.INTERSTITIAL
  : "ca-app-pub-2360241039001516/5392693752";

const AdContext = createContext();

export const AdProvider = ({ children }) => {
  const [searchCount, setSearchCount] = useState(0);
  const [interstitialAd, setInterstitialAd] = useState(null);
  const [adLoaded, setAdLoaded] = useState(false);

  useEffect(() => {
    const ad = InterstitialAd.createForAdRequest(INTERSTITIAL_AD_UNIT_ID, {
      requestNonPersonalizedAdsOnly: true,
      keywords: ["retail", "shopping", "market"],
    });

    const handleAdLoaded = () => {
      console.log("Interstitial ad loaded");
      setAdLoaded(true);
      setInterstitialAd(ad);
    };

    const handleAdClosed = () => {
      console.log("Interstitial ad closed");
      setAdLoaded(false);
      AsyncStorage.setItem("searchCount", "0");
      setSearchCount(0);
      ad.load();
    };

    const handleAdError = (error) => {
      console.error("Interstitial ad error:", error);
      setAdLoaded(false);
    };

    ad.addAdEventListener(AdEventType.LOADED, handleAdLoaded);
    ad.addAdEventListener(AdEventType.CLOSED, handleAdClosed);
    ad.addAdEventListener(AdEventType.ERROR, handleAdError);

    ad.load();

    AsyncStorage.getItem("searchCount")
      .then((count) => {
        setSearchCount(parseInt(count || "0", 10));
      })
      .catch((error) => console.error("Error loading search count:", error));

    return () => {
      ad.removeAllListeners();
    };
  }, []);

  const incrementSearchCount = async () => {
    try {
      let count = (await AsyncStorage.getItem("searchCount")) || "0";
      count = parseInt(count, 10) + 1;
      await AsyncStorage.setItem("searchCount", count.toString());
      setSearchCount(count);

      if (count >= 3 && adLoaded && interstitialAd) {
        interstitialAd.show().catch((error) =>
          console.error("Error showing interstitial ad:", error)
        );
      }
    } catch (error) {
      console.error("Error handling search count:", error);
    }
  };

  return (
    <AdContext.Provider value={{ incrementSearchCount, searchCount }}>
      {children}
    </AdContext.Provider>
  );
};

export const useAdContext = () => useContext(AdContext);