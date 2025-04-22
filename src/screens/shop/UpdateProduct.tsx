import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, TextInput, Button, KeyboardAvoidingView, FlatList,
  Platform, Modal, TouchableWithoutFeedback, Alert
} from 'react-native';
import axios from 'axios';
import { Checkbox } from 'expo-checkbox';
import { useLocalSearchParams, useRouter } from 'expo-router'; 
import { SelectList } from "react-native-dropdown-select-list";
import { Table, Row, Rows } from "react-native-table-component";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";


const UpdateShopProducts = () => {
  const [groupedProductSuggestions, setGroupedProductSuggestions] = useState({});
  const [selectedProducts, setSelectedProducts] = useState({});
  const [customProducts, setCustomProducts] = useState([]);
  const [customProductName, setCustomProductName] = useState('');
  const [customProductCategory, setCustomProductCategory] = useState('');
  const [customProductSubcategory, setCustomProductSubcategory] = useState('');
  const [editingIndex, setEditingIndex] = useState(null); // Track which product is being edited
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [selectedItems, setSelectedItems] = useState({});

  // To control the modal's visibility
  const [priceModalVisible, setPriceModalVisible] = useState(false);
  const [categoryResetTrigger, setCategoryResetTrigger] = useState(0);
  const [subcategoryTouched, setSubcategoryTouched] = useState(false);
  const [subcategoryResetTrigger, setSubcategoryResetTrigger] = useState(0);

// To store the current context: which product, in which section (custom or suggested)
  const [activePriceContext, setActivePriceContext] = useState(null); // null or an object like: { type: 'custom' | 'suggested', index or category/subcategory/id }

// To store the temporary value in the modal input before saving
  const [tempPrice, setTempPrice] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDeleteInfo, setPendingDeleteInfo] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalValue, setModalValue] = useState('');
  const [modalTargetInfo, setModalTargetInfo] = useState(null); // category, subcategory, productId
  const [dropdownState, setDropdownState] = useState({}); // { [dropdownKey]: { isOpen: boolean, searchQuery: string, filteredItems: array } }


  const params = useLocalSearchParams();
  const { shop_id } = params;
  const router = useRouter(); 
  const contentData = useMemo(() => [{ key: "content" }], []);
  // Add this state at the top of your component, alongside other useState hooks
const [openDropdown, setOpenDropdown] = useState({});

// Helper function to generate a unique key for each dropdown
const getDropdownKey = (category, subcategory) => `${category}-${subcategory}`;

  const openPriceModal = (context, initialPrice) => {
  setActivePriceContext(context);  // e.g. { type: 'custom', index: 0 } or { type: 'suggested', category, subcategory, productId }
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
  try {
    const response = await fetch("https://retail-alvinia-goza-f6a0e4f7.koyeb.app/product-suggestion/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ shop_id: shop_id }).toString(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Fetch Success:", data);

    // Destructure the response
    const { product_suggestions, selected_products } = data;

        if (product_suggestions && selected_products) {
          setGroupedProductSuggestions(product_suggestions);

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
                    });
                  }
                }
              }
              return acc;
            }, {});

          setSelectedProducts(preselectedProducts);

          const customProductsList = selected_products
            .filter(product => product.custom_name)
            .map(product => {
              const category = Object.keys(product_suggestions).find(key => key === product.category_name);
              const subcategory = category ? Object.keys(product_suggestions[category]).find(subcat => subcat === product.subcategory_name) : undefined;

              return {
                name: product.custom_name,
                category: category,
                subcategory: subcategory,
                is_available: product.is_available,
                price: product.price || '',
                category_id: product.category_id,
                subcategory_id: product.subcategory_id,
                category_name: category,
                subcategory_name: subcategory,
              };
            });

          setCustomProducts(customProductsList);
        } else {
          console.error('Error: Missing product suggestions or selected products in the response.');
        }
      } catch (error) {
        console.error('Error fetching product suggestions:', error);
      }
    };

    fetchProductSuggestions();
  }, [shop_id]);

  const openPriceModalForCustomCreate = () => {
    setModalTargetInfo({ type: "custom", phase: "create" });
    setModalValue("");
    setShowModal(true);
};

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

  const resetCategoryAndSubcategory = () => {
  setCustomProductCategory('');
  setCustomProductSubcategory('');
  setCategoryResetTrigger(prev => prev + 1); // see below
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
    updatedProducts[index].name = value;
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

       // Deduplicate products and filter out invalid entries
const allProducts = [];
const seenProductIds = new Set();

Object.entries(selectedProducts).forEach(([category, subcategories]) => {
  Object.values(subcategories).flat().forEach(product => {
    if (!seenProductIds.has(product.value)) {
      seenProductIds.add(product.value);
      allProducts.push(product);
    }
  });
});

// Construct formData
allProducts.forEach(product => {
  // Append the product suggestion ID
  formData.append('product_suggestions[]', product.value);

  // Append is_available in the format is_available_${product_suggestion_id}
  formData.append(`is_available_${product.value}`, product.is_available ? 'true' : 'false');

  // Append price in the format price_${product_suggestion_id}
  // If price is null or undefined, send an empty string (backend will handle it as None)
  formData.append(`price_${product.value}`, product.price ? product.price.toString() : '');

  // Log for debugging
  console.log(`Appending product ${product.value}:`, {
    product_suggestion: product.value,
    is_available: `is_available_${product.value}: ${product.is_available ? 'true' : 'false'}`,
    price: `price_${product.value}: ${product.price ? product.price.toString() : ''}`,
  });

  // Note: category_id and subcategory_id are not needed for product suggestions
  // (They are used for custom products, which we're not handling in this loop)
});

        customProducts.forEach((customProduct, index) => {
            formData.append('custom_products[]', customProduct.name);
            formData.append(`is_available_custom_${index}`, customProduct.is_available);
            formData.append(`price_custom_${index}`, customProduct.price);
            formData.append(`category_custom_${index}`, customProduct.category_id || ''); // Allow empty category_id
            formData.append(`subcategory_custom_${index}`, customProduct.subcategory_id || ''); 
        });

        const response = await axios.post('https://retail-alvinia-goza-f6a0e4f7.koyeb.app/update-shop-products/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        console.log('Products updated:', response.data);
        router.push({pathname: 'shop/ShopProduct', params: { shopId: shop_id }, });
    } catch (error) {
        console.error('Error updating products:', error);
    }
};
  
  // Compute productsMap and selectedValuesMap at the top level
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

return (
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
          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmitProducts}
            style={styles.submitButton}
          >
            <Text style={styles.submitButtonText}>Update Products</Text>
          </TouchableOpacity>

          {/* Custom Product Section */}
          <View style={styles.customProductContainer}>
            {customProducts.length > 0 && (
              <View style={styles.tableWrapper}>
                <Text style={styles.customTableTitle}>Custom Products</Text>
                <Table borderStyle={{ borderWidth: 1, borderColor: "#ddd" }}>
                  <Row
                    data={[
                      "Product Name",
                      "Category",
                      "Subcategory",
                      "Available",
                      "Price",
                      "Action",
                    ]}
                    flexArr={[2.5, 1.2, 1.5, 0.8, 1.2, 0.8]}
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
                              onChangeText={(text) =>
                                handleCustomProductNameChange(index, text)
                              }
                              onBlur={() =>
                                handleSaveProductName(index, product.name)
                              }
                              onSubmitEditing={() =>
                                handleSaveProductName(index, product.name)
                              }
                              placeholder="Enter product name"
                              autoFocus
                            />
                          ) : (
                            <TouchableOpacity
                              onPress={() => setEditingIndex(index)}
                            >
                              <Text style={styles.tableText}>
                                {product.name}
                              </Text>
                            </TouchableOpacity>
                          ),
                          <Text
                            numberOfLines={1}
                            ellipsizeMode="tail"
                            style={styles.tableText}
                          >
                            {product.category_name}
                          </Text>,
                          <Text
                            numberOfLines={1}
                            ellipsizeMode="tail"
                            style={styles.tableText}
                          >
                            {product.subcategory_name}
                          </Text>,
                          <Checkbox
                            value={product.is_available}
                            onValueChange={() =>
                              handleCustomProductCheckboxChange(index)
                            }
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
                              {product.price
                                ? `₦${Number(product.price).toLocaleString()}`
                                : "Set Price"}
                            </Text>
                          </TouchableOpacity>,
                          <TouchableOpacity
                            onPress={() => handleRemoveCustomProduct(index)}
                            style={styles.removeButton}
                          >
                            <Text style={styles.removeButtonText}>X</Text>
                          </TouchableOpacity>,
                        ],
                      ]}
                      flexArr={[2.5, 1.2, 1.5, 0.8, 1.2, 0.8]}
                      textStyle={styles.tableText}
                    />
                  ))}
                </Table>
              </View>
            )}

            <View style={styles.customProductInputs}>
              <TextInput
                style={styles.customNameInput}
                placeholder="Input your product name"
                value={customProductName}
                onChangeText={(text) => setCustomProductName(text)}
              />

              <View style={styles.customCard}>
                {/* Category dropdown */}
                <SelectList
                  key={`category-${categoryResetTrigger}`}
                  data={Object.keys(groupedProductSuggestions).map(
                    (category) => ({
                      key: category,
                      value: category,
                    })
                  )}
                  setSelected={(selectedCategory) => {
                    setCustomProductCategory(selectedCategory || "");
                    setCustomProductSubcategory("");
                    setSubcategoryTouched(false);
                    setSubcategoryResetTrigger((prev) => prev + 1);
                  }}
                  placeholder="Category"
                  boxStyles={styles.dropdownBox}
                  dropdownStyles={styles.dropdownList}
                  defaultOption={
                    customProductCategory
                      ? {
                          key: customProductCategory,
                          value: customProductCategory,
                        }
                      : null
                  }
                />

                {/* Subcategory dropdown */}
                <SelectList
                  key={`subcategory-${subcategoryResetTrigger}`}
                  data={
                    customProductCategory
                      ? Object.keys(
                          groupedProductSuggestions[customProductCategory] || {}
                        ).map((subcategory) => ({
                          key: subcategory,
                          value: subcategory,
                        }))
                      : []
                  }
                  setSelected={(selectedSubcategory) =>
                    setCustomProductSubcategory(selectedSubcategory || "")
                  }
                  placeholder="Subcategory"
                  boxStyles={styles.dropdownBox}
                  dropdownStyles={styles.dropdownList}
                  defaultOption={
                    customProductSubcategory
                      ? {
                          key: customProductSubcategory,
                          value: customProductSubcategory,
                        }
                      : null
                  }
                  disabled={!customProductCategory || !subcategoryTouched}
                  onFocus={() => setSubcategoryTouched(true)}
                />
              </View>

              <TouchableOpacity
                onPress={handleAddCustomProduct}
                style={styles.addButton}
              >
                <Text style={styles.addButtonText}>Add Custom Product</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Product Suggestions Section */}
          <View>
            {Object.entries(groupedProductSuggestions).map(
              ([category, subcategories]) => (
                <View key={category} style={styles.categoryContainer}>
                  <Text style={styles.categoryTitle}>{category}</Text>
                  {Object.entries(subcategories).map(
                    ([subcategory, products]) => {
                      const dropdownKey = getDropdownKey(category, subcategory);
                      const dropdownData = dropdownState[dropdownKey] || {
                        isOpen: false,
                        searchQuery: "",
                        filteredItems: products.map((product) => ({
                          id: product.id,
                          name: product.name,
                        })),
                      };

                      // Ensure selectedProducts is initialized
                      const selectedValues =
                        selectedProducts[category]?.[subcategory]
                          ?.map((p) => p.value)
                          .filter((id) => id !== undefined) || [];

                      console.log(
                        `Selected Products for ${category}/${subcategory}:`,
                        selectedProducts[category]?.[subcategory]
                      );

                      // Handle selection logic
                      const handleSelection = (itemId, isSelected) => {
                        const newSelectedValues = isSelected
                          ? selectedValues.filter(id => id !== itemId)
                          : [...selectedValues, itemId];

                        console.log(
                          `Category: ${category}, Subcategory: ${subcategory}`
                        );
                        console.log("Products:", products);
                        console.log("Selected IDs:", newSelectedValues);

                        const selectedOptions = newSelectedValues.map(id => {
                          const product = productsMap[`${category}_${subcategory}_${id}`];
                          if (!product) {
                            console.warn(
                              `Product with ID ${id} not found in products array`
                            );
                            return null;
                          }
                          const existingProduct =
                            selectedProducts[category]?.[subcategory]?.find(
                              p => p.value === id
                            );
                          return {
                            value: product.id,
                            label: product.name,
                            is_available: existingProduct
                              ? existingProduct.is_available
                              : true,
                            price: existingProduct?.price ?? null,
                          };
                        }).filter(option => option !== null);

                        handleProductChange(category, subcategory, selectedOptions);
                      };

                      // Memoized Item Component
                      const ProductItem = React.memo(
                        ({ item, isSelected, onSelect }) => {
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
                                name={
                                  isSelected
                                    ? "checkbox-marked"
                                    : "checkbox-blank-outline"
                                }
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
                        }
                      );

                      return (
                        <View
                          key={subcategory}
                          style={styles.subcategoryContainer}
                        >
                          <Text style={styles.subcategoryTitle}>
                            {subcategory}
                          </Text>
                          {/* Custom Dropdown Trigger */}
                          <TouchableOpacity
                            style={styles.dropdownBox}
                            onPress={() => {
                              setDropdownState((prev) => ({
                                ...prev,
                                [dropdownKey]: {
                                  ...dropdownData,
                                  isOpen: true,
                                },
                              }));
                            }}
                          >
                            <Text
                              style={
                                selectedValues.length > 0
                                  ? styles.dropdownText
                                  : styles.placeholderText
                              }
                            >
                              {selectedValues.length > 0
                                ? `${selectedValues.length} product(s) selected`
                                : "Pick Products"}
                            </Text>
                            <MaterialCommunityIcons
                              name="chevron-down"
                              size={20}
                              color="#CCC"
                            />
                          </TouchableOpacity>

                          {/* Custom Dropdown Modal */}
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
                            <View
                              style={{
                                flex: 1,
                                backgroundColor: "rgba(0,0,0,0.5)",
                                justifyContent: "center",
                                alignItems: "center",
                              }}
                            >
                              <View
                                style={{
                                  backgroundColor: "#fff",
                                  borderRadius: 8,
                                  width: "90%",
                                  maxHeight: "80%",
                                  shadowColor: "#000",
                                  shadowOffset: { width: 0, height: 2 },
                                  shadowOpacity: 0.1,
                                  shadowRadius: 4,
                                  elevation: 3,
                                }}
                              >
                                {/* Search Bar */}
                                <TextInput
                                  style={{
                                    padding: 10,
                                    borderBottomWidth: 1,
                                    borderBottomColor: "#ddd",
                                    fontSize: 16,
                                    color: "#000",
                                  }}
                                  placeholder="Search Products..."
                                  placeholderTextColor="#CCC"
                                  value={dropdownData.searchQuery}
                                  onChangeText={(text) => {
                                    const filtered = products
                                      .filter((product) =>
                                        product.name
                                          .toLowerCase()
                                          .includes(text.toLowerCase())
                                      )
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
                                  }}
                                />
                                {/* Product List */}
                                <FlatList
                                  data={dropdownData.filteredItems}
                                  keyExtractor={(item) => item.id.toString()}
                                  renderItem={({ item }) => {
                                    const isSelected = selectedValuesMap[
                                      `${category}_${subcategory}`
                                    ].has(item.id);
                                    return (
                                      <ProductItem
                                        item={item}
                                        isSelected={isSelected}
                                        onSelect={() =>
                                          handleSelection(item.id, isSelected)
                                        }
                                      />
                                    );
                                  }}
                                  style={{ maxHeight: 300 }}
                                  initialNumToRender={10}
                                  windowSize={5}
                                  maxToRenderPerBatch={10}
                                  getItemLayout={(data, index) => ({
                                    length: 40,
                                    offset: 40 * index,
                                    index,
                                  })}
                                  removeClippedSubviews={true}
                                  extraData={
                                    selectedValuesMap[`${category}_${subcategory}`]
                                  }
                                />
                                {/* Close Button */}
                                <TouchableOpacity
                                  style={{
                                    padding: 10,
                                    backgroundColor: "#4682B4",
                                    borderRadius: 4,
                                    margin: 10,
                                    alignItems: "center",
                                  }}
                                  onPress={() => {
                                    setDropdownState((prev) => ({
                                      ...prev,
                                      [dropdownKey]: {
                                        ...dropdownData,
                                        isOpen: false,
                                        searchQuery: "",
                                        filteredItems: products.map(
                                          (product) => ({
                                            id: product.id,
                                            name: product.name,
                                          })
                                        ),
                                      },
                                    }));
                                  }}
                                >
                                  <Text
                                    style={{
                                      color: "#fff",
                                      fontSize: 16,
                                    }}
                                  >
                                    Done
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          </Modal>

                          {/* Selected Products Table */}
                          {selectedProducts[category]?.[subcategory]?.length >
                            0 && (
                            <View style={styles.tableWrapper}>
                              <Table
                                borderStyle={{
                                  borderWidth: 1,
                                  borderColor: "#ddd",
                                }}
                              >
                                <Row
                                  data={[
                                    "Product Name",
                                    "Available",
                                    "Price",
                                    "Delete",
                                  ]}
                                  flexArr={[2.7, 0.8, 1.3, 1]}
                                  style={styles.tableHeader}
                                  textStyle={styles.tableHeaderText}
                                />
                                {selectedProducts[category][subcategory].map(
                                  (product) => (
                                    <Rows
                                      key={product.value}
                                      data={[
                                        [
                                          <View style={{ paddingVertical: 10 }}>
                                            <Text
                                              style={[
                                                styles.tableText,
                                                { flexShrink: 1, numberOfLines: 1 },
                                              ]}
                                            >
                                              {product.label}
                                            </Text>
                                          </View>,
                                          <View style={{ paddingVertical: 10 }}>
                                            <Checkbox
                                              value={product.is_available}
                                              onValueChange={() =>
                                                handleCheckboxChange(
                                                  category,
                                                  subcategory,
                                                  product.value
                                                )
                                              }
                                              style={styles.checkBox}
                                            />
                                          </View>,
                                          <View style={{ paddingVertical: 10 }}>
                                            <TouchableOpacity
                                              onPress={() => {
                                                setModalValue(product.price || "");
                                                setModalTargetInfo({
                                                  category,
                                                  subcategory,
                                                  productId: product.value,
                                                });
                                                setShowModal(true);
                                              }}
                                            >
                                              <Text
                                                style={[
                                                  styles.tableText,
                                                  { flexShrink: 1, numberOfLines: 1 },
                                                ]}
                                                numberOfLines={1}
                                                ellipsizeMode="tail"
                                              >
                                                {product.price
                                                  ? `₦${Number(
                                                      product.price
                                                    ).toLocaleString()}`
                                                  : "Set Price"}
                                              </Text>
                                            </TouchableOpacity>
                                          </View>,
                                          <View style={{ paddingVertical: 10 }}>
                                            <TouchableOpacity
                                              onPress={() => {
                                                setPendingDeleteInfo({
                                                  category,
                                                  subcategory,
                                                  productId: product.value,
                                                });
                                                setShowDeleteModal(true);
                                              }}
                                              style={styles.removeButton}
                                            >
                                              <Text style={styles.removeButtonText}>
                                                X
                                              </Text>
                                            </TouchableOpacity>
                                          </View>,
                                        ],
                                      ]}
                                      flexArr={[2.7, 0.8, 1.3, 1]}
                                      textStyle={styles.tableText}
                                    />
                                  )
                                )}
                              </Table>
                            </View>
                          )}
                        </View>
                      );
                    }
                  )}
                </View>
              )
            )}
          </View>

          {/* Final Submit */}
          <TouchableOpacity
            onPress={handleSubmitProducts}
            style={styles.submitButton}
          >
            <Text style={styles.submitButtonText}>Update Products</Text>
          </TouchableOpacity>

          {/* Price Edit Modal */}
          {showModal && (
            <Modal transparent animationType="fade" visible={showModal}>
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Edit Product Price</Text>
                  <Text style={styles.modalText}>Enter a new price:</Text>
                  <TextInput
                    style={[
                      styles.priceInput,
                      { marginBottom: 20, width: "100%" },
                    ]}
                    value={modalValue ? formatWithCommas(modalValue) : ""}
                    onChangeText={(text) => {
                      const raw = text.replace(/[^0-9]/g, ""); // Strip non-numeric
                      setModalValue(raw);
                    }}
                    keyboardType="numeric"
                    placeholder="e.g. 1500"
                    autoFocus={true}
                  />
                  <View style={styles.modalButtonRow}>
                    <TouchableOpacity
                      style={styles.modalConfirmButton}
                      onPress={() => {
                        if (modalTargetInfo) {
                          if (modalTargetInfo.type === "custom") {
                            handleCustomProductPriceChange(
                              modalTargetInfo.index,
                              modalValue
                            );
                          } else {
                            const { category, subcategory, productId } =
                              modalTargetInfo;
                            handleProductPriceChange(
                              category,
                              subcategory,
                              productId,
                              modalValue
                            );
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
                  <Text style={styles.modalText}>
                    Are you sure you want to remove this product?
                  </Text>
                  <View style={styles.modalButtonRow}>
                    <TouchableOpacity
                      style={styles.modalConfirmButton}
                      onPress={() => {
                        if (pendingDeleteInfo) {
                          const { category, subcategory, productId } =
                            pendingDeleteInfo;
                          setSelectedProducts((prev) => {
                            const updatedCategory = { ...prev[category] };
                            updatedCategory[subcategory] = updatedCategory[
                              subcategory
                            ].filter((p) => p.value !== productId);
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
);
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: "#f8f9fa",
  },
  shopManagerContainer: {
    flex: 1,
    backgroundColor: "red",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shopManagerContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#212529",
    marginBottom: 16,
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
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
  },
   tableRow: {
    paddingVertical: 10, // Adds spacing above and below the row content
    alignItems: "center", // Ensures content is vertically centered within the row
   
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
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 4,
  },
  customNameInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 14,
    backgroundColor: '#fafafa',
    color: '#333',
  },
  customCard: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  checkBox: {
    alignSelf: "center",
  },
  priceInput: {
  borderWidth: 1,
  borderColor: '#ccc',
  borderRadius: 5,
  paddingHorizontal: 10,
  paddingVertical: 10, // Increase vertical padding
  height: 50, // Explicit height for better tap area
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    backgroundColor: "#fff",
  },
  dropdownText: {
    fontSize: 16,
    color: "#000",
  },
  placeholderText: {
    fontSize: 16,
    color: "#CCC",
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
  backgroundColor: '#f1f3f5', // soft highlight to make it feel like a section
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
  paddingLeft: 12, // slight indent to signal nesting
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
    backgroundColor: "#4CAF50", // A refined green color
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30, // Rounded edges for an elegant look
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3, // Elevation for Android shadow
    alignItems: "center",
    marginTop: 0,
    marginBottom: 20
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700", // Bold text
    textTransform: "uppercase", // Makes the text look sharp
    letterSpacing: 1.2, // Adds spacing between letters for elegance
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
  padding: 10,
  borderRadius: 10,
  marginLeft: 5,
  alignItems: 'center',
},

modalConfirmButtonText: {
  color: '#fff',
  fontWeight: 'bold',
},

modalCancelButtonText: {
  color: '#fff',
  fontWeight: 'bold',
},

});


export default UpdateShopProducts;

