import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator,
     TouchableOpacity, TextInput, Button, FlatList, CheckBox } from 'react-native';
import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router'; 
import { MultiSelect } from 'react-multi-select-component';
import { SelectList } from "react-native-dropdown-select-list";
import { Table, Row, Rows } from "react-native-table-component";

const UpdateShopProducts = () => {
  const [groupedProductSuggestions, setGroupedProductSuggestions] = useState({});
  const [selectedProducts, setSelectedProducts] = useState({});
  const [customProducts, setCustomProducts] = useState([]);
  const [customProductName, setCustomProductName] = useState('');
  const [customProductCategory, setCustomProductCategory] = useState('');
  const [customProductSubcategory, setCustomProductSubcategory] = useState('');
  const [editingIndex, setEditingIndex] = useState(null); // Track which product is being edited

  const params = useLocalSearchParams();
  const { shop_id } = params;
  const router = useRouter(); 

  useEffect(() => {
    const fetchProductSuggestions = async () => {
      try {
        const formData = new FormData();
        formData.append('shop_id', shop_id);
        const response = await axios.post('https://172.27.243.94:8000/product-suggestion/', formData);
        const { product_suggestions, selected_products } = response.data;

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

const handleCustomProductCategoryChange = (index, selectedOption) => {
    setCustomProducts(prevState => {
        const newProducts = [...prevState];
        newProducts[index].category = selectedOption.value;
        newProducts[index].category_id = groupedProductSuggestions[selectedOption.value]?.[0]?.category_id || '';
        newProducts[index].category_name = selectedOption.value;
        return newProducts;
    });
};

const handleCustomProductSubcategoryChange = (index, selectedOption) => {
    setCustomProducts(prevState => {
        const newProducts = [...prevState];
        newProducts[index].subcategory = selectedOption.value;
        newProducts[index].subcategory_id = groupedProductSuggestions[newProducts[index].category]?.[selectedOption.value]?.[0]?.subcategory_id || '';
        newProducts[index].subcategory_name = selectedOption.value;
        return newProducts;
    });
};

const handleSaveProductName = (index, newName) => {
  const updatedProducts = [...customProducts];
  updatedProducts[index].name = newName;
  setCustomProducts(updatedProducts);
  setEditingIndex(null); // Exit editing mode
};

const handleSubmitProducts = async () => {
    try {
        const formData = new FormData();
        formData.append('shop_id', shop_id);

        Object.entries(selectedProducts).forEach(([category, subcategories]) => {
            Object.values(subcategories).flat().forEach(product => {
                formData.append('product_suggestions[]', product.value);
                formData.append(`is_available_${product.value}`, product.is_available);
                formData.append(`price_${product.value}`, product.price);
                formData.append(`category_id_${product.value}`, product.category_id);
                formData.append(`subcategory_id_${product.value}`, product.subcategory_id);
            });
        });

        customProducts.forEach((customProduct, index) => {
            formData.append('custom_products[]', customProduct.name);
            formData.append(`is_available_custom_${index}`, customProduct.is_available);
            formData.append(`price_custom_${index}`, customProduct.price);
            formData.append(`category_custom_${index}`, customProduct.category_id || ''); // Allow empty category_id
            formData.append(`subcategory_custom_${index}`, customProduct.subcategory_id || ''); 
        });

        const response = await axios.post('https://172.27.243.94:8000/update-shop-products/', formData, {
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

return (
  <ScrollView contentContainerStyle={styles.scrollContainer}>
    <View style={styles.shopManagerContainer}>
      <View style={styles.shopManagerContent}>
        <Text style={styles.title}>Update Shop Products</Text>

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
                    "Actions",
                  ]}
                  flexArr={[2.5, 1, 1, 0.8, 1, 1]}
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
                            <Text style={styles.tableText}>{product.name}</Text>
                          </TouchableOpacity>
                        ),
                        product.category_name,
                        product.subcategory_name,
                        <CheckBox
                          value={product.is_available}
                          onValueChange={() =>
                            handleCustomProductCheckboxChange(index)
                          }
                          style={styles.checkBox}
                        />,
                        <TextInput
                          style={styles.priceInput}
                          value={product.price}
                          onChangeText={(text) =>
                            handleCustomProductPriceChange(index, text)
                          }
                          placeholder="Price"
                        />,
                        <TouchableOpacity
                          onPress={() => handleRemoveCustomProduct(index)}
                          style={styles.removeButton}
                        >
                          <Text style={styles.removeButtonText}>X</Text>
                        </TouchableOpacity>,
                      ],
                    ]}
                    flexArr={[2.5, 1, 1, 0.8, 1, 1]}
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
            <SelectList
              data={Object.keys(groupedProductSuggestions).map((category) => ({
                key: category,
                value: category,
              }))}
              setSelected={(selectedCategory) => {
                setCustomProductCategory(selectedCategory || "");
                setCustomProductSubcategory("");
              }}
              placeholder="Select Category"
              boxStyles={styles.dropdownBox}
              dropdownStyles={styles.dropdownList}
              defaultOption={
                customProductCategory
                  ? { key: customProductCategory, value: customProductCategory }
                  : null
              }
            />
            <SelectList
              data={
                customProductCategory
                  ? Object.keys(
                      groupedProductSuggestions[customProductCategory]
                    ).map((subcategory) => ({
                      key: subcategory,
                      value: subcategory,
                    }))
                  : []
              }
              setSelected={(selectedSubcategory) => {
                setCustomProductSubcategory(selectedSubcategory || "");
              }}
              placeholder="Select Subcategory"
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
              disabled={!customProductCategory}
            />
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
                  ([subcategory, products]) => (
                    <View
                      key={subcategory}
                      style={styles.subcategoryContainer}
                    >
                      <Text style={styles.subcategoryTitle}>
                        {subcategory}
                      </Text>
                      <MultiSelect
                        isMulti
                        value={
                          selectedProducts[category]?.[subcategory] || []
                        }
                        options={products.map((product) => ({
                          value: product.id,
                          label: product.name,
                        }))}
                        onChange={(selectedOptions) =>
                          handleProductChange(
                            category,
                            subcategory,
                            selectedOptions
                          )
                        }
                        style={styles.reactSelectContainer}
                      />
                      {selectedProducts[category]?.[subcategory]?.length >
                        0 && (
                        <View style={styles.tableWrapper}>
                          <Table borderStyle={{ borderWidth: 1, borderColor: "#ddd" }}>
                            <Row
                              data={[
                                "Product Name",
                                "Available",
                                "Price",
                                "Delete",
                              ]}
                              flexArr={[2.5, 1, 1, 1]}
                              style={styles.tableHeader}
                              textStyle={styles.tableHeaderText}
                            />
                            {selectedProducts[category][subcategory].map(
                              (product) => (
                                <Rows
                                  key={product.value}
                                  data={[
                                    [
                                      product.label,
                                      <CheckBox
                                        value={product.is_available}
                                        onValueChange={() =>
                                          handleCheckboxChange(
                                            category,
                                            subcategory,
                                            product.value
                                          )
                                        }
                                        style={styles.checkBox}
                                      />,
                                      <TextInput
                                        style={styles.priceInput}
                                        value={product.price || ""}
                                        onChangeText={(text) =>
                                          handleProductPriceChange(
                                            category,
                                            subcategory,
                                            product.value,
                                            text
                                          )
                                        }
                                        placeholder="Enter price"
                                      />,
                                      <TouchableOpacity
                                        onPress={() =>
                                          handleRemoveProduct(
                                            category,
                                            subcategory,
                                            product.value
                                          )
                                        }
                                        style={styles.removeButton}
                                      >
                                        <Text style={styles.removeButtonText}>
                                          X
                                        </Text>
                                      </TouchableOpacity>,
                                    ],
                                  ]}
                                  flexArr={[2.5, 1, 1, 1]}
                                  textStyle={styles.tableText}
                                />
                              )
                            )}
                          </Table>
                        </View>
                      )}
                    </View>
                  )
                )}
              </View>
            )
          )}
        </View>
        <TouchableOpacity
          onPress={handleSubmitProducts}
          style={styles.submitButton}
        >
          <Text style={styles.submitButtonText}>Update Products</Text>
        </TouchableOpacity>
      </View>
    </View>
  </ScrollView>
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
    backgroundColor: "#ffffff",
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
  tableText: {
    fontSize: 14,
    color: "#495057",
    textAlign: "center",
  },
  customNameInput: {
    flex: 1,
    borderColor: "#ced4da",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginVertical: 8,
    backgroundColor: "#ffffff",
    fontSize: 14,
    color: "#212529",
  },
  checkBox: {
    alignSelf: "center",
  },
  priceInput: {
    flex: 1,
    borderColor: "#ced4da",
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginVertical: 8,
    backgroundColor: "#ffffff",
    fontSize: 14,
    color: "#212529",
  },
  
  removeButtonText: {
    color: "red",
    fontSize: 17,
    textAlign: "center",
    fontWeight: "1900"
  },
  dropdownBox: {
    flex: 1,
    borderColor: "#ced4da",
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    padding: 8,
    marginVertical: 8,
  },
  dropdownList: {
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderColor: "#ced4da",
    borderWidth: 1,
  },
  addButton: {
    backgroundColor: "blue",
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  addButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  categoryContainer: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#343a40",
    marginBottom: 8,
  },
  subcategoryContainer: {
    marginBottom: 16,
  },
  subcategoryTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#495057",
    marginBottom: 4,
  },
  reactSelectContainer: {
    borderColor: "#ced4da",
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    backgroundColor: "red",
    zIndex: 999,
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
    marginTop: 16,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700", // Bold text
    textTransform: "uppercase", // Makes the text look sharp
    letterSpacing: 1.2, // Adds spacing between letters for elegance
  },
});


export default UpdateShopProducts;

