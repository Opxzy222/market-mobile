import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, TextInput, Button, KeyboardAvoidingView, FlatList,
  Platform, Modal, TouchableWithoutFeedback, Alert, Keyboard, StatusBar, Image
} from 'react-native';
import api from '../../api';
import { Checkbox } from 'expo-checkbox';
import { useLocalSearchParams, useRouter } from 'expo-router'; 
import { Table, Row, Rows } from "react-native-table-component";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import debounce from 'lodash/debounce';
import ProductImageManager from '@/components/shop/ProductImageManager';

const UpdateShopProducts = () => {
  const [groupedProductSuggestions, setGroupedProductSuggestions] = useState({});
  const [selectedProducts, setSelectedProducts] = useState({});
  const [customProducts, setCustomProducts] = useState([]);
  const [customProductName, setCustomProductName] = useState('');
  const [customProductCategory, setCustomProductCategory] = useState('');
  const [customProductSubcategory, setCustomProductSubcategory] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [selectedItems, setSelectedItems] = useState({});
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [isSubcategoryDropdownOpen, setIsSubcategoryDropdownOpen] = useState(false);
  const [subcategorySearchQuery, setSubcategorySearchQuery] = useState("");
  const customNameInputRef = useRef(null);
  const [isFetching, setIsFetching] = useState(true);

  const [priceModalVisible, setPriceModalVisible] = useState(false);
  const [categoryResetTrigger, setCategoryResetTrigger] = useState(0);
  const [subcategoryTouched, setSubcategoryTouched] = useState(false);
  const [subcategoryResetTrigger, setSubcategoryResetTrigger] = useState(0);

  const [activePriceContext, setActivePriceContext] = useState(null);
  const [tempPrice, setTempPrice] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDeleteInfo, setPendingDeleteInfo] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalValue, setModalValue] = useState('');
  const [modalTargetInfo, setModalTargetInfo] = useState(null);
  const [dropdownState, setDropdownState] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({});
  const [loading, setLoading] = useState(false);
  const [pendingImages, setPendingImages] = useState<Record<string, any>>({});

  const params = useLocalSearchParams();
  const { shop_id } = params;
  const router = useRouter(); 
  const contentData = useMemo(() => [{ key: "content" }], []);

  const getDropdownKey = (category, subcategory) => `${category}-${subcategory}`;
  const getImageKey = (type: 'suggestion' | 'custom', id: string | number, item?: any) =>
  type === 'suggestion'
    ? `suggestion_${id}`
    : `custom_${item?.serverIndex !== undefined ? item.serverIndex : id}`;

  const openPriceModal = (context, initialPrice) => {
    setActivePriceContext(context);
    setTempPrice(initialPrice || '');
    setPriceModalVisible(true);
  };

  function formatWithCommas(number) {
    if (!number && number !== 0) return '';
    return parseInt(number, 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  const savePriceFromModal = () => {
    if (!activePriceContext) return;

    if (activePriceContext.type === 'custom') {
      handleCustomProductPriceChange(activePriceContext.index, tempPrice);
    } else if (activePriceContext.type === 'suggested') {
      handleProductPriceChange(
        activePriceContext.category,
        activePriceContext.subcategory,
        activePriceContext.productId,
        tempPrice
      );
    }

    setPriceModalVisible(false);
    setActivePriceContext(null);
    setTempPrice('');
  };

  useEffect(() => {
  const fetchProductSuggestions = async () => {
    setIsFetching(true);
    try {
      const response = await api.post(
        '/product-suggestion/',
        new URLSearchParams({ shop_id: shop_id }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const { product_suggestions, selected_products } = response.data;

      if (product_suggestions && selected_products) {
        setGroupedProductSuggestions(product_suggestions);

        // ────────────────────────────── SUGGESTED PRODUCTS ──────────────────────────────
        const preselectedProducts = selected_products
          .filter(product => !product.custom_name)
          .reduce((acc, product) => {
            const suggestion = Object.values(product_suggestions)
              .flatMap(subcats => Object.values(subcats).flat())
              .find(s => s.id === product.product_suggestion_id);

            if (suggestion) {
              const category = Object.keys(product_suggestions).find(key =>
                Object.values(product_suggestions[key]).flat().some(s => s.id === product.product_suggestion_id)
              );
              if (category) {
                const subcategory = Object.keys(product_suggestions[category]).find(subcat =>
                  product_suggestions[category][subcat].some(s => s.id === product.product_suggestion_id)
                );
                if (subcategory) {
                  acc[category] = acc[category] || {};
                  acc[category][subcategory] = acc[category][subcategory] || [];
                  acc[category][subcategory].push({
                    value: product.product_suggestion_id,
                    label: suggestion.name,
                    is_available: product.is_available,
                    price: product.price || '',
                    custom_name: product.custom_name,
                    category_id: suggestion.category_id,
                    subcategory_id: suggestion.subcategory_id,
                    category_name: category,
                    subcategory_name: subcategory,
                    image: product.image || null, // ← Preserved from server
                  });
                }
              }
            }
            return acc;
          }, {});

        setSelectedProducts(preselectedProducts);

        // ────────────────────────────── CUSTOM PRODUCTS ──────────────────────────────
        const customProductsList = selected_products
          .filter(product => product.custom_name)
          .map((product, index) => {
            const category = Object.keys(product_suggestions).find(key => key === product.category_name);
            const subcategory = category 
              ? Object.keys(product_suggestions[category]).find(subcat => subcat === product.subcategory_name)
              : undefined;

            return {
              name: product.custom_name,
              category: category || '',
              subcategory: subcategory || '',
              is_available: product.is_available,
              price: product.price || '',
              category_id: product.category_id || '',
              subcategory_id: product.subcategory_id || '',
              category_name: product.category_name || '',
              subcategory_name: product.subcategory_name || '',
              image: product.image || null,        // ← NOW SAVED FOR CUSTOM TOO!
              serverIndex: index,                  // ← Stable index from server order
            };
          });

        setCustomProducts(customProductsList);
      }
    } catch (error) {
      console.error('Error fetching product suggestions:', error);
    } finally {
      setIsFetching(false);
    }
  };

  fetchProductSuggestions();
}, [shop_id]);

  const handleAddCustomProduct = () => {
    if (!customProductName) {
      console.error('Product name is required');
      return;
    }

    if (customProductCategory && !customProductSubcategory) {
      Alert.alert('Validation Error', 'Please select a subcategory.');
      return;
    }

    const category = customProductCategory ? groupedProductSuggestions[customProductCategory] : null;
    const subcategory = category ? category[customProductSubcategory] : null;

    const category_id = subcategory ? subcategory[0]?.category_id : '';
    const subcategory_id = subcategory ? subcategory[0]?.subcategory_id : '';

    const newCustomProduct = {
      name: customProductName,
      category: customProductCategory || '',
      subcategory: customProductSubcategory || '',
      category_id: category_id || '',
      subcategory_id: subcategory_id || '',
      is_available: true,
      price: '',
      category_name: customProductCategory || '',
      subcategory_name: customProductSubcategory || '',
    };

    setCustomProducts([...customProducts, newCustomProduct]);
    setCustomProductName('');
    setCustomProductCategory('');
    setCustomProductSubcategory('');
    setCategoryResetTrigger(prev => prev + 1);
    setSubcategoryTouched(false);
  };

  const handleRemoveCustomProduct = index => {
    setCustomProducts(customProducts.filter((_, i) => i !== index));
  };

  const handleProductChange = (category, subcategory, selectedOptions) => {
    setSelectedProducts(prevState => ({
        ...prevState,
        [category]: {
            ...prevState[category],
            [subcategory]: selectedOptions.map(option => ({
                ...option,
                is_available: prevState[category]?.[subcategory]?.find(p => p.value === option.value)?.is_available ?? true,
                category_id: groupedProductSuggestions[category]?.[subcategory]?.find(p => p.id === option.value)?.category_id,
                subcategory_id: groupedProductSuggestions[category]?.[subcategory]?.find(p => p.id === option.value)?.subcategory_id,
                category_name: category,
                subcategory_name: subcategory
            }))
        }
    }));
  };

  const handleCheckboxChange = (category, subcategory, productId) => {
    setSelectedProducts(prevState => ({
        ...prevState,
        [category]: {
            ...prevState[category],
            [subcategory]: prevState[category][subcategory].map(product =>
                product.value === productId
                    ? { ...product, is_available: !product.is_available }
                    : product
            )
        }
    }));
  };

  const handleSelection = useCallback((category, subcategory, itemId, isSelected, selectedValues, products, productsMap, selectedProducts) => {
    const newSelectedValues = isSelected
      ? selectedValues.filter((id) => id !== itemId)
      : [...selectedValues, itemId];

    const selectedOptions = newSelectedValues
      .map((id) => {
        const product = productsMap[`${category}_${subcategory}_${id}`];
        if (!product) {
          console.warn(`Product with ID ${id} not found in products array`);
          return null;
        }
        const existingProduct = selectedProducts[category]?.[subcategory]?.find(
          (p) => p.value === id
        );
        return {
          value: product.id,
          label: product.name,
          is_available: existingProduct ? existingProduct.is_available : true,
          price: existingProduct?.price ?? null,
        };
      })
      .filter((option) => option !== null);

    handleProductChange(category, subcategory, selectedOptions);
  }, [handleProductChange]);

  const ProductItem = React.memo(({ item, isSelected, onSelect }) => {
    return (
      <TouchableOpacity
        onPress={onSelect}
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 10,
          backgroundColor: isSelected ? "#f0f0f0" : "#fff",
        }}
      >
        <MaterialCommunityIcons
          name={isSelected ? "checkbox-marked" : "checkbox-blank-outline"}
          size={20}
          color={isSelected ? "#4682B4" : "#CCC"}
          style={{ marginRight: 10 }}
        />
        <Text
          style={{
            fontSize: 14,
            color: "#000",
            flex: 1,
          }}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  });

  const handleProductPriceChange = (category, subcategory, productId, value) => {
    setSelectedProducts(prevState => ({
        ...prevState,
        [category]: {
            ...prevState[category],
            [subcategory]: prevState[category][subcategory].map(product =>
                product.value === productId
                    ? { ...product, price: value || '' }
                    : product
            )
        }
    }));
  };

  const handleCustomProductCheckboxChange = (index) => {
    setCustomProducts(prevState => {
        const newProducts = [...prevState];
        newProducts[index] = {
            ...newProducts[index],
            is_available: !newProducts[index].is_available
        };
        return newProducts;
    });
  };

  const handleCustomProductPriceChange = (index, value) => {
    setCustomProducts(prevState => {
        const newProducts = [...prevState];
        newProducts[index].price = value;
        return newProducts;
    });
  };

  const handleCustomProductNameChange = (index, value) => {
    const updatedProducts = [...customProducts];
    updatedProducts[index].name = value.trim();
    setCustomProducts(updatedProducts);
  };

  const handleRemoveProduct = (category, subcategory, productId) => {
    setSelectedProducts(prevState => ({
        ...prevState,
        [category]: {
            ...prevState[category],
            [subcategory]: prevState[category][subcategory].filter(product => product.value !== productId),
        }
    }));
  };

  const handleSubmitProducts = async () => {
  try {
    const formData = new FormData();
    formData.append('shop_id', shop_id);
    setLoading(true);

    const allProducts = [];
    const seenProductIds = new Set();

    // Collect all selected suggested products
    Object.entries(selectedProducts).forEach(([category, subcategories]) => {
      Object.values(subcategories).flat().forEach(product => {
        if (!seenProductIds.has(product.value)) {
          seenProductIds.add(product.value);
          allProducts.push(product);
        }
      });
    });

    // SUGGESTED PRODUCTS
    allProducts.forEach(product => {
      const productId = product.value;

      formData.append('product_suggestions[]', productId);
      formData.append(`is_available_${productId}`, product.is_available ? 'true' : 'false');
      formData.append(`price_${productId}`, product.price ? product.price.toString() : '');

      const imgKey = getImageKey('suggestion', productId);

      if (pendingImages[imgKey]) {
        // User uploaded a NEW image → replace
        formData.append(`image_suggestion_${productId}`, pendingImages[imgKey]);
      } else if (product.image) {
        // Image exists on server + user did nothing → tell backend to KEEP it
        formData.append(`keep_image_suggestion_${productId}`, 'true');
      }
      // If neither → user removed image → backend will delete it
    });

    // CUSTOM PRODUCTS
    customProducts.forEach((customProduct, index) => {
      formData.append('custom_products[]', customProduct.name);
      formData.append(`is_available_custom_${index}`, customProduct.is_available ? 'true' : 'false');
      formData.append(`price_custom_${index}`, customProduct.price || '');
      formData.append(`category_custom_${index}`, customProduct.category_id || '');
      formData.append(`subcategory_custom_${index}`, customProduct.subcategory_id || '');

      const imgKey = getImageKey('custom', index);

      if (pendingImages[imgKey]) {
        // User uploaded a new image
        formData.append(`image_custom_${index}`, pendingImages[imgKey]);
      } else if (customProduct.image) {
        // Custom product has a saved image (once you add image support in API)
        formData.append(`keep_image_custom_${index}`, 'true');
      }
      // If neither → user removed image
    });

    const response = await api.post('/update-shop-products/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    console.log('Products updated successfully:', response.data);
    Alert.alert('Success', 'Products updated successfully!');

    router.push({
      pathname: 'shop/ShopProduct',
      params: { shopId: shop_id },
    });

  } catch (error: any) {
    console.error('Error updating products:', error);
    const msg = error.response?.data?.error || 'Failed to update products. Please try again.';
    Alert.alert('Error', msg);
  } finally {
    setLoading(false);
  }
};

  const productsMap = useMemo(() => {
    const map = {};
    Object.entries(groupedProductSuggestions).forEach(([category, subcategories]) => {
      Object.entries(subcategories).forEach(([subcategory, products]) => {
        products.forEach(product => {
          map[`${category}_${subcategory}_${product.id}`] = product;
        });
      });
    });
    return map;
  }, [groupedProductSuggestions]);
  
  const sortedSubcategories = useMemo(() => {
    return Object.entries(groupedProductSuggestions).reduce((acc, [category, subcategories]) => {
      const sorted = Object.keys(subcategories).sort((a, b) => {
        const aHasProducts = selectedProducts[category]?.[a]?.length > 0;
        const bHasProducts = selectedProducts[category]?.[b]?.length > 0;
        if (aHasProducts && !bHasProducts) return -1;
        if (!aHasProducts && bHasProducts) return 1;
        return a.localeCompare(b);
      });
      acc[category] = sorted;
      return acc;
    }, {});
  }, [groupedProductSuggestions, selectedProducts]);

  const selectedValuesMap = useMemo(() => {
    const map = {};
    Object.entries(selectedProducts).forEach(([category, subcategories]) => {
      Object.entries(subcategories).forEach(([subcategory, products]) => {
        const selectedValues = products
          .map(p => p.value)
          .filter(id => id !== undefined) || [];
        map[`${category}_${subcategory}`] = new Set(selectedValues);
      });
    });
    return map;
  }, [selectedProducts]);
  
  useEffect(() => {
    const initialExpanded = Object.keys(groupedProductSuggestions).reduce((acc, category) => {
      acc[category] = true;
      return acc;
    }, {});
    setExpandedCategories(initialExpanded);
  }, [groupedProductSuggestions]);

  const toggleCategory = (category) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  useEffect(() => {
    const initializedSelectedProducts = {};
    Object.entries(groupedProductSuggestions).forEach(
      ([category, subcategories]) => {
        initializedSelectedProducts[category] = {};
        Object.keys(subcategories).forEach((subcategory) => {
          if (!initializedSelectedProducts[category][subcategory]) {
            initializedSelectedProducts[category][subcategory] =
              selectedProducts[category]?.[subcategory] || [];
          }
        });
      }
    );
    setSelectedProducts(initializedSelectedProducts);
  }, [groupedProductSuggestions]);
  
  const debouncedSetDropdownState = useCallback(
    debounce((dropdownKey, dropdownData, text, products) => {
      const filtered = products
        .filter((product) => product.name.toLowerCase().includes(text.toLowerCase()))
        .map((product) => ({
          id: product.id,
          name: product.name,
        }));
      setDropdownState((prev) => ({
        ...prev,
        [dropdownKey]: {
          ...dropdownData,
          searchQuery: text,
          filteredItems: filtered,
        },
      }));
    }, 300),
    []
  );

  return (
  <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
    <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <MaterialIcons name="arrow-back" size={26} color="white" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Edit Space Listings</Text>
      <View style={styles.headerSpacer} />
    </View>
    {isFetching ? (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    ) : (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >
        <FlatList
          data={contentData}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
          renderItem={() => (
            <View style={styles.shopManagerContent}>
              {/* Custom Product Section */}
              <View style={styles.customProductContainer}>
                {customProducts.length > 0 && (
                  <View style={styles.tableWrapper}>
                    <Text style={styles.customTableTitle}>Create Your Own Listing</Text>
                    <Table borderStyle={{ borderWidth: 1, borderColor: "#ddd" }}>
                      <Row
                        data={["Item Name", "Category", "Subcategory", "Available", "Price", "Img", "Action"]}
                        flexArr={[2.5, 1.2, 1.5, 0.8, 1.2, 0.8, 0.8]}
                        style={styles.tableHeader}
                        textStyle={styles.tableHeaderText}
                      />
                      {customProducts.map((product, index) => (
                        <Rows
                          key={index}
                          data={[
                            [
                              editingIndex === index ? (
                                <TextInput
                                  style={styles.customNameInput}
                                  value={product.name}
                                  onChangeText={(text) => handleCustomProductNameChange(index, text)}
                                  onBlur={() => setEditingIndex(null)}
                                  onSubmitEditing={() => setEditingIndex(null)}
                                  placeholder="Enter listing name"
                                  placeholderTextColor="#5A5A5A"
                                  autoFocus
                                />
                              ) : (
                                <TouchableOpacity onPress={() => setEditingIndex(index)}>
                                  <Text style={styles.tableText}>{product.name}</Text>
                                </TouchableOpacity>
                              ),
                              <Text numberOfLines={1} ellipsizeMode="tail" style={styles.tableText}>
                                {product.category_name}
                              </Text>,
                              <Text numberOfLines={1} ellipsizeMode="tail" style={styles.tableText}>
                                {product.subcategory_name}
                              </Text>,
                              <Checkbox
                                value={product.is_available}
                                onValueChange={() => handleCustomProductCheckboxChange(index)}
                                style={styles.checkBox}
                              />,
                              <TouchableOpacity
                                style={styles.priceInput}
                                onPress={() => {
                                  setModalTargetInfo({ type: "custom", index });
                                  setModalValue(product.price || "");
                                  setShowModal(true);
                                }}
                              >
                                <Text
                                  style={[{ flexShrink: 1, numberOfLines: 1 }]}
                                  numberOfLines={1}
                                  ellipsizeMode="tail"
                                >
                                  {product.price ? `₦${Number(product.price).toLocaleString()}` : "Set Price"}
                                </Text>
                              </TouchableOpacity>,
                              <ProductImageManager
  productKey={getImageKey('custom', index, product)}  // ← Pass `product` for serverIndex
  currentImageUrl={product.image ?? null}            // ← NOW SHOWS SAVED IMAGE
  onImageSelect={(key, file) => setPendingImages(p => ({ ...p, [key]: file }))}
  onImageRemove={(key) => setPendingImages(p => {
    const { [key]: _, ...rest } = p;
    return rest;
  })}
/>,
                              <TouchableOpacity
                                onPress={() => handleRemoveCustomProduct(index)}
                                style={styles.removeButton}
                              >
                                <Text style={styles.removeButtonText}>X</Text>
                              </TouchableOpacity>,
                            ],
                          ]}
                          flexArr={[2.5, 1.2, 1.5, 0.8, 1.2, 0.8, 0.8]}
                          textStyle={styles.tableText}
                        />
                      ))}
                    </Table>
                  </View>
                )}

                <View style={styles.customProductInputs}>
                  <TextInput
                    ref={customNameInputRef}
                    style={styles.customNameInput}
                    placeholder="Input your custom listing"
                    placeholderTextColor="#5A5A5A"
                    value={customProductName}
                    onChangeText={(text) => setCustomProductName(text)}
                    onSubmitEditing={() => Keyboard.dismiss()}
                    returnKeyType="done"
                    blurOnSubmit={true}
                  />
                  <View style={styles.customCard}>
                    <TouchableOpacity
                      style={styles.dropdownBox}
                      onPress={() => {
                        Keyboard.dismiss();
                        customNameInputRef.current?.blur();
                        setIsCategoryDropdownOpen(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={customProductCategory ? styles.dropdownText : styles.placeholderText}>
                        {customProductCategory || "Select Category"}
                      </Text>
                      <MaterialCommunityIcons name="chevron-down" size={20} color="#666" />
                    </TouchableOpacity>

                    <Modal
                      visible={isCategoryDropdownOpen}
                      animationType="slide"
                      transparent={true}
                      onRequestClose={() => setIsCategoryDropdownOpen(false)}
                    >
                      <TouchableWithoutFeedback onPress={() => setIsCategoryDropdownOpen(false)}>
                        <View style={styles.modalOverlay}>
                          <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Select Category</Text>
                            <TextInput
                              style={styles.searchInput}
                              placeholder="Search Categories..."
                              placeholderTextColor="#5A5A5A"
                              value={categorySearchQuery}
                              onChangeText={(text) => setCategorySearchQuery(text)}
                            />
                            <FlatList
                              data={Object.keys(groupedProductSuggestions)
                                .filter((category) => category.toLowerCase().includes(categorySearchQuery.toLowerCase()))
                                .map((category) => ({ key: category, value: category }))}
                              keyExtractor={(item) => item.key}
                              renderItem={({ item }) => (
                                <TouchableOpacity
                                  style={[
                                    styles.dropdownItem,
                                    { backgroundColor: customProductCategory === item.value ? '#e6f0ff' : '#fff' },
                                  ]}
                                  onPress={() => {
                                    setCustomProductCategory(item.value);
                                    setCustomProductSubcategory("");
                                    setSubcategoryTouched(false);
                                    setSubcategoryResetTrigger((prev) => prev + 1);
                                    setIsCategoryDropdownOpen(false);
                                    setCategorySearchQuery("");
                                  }}
                                  activeOpacity={0.8}
                                >
                                  <Text style={styles.dropdownItemText}>{item.value}</Text>
                                </TouchableOpacity>
                              )}
                              style={styles.dropdownList}
                              keyboardShouldPersistTaps="handled"
                            />
                            <TouchableOpacity
                              style={styles.modalCancelButton}
                              onPress={() => {
                                setIsCategoryDropdownOpen(false);
                                setCategorySearchQuery("");
                              }}
                            >
                              <Text style={styles.modalCancelButtonText}>Close</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </TouchableWithoutFeedback>
                    </Modal>

                    <TouchableOpacity
                      style={[styles.dropdownBox, { opacity: customProductCategory ? 1 : 0.5 }]}
                      onPress={() => {
                        if (!customProductCategory) return;
                        Keyboard.dismiss();
                        customNameInputRef.current?.blur();
                        setIsSubcategoryDropdownOpen(true);
                      }}
                      activeOpacity={0.7}
                      disabled={!customProductCategory}
                    >
                      <Text style={customProductSubcategory ? styles.dropdownText : styles.placeholderText}>
                        {customProductSubcategory || "Select Subcategory"}
                      </Text>
                      <MaterialCommunityIcons name="chevron-down" size={20} color="#666" />
                    </TouchableOpacity>

                    <Modal
                      visible={isSubcategoryDropdownOpen}
                      animationType="slide"
                      transparent={true}
                      onRequestClose={() => setIsSubcategoryDropdownOpen(false)}
                    >
                      <TouchableWithoutFeedback onPress={() => setIsSubcategoryDropdownOpen(false)}>
                        <View style={styles.modalOverlay}>
                          <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Select Subcategory</Text>
                            <TextInput
                              style={styles.searchInput}
                              placeholder="Search Subcategories..."
                              placeholderTextColor="#5A5A5A"
                              value={subcategorySearchQuery}
                              onChangeText={(text) => setSubcategorySearchQuery(text)}
                            />
                            <FlatList
                              data={
                                customProductCategory
                                  ? Object.keys(groupedProductSuggestions[customProductCategory] || {})
                                      .filter((subcategory) =>
                                        subcategory.toLowerCase().includes(subcategorySearchQuery.toLowerCase())
                                      )
                                      .map((subcategory) => ({ key: subcategory, value: subcategory }))
                                  : []
                              }
                              keyExtractor={(item) => item.key}
                              renderItem={({ item }) => (
                                <TouchableOpacity
                                  style={[
                                    styles.dropdownItem,
                                    { backgroundColor: customProductSubcategory === item.value ? '#e6f0ff' : '#fff' },
                                  ]}
                                  onPress={() => {
                                    setCustomProductSubcategory(item.value);
                                    setSubcategoryTouched(true);
                                    setIsSubcategoryDropdownOpen(false);
                                    setSubcategorySearchQuery("");
                                  }}
                                  activeOpacity={0.8}
                                >
                                  <Text style={styles.dropdownItemText}>{item.value}</Text>
                                </TouchableOpacity>
                              )}
                              style={styles.dropdownList}
                              keyboardShouldPersistTaps="handled"
                            />
                            <TouchableOpacity
                              style={styles.modalCancelButton}
                              onPress={() => {
                                setIsSubcategoryDropdownOpen(false);
                                setSubcategorySearchQuery("");
                              }}
                            >
                              <Text style={styles.modalCancelButtonText}>Close</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </TouchableWithoutFeedback>
                    </Modal>
                  </View>
                  <TouchableOpacity onPress={handleAddCustomProduct} style={styles.addButton}>
                    <Text style={styles.addButtonText}>Add New Listing</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Product Suggestions Section */}
              <View>
                {Object.entries(groupedProductSuggestions).map(([category, subcategories]) => (
                  <View key={category} style={styles.categoryContainer}>
                    <View style={styles.categoryHeader}>
                      <Text style={styles.categoryTitle}>{category}</Text>
                      <TouchableOpacity onPress={() => toggleCategory(category)}>
                        <MaterialCommunityIcons
                          name={expandedCategories[category] ? "chevron-up" : "chevron-down"}
                          size={24}
                          color="#4682B4"
                        />
                      </TouchableOpacity>
                    </View>
                    {expandedCategories[category] && (
                      <View>
                        {sortedSubcategories[category].map((subcategory) => {
                          const products = subcategories[subcategory];
                          const dropdownKey = getDropdownKey(category, subcategory);
                          const dropdownData = dropdownState[dropdownKey] || {
                            isOpen: false,
                            searchQuery: "",
                            filteredItems: products.map((product) => ({
                              id: product.id,
                              name: product.name,
                            })),
                          };
                          const selectedValues =
                            selectedProducts[category]?.[subcategory]?.map((p) => p.value).filter((id) => id !== undefined) || [];

                          return (
                            <View key={subcategory} style={styles.subcategoryContainer}>
                              <Text style={styles.subcategoryTitle}>{subcategory}</Text>
                              <TouchableOpacity
                                style={styles.dropdownBox}
                                onPress={() => {
                                  setDropdownState((prev) => ({
                                    ...prev,
                                    [dropdownKey]: { ...dropdownData, isOpen: true },
                                  }));
                                }}
                              >
                                <Text
                                  style={selectedValues.length > 0 ? styles.dropdownText : styles.placeholderText}
                                >
                                  {selectedValues.length > 0 ? `${selectedValues.length} listing(s) selected` : "Pick Products"}
                                </Text>
                                <MaterialCommunityIcons name="chevron-down" size={20} color="black" />
                              </TouchableOpacity>

                              <Modal
                                visible={dropdownData.isOpen}
                                animationType="fade"
                                transparent={true}
                                onRequestClose={() => {
                                  setDropdownState((prev) => ({
                                    ...prev,
                                    [dropdownKey]: {
                                      ...dropdownData,
                                      isOpen: false,
                                      searchQuery: "",
                                      filteredItems: products.map((product) => ({
                                        id: product.id,
                                        name: product.name,
                                      })),
                                    },
                                  }));
                                }}
                              >
                                <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" }}>
                                  <View style={{ backgroundColor: "#fff", borderRadius: 8, width: "90%", maxHeight: "80%", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }}>
                                    <TextInput
                                      style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: "#ddd", fontSize: 16, color: "#000" }}
                                      placeholder="Search Products..."
                                      placeholderTextColor="#5A5A5A"
                                      value={dropdownData.searchQuery}
                                      onChangeText={(text) => debouncedSetDropdownState(dropdownKey, dropdownData, text, products)}
                                    />
                                    <FlatList
                                      data={dropdownData.filteredItems}
                                      keyExtractor={(item) => item.id.toString()}
                                      renderItem={({ item }) => {
                                        const isSelected = selectedValuesMap[`${category}_${subcategory}`].has(item.id);
                                        return (
                                          <ProductItem
                                            item={item}
                                            isSelected={isSelected}
                                            onSelect={() =>
                                              handleSelection(
                                                category,
                                                subcategory,
                                                item.id,
                                                isSelected,
                                                selectedValues,
                                                products,
                                                productsMap,
                                                selectedProducts
                                              )
                                            }
                                          />
                                        );
                                      }}
                                      style={{ maxHeight: 300 }}
                                      initialNumToRender={15}
                                      windowSize={10}
                                      maxToRenderPerBatch={15}
                                      getItemLayout={(data, index) => ({
                                        length: 40,
                                        offset: 40 * index,
                                        index,
                                      })}
                                      removeClippedSubviews={true}
                                      extraData={selectedValuesMap[`${category}_${subcategory}`]}
                                      keyboardShouldPersistTaps="handled"
                                    />
                                    <TouchableOpacity
                                      style={{ padding: 10, backgroundColor: "#4682B4", borderRadius: 4, margin: 10, alignItems: "center" }}
                                      onPress={() => {
                                        setDropdownState((prev) => ({
                                          ...prev,
                                          [dropdownKey]: {
                                            ...dropdownData,
                                            isOpen: false,
                                            searchQuery: "",
                                            filteredItems: products.map((product) => ({
                                              id: product.id,
                                              name: product.name,
                                            })),
                                          },
                                        }));
                                      }}
                                    >
                                      <Text style={{ color: "#fff", fontSize: 16 }}>Done</Text>
                                    </TouchableOpacity>
                                  </View>
                                </View>
                              </Modal>

                              {selectedProducts[category]?.[subcategory]?.length > 0 && (
                                <View style={styles.tableWrapper}>
                                  <Table borderStyle={{ borderWidth: 1, borderColor: "#ddd" }}>
                                    <Row
                                      data={["Listing Name", "Available", "Price", "Img", "Delete"]}
                                      flexArr={[2.7, 0.8, 1.3, 0.8, 1]}
                                      style={styles.tableHeader}
                                      textStyle={styles.tableHeaderText}
                                    />
                                    {selectedProducts[category][subcategory].map((product) => (
                                      <Rows
                                        key={product.value}
                                        data={[
                                          [
                                            <View style={{ paddingVertical: 10 }}>
                                              <Text style={[styles.tableText, { flexShrink: 1, numberOfLines: 1 }]}>
                                                {product.label}
                                              </Text>
                                            </View>,
                                            <View style={{ paddingVertical: 10 }}>
                                              <Checkbox
                                                value={product.is_available}
                                                onValueChange={() => handleCheckboxChange(category, subcategory, product.value)}
                                                style={styles.checkBox}
                                              />
                                            </View>,
                                            <View style={{ paddingVertical: 10 }}>
                                              <TouchableOpacity
                                                onPress={() => {
                                                  setModalValue(product.price || "");
                                                  setModalTargetInfo({ category, subcategory, productId: product.value });
                                                  setShowModal(true);
                                                }}
                                              >
                                                <Text
                                                  style={[styles.tableText, { flexShrink: 1, numberOfLines: 1 }]}
                                                  numberOfLines={1}
                                                  ellipsizeMode="tail"
                                                >
                                                  {product.price ? `₦${Number(product.price).toLocaleString()}` : "Set Price"}
                                                </Text>
                                              </TouchableOpacity>
                                            </View>,
                                            <ProductImageManager
  productKey={getImageKey('suggestion', product.value)}
  currentImageUrl={product.image ?? null}
  onImageSelect={(key, file) => setPendingImages(p => ({ ...p, [key]: file }))}
  onImageRemove={(key) => setPendingImages(p => {
    const { [key]: _, ...rest } = p;
    return rest;
  })}
/>,
                                            <View style={{ paddingVertical: 10 }}>
                                              <TouchableOpacity
                                                onPress={() => {
                                                  setPendingDeleteInfo({ category, subcategory, productId: product.value });
                                                  setShowDeleteModal(true);
                                                }}
                                                style={styles.removeButton}
                                              >
                                                <Text style={styles.removeButtonText}>X</Text>
                                              </TouchableOpacity>
                                            </View>,
                                          ],
                                        ]}
                                        flexArr={[2.7, 0.8, 1.3, 0.8, 1]}
                                        textStyle={styles.tableText}
                                      />
                                    ))}
                                  </Table>
                                </View>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                ))}
              </View>

              {/* Final Submit */}
              <TouchableOpacity
                onPress={handleSubmitProducts}
                style={[styles.submitButton, loading && styles.searchButtonDisabled]}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitButtonText}>Update Products</Text>}
              </TouchableOpacity>

              {/* Price Edit Modal */}
              {showModal && (
                <Modal transparent animationType="fade" visible={showModal}>
                  <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                      <Text style={styles.modalTitle}>Edit Listing Price</Text>
                      <Text style={styles.modalText}>Enter a new price:</Text>
                      <TextInput
                        style={[styles.priceInput, { marginBottom: 20, width: "100%" }]}
                        value={modalValue ? formatWithCommas(modalValue) : ""}
                        onChangeText={(text) => {
                          const raw = text.replace(/[^0-9]/g, "");
                          setModalValue(raw);
                        }}
                        keyboardType="numeric"
                        placeholder="e.g. 1500"
                        placeholderTextColor="#5A5A5A"
                        autoFocus={true}
                      />
                      <View style={styles.modalButtonRow}>
                        <TouchableOpacity
                          style={styles.modalConfirmButton}
                          onPress={() => {
                            if (modalTargetInfo) {
                              if (modalTargetInfo.type === "custom") {
                                handleCustomProductPriceChange(modalTargetInfo.index, modalValue);
                              } else {
                                const { category, subcategory, productId } = modalTargetInfo;
                                handleProductPriceChange(category, subcategory, productId, modalValue);
                              }
                            }
                            setShowModal(false);
                            setModalTargetInfo(null);
                            setModalValue("");
                          }}
                        >
                          <Text style={styles.modalConfirmButtonText}>Save</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.modalCancelButton}
                          onPress={() => {
                            setShowModal(false);
                            setModalTargetInfo(null);
                            setModalValue("");
                          }}
                        >
                          <Text style={styles.modalCancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </Modal>
              )}

              {/* Delete Confirmation Modal */}
              {showDeleteModal && (
                <Modal transparent animationType="fade" visible={showDeleteModal}>
                  <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                      <Text style={styles.modalTitle}>Confirm Delete</Text>
                      <Text style={styles.modalText}>Are you sure you want to remove this listing?</Text>
                      <View style={styles.modalButtonRow}>
                        <TouchableOpacity
                          style={styles.modalConfirmButton}
                          onPress={() => {
                            if (pendingDeleteInfo) {
                              const { category, subcategory, productId } = pendingDeleteInfo;
                              setSelectedProducts((prev) => {
                                const updatedCategory = { ...prev[category] };
                                updatedCategory[subcategory] = updatedCategory[subcategory].filter((p) => p.value !== productId);
                                return { ...prev, [category]: updatedCategory };
                              });
                              setShowDeleteModal(false);
                              setPendingDeleteInfo(null);
                            }
                          }}
                        >
                          <Text style={styles.modalConfirmButtonText}>Delete</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.modalCancelButton}
                          onPress={() => {
                            setShowDeleteModal(false);
                            setPendingDeleteInfo(null);
                          }}
                        >
                          <Text style={styles.modalCancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </Modal>
              )}
            </View>
          )}
        />
      </KeyboardAvoidingView>
    )}
  </SafeAreaView>
);
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
  },
  headerSpacer: {
    width: 42,
  },
  shopManagerContent: {
    flex: 1,
  },
  customProductContainer: {
    marginBottom: 24,
  },
  customTableTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#495057",
    marginBottom: 8,
  },
  tableWrapper: {
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 16,
    backgroundColor: "#ffffff",
    borderColor: "#e9ecef",
    borderWidth: 1,
  },
  tableHeader: {
    height: 40,
    backgroundColor: "#343a40",
  },
  tableHeaderText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "bold",
    textAlign: "center",
  },
  tableText: {
    fontSize: 14,
    color: "#495057",
    textAlign: "flex-start",
    marginLeft: 5,
  },
  customProductInputs: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 10,
    marginTop: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 5,
  },
  customNameInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
    color: '#333',
  },
  customCard: {
    flexDirection: 'column',
    gap: 12,
  },
  checkBox: {
    alignSelf: "center",
  },
  priceInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 10,
    height: 50,
    fontSize: 16,
    color: '#333',
  },
  removeButtonText: {
    color: "red",
    fontSize: 17,
    textAlign: "center",
    fontWeight: "1900"
  },
  dropdownBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  placeholderText: {
    fontSize: 16,
    color: 'grey',
    fontWeight: '400',
  },
  dropdownList: {
    borderRadius: 12,
    borderColor: '#ddd',
  },
  addButton: {
    backgroundColor: "#007bff",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 4,
    elevation: 2,
    marginTop: 12
  },
  addButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  categoryContainer: {
    marginBottom: 32,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f1f3f5',
    borderRadius: 10,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 10,
  },
  subcategoryContainer: {
    marginBottom: 20,
    paddingLeft: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#adb5bd',
    paddingVertical: 8,
  },
  subcategoryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 6,
  },
  submitButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    alignItems: "center",
    marginTop: 0,
    marginBottom: 20
  },
  searchButtonDisabled: {
    backgroundColor: '#A7C7E7',
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    color: '#666',
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: '#d9534f',
    padding: 10,
    borderRadius: 10,
    marginRight: 5,
    alignItems: 'center',
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#5bc0de',
    padding: 9,
    borderRadius: 10,
    marginLeft: 5,
    alignItems: 'center',
    paddingHorizontal: 17
  },
  modalConfirmButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalCancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  searchInput: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    fontSize: 16,
    color: "#000",
    marginBottom: 10,
  },
  dropdownItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  dropdownItemText: {
    fontSize: 16,
    color: "#000",
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#495057',
    fontWeight: '500',
  },
});

export default UpdateShopProducts;