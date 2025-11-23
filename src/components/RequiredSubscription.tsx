import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SubscriptionRequiredModalProps {
  visible: boolean;
  onClose: () => void;
}

const SubscriptionRequiredModal = ({ visible, onClose }: SubscriptionRequiredModalProps) => {
  const router = useRouter();
  const pathname = usePathname();

  const [subscription, setSubscription] = useState<{
    plan: string | null;
    end_date: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      const loadSubscription = async () => {
        try {
          const cache = await AsyncStorage.getItem("subscription_cache");
          if (cache) {
            const parsed = JSON.parse(cache);
            setSubscription({
              plan: parsed.plan || null,
              end_date: parsed.end_date || null,
            });
          } else {
            setSubscription({ plan: null, end_date: null });
          }
        } catch (error) {
          console.error("Failed to load subscription_cache:", error);
          setSubscription({ plan: null, end_date: null });
        } finally {
          setLoading(false);
        }
      };
      loadSubscription();
    } else {
      setLoading(true);
      setSubscription(null);
    }
  }, [visible]);

  const handleUpgrade = () => {
    onClose(); // Close modal
    router.push({
      pathname: '/shop/Subscription',
      params: {
        prevRoute: pathname,
        currentPlan: subscription?.plan || 'none',
        endDate: subscription?.end_date || 'N/A',
      },
    });
  };

  const handleClose = (e: any) => {
    e.stopPropagation(); // Prevent overlay from triggering
    onClose();
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        {/* Stop propagation on modal content */}
        <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Exclusive Feature</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <Text style={styles.description}>
            This feature is exclusive to{' '}
            <Text style={styles.bold}>Standard</Text> and{' '}
            <Text style={styles.bold}>Premium</Text> subscribers.
            {'\n\n'}
            Upgrade now to unlock the full experience!
          </Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#2563eb" />
            </View>
          ) : (
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                <Text style={styles.cancelText}>Maybe Later</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade}>
                <Text style={styles.upgradeText}>Upgrade Now</Text>
              </TouchableOpacity>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  closeButton: {
    padding: 4,
  },
  description: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
    marginBottom: 24,
  },
  bold: {
    fontWeight: '700',
    color: '#1e293b',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  cancelText: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '500',
  },
  upgradeButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  upgradeText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
});

export default SubscriptionRequiredModal;