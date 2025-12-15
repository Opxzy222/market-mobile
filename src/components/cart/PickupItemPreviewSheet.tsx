// components/PickupItemPreviewSheet.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  Dimensions,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, FadeInDown } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');
const CARD_HEIGHT = 140; // Compact but elegant

type Item = {
  display_name: string;
  quantity: number;
  proposed_price: string;
  image_url?: string | null;
  custom_image_url?: string | null;
  note?: string | null;
};

type PickupSheetProps = {
  items: Item[];
  onClose: () => void;
  buyerName?: string;
  title?: string;
};

export const PickupItemPreviewSheet = ({
  items,
  onClose,
  buyerName = 'Customer',
  title = 'Order Items',
}: PickupSheetProps) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const totalAmount = items.reduce(
    (sum, item) => sum + parseFloat(item.proposed_price) * item.quantity,
    0
  );

  return (
    <>
      {/* Backdrop */}
      <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)} style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View entering={FadeInDown.springify().damping(20)} style={styles.sheet}>
        <SafeAreaView style={{ flex: 1 }}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={26} color="#1E293B" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{title}</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Buyer Tag */}
          {buyerName !== 'Customer' && (
            <Animated.View entering={FadeInDown.delay(100)} style={styles.buyerTag}>
              <Ionicons name="person-circle" size={28} color="#16A34A" />
              <Text style={styles.buyerText}>{buyerName}</Text>
              <View style={styles.readyBadge}>
                <Text style={styles.readyText}>Ready for Pickup</Text>
              </View>
            </Animated.View>
          )}

          {/* Scrollable List */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            bounces={true}
            overScrollMode="always"
          >
            {items.map((item, index) => {
              const image = item.custom_image_url || item.image_url;

              return (
                <Animated.View
                  key={index}
                  entering={FadeInDown.delay(index * 80).springify()}
                  style={styles.itemCard}
                >
                  {/* Image */}
                  <TouchableOpacity
                    activeOpacity={0.95}
                    onPress={() => image && setSelectedImage(image)}
                    style={styles.imageWrapper}
                  >
                    {image ? (
                      <Image source={{ uri: image }} style={styles.itemImage} resizeMode="cover" />
                    ) : (
                      <View style={styles.placeholder}>
                        <Ionicons name="image-outline" size={32} color="#CBD5E1" />
                      </View>
                    )}
                    {/* Quantity Badge on Image */}
                    <View style={styles.quantityBadge}>
                      <Text style={styles.quantityText}>{item.quantity}x</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Details */}
                  <View style={styles.detailsContainer}>
                    <Text style={styles.itemName} numberOfLines={3}>
                      {item.display_name}
                    </Text>

                    {item.note ? (
                      <View style={styles.noteTag}>
                        <Ionicons name="chatbubble-ellipses" size={14} color="#DC2626" />
                        <Text style={styles.noteText} numberOfLines={1}>
                          {item.note}
                        </Text>
                      </View>
                    ) : null}

                    <Text style={styles.priceText}>
                      ₦{parseFloat(item.proposed_price).toLocaleString()}
                    </Text>
                  </View>

                  {/* Right Arrow Indicator */}
                  <Ionicons name="chevron-forward" size={24} color="#94A3B8" />
                </Animated.View>
              );
            })}

            {/* Extra space for floating total */}
            <View style={{ height: 100 }} />
          </ScrollView>

          {/* Floating Total Bar */}
          <Animated.View entering={FadeInDown.delay(300)} style={styles.totalContainer}>
            <View style={styles.totalInner}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalAmount}>₦{totalAmount.toLocaleString()}</Text>
            </View>
          </Animated.View>
        </SafeAreaView>
      </Animated.View>

      {/* Full Screen Image Modal */}
      <Modal visible={!!selectedImage} transparent animationType="fade">
        <SafeAreaView style={styles.fullscreenModal}>
          <TouchableOpacity style={styles.fullscreenClose} onPress={() => setSelectedImage(null)}>
            <Ionicons name="close" size={32} color="#FFF" />
          </TouchableOpacity>
          <Image
            source={{ uri: selectedImage! }}
            style={styles.fullscreenImage}
            resizeMode="contain"
          />
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.92,
    backgroundColor: '#FAFAFA',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E293B',
  },

  buyerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 16,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#86EFAC',
  },
  buyerText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#166534',
  },
  readyBadge: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  readyText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 120,
  },

  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
    height: CARD_HEIGHT,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 16,
  },
  itemImage: {
    width: 100,
    height: 100,
    borderRadius: 18,
  },
  placeholder: {
    width: 100,
    height: 100,
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  quantityBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#10B981',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  quantityText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '900',
  },

  detailsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 24,
    marginBottom: 6,
  },
  noteTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
    marginBottom: 8,
  },
  noteText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '600',
  },
  priceText: {
    fontSize: 19,
    fontWeight: '900',
    color: '#16A34A',
  },

  totalContainer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: '#1E293B',
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 28,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  totalInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  totalAmount: {
    fontSize: 26,
    fontWeight: '900',
    color: '#10B981',
  },

  // Fullscreen Image
  fullscreenModal: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenClose: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: width * 0.95,
    height: height * 0.8,
  },
});

export default PickupItemPreviewSheet;