import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Types
interface Product {
  id: number;
  name: string;
  price: number;
  unit: string;
  sales: number;
}

interface BillItem {
  name: string;
  price: number;
  qty: number;
  productId?: number;
  custom?: boolean;
}

interface Session {
  id: number;
  customerName: string;
  phone: string;
  items: BillItem[];
  npVal: string;
}

export default function ProductsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const sessionId = params.sessionId ? parseInt(params.sessionId as string) : null;
  
  const [products, setProducts] = useState<Product[]>([
    { id: 1, name: 'Puri plate', price: 20, unit: 'pieces', sales: 0 },
    { id: 2, name: 'Masala puri', price: 25, unit: 'pieces', sales: 0 },
    { id: 3, name: 'Tamarind water', price: 10, unit: 'liters', sales: 0 },
    { id: 4, name: 'Special plate', price: 40, unit: 'pieces', sales: 0 },
    { id: 5, name: 'Idly 2pcs', price: 15, unit: 'pieces', sales: 0 },
  ]);
  
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [npValue, setNpValue] = useState('0');
  const [itemName, setItemName] = useState('');
  const [customItemName, setCustomItemName] = useState('');
  const [customItemAmount, setCustomItemAmount] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [newProductUnit, setNewProductUnit] = useState('pieces');
  const [unitPickerVisible, setUnitPickerVisible] = useState(false);
  const [addProductVisible, setAddProductVisible] = useState(false);
  const [customerToggle, setCustomerToggle] = useState(false);

  const unitOptions = ['pieces', 'kgs', 'liters', 'grams', 'ml', 'units'];

  // Load products and sessions
  useEffect(() => {
    loadProducts();
    loadSessions();
  }, []);

  // Update session when sessions change
  useEffect(() => {
    if (sessionId && sessions.length > 0) {
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
        setCurrentSession(session);
        setNpValue(session.npVal || '0');
      }
    }
  }, [sessions, sessionId]);

  const loadProducts = async () => {
    try {
      const stored = await AsyncStorage.getItem('products');
      if (stored) {
        setProducts(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadSessions = async () => {
    try {
      const stored = await AsyncStorage.getItem('sessions');
      if (stored) {
        setSessions(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const saveSessions = async (updatedSessions: Session[]) => {
    try {
      await AsyncStorage.setItem('sessions', JSON.stringify(updatedSessions));
      setSessions(updatedSessions);
    } catch (error) {
      console.error('Error saving sessions:', error);
    }
  };

  // Update current session and save
  const updateCurrentSession = (updatedItems: BillItem[]) => {
    if (!currentSession) return;
    
    const updatedSession = { ...currentSession, items: updatedItems, npVal: npValue };
    const updatedSessions = sessions.map(s => 
      s.id === currentSession.id ? updatedSession : s
    );
    saveSessions(updatedSessions);
    setCurrentSession(updatedSession);
  };

  // Add item to bill
  const addItemToBill = (name: string, price: number, productId?: number) => {
    if (!currentSession) {
      Alert.alert('Info', 'Please start a bill first from Home');
      router.back();
      return;
    }

    const existingIndex = currentSession.items.findIndex(
      item => item.productId === productId && productId
    );

    let newItems;
    if (existingIndex !== -1 && productId) {
      // Increment quantity for existing product
      newItems = [...currentSession.items];
      newItems[existingIndex].qty += 1;
    } else {
      // Add new item
      newItems = [...currentSession.items, {
        name,
        price,
        qty: 1,
        productId,
        custom: !productId
      }];
    }
    
    updateCurrentSession(newItems);
  };

  // Remove item from bill
  const removeItem = (index: number) => {
    if (!currentSession) return;
    const newItems = [...currentSession.items];
    newItems.splice(index, 1);
    updateCurrentSession(newItems);
  };

  // Adjust quantity
  const adjustQuantity = (index: number, delta: number) => {
    if (!currentSession) return;
    const newItems = [...currentSession.items];
    newItems[index].qty = Math.max(1, newItems[index].qty + delta);
    updateCurrentSession(newItems);
  };

  // Add custom item
  const addCustomItem = () => {
    if (!customItemName.trim() || !customItemAmount) {
      Alert.alert('Error', 'Please enter item name and amount');
      return;
    }
    const amount = parseFloat(customItemAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter valid amount');
      return;
    }
    addItemToBill(customItemName.trim(), amount);
    setCustomItemName('');
    setCustomItemAmount('');
  };

  // Numpad functions
  const npKey = (key: string) => {
    if (key === 'del') {
      setNpValue(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
    } else if (key === '.') {
      if (!npValue.includes('.')) setNpValue(prev => prev + '.');
    } else {
      setNpValue(prev => prev === '0' ? key : prev + key);
    }
  };

  const addFromNumpad = () => {
    const amount = parseFloat(npValue);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Enter valid amount');
      return;
    }
    const name = itemName.trim() || 'Item';
    addItemToBill(name, amount);
    setItemName('');
    setNpValue('0');
  };

  // Add product to catalogue
  const addProduct = async () => {
    if (!newProductName.trim() || !newProductPrice) {
      Alert.alert('Error', 'Enter product name and price');
      return;
    }
    const price = parseFloat(newProductPrice);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Error', 'Enter valid price');
      return;
    }
    
    const newProduct: Product = {
      id: Date.now(),
      name: newProductName.trim(),
      price,
      unit: newProductUnit,
      sales: 0,
    };
    
    const updatedProducts = [...products, newProduct];
    setProducts(updatedProducts);
    await AsyncStorage.setItem('products', JSON.stringify(updatedProducts));
    
    setNewProductName('');
    setNewProductPrice('');
    setNewProductUnit('pieces');
    Alert.alert('Success', 'Product added!');
  };

  // Delete product
  const deleteProduct = (id: number) => {
    Alert.alert(
      'Delete Product',
      'Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = products.filter(p => p.id !== id);
            setProducts(updated);
            await AsyncStorage.setItem('products', JSON.stringify(updated));
          }
        }
      ]
    );
  };

  // Edit product - simple modal approach
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editModalVisible, setEditModalVisible] = useState(false);

  const startEditProduct = (product: Product) => {
    setEditingProduct(product);
    setEditName(product.name);
    setEditPrice(product.price.toString());
    setEditModalVisible(true);
  };

  const saveEditedProduct = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Product name cannot be empty');
      return;
    }
    
    const price = parseFloat(editPrice);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    const updated = products.map(p =>
      p.id === editingProduct?.id ? { ...p, name: editName.trim(), price } : p
    );
    setProducts(updated);
    await AsyncStorage.setItem('products', JSON.stringify(updated));
    setEditModalVisible(false);
    Alert.alert('Success', 'Product updated!');
  };

  // Complete bill and collect payment
  const collectBill = async () => {
    if (!currentSession || currentSession.items.length === 0) {
      Alert.alert('Error', 'No items in bill');
      return;
    }

    const total = currentSession.items.reduce((sum, i) => sum + i.price * i.qty, 0);
    
    // Update product sales
    for (const item of currentSession.items) {
      if (item.productId) {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          product.sales += item.qty;
        }
      }
    }
    await AsyncStorage.setItem('products', JSON.stringify(products));
    
    // Create sale record
    const now = new Date();
    const timeStr = now.getHours().toString().padStart(2, '0') + ':' + 
                    now.getMinutes().toString().padStart(2, '0');
    
    const saleRecord = {
      total,
      time: timeStr,
      items: currentSession.items,
      customerName: currentSession.customerName,
      phone: currentSession.phone,
    };
    
    const existingSales = await AsyncStorage.getItem('salesLog');
    const salesLog = existingSales ? JSON.parse(existingSales) : [];
    salesLog.unshift(saleRecord);
    await AsyncStorage.setItem('salesLog', JSON.stringify(salesLog));
    
    // Remove current session
    const updatedSessions = sessions.filter(s => s.id !== currentSession.id);
    await saveSessions(updatedSessions);
    
    Alert.alert('Success', `₹${total.toLocaleString('en-IN')} collected!`);
    router.back();
  };

  // Calculate total
  const billTotal = currentSession?.items.reduce((sum, i) => sum + i.price * i.qty, 0) || 0;

  // Render product item
  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.productCard}>
      <View>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productPrice}>₹{item.price}</Text>
      </View>
      <View style={styles.productActions}>
        <TouchableOpacity style={styles.editBtn} onPress={() => startEditProduct(item)}>
          <Text style={styles.editBtnText}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteProduct(item.id)}>
          <Text style={styles.deleteBtnText}>Del</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Catalogue Picker Modal
  const PickerModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={pickerVisible}
      onRequestClose={() => setPickerVisible(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1} 
        onPress={() => setPickerVisible(false)}
      >
        <View style={styles.pickerBox}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Pick product</Text>
            <TouchableOpacity onPress={() => setPickerVisible(false)}>
              <Text style={styles.pickerClose}>×</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={products}
            renderItem={({ item }) => (
              <View style={styles.pickerRow}>
                <View>
                  <Text style={styles.pickerProdName}>{item.name}</Text>
                  <Text style={styles.pickerProdPrice}>₹{item.price}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.pickerAddBtn}
                  onPress={() => {
                    addItemToBill(item.name, item.price, item.id);
                    setPickerVisible(false);
                  }}
                >
                  <Text style={styles.pickerAddText}>+ Add</Text>
                </TouchableOpacity>
              </View>
            )}
            keyExtractor={(item) => item.id.toString()}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // Unit Picker Modal
  const UnitPickerModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={unitPickerVisible}
      onRequestClose={() => setUnitPickerVisible(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1} 
        onPress={() => setUnitPickerVisible(false)}
      >
        <View style={styles.pickerBox}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Select Unit</Text>
            <TouchableOpacity onPress={() => setUnitPickerVisible(false)}>
              <Text style={styles.pickerClose}>×</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.unitGrid}>
            {unitOptions.map((unit) => (
              <TouchableOpacity 
                key={unit}
                style={[
                  styles.unitOption,
                  newProductUnit === unit && styles.unitOptionSelected
                ]}
                onPress={() => {
                  setNewProductUnit(unit);
                  setUnitPickerVisible(false);
                }}
              >
                <Text 
                  style={[
                    styles.unitOptionText,
                    newProductUnit === unit && styles.unitOptionTextSelected
                  ]}
                >
                  {unit}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // Add Product Modal
  const AddProductModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={addProductVisible}
      onRequestClose={() => setAddProductVisible(false)}
    >
      <KeyboardAvoidingView 
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setAddProductVisible(false)}
        >
          <View style={styles.addProductModal}>
            <View style={styles.addProductModalHeader}>
              <Text style={styles.addProductModalTitle}>➕ Add New Product</Text>
              <TouchableOpacity onPress={() => setAddProductVisible(false)}>
                <Text style={styles.pickerClose}>×</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.addProductModalContent}>
              <Text style={styles.inputLabel}>Product Name</Text>
              <TextInput
                style={styles.addInput}
                placeholder="Enter product name"
                value={newProductName}
                onChangeText={setNewProductName}
              />

              <Text style={styles.inputLabel}>Price (₹)</Text>
              <TextInput
                style={styles.addInput}
                placeholder="Enter price"
                value={newProductPrice}
                onChangeText={setNewProductPrice}
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>Unit</Text>
              <TouchableOpacity 
                style={styles.unitSelectBtn}
                onPress={() => setUnitPickerVisible(true)}
              >
                <Text style={styles.unitSelectText}>{newProductUnit}</Text>
                <Ionicons name="chevron-down" size={18} color="#2563EB" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.saveBtn} 
                onPress={() => {
                  addProduct();
                  setAddProductVisible(false);
                }}
              >
                <Text style={styles.saveBtnText}>Save Product ✓</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );

  // Edit Product Modal
  const EditProductModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={editModalVisible}
      onRequestClose={() => setEditModalVisible(false)}
    >
      <KeyboardAvoidingView 
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setEditModalVisible(false)}
        >
          <View style={styles.addProductModal}>
            <View style={styles.addProductModalHeader}>
              <Text style={styles.addProductModalTitle}>✏️ Edit Product</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={styles.pickerClose}>×</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.addProductModalContent}>
              <Text style={styles.inputLabel}>Product Name</Text>
              <TextInput
                style={styles.addInput}
                placeholder="Enter product name"
                value={editName}
                onChangeText={setEditName}
              />

              <Text style={styles.inputLabel}>Price (₹)</Text>
              <TextInput
                style={styles.addInput}
                placeholder="Enter price"
                value={editPrice}
                onChangeText={setEditPrice}
                keyboardType="numeric"
              />

              <TouchableOpacity 
                style={styles.saveBtn} 
                onPress={saveEditedProduct}
              >
                <Text style={styles.saveBtnText}>Save Changes ✓</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );

  if (!currentSession && sessionId) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // If in a billing session, show Live Bill UI
  if (currentSession != null) {
    return (
    <View style={styles.container}>
      <PickerModal />
      
      {/* Bill Header */}
      <View style={styles.billHeader}>
        <View style={styles.headerText}>
          <Text style={styles.billHeaderTitle}>Live Bill · లైవ్ బిల్లు</Text>
          <Text style={styles.headerSub}>Add items · collect when done</Text>
        </View>
        <TouchableOpacity 
          style={[styles.toggleBtn, customerToggle && styles.toggleBtnOn]}
          onPress={() => setCustomerToggle(!customerToggle)}
        >
          <Text style={styles.toggleText}>{customerToggle ? 'ON' : 'OFF'}</Text>
        </TouchableOpacity>
      </View>

      {/* Customer Display */}
      {!customerToggle && (
        <View style={styles.customerDisplay}>
          <Text style={styles.customerIcon}>👤</Text>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{currentSession!.customerName}</Text>
            {currentSession!.phone && (
              <Text style={styles.customerPhone}>📞 {currentSession!.phone}</Text>
            )}
          </View>
          <TouchableOpacity 
            style={[styles.toggleBtn, customerToggle && styles.toggleBtnOn]}
            onPress={() => setCustomerToggle(!customerToggle)}
          >
            <Text style={styles.toggleText}>{customerToggle ? 'ON' : 'OFF'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bill Total */}
      <View style={styles.totalBar}>
        <Text style={styles.totalLabel}>Running Total · మొత్తం</Text>
        <Text style={styles.totalValue}>₹{billTotal.toLocaleString('en-IN')}</Text>
      </View>

      {/* Bill Items */}
      <ScrollView style={styles.itemsArea}>
        {currentSession!.items.length === 0 ? (
          <View style={styles.emptyBill}>
            <Text style={styles.emptyBillText}>No items yet</Text>
            <Text style={styles.emptyBillSub}>Use numpad below or pick from catalogue</Text>
          </View>
        ) : (
          currentSession!.items.map((item: BillItem, index: number) => (
            <View key={index} style={styles.billItem}>
              <Text style={styles.itemName}>
                {item.name}
                {item.custom && <Text style={styles.customBadge}> (custom)</Text>}
              </Text>
              <View style={styles.itemControls}>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => adjustQuantity(index, -1)}>
                  <Text style={styles.qtyBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.qtyNum}>{item.qty}</Text>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => adjustQuantity(index, 1)}>
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>
                <Text style={styles.itemPrice}>₹{(item.price * item.qty).toLocaleString('en-IN')}</Text>
                <TouchableOpacity onPress={() => removeItem(index)}>
                  <Text style={styles.removeBtn}>×</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Custom Item Input */}
      <View style={styles.customItemSection}>
        <Text style={styles.customLabel}>Quick add (not in catalogue)</Text>
        <View style={styles.customRow}>
          <TextInput
            style={styles.customInput}
            placeholder="Item name"
            value={customItemName}
            onChangeText={setCustomItemName}
          />
          <TextInput
            style={[styles.customInput, styles.customAmount]}
            placeholder="₹ Amt"
            value={customItemAmount}
            onChangeText={setCustomItemAmount}
            keyboardType="numeric"
          />
          <TouchableOpacity style={styles.customAddBtn} onPress={addCustomItem}>
            <Text style={styles.customAddText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Numpad */}
      <View style={styles.numpad}>
        <View style={styles.numpadInputRow}>
          <TextInput
            style={styles.numpadInput}
            placeholder="Item name (optional)"
            value={itemName}
            onChangeText={setItemName}
          />
          <View style={styles.numpadDisplay}>
            <Text style={styles.numpadDisplayText}>{npValue}</Text>
          </View>
        </View>
        
        <View style={styles.numpadGrid}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'].map(key => (
            <TouchableOpacity 
              key={key} 
              style={[
                styles.numpadKey,
                key === '.' && styles.grayKey,
                key === 'del' && styles.grayKey
              ]}
              onPress={() => npKey(key)}
            >
              <Text style={styles.numpadKeyText}>{key === 'del' ? '⌫' : key}</Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.outlineBtn} onPress={() => setPickerVisible(true)}>
            <Text style={styles.outlineBtnText}>📋 From catalogue</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.fillBtn} onPress={addFromNumpad}>
            <Text style={styles.fillBtnText}>+ Add item</Text>
          </TouchableOpacity>
        </View>
        
        {!customerToggle ? (
          <TouchableOpacity 
            style={[styles.collectBtn, !currentSession!.items.length && styles.collectBtnDisabled]}
            onPress={collectBill}
            disabled={!currentSession!.items.length}
          >
            <Text style={styles.collectBtnText}>Collect · వసూలు చేయి ✓</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.outlineBtn} onPress={() => router.back()}>
              <Text style={styles.outlineBtnText}>← Go Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.fillBtn} onPress={collectBill}>
              <Text style={styles.fillBtnText}>Bill ✓</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Bottom Nav */}
      <View style={[styles.bottomNav, { paddingBottom: insets.bottom || 8 }]}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/home')}>
          <Ionicons name="home" size={24} color="#64748B" />
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/analytics')}>
          <Ionicons name="stats-chart" size={24} color="#64748B" />
          <Text style={styles.navLabel}>Analytics</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => {}}>
          <Ionicons name="pricetag" size={24} color="#2563EB" />
          <Text style={[styles.navLabel, { color: '#2563EB' }]}>Products</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/suppliers')}>
          <Ionicons name="people" size={24} color="#64748B" />
          <Text style={styles.navLabel}>Suppliers</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
  }

  // Default: show Products Management UI when not in a billing session
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <PickerModal />
      <UnitPickerModal />
      <AddProductModal />
      <EditProductModal />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View>
          <Text style={styles.headerTitle}>Products</Text>
        </View>
      </View>

      {/* Product Catalogue Section */}
      <View style={styles.catalogueSection}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
        
        <FlatList
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id.toString()}
          style={styles.productList}
        />
        
        <TouchableOpacity 
          style={styles.addProductButton}
          onPress={() => setAddProductVisible(true)}
        >
          <Ionicons name="add-circle" size={50} color="#2563EB" />
          <Text style={styles.addProductButtonText}>Add Product</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Nav */}
      <View style={[styles.bottomNav, { paddingBottom: insets.bottom || 8 }]}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/home')}>
          <Ionicons name="home" size={24} color="#64748B" />
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/analytics')}>
          <Ionicons name="stats-chart" size={24} color="#64748B" />
          <Text style={styles.navLabel}>Analytics</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => {}}>
          <Ionicons name="pricetag" size={24} color="#2563EB" />
          <Text style={[styles.navLabel, { color: '#2563EB' }]}>Products</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/suppliers')}>
          <Ionicons name="people" size={24} color="#64748B" />
          <Text style={styles.navLabel}>Suppliers</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#94A3B8',
  },
  billHeader: {
    backgroundColor: '#2563EB',
    padding: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  billHeaderTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  headerSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnOn: {
    backgroundColor: '#22C55E',
  },
  toggleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  customerDisplay: {
    backgroundColor: 'rgba(252,128,25,0.15)',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'space-between',
  },
  customerIcon: {
    fontSize: 18,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2563EB',
  },
  customerPhone: {
    fontSize: 11,
    color: 'rgba(252,128,25,0.7)',
    fontWeight: '600',
  },
  totalBar: {
    backgroundColor: '#fff',
    padding: 12,
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E2E8F0',
  },
  totalLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#2563EB',
    letterSpacing: -0.5,
  },
  itemsArea: {
    flex: 1,
    padding: 12,
    maxHeight: 200,
  },
  emptyBill: {
    alignItems: 'center',
    padding: 30,
  },
  emptyBillText: {
    color: '#bbb',
    fontSize: 13,
  },
  emptyBillSub: {
    fontSize: 11,
    color: '#ccc',
    marginTop: 4,
  },
  billItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  customBadge: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  itemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  qtyBtn: {
    width: 26,
    height: 26,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2563EB',
  },
  qtyNum: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    minWidth: 20,
    textAlign: 'center',
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2563EB',
    minWidth: 52,
    textAlign: 'right',
  },
  removeBtn: {
    fontSize: 18,
    color: '#ddd',
    paddingHorizontal: 4,
  },
  customItemSection: {
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 0.5,
    borderTopColor: '#E2E8F0',
  },
  customLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  customRow: {
    flexDirection: 'row',
    gap: 8,
  },
  customInput: {
    flex: 2,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  customAmount: {
    flex: 1,
  },
  customAddBtn: {
    paddingHorizontal: 16,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customAddText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  numpad: {
    backgroundColor: '#fff',
    borderTopWidth: 0.5,
    borderTopColor: '#E2E8F0',
    padding: 12,
  },
  numpadInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  numpadInput: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#fafafa',
    fontSize: 13,
    fontWeight: '700',
  },
  numpadDisplay: {
    padding: 10,
    paddingHorizontal: 16,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  numpadDisplayText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  numpadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  numpadKey: {
    width: '31%',
    padding: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    alignItems: 'center',
  },
  grayKey: {
    backgroundColor: '#E2E8F0',
  },
  numpadKeyText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  outlineBtn: {
    flex: 1,
    padding: 12,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#2563EB',
    borderRadius: 10,
    alignItems: 'center',
  },
  outlineBtnText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '800',
  },
  fillBtn: {
    flex: 1,
    padding: 12,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    alignItems: 'center',
  },
  fillBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  collectBtn: {
    padding: 14,
    backgroundColor: '#2563EB',
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  collectBtnDisabled: {
    backgroundColor: '#ddd',
  },
  collectBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  bottomNav: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    paddingVertical: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#E2E8F0',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  navLabel: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '700',
    marginTop: 2,
  },
  catalogueSection: {
    flex: 1,
    padding: 14,
    backgroundColor: '#F8FAFC',
  },
  catalogueHeader: {
    marginBottom: 12,
  },
  catalogueTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  catalogueSub: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '700',
    marginTop: 1,
  },
  productList: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginHorizontal: 12,
    marginVertical: 10,
    height: 40,
    gap: 8,
  },
  searchIcon: {
    color: '#94A3B8',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  unitSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  unitLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    width: 50,
  },
  unitSelectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  unitSelectText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  unitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 10,
    justifyContent: 'space-around',
  },
  unitOption: {
    width: '45%',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  unitOptionSelected: {
    borderColor: '#2563EB',
    backgroundColor: 'rgba(252,128,25,0.1)',
  },
  unitOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'capitalize',
  },
  unitOptionTextSelected: {
    color: '#2563EB',
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
  },
  productName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  productPrice: {
    fontSize: 13,
    color: '#2563EB',
    marginTop: 3,
    fontWeight: '700',
    textAlign: 'center',
  },
  productSales: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  productActions: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  editBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: '#fff8f0',
    borderWidth: 1,
    borderColor: '#2563EB',
    borderRadius: 9,
  },
  editBtnText: {
    fontSize: 12,
  },
  deleteBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: '#FCEBEB',
    borderRadius: 9,
  },
  deleteBtnText: {
    fontSize: 12,
    color: '#A32D2D',
    fontWeight: '700',
  },
  useBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#2563EB',
    borderRadius: 9,
  },
  useBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  addProductCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginTop: 6,
  },
  addProductTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  addInput: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#fafafa',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  saveBtn: {
    backgroundColor: '#2563EB',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  pickerBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    maxHeight: '65%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  pickerTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  pickerClose: {
    fontSize: 26,
    color: '#64748B',
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fafafa',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
  },
  pickerProdName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  pickerProdPrice: {
    fontSize: 12,
    color: '#2563EB',
    marginTop: 2,
    fontWeight: '700',
  },
  pickerAddBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  pickerAddText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  addProductButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  addProductButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  addProductModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  addProductModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  addProductModalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  addProductModalContent: {
    gap: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
