// screens/seller/SellerPOEditor.tsx
// FINAL: Fixed buttons + Accept/Reject confirmation + pickup_pending logic

import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  TextInput,
  Platform,
  Image,
  KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../src/api';
import PickupItemPreviewSheet from '@/components/cart/PickupItemPreviewSheet';

type Version = {
  id: string;
  version: number;
  status: string;
  total: string;
  counter_by: string;
  last_counter: 'buyer' | 'seller' | null;
  is_latest: boolean;
  created_at: string;
  message?: string;
  items: Array<{
    product_name: string | null;
    custom_name?: string | null;
    quantity: number;
    original_price: string;
    proposed_price: string;
    total_price: string;
    change_type: string;
    image_url?: string | null;
    custom_image_url?: string | null;
    added_by?: 'buyer' | 'seller';
    note?: string;
  }>;
};

export default function SellerPOEditor() {
  const { poId } = useLocalSearchParams<{ poId: string }>();
  const router = useRouter();

  const [po, setPo] = useState<any>(null);
  const [allVersions, setAllVersions] = useState<Version[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');
  const [rootPoId, setRootPoId] = useState<string | null>(null);
  const [manuallySelectedVersionId, setManuallySelectedVersionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [showVersions, setShowVersions] = useState(false);
  const [showFullMessage, setShowFullMessage] = useState(false);
  const [showPreviewSheet, setShowPreviewSheet] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 700 });
    translateY.value = withTiming(0, { duration: 700 });
  }, []);

  useEffect(() => {
    AsyncStorage.getItem('sessionToken').then(setSessionToken);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (!poId || !sessionToken) return;

      const reload = async () => {
        try {
          setLoading(true);

          const res = await api.get(`/po/seller/detail/${poId}/`, {
            headers: { Authorization: sessionToken },
          });

          const latestVersion = (res.data.versions || []).find((v: any) => v.is_latest === true);
          if (!latestVersion) return;

          const fullRes = await api.get(`/po/seller/detail/${latestVersion.id}/`, {
            headers: { Authorization: sessionToken },
          });

          const fullPo = fullRes.data.po;
          const fullVersions: Version[] = fullRes.data.versions || [];
          const sorted = [...fullVersions].sort((a, b) => a.version - b.version);

          setPo(fullPo);
          setAllVersions(sorted);
          setSelectedVersionId(sorted[sorted.length - 1].id);
          setCodeInput(''); // Clear old code
        } catch (err) {
          console.error('Focus reload failed:', err);
        } finally {
          setLoading(false);
        }
      };

      reload();
    }, [poId, sessionToken])
  );

  useEffect(() => {
    setManuallySelectedVersionId(null);
    setSelectedVersionId('');
    setAllVersions([]);
    setPo(null);
    setRootPoId(null);
    setShowVersions(false);
  }, [poId]);

  useEffect(() => {
    if (!poId || !sessionToken) return;

    const fetchFullThread = async () => {
      try {
        setLoading(true);

        const res = await api.get(`/po/seller/detail/${poId}/`, {
          headers: { Authorization: sessionToken },
        });

        const incomingVersions: Version[] = res.data.versions || [];

        const latestVersion = incomingVersions.find((v: any) => v.is_latest === true);
        if (!latestVersion) throw new Error('No latest version');

        const realRootPoId = latestVersion.id;
        setRootPoId(realRootPoId);

        const fullRes = await api.get(`/po/seller/detail/${realRootPoId}/`, {
          headers: { Authorization: sessionToken },
        });

        const fullPo = fullRes.data.po;
        const fullVersions: Version[] = fullRes.data.versions || [];
        const sorted = [...fullVersions].sort((a, b) => a.version - b.version);

        setPo(fullPo);
        setAllVersions(sorted);
        setSelectedVersionId(sorted[sorted.length - 1].id);

        if (manuallySelectedVersionId && sorted.some(v => v.id === manuallySelectedVersionId)) {
          setSelectedVersionId(manuallySelectedVersionId);
        }

        if (poId !== realRootPoId) {
          router.replace(`/cart/SellerPOEditor?poId=${realRootPoId}`);
        }
      } catch (err: any) {
        console.error('SellerPOEditor error:', err);
        Alert.alert('Error', err.response?.data?.error || 'Failed to load order');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    fetchFullThread();
  }, [poId, sessionToken, router]);

  useEffect(() => {
    if (manuallySelectedVersionId && allVersions.length > 0) {
      const exists = allVersions.some(v => v.id === manuallySelectedVersionId);
      if (exists) setSelectedVersionId(manuallySelectedVersionId);
    }
  }, [manuallySelectedVersionId, allVersions]);

  const currentVersion = useMemo(() => {
    return allVersions.find(v => v.id === selectedVersionId) || allVersions[allVersions.length - 1];
  }, [allVersions, selectedVersionId]);

  const latestVersion = useMemo(() => {
    return allVersions.find(v => v.is_latest) || allVersions[allVersions.length - 1];
  }, [allVersions]);

  const isViewingOldVersion = selectedVersionId !== latestVersion?.id;
  const isNegotiating = currentVersion && ['proposed', 'countered'].includes(currentVersion.status);
  const canAccept = po?.can_accept === true;
  const terminalStatuses = ['completed', 'cancelled_by_seller', 'rejected', 'expired'];
  // Use the actual expiry flag from backend
const isExpired = po?.is_expired === true;
const isTerminalStatus = 
  ['completed', 'cancelled_by_seller', 'rejected'].includes(po?.status) || 
  isExpired;

const showActionButtons = 
  !isViewingOldVersion && 
  isNegotiating && 
  po?.status !== 'pickup_pending' && 
  !isTerminalStatus;

  const handleVersionSelect = (versionId: string) => {
    setManuallySelectedVersionId(versionId);
    setShowVersions(false);
  };

  const getTrueChangeLabel = (item: any) => {
  const priceChanged = parseFloat(item.proposed_price) !== parseFloat(item.original_price);

  if (priceChanged) {
    if (item.added_by === 'buyer' || currentVersion?.last_counter === 'buyer') {
      return { text: 'Buyer changed price', color: '#3B82F6', bg: '#DBEAFE' };
    } else {
      return { text: 'You changed price', color: '#EA580C', bg: '#FFEDD5' };
    }
  }

  if (item.custom_name || item.change_type === 'custom') {
    return { text: 'Custom item by buyer', color: '#7C3AED', bg: '#E9D5FF' };
  }

  return null;
};

  const handleAccept = () => {
    Alert.alert(
      'Accept Offer',
      'Are you sure you want to accept this offer?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            setActionLoading(true);
            const form = new FormData();
            form.append('po_id', selectedVersionId);
            try {
              await api.post('/po/accept/', form, {
                headers: { Authorization: sessionToken!, 'Content-Type': 'multipart/form-data' },
              });
              Alert.alert('Accepted!', 'Offer accepted!', [
                { text: 'OK', onPress: () => router.replace('/cart/SellerPODashboard') }
              ]);
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.error || 'Failed to accept');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleReject = () => {
    Alert.alert(
      'Reject Offer',
      'Are you sure you want to reject this offer?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            const form = new FormData();
            form.append('po_id', selectedVersionId);
            try {
              await api.post('/po/reject/', form, {
                headers: { Authorization: sessionToken!, 'Content-Type': 'multipart/form-data' },
              });
              Alert.alert('Rejected', 'Offer has been rejected', [
                { text: 'OK', onPress: () => router.back() }
              ]);
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.error || 'Failed to reject');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleConfirmPickup = async () => {
    if (codeInput.length !== 4 || !/^\d+$/.test(codeInput)) {
      return Alert.alert('Invalid', 'Enter 4-digit code');
    }
    setActionLoading(true);
    const form = new FormData();
    form.append('po_id', poId);
    form.append('pickup_code', codeInput);
    try {
      await api.post('/po/confirm-pickup/', form, {
        headers: { Authorization: sessionToken!, 'Content-Type': 'multipart/form-data' },
      });
      Alert.alert('Success!', 'Order completed!', [
        { text: 'OK', onPress: () => router.replace('/cart/SellerPODashboard') }
      ]);
    } catch (err: any) {
      Alert.alert('Wrong Code', err.response?.data?.error || 'Invalid code');
    } finally {
      setActionLoading(false);
      setCodeInput('');
    }
  };

  const handleCancelPickup = async () => {
    Alert.alert('Cancel Pickup', 'Buyer didn’t show?', [
      { text: 'No' },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          const form = new FormData();
          form.append('po_id', poId);
          try {
            await api.post('/po/cancel-pickup/', form, {
              headers: { Authorization: sessionToken!, 'Content-Type': 'multipart/form-data' },
            });
            Alert.alert('Cancelled', 'Pickup cancelled', [{ text: 'OK', onPress: () => router.back() }]);
          } catch (err: any) {
            Alert.alert('Error', err.response?.data?.error || 'Failed');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  if (loading || !currentVersion || allVersions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#3A7BD5" />
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#60A5FA" />
          <Text style={styles.loaderText}>Loading order...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
  <>

    <SafeAreaView style={{ flex: 1 }} edges={['left', 'right', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#3A7BD5" />
      <LinearGradient colors={['#E3F2FD', '#BBDEFB']} style={{ flex: 1 }}>

        {/* PREMIUM CURVED HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.push({ pathname: 'cart/SellerPODashboard' })}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back-ios" size={26} color="#FFF" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            {po?.buyer_name || 'Customer'}
          </Text>

          {allVersions.length > 0 ? (
            <TouchableOpacity
              style={styles.versionBtn}
              onPress={() => setShowVersions(v => !v)}
            >
              <Text style={styles.versionText}>v{currentVersion.version}</Text>
              <Ionicons
                name={showVersions ? "chevron-up" : "chevron-down"}
                size={20}
                color="#FFF"
                style={{ marginLeft: 6 }}
              />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>

        {/* BEAUTIFUL VERSION DROPDOWN */}
        {showVersions && allVersions.length > 1 && (
          <View style={styles.dropdownWrapper}>
            <View style={styles.dropdownCard}>
              <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled>
                {allVersions.map((v) => (
                  <TouchableOpacity
                    key={v.id}
                    style={[
                      styles.versionItem,
                      v.id === selectedVersionId && styles.currentVersionItem,
                    ]}
                    onPress={() => handleVersionSelect(v.id)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.versionLabel}>
                        v{v.version} • {v.counter_by}
                        {v.is_latest && ' (Latest)'}
                        {v.is_latest && po?.status === 'completed' && ' (Final)'}
                      </Text>
                      {v.message ? (
                        <Text style={styles.versionMessage}>“{v.message}”</Text>
                      ) : (
                        <Text style={styles.versionSub}>
                          {new Date(v.created_at).toLocaleString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          • ₦{parseFloat(v.total).toLocaleString()}
                        </Text>
                      )}
                    </View>
                    {v.id === selectedVersionId && (
                      <Ionicons name="checkmark-circle" size={24} color="#EA580C" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        )}

        {/* OLD VERSION BANNER */}
        {isViewingOldVersion && (
          <View style={styles.oldVersionBanner}>
            <Ionicons name="alert-circle-outline" size={20} color="#F59E0B" />
            <Text style={styles.oldVersionText}>Viewing older version • Actions disabled</Text>
          </View>
        )}

        {/* CUSTOMER MESSAGE */}
        {currentVersion.message && (
          <View style={styles.messageCard}>
            <Text style={styles.messageText}>“{currentVersion.message}”</Text>
          </View>
        )}

        {/* MAIN CONTENT */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 20}
        >
          <Animated.View style={[animatedStyle, { flex: 1 }]}>
            <ScrollView
              ref={scrollViewRef}
              contentContainerStyle={{
                paddingBottom: po?.status === 'pickup_pending' ? 320 : 340,
                paddingHorizontal: 16,
                paddingTop: 12,
              }}
              showsVerticalScrollIndicator={false}
            >
              {currentVersion.items.length === 0 ? (
                <View style={styles.empty}>
                  <Ionicons name="cart-outline" size={84} color="#CBD5E1" />
                  <Text style={styles.emptyText}>No items in this offer</Text>
                </View>
              ) : (
                currentVersion.items.map((item, idx) => {
                  const isEdited = parseFloat(item.proposed_price) !== parseFloat(item.original_price);
                  const itemImage = item.custom_image_url || item.image_url;

                  const changeInfo = getTrueChangeLabel(item);
                  
                  return (
                    <View key={idx} style={styles.compactCard}>
                      <View style={styles.compactImageWrapper}>
                        {itemImage ? (
                          <Image source={{ uri: itemImage }} style={styles.compactImage} />
                        ) : (
                          <View style={styles.compactPlaceholder}>
                            <Ionicons name="image-outline" size={24} color="#94A3B8" />
                          </View>
                        )}
                      </View>

                      <View style={styles.compactContent}>
                        <Text style={styles.compactName} numberOfLines={2}>
                          {item.custom_name || item.product_name || 'Item'}
                        </Text>

                        {item.note && <Text style={styles.compactNote}>Note: {item.note}</Text>}

                        <View style={styles.compactPriceRow}>
                          {isEdited && (
                            <Text style={styles.compactOldPrice}>
                              ₦{parseFloat(item.original_price).toLocaleString()}
                            </Text>
                          )}
                          <Text style={styles.compactNewPrice}>
                            ₦{parseFloat(item.proposed_price).toLocaleString()}
                          </Text>
                          <Text style={styles.compactQuantity}>× {item.quantity}</Text>
                        </View>
                        {changeInfo && (
          <View style={[styles.compactBadge, { backgroundColor: changeInfo.bg + '30' }]}>
            <Text style={[styles.compactBadgeText, { color: changeInfo.color }]}>
              {changeInfo.text}
            </Text>
          </View>
        )}
                      </View>
                    </View>
                  );
                })
              )}

              <View style={styles.compactTotalCard}>
                <Text style={styles.compactTotalLabel}>
                  {po?.status === 'completed' ? 'Customer paid' : 'Customer wants to pay'}
                </Text>
                <Text style={styles.compactTotalPrice}>
                  ₦{parseFloat(currentVersion.total).toLocaleString()}
                </Text>
              </View>
            </ScrollView>
          </Animated.View>

          {/* PICKUP SECTION */}
          {po?.status === 'pickup_pending' && (
            <View style={styles.pickupSection}>
              <View style={styles.pickupHeader}>
                <Ionicons name="walk" size={28} color="#10B981" />
                <Text style={styles.pickupTitle}>Buyer is ready for pickup</Text>
              </View>

              <TextInput
                style={styles.codeInput}
                value={codeInput}
                onChangeText={setCodeInput}
                placeholder="Enter code"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                maxLength={4}
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 300);
                }}
              />

              {/* VIEW ITEMS BUTTON */}
              <TouchableOpacity
                style={styles.viewItemsBtn}
                onPress={() => setShowPreviewSheet(true)}
              >
                <Ionicons name="eye-outline" size={22} color="#FFF" />
                <Text style={styles.viewItemsText}>View Items in Full Screen</Text>
              </TouchableOpacity>

              <View style={styles.pickupActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={handleCancelPickup}
                  disabled={actionLoading}
                >
                  <Text style={styles.cancelText}>Buyer didn't show</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.confirmBtn, actionLoading && { opacity: 0.7 }]}
                  onPress={handleConfirmPickup}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.confirmText}>Confirm Pickup</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ACTION BUTTONS */}
          {showActionButtons && (
            <View style={styles.footer}>
              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.actionBtnReject} onPress={handleReject}>
                  <Text style={styles.actionBtnText}>Reject</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionBtnCounter}
                  onPress={() => router.push(`/cart/SellerPOCounter?poId=${latestVersion.id}`)}
                >
                  <Text style={styles.actionBtnText}>Counter</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtnAccept, (!canAccept || actionLoading) && styles.actionBtnDisabled]}
                  onPress={handleAccept}
                  disabled={!canAccept || actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={[styles.actionBtnText, !canAccept && { opacity: 0.6 }]}>
                      {canAccept ? 'Accept' : 'Waiting'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>

        {/* FULL SCREEN ITEM PREVIEW SHEET */}
        {showPreviewSheet && (
          <PickupItemPreviewSheet
            items={currentVersion.items.map((item: any) => ({
              display_name: item.custom_name || item.product_name || 'Item',
              quantity: item.quantity,
              proposed_price: item.proposed_price,
              image_url: item.image_url,
              custom_image_url: item.custom_image_url,
              note: item.note,
            }))}
            onClose={() => setShowPreviewSheet(false)}
          />
        )}

      </LinearGradient>
    </SafeAreaView>
  </>
);
}

// Your beautiful styles — 100% untouched
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 25,
    paddingHorizontal: 12,
    backgroundColor: "#3A7BD5",
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  backButton: {
    padding: 5,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
  },
  headerSpacer: {
    width: 48,
  },
  topSafeArea: {
    backgroundColor: '#3A7BD5', // same as header
    height: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  versionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 28,
  },
  
  versionText: { color: '#FFF', fontWeight: '900', fontSize: 16 },

  versionDropdownContainer: {
    position: 'absolute',
    top: 120,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    elevation: 30,
    minWidth: 340,
    maxHeight: 480,
    zIndex: 1000,
    borderWidth: 1.8,
    borderColor: '#FED7AA',
  },
  versionItem: { padding: 16, borderRadius: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  currentVersion: { backgroundColor: '#FFF4E5' },
  versionLabel: { fontSize: 16, fontWeight: '800', color: '#9A3412' },
  versionMessage: { fontSize: 14.5, color: '#EA580C', fontStyle: 'italic', marginTop: 4, fontWeight: '700' },
  versionSub: { fontSize: 13.5, color: '#64748B', marginTop: 4 },

  oldVersionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFBEB',
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#FCD34D',
  },
  oldVersionText: { fontSize: 15.5, fontWeight: '700', color: '#92400E' },

  messageCard: { marginHorizontal: 22, marginTop: 20, padding: 22, backgroundColor: '#FFF4E5', borderRadius: 28, borderWidth: 2, borderColor: '#FDBA74', elevation: 10 },
  messageText: { fontSize: 18, color: '#C2410C', lineHeight: 30, fontWeight: '600' },

  compactCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginVertical: 6,
    borderRadius: 20,
    padding: 12,
    elevation: 6,
    borderWidth: 1.2,
    borderColor: '#FED7AA',
  },
  compactImageWrapper: { marginRight: 14 },
  compactImage: { width: 68, height: 68, borderRadius: 16 },
  compactPlaceholder: { width: 68, height: 68, borderRadius: 16, backgroundColor: '#FFF4E5', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#FDBA74', borderStyle: 'dashed' },
  compactContent: { flex: 1 },
  compactName: { fontSize: 15.5, fontWeight: '800', color: '#1E293B', lineHeight: 20 },
  compactNote: { fontSize: 12.5, color: '#64748B', fontStyle: 'italic', marginTop: 3 },
  compactPriceRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  compactOldPrice: { fontSize: 13, color: '#94A3B8', textDecorationLine: 'line-through' },
  compactNewPrice: { fontSize: 17, fontWeight: '900', color: '#EA580C' },
  compactQuantity: { fontSize: 14, color: '#475569', fontWeight: '700' },
  compactBadge: { 
  marginTop: 6, 
  alignSelf: 'flex-start', 
  paddingHorizontal: 10, 
  paddingVertical: 4, 
  borderRadius: 12, 
  borderWidth: 1.2 
},
compactBadgeText: { 
  fontSize: 11, 
  fontWeight: '800' 
},

  compactTotalCard: {
    backgroundColor: '#FFF',
    margin: 20,
    marginTop: 28,
    paddingVertical: 28,
    paddingHorizontal: 28,
    borderRadius: 28,
    alignItems: 'center',
    elevation: 20,
    borderWidth: 3.5,
    borderColor: '#EA580C',
  },
  compactTotalLabel: { fontSize: 18, fontWeight: '900', color: '#9A3412' },
  compactTotalPrice: { fontSize: 42, fontWeight: '900', color: '#EA580C', marginTop: 8 },

  pickupSection: {
    marginHorizontal: 20,
    marginVertical: 20,
    backgroundColor: '#ECFDF5',
    borderRadius: 28,
    padding: 10,
    borderWidth: 2.5,
    borderColor: '#10B981',
    elevation: 12,
  },
  pickupHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  pickupTitle: { fontSize: 19, fontWeight: '900', color: '#166534', marginLeft: 12 },
  codeInput: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 20,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 12,
    color: '#166534',
    borderWidth: 2,
    borderColor: '#10B981',
  },
  pickupActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  viewItemsBtn: {
  backgroundColor: '#16A34A',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 16,
  borderRadius: 20,
  marginTop: 16,
  gap: 10,
},
viewItemsText: { color: '#FFF', fontSize: 17, fontWeight: '800' },

cancelBtn: {
  flex: 1,
  backgroundColor: '#FEF2F2',
  paddingVertical: 18,
  borderRadius: 20,
  alignItems: 'center',
  borderWidth: 2,
  borderColor: '#FCA5A5',
  marginRight: 10,
},
cancelText: { fontSize: 16, fontWeight: '800', color: '#DC2626' },

confirmBtn: {
  flex: 2,
  backgroundColor: '#10B981',
  paddingVertical: 18,
  borderRadius: 20,
  alignItems: 'center',
},
confirmText: { color: '#FFF', fontSize: 18, fontWeight: '900' },

  footer: { padding: 22, backgroundColor: '#FFF', borderTopWidth: 2, borderColor: '#FED7AA', paddingBottom: Platform.OS === 'ios' ? 44 : 24, elevation: 28 },
  buttonRow: { flexDirection: 'row', gap: 12 },
  actionBtnReject: { flex: 1, backgroundColor: '#EF4444', paddingVertical: 20, borderRadius: 20 },
  actionBtnCounter: { flex: 1, backgroundColor: '#F59E0B', paddingVertical: 20, borderRadius: 20 },
  actionBtnAccept: { flex: 1, backgroundColor: '#10B981', paddingVertical: 20, borderRadius: 20 },
  actionBtnDisabled: { backgroundColor: '#94A3B8', opacity: 0.7 },
  actionBtnText: { textAlign: 'center', fontWeight: '900', fontSize: 17, color: '#FFF' },

  empty: { paddingTop: 80, alignItems: 'center' },
  emptyText: { fontSize: 20, fontWeight: '800', color: '#64748B', marginTop: 16 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderText: { marginTop: 24, fontSize: 19, color: '#64748B', fontWeight: '700' },
});