import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

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
  const [newProductUnit, setNewProductUnit] = useState('pieces');
  const [unitPickerVisible, setUnitPickerVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [npValue, setNpValue] = useState('0');
  const [itemName, setItemName] = useState('');
  const [customItemName, setCustomItemName] = useState('');
  const [customItemAmount, setCustomItemAmount] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [billSearchQuery, setBillSearchQuery] = useState('');

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

  // Edit product
  const editProduct = (product: Product) => {
    Alert.prompt(
      'Edit Product',
      'Product Name',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Next',
          onPress: (name: string | undefined) => {
            if (name && name.trim()) {
              Alert.prompt(
                'Edit Price',
                'Product Price',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Save',
                    onPress: async (priceStr: string | undefined) => {
                      const price = parseFloat(priceStr || '');
                      if (!isNaN(price) && price > 0) {
                        const updated = products.map(p =>
                          p.id === product.id ? { ...p, name: name.trim(), price } : p
                        );
                        setProducts(updated);
                        await AsyncStorage.setItem('products', JSON.stringify(updated));
                      }
                    }
                  }
                ],
                'plain-text',
                product.price.toString()
              );
            }
          }
        }
      ],
      'plain-text',
      product.name
    );
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
        <Text style={styles.productUnit}>Unit: {item.unit}</Text>
        <Text style={styles.productSales}>Sold {item.sales} times today</Text>
      </View>
      <View style={styles.productActions}>
        <TouchableOpacity style={styles.editBtn} onPress={() => editProduct(item)}>
          <Text style={styles.editBtnText}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteProduct(item.id)}>
          <Text style={styles.deleteBtnText}>Del</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Catalogue Picker Modal
  const PickerModal = () => {
    const filteredProducts = products.filter(p => 
      p.name.toLowerCase().includes(billSearchQuery.toLowerCase())
    );
    
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={pickerVisible}
        onRequestClose={() => {
          setPickerVisible(false);
          setBillSearchQuery('');
        }}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => {
            setPickerVisible(false);
            setBillSearchQuery('');
          }}
        >
          <View style={styles.pickerBox}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Pick product</Text>
              <TouchableOpacity onPress={() => {
                setPickerVisible(false);
                setBillSearchQuery('');
              }}>
                <Text style={styles.pickerClose}>×</Text>
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.pickerSearchInput}
              placeholder="Search products..."
              value={billSearchQuery}
              onChangeText={setBillSearchQuery}
              placeholderTextColor="#999"
            />
            
            <FlatList
              data={filteredProducts}
              renderItem={({ item }) => (
                <View style={styles.pickerRow}>
                  <View>
                    <Text style={styles.pickerProdName}>{item.name}</Text>
                    <Text style={styles.pickerProdPrice}>₹{item.price} · {item.unit}</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.pickerAddBtn}
                    onPress={() => {
                      addItemToBill(item.name, item.price, item.id);
                      setPickerVisible(false);
                      setBillSearchQuery('');
                    }}
                  >
                    <Text style={styles.pickerAddText}>+ Add</Text>
                  </TouchableOpacity>
                </View>
              )}
              keyExtractor={(item) => item.id.toString()}
              ListEmptyComponent={
                <Text style={styles.noResultsText}>No products found</Text>
              }
            />
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

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
          <Text style={styles.headerTitle}>Live Bill · లైవ్ బిల్లు</Text>
          <Text style={styles.headerSub}>Add items · collect when done</Text>
        </View>
      </View>

      {/* Customer Display */}
      <View style={styles.customerDisplay}>
        <Text style={styles.customerIcon}>👤</Text>
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>{currentSession!.customerName}</Text>
          {currentSession!.phone && (
            <Text style={styles.customerPhone}>📞 {currentSession!.phone}</Text>
          )}
        </View>
      </View>

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
        
        <TouchableOpacity 
          style={[styles.collectBtn, !currentSession!.items.length && styles.collectBtnDisabled]}
          onPress={collectBill}
          disabled={!currentSession!.items.length}
        >
          <Text style={styles.collectBtnText}>Collect · వసూలు చేయి ✓</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/home')}>
          <Ionicons name="home" size={24} color="#aaa" />
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => {}}>
          <Ionicons name="pricetag" size={24} color="#FC8019" />
          <Text style={[styles.navLabel, { color: '#FC8019' }]}>Products</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/analytics')}>
          <Ionicons name="stats-chart" size={24} color="#aaa" />
          <Text style={styles.navLabel}>Analytics</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/suppliers')}>
          <Ionicons name="people" size={24} color="#aaa" />
          <Text style={styles.navLabel}>Suppliers</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
  }

  // Default: show Products Management UI when not in a billing session
  return (
    <View style={styles.container}>
      {/* Product Catalogue Section */}
      <View style={styles.catalogueSection}>
        <View style={styles.catalogueHeader}>
          <Text style={styles.catalogueTitle}>📦 Your Products</Text>
        </View>
        
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        
        <FlatList
          data={products.filter(p => 
            p.name.toLowerCase().includes(searchQuery.toLowerCase())
          )}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id.toString()}
          style={styles.productList}
          ListEmptyComponent={
            <Text style={styles.noResultsText}>No products found</Text>
          }
        />
        
        <View style={styles.addProductCard}>
          <Text style={styles.addProductTitle}>➕ Add new product</Text>
          <TextInput
            style={styles.addInput}
            placeholder="Product name"
            value={newProductName}
            onChangeText={setNewProductName}
          />
          <TextInput
            style={styles.addInput}
            placeholder="Price ₹"
            value={newProductPrice}
            onChangeText={setNewProductPrice}
            keyboardType="numeric"
          />
          
          <View style={styles.unitSelectRow}>
            <Text style={styles.unitLabel}>Unit</Text>
            <TouchableOpacity 
              style={styles.unitSelectBtn}
              onPress={() => setUnitPickerVisible(true)}
            >
              <Text style={styles.unitSelectText}>{newProductUnit}</Text>
              <Ionicons name="chevron-down" size={18} color="#FC8019" />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles.saveBtn} onPress={addProduct}>
            <Text style={styles.saveBtnText}>Save Product ✓</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Unit Picker Modal */}
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
          <View style={styles.unitPickerBox}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Unit</Text>
              <TouchableOpacity onPress={() => setUnitPickerVisible(false)}>
                <Text style={styles.pickerClose}>×</Text>
              </TouchableOpacity>
            </View>
            
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
                <Text style={[
                  styles.unitOptionText,
                  newProductUnit === unit && styles.unitOptionTextSelected
                ]}>
                  {unit}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/home')}>
          <Ionicons name="home" size={24} color="#aaa" />
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => {}}>
          <Ionicons name="pricetag" size={24} color="#FC8019" />
          <Text style={[styles.navLabel, { color: '#FC8019' }]}>Products</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/analytics')}>
          <Ionicons name="stats-chart" size={24} color="#aaa" />
          <Text style={styles.navLabel}>Analytics</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/suppliers')}>
          <Ionicons name="people" size={24} color="#aaa" />
          <Text style={styles.navLabel}>Suppliers</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#999',
  },
  billHeader: {
    backgroundColor: '#FC8019',
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
  headerTitle: {
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
  customerDisplay: {
    backgroundColor: 'rgba(252,128,25,0.15)',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    color: '#FC8019',
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
    borderBottomColor: '#eee',
  },
  totalLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FC8019',
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
    borderColor: '#eee',
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#222',
    flex: 1,
  },
  customBadge: {
    fontSize: 10,
    color: '#aaa',
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
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FC8019',
  },
  qtyNum: {
    fontSize: 13,
    fontWeight: '800',
    color: '#222',
    minWidth: 20,
    textAlign: 'center',
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FC8019',
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
    borderTopColor: '#eee',
  },
  customLabel: {
    fontSize: 10,
    color: '#aaa',
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
    borderColor: '#eee',
    backgroundColor: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  customAmount: {
    flex: 1,
  },
  customAddBtn: {
    paddingHorizontal: 16,
    backgroundColor: '#FC8019',
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
    borderTopColor: '#eee',
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
    borderColor: '#eee',
    backgroundColor: '#fafafa',
    fontSize: 13,
    fontWeight: '700',
  },
  numpadDisplay: {
    padding: 10,
    paddingHorizontal: 16,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  numpadDisplayText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#222',
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
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    alignItems: 'center',
  },
  grayKey: {
    backgroundColor: '#eee',
  },
  numpadKeyText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#222',
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
    borderColor: '#FC8019',
    borderRadius: 10,
    alignItems: 'center',
  },
  outlineBtnText: {
    color: '#FC8019',
    fontSize: 12,
    fontWeight: '800',
  },
  fillBtn: {
    flex: 1,
    padding: 12,
    backgroundColor: '#FC8019',
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
    backgroundColor: '#FC8019',
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
    borderTopColor: '#eee',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  navLabel: {
    fontSize: 9,
    color: '#aaa',
    fontWeight: '700',
    marginTop: 2,
  },
  catalogueSection: {
    flex: 1,
    padding: 14,
    backgroundColor: '#f5f5f5',
  },
  catalogueHeader: {
    marginBottom: 12,
  },
  catalogueTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#222',
  },
  catalogueSub: {
    fontSize: 11,
    color: '#FC8019',
    fontWeight: '700',
    marginTop: 1,
  },
  productList: {
    flex: 1,
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
    borderColor: '#eee',
  },
  productName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#222',
  },
  productPrice: {
    fontSize: 13,
    color: '#FC8019',
    marginTop: 3,
    fontWeight: '700',
  },
  productSales: {
    fontSize: 11,
    color: '#aaa',
    marginTop: 2,
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
    borderColor: '#FC8019',
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
    backgroundColor: '#FC8019',
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
    color: '#222',
    marginBottom: 12,
  },
  addInput: {
    borderWidth: 1.5,
    borderColor: '#eee',
    backgroundColor: '#fafafa',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  saveBtn: {
    backgroundColor: '#FC8019',
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
    color: '#222',
  },
  pickerClose: {
    fontSize: 26,
    color: '#aaa',
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
    borderColor: '#eee',
  },
  pickerProdName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#222',
  },
  pickerProdPrice: {
    fontSize: 12,
    color: '#FC8019',
    marginTop: 2,
    fontWeight: '700',
  },
  pickerAddBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FC8019',
    borderRadius: 8,
  },
  pickerAddText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#eee',
    gap: 8,
    marginBottom: 14,
  },
  searchInput: {
    width: '100%',
    padding: 12,
    fontSize: 13,
    fontWeight: '600',
    color: '#222',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 12,
  },
  noResultsText: {
    textAlign: 'center',
    color: '#aaa',
    fontSize: 13,
    fontWeight: '600',
    paddingVertical: 30,
  },
  pickerSearchInput: {
    padding: 12,
    fontSize: 13,
    fontWeight: '600',
    color: '#222',
    backgroundColor: '#fafafa',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 12,
  },
  productDetails: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  productUnit: {
    fontSize: 11,
    backgroundColor: '#FFF5E6',
    color: '#FC8019',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    fontWeight: '700',
  },
  unitPickerBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    maxHeight: '50%',
  },
  unitPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  unitPickerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#222',
  },
  unitPickerClose: {
    fontSize: 28,
    color: '#aaa',
  },
  unitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  unitOption: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 14,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#eee',
  },
  unitOptionSelected: {
    backgroundColor: '#FFF5E6',
    borderColor: '#FC8019',
  },
  unitOptionText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#222',
  },
  unitOptionTextSelected: {
    color: '#FC8019',
  },
  unitSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  unitLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#222',
    flex: 0.3,
  },
  unitSelectBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FC8019',
    backgroundColor: '#FFF5E6',
    borderRadius: 10,
    padding: 12,
  },
  unitSelectText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FC8019',
  },
});