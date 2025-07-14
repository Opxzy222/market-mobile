import React, { useEffect, useState } from 'react';
import { View, Button, StyleSheet, Text } from 'react-native';
import {
  BannerAd,
  BannerAdSize,
  InterstitialAd,
  AdEventType,
  TestIds,
  MobileAds,
  NativeAdView,
} from 'react-native-google-mobile-ads';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BANNER_AD_UNIT_ID = __DEV__
  ? TestIds.BANNER
  : 'ca-app-pub-2360241039001516/8894147031';
const INTERSTITIAL_AD_UNIT_ID = __DEV__
  ? TestIds.INTERSTITIAL
  : 'ca-app-pub-2360241039001516/5392693752';
const NATIVE_AD_UNIT_ID = __DEV__
  ? TestIds.NATIVE
  : 'ca-app-pub-2360241039001516/9517278195';

// Type definition for useInterstitialAd return value
interface InterstitialAdHook {
  showInterstitial: () => Promise<void>;
  adLoaded: boolean;
}

// Hook for interstitial ad management
export const useInterstitialAd = (): InterstitialAdHook => {
  const [interstitialAd, setInterstitialAd] = useState<InterstitialAd | null>(null);
  const [adLoaded, setAdLoaded] = useState(false);

  useEffect(() => {
    MobileAds()
      .initialize()
      .then((adapterStatuses) => console.log('AdMob initialized:', adapterStatuses))
      .catch((error) => console.error('AdMob initialization error:', error));

    const ad = InterstitialAd.createForAdRequest(INTERSTITIAL_AD_UNIT_ID, {
      requestNonPersonalizedAdsOnly: true,
      keywords: ['retail', 'shopping', 'market'],
    });

    const handleAdLoaded = () => {
      console.log('Interstitial ad loaded');
      setAdLoaded(true);
      setInterstitialAd(ad);
    };

    const handleAdClosed = () => {
      console.log('Interstitial ad closed');
      setAdLoaded(false);
      AsyncStorage.setItem('searchCount', '0'); // Reset count
      ad.load();
    };

    const handleAdError = (error: Error) => {
      console.error('Interstitial ad error:', error);
      setAdLoaded(false);
      ad.load();
    };

    ad.addAdEventListener(AdEventType.LOADED, handleAdLoaded);
    ad.addAdEventListener(AdEventType.CLOSED, handleAdClosed);
    ad.addAdEventListener(AdEventType.ERROR, handleAdError);

    ad.load();

    return () => ad.removeAllListeners();
  }, []);

  const showInterstitial = async () => {
    if (adLoaded && interstitialAd) {
      try {
        await interstitialAd.show();
        console.log('Interstitial ad shown');
      } catch (error) {
        console.error('Error showing interstitial ad:', error);
      }
    }
  };

  return { showInterstitial, adLoaded };
};

// Native ad component
const NativeAdComponent: React.FC = () => {
  const [adLoaded, setAdLoaded] = useState(false);

  return (
    <NativeAdView
      style={styles.nativeAd}
      adUnitId={NATIVE_AD_UNIT_ID}
      requestOptions={{
        requestNonPersonalizedAdsOnly: true,
        keywords: ['retail', 'shopping', 'market'],
      }}
      onAdLoaded={() => {
        console.log('Native ad loaded');
        setAdLoaded(true);
      }}
      onAdFailedToLoad={(error: Error) => {
        console.error('Native ad failed to load:', error);
        setAdLoaded(false);
      }}
    >
      <View style={styles.adContainer}>
        <Text style={styles.adBadge}>Ad</Text>
        <View style={styles.adIcon} nativeID="icon" />
        <View style={styles.adContent}>
          <Text style={styles.adHeadline} nativeID="headline" />
          <Text style={styles.adBody} nativeID="body" />
          <View style={styles.adButton} nativeID="call_to_action">
            <Text style={styles.adButtonText}>Learn More</Text>
          </View>
        </View>
      </View>
    </NativeAdView>
  );
};

// Banner ad component (fallback)
const BannerAdComponent: React.FC = () => {
  return (
    <BannerAd
      unitId={BANNER_AD_UNIT_ID}
      size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
      requestOptions={{
        requestNonPersonalizedAdsOnly: true,
      }}
      onAdLoaded={() => console.log('Banner ad loaded')}
      onAdFailedToLoad={(error: Error) => console.error('Banner ad failed to load:', error)}
    />
  );
};

// Props for AdMobManager
interface AdMobManagerProps {
  useNativeAd?: boolean;
}

const AdMobManager: React.FC<AdMobManagerProps> = ({ useNativeAd = false }) => {
  const { showInterstitial, adLoaded } = useInterstitialAd();

  return (
    <View style={styles.container}>
      {useNativeAd ? <NativeAdComponent /> : <BannerAdComponent />}
      {__DEV__ && <Button title="Simulate Search" onPress={showInterstitial} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#F7FAFC',
    paddingVertical: 5,
  },
  nativeAd: {
    width: '100%',
    height: 100,
    backgroundColor: '#F7FAFC',
  },
  adContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  adBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    fontSize: 12,
    color: '#FFF',
    backgroundColor: '#2563EB',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  adIcon: {
    width: 50,
    height: 50,
    marginRight: 10,
  },
  adContent: {
    flex: 1,
  },
  adHeadline: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 5,
  },
  adBody: {
    fontSize: 14,
    color: '#444',
    marginBottom: 5,
  },
  adButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  adButtonText: {
    fontSize: 14,
    color: '#FFF',
    textAlign: 'center',
  },
});

export default AdMobManager;