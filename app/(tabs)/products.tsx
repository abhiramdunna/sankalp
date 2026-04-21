import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Keyboard,
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

interface AppAlertConfig {
  visible: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'confirm';
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
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

  // Edit product state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editModalVisible, setEditModalVisible] = useState(false);

  // Custom alert state — replaces all Alert.alert calls
  const [appAlert, setAppAlert] = useState<AppAlertConfig>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  const showAlert = (
    title: string,
    message: string,
    type: AppAlertConfig['type'] = 'info',
    onConfirm?: () => void,
    confirmText = 'OK',
    cancelText = 'Cancel',
  ) => {
    setAppAlert({ visible: true, title, message, type, onConfirm, confirmText, cancelText });
  };

  const dismissAlert = () => setAppAlert(prev => ({ ...prev, visible: false }));

  const unitOptions = ['pieces', 'kgs', 'liters', 'grams', 'ml', 'units'];

  useEffect(() => {
    loadProducts();
    loadSessions();
  }, []);

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
      if (stored) setProducts(JSON.parse(stored));
    } catch (e) {
      console.error('Error loading products:', e);
    }
  };

  const loadSessions = async () => {
    try {
      const stored = await AsyncStorage.getItem('sessions');
      if (stored) setSessions(JSON.parse(stored));
    } catch (e) {
      console.error('Error loading sessions:', e);
    }
  };

  const saveSessions = async (updatedSessions: Session[]) => {
    try {
      await AsyncStorage.setItem('sessions', JSON.stringify(updatedSessions));
      setSessions(updatedSessions);
    } catch (e) {
      console.error('Error saving sessions:', e);
    }
  };

  const updateCurrentSession = (updatedItems: BillItem[]) => {
    if (!currentSession) return;
    const updatedSession = { ...currentSession, items: updatedItems, npVal: npValue };
    const updatedSessions = sessions.map(s =>
      s.id === currentSession.id ? updatedSession : s
    );
    saveSessions(updatedSessions);
    setCurrentSession(updatedSession);
  };

  const addItemToBill = (name: string, price: number, productId?: number) => {
    if (!currentSession) {
      showAlert('Info', 'Please start a bill first from Home', 'info', () => router.back());
      return;
    }
    const existingIndex = currentSession.items.findIndex(
      item => item.productId === productId && productId
    );
    let newItems;
    if (existingIndex !== -1 && productId) {
      newItems = [...currentSession.items];
      newItems[existingIndex].qty += 1;
    } else {
      newItems = [...currentSession.items, { name, price, qty: 1, productId, custom: !productId }];
    }
    updateCurrentSession(newItems);
  };

  const removeItem = (index: number) => {
    if (!currentSession) return;
    const newItems = [...currentSession.items];
    newItems.splice(index, 1);
    updateCurrentSession(newItems);
  };

  const adjustQuantity = (index: number, delta: number) => {
    if (!currentSession) return;
    const newItems = [...currentSession.items];
    newItems[index].qty = Math.max(1, newItems[index].qty + delta);
    updateCurrentSession(newItems);
  };

  const addCustomItem = () => {
    if (!customItemName.trim() || !customItemAmount) {
      showAlert('Error', 'Please enter item name and amount', 'error');
      return;
    }
    const amount = parseFloat(customItemAmount);
    if (isNaN(amount) || amount <= 0) {
      showAlert('Error', 'Please enter valid amount', 'error');
      return;
    }
    addItemToBill(customItemName.trim(), amount);
    setCustomItemName('');
    setCustomItemAmount('');
  };

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
      showAlert('Error', 'Enter valid amount', 'error');
      return;
    }
    const name = itemName.trim() || 'Item';
    addItemToBill(name, amount);
    setItemName('');
    setNpValue('0');
  };

  const addProduct = async () => {
    if (!newProductName.trim() || !newProductPrice) {
      showAlert('Error', 'Enter product name and price', 'error');
      return;
    }
    const price = parseFloat(newProductPrice);
    if (isNaN(price) || price <= 0) {
      showAlert('Error', 'Enter valid price', 'error');
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
    setAddProductVisible(false);
    showAlert('Product Added', `"${newProduct.name}" has been saved to your catalogue.`, 'success');
  };

  const deleteProduct = (id: number) => {
    showAlert(
      'Delete Product',
      'Are you sure you want to remove this product?',
      'confirm',
      async () => {
        const updated = products.filter(p => p.id !== id);
        setProducts(updated);
        await AsyncStorage.setItem('products', JSON.stringify(updated));
      },
      'Delete',
      'Cancel',
    );
  };

  const startEditProduct = (product: Product) => {
    setEditingProduct(product);
    setEditName(product.name);
    setEditPrice(product.price.toString());
    setEditModalVisible(true);
  };

  const saveEditedProduct = async () => {
    if (!editName.trim()) {
      showAlert('Error', 'Product name cannot be empty', 'error');
      return;
    }
    const price = parseFloat(editPrice);
    if (isNaN(price) || price <= 0) {
      showAlert('Error', 'Please enter a valid price', 'error');
      return;
    }
    const updated = products.map(p =>
      p.id === editingProduct?.id ? { ...p, name: editName.trim(), price } : p
    );
    setProducts(updated);
    await AsyncStorage.setItem('products', JSON.stringify(updated));
    setEditModalVisible(false);
    showAlert('Updated!', 'Product details have been saved.', 'success');
  };

  const collectBill = async () => {
    if (!currentSession || currentSession.items.length === 0) {
      showAlert('Error', 'No items in bill', 'error');
      return;
    }
    const total = currentSession.items.reduce((sum, i) => sum + i.price * i.qty, 0);
    const updatedProducts = [...products];
    for (const item of currentSession.items) {
      if (item.productId) {
        const idx = updatedProducts.findIndex(p => p.id === item.productId);
        if (idx !== -1) updatedProducts[idx].sales += item.qty;
      }
    }
    setProducts(updatedProducts);
    await AsyncStorage.setItem('products', JSON.stringify(updatedProducts));

    const now = new Date();
    const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    const saleRecord = { total, time: timeStr, items: currentSession.items, customerName: currentSession.customerName, phone: currentSession.phone };
    const existingSales = await AsyncStorage.getItem('salesLog');
    const salesLog = existingSales ? JSON.parse(existingSales) : [];
    salesLog.unshift(saleRecord);
    await AsyncStorage.setItem('salesLog', JSON.stringify(salesLog));

    const updatedSessions = sessions.filter(s => s.id !== currentSession.id);
    await saveSessions(updatedSessions);

    showAlert('Payment Collected!', `₹${total.toLocaleString('en-IN')} received successfully.`, 'success', () => router.back());
  };

  const billTotal = currentSession?.items.reduce((sum, i) => sum + i.price * i.qty, 0) || 0;

  const alertIconMap = {
    success: { icon: 'checkmark-circle' as const, color: '#22C55E', bg: '#F0FDF4' },
    error: { icon: 'close-circle' as const, color: '#EF4444', bg: '#FEF2F2' },
    info: { icon: 'information-circle' as const, color: '#2563EB', bg: '#EFF6FF' },
    confirm: { icon: 'alert-circle' as const, color: '#F59E0B', bg: '#FFFBEB' },
  };

  // ─── Custom Alert Modal ────────────────────────────────────────────────────
  const renderAppAlert = () => {
    const cfg = alertIconMap[appAlert.type];
    return (
      <Modal
        transparent
        animationType="fade"
        visible={appAlert.visible}
        onRequestClose={dismissAlert}
        statusBarTranslucent
      >
        <View style={styles.alertOverlay}>
          <View style={styles.alertBox}>
            <View style={[styles.alertIconWrap, { backgroundColor: cfg.bg }]}>
              <Ionicons name={cfg.icon} size={36} color={cfg.color} />
            </View>
            <Text style={styles.alertTitle}>{appAlert.title}</Text>
            <Text style={styles.alertMessage}>{appAlert.message}</Text>
            <View style={styles.alertBtnRow}>
              {appAlert.type === 'confirm' && (
                <TouchableOpacity
                  style={styles.alertCancelBtn}
                  onPress={dismissAlert}
                >
                  <Text style={styles.alertCancelText}>{appAlert.cancelText ?? 'Cancel'}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.alertOkBtn,
                  appAlert.type === 'confirm' && { backgroundColor: '#EF4444' },
                  appAlert.type === 'success' && { backgroundColor: '#22C55E' },
                ]}
                onPress={() => {
                  dismissAlert();
                  appAlert.onConfirm?.();
                }}
              >
                <Text style={styles.alertOkText}>{appAlert.confirmText ?? 'OK'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // ─── Modals inlined (NO sub-component functions) ───────────────────────────

  const renderPickerModal = () => (
    <Modal animationType="slide" transparent visible={pickerVisible} onRequestClose={() => setPickerVisible(false)}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPickerVisible(false)}>
        <View style={styles.pickerBox}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Pick product</Text>
            <TouchableOpacity onPress={() => setPickerVisible(false)}>
              <Text style={styles.pickerClose}>×</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={products}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={styles.pickerRow}>
                <View>
                  <Text style={styles.pickerProdName}>{item.name}</Text>
                  <Text style={styles.pickerProdPrice}>₹{item.price}</Text>
                </View>
                <TouchableOpacity
                  style={styles.pickerAddBtn}
                  onPress={() => { addItemToBill(item.name, item.price, item.id); setPickerVisible(false); }}
                >
                  <Text style={styles.pickerAddText}>+ Add</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderUnitPickerModal = () => (
    <Modal animationType="slide" transparent visible={unitPickerVisible} onRequestClose={() => setUnitPickerVisible(false)}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setUnitPickerVisible(false)}>
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
                style={[styles.unitOption, newProductUnit === unit && styles.unitOptionSelected]}
                onPress={() => { setNewProductUnit(unit); setUnitPickerVisible(false); }}
              >
                <Text style={[styles.unitOptionText, newProductUnit === unit && styles.unitOptionTextSelected]}>
                  {unit}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // FIX: Add Product Modal — defined inline, not as a nested component function
  const renderAddProductModal = () => (
    <Modal
      animationType="slide"
      transparent
      visible={addProductVisible}
      onRequestClose={() => setAddProductVisible(false)}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
            style={styles.modalContainer}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
          >
            <View style={styles.addProductModal}>
              <View style={styles.addProductModalHeader}>
                <Text style={styles.addProductModalTitle}>➕ Add New Product</Text>
                <TouchableOpacity onPress={() => setAddProductVisible(false)}>
                  <Text style={styles.pickerClose}>×</Text>
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }} keyboardShouldPersistTaps="handled" scrollEnabled={true}>
                <View style={styles.addProductModalContent}>
                  <View>
                    <Text style={styles.inputLabel}>Product Name</Text>
                    <View style={styles.lbInputBox}>
                      <Ionicons name="pricetag-outline" size={18} color="#bbb" style={{ marginRight: 8 }} />
                      <TextInput
                        style={styles.lbInput}
                        placeholder="Enter product name"
                        value={newProductName}
                        onChangeText={setNewProductName}
                        placeholderTextColor="#999"
                        autoCorrect={false}
                        returnKeyType="next"
                      />
                    </View>
                  </View>
                  <View>
                    <Text style={styles.inputLabel}>Price (₹)</Text>
                    <View style={styles.lbInputBox}>
                      <Ionicons name="cash-outline" size={18} color="#bbb" style={{ marginRight: 8 }} />
                      <TextInput
                        style={styles.lbInput}
                        placeholder="Enter price"
                        value={newProductPrice}
                        onChangeText={setNewProductPrice}
                        keyboardType="numeric"
                        placeholderTextColor="#999"
                        returnKeyType="done"
                      />
                    </View>
                  </View>
                  <View>
                    <Text style={styles.inputLabel}>Unit</Text>
                    <TouchableOpacity
                      style={[styles.lbInputBox, { paddingHorizontal: 12, paddingVertical: 8 }]}
                      onPress={() => setUnitPickerVisible(true)}
                    >
                      <Ionicons name="cube-outline" size={18} color="#bbb" style={{ marginRight: 8 }} />
                      <Text style={[styles.lbInput, { flex: 1 }]}>{newProductUnit}</Text>
                      <Ionicons name="chevron-down" size={18} color="#2563EB" />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity style={styles.saveBtn} onPress={addProduct}>
                    <Text style={styles.saveBtnText}>Save Product ✓</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  // FIX: Edit Product Modal — defined inline, not as a nested component function
  const renderEditProductModal = () => (
    <Modal
      animationType="slide"
      transparent
      visible={editModalVisible}
      onRequestClose={() => setEditModalVisible(false)}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
            style={styles.modalContainer}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
          >
            <View style={styles.addProductModal}>
              <View style={styles.addProductModalHeader}>
                <Text style={styles.addProductModalTitle}>✏️ Edit Product</Text>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <Text style={styles.pickerClose}>×</Text>
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }} keyboardShouldPersistTaps="handled" scrollEnabled={true}>
                <View style={styles.addProductModalContent}>
                  <View>
                    <Text style={styles.inputLabel}>Product Name</Text>
                    <View style={styles.lbInputBox}>
                      <Ionicons name="pricetag-outline" size={18} color="#bbb" style={{ marginRight: 8 }} />
                      <TextInput
                        style={styles.lbInput}
                        placeholder="Enter product name"
                        value={editName}
                        onChangeText={setEditName}
                        placeholderTextColor="#999"
                        autoCorrect={false}
                        returnKeyType="next"
                      />
                    </View>
                  </View>
                  <View>
                    <Text style={styles.inputLabel}>Price (₹)</Text>
                    <View style={styles.lbInputBox}>
                      <Ionicons name="cash-outline" size={18} color="#bbb" style={{ marginRight: 8 }} />
                      <TextInput
                        style={styles.lbInput}
                        placeholder="Enter price"
                        value={editPrice}
                        onChangeText={setEditPrice}
                        keyboardType="numeric"
                        placeholderTextColor="#999"
                        returnKeyType="done"
                      />
                    </View>
                  </View>
                  <TouchableOpacity style={styles.saveBtn} onPress={saveEditedProduct}>
                    <Text style={styles.saveBtnText}>Save Changes ✓</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  if (!currentSession && sessionId) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // ─── Live Bill UI ──────────────────────────────────────────────────────────
  if (currentSession != null) {
    return (
      <View style={styles.container}>
        {renderAppAlert()}
        {renderPickerModal()}

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

        {!customerToggle && (
          <View style={styles.customerDisplay}>
            <Text style={styles.customerIcon}>👤</Text>
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{currentSession.customerName}</Text>
              {currentSession.phone && (
                <Text style={styles.customerPhone}>📞 {currentSession.phone}</Text>
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

        <View style={styles.totalBar}>
          <Text style={styles.totalLabel}>Running Total · మొత్తం</Text>
          <Text style={styles.totalValue}>₹{billTotal.toLocaleString('en-IN')}</Text>
        </View>

        <ScrollView style={styles.itemsArea}>
          {currentSession.items.length === 0 ? (
            <View style={styles.emptyBill}>
              <Text style={styles.emptyBillText}>No items yet</Text>
              <Text style={styles.emptyBillSub}>Use numpad below or pick from catalogue</Text>
            </View>
          ) : (
            currentSession.items.map((item: BillItem, index: number) => (
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

        <View style={styles.customItemSection}>
          <Text style={styles.customLabel}>Quick add (not in catalogue)</Text>
          <View style={styles.customRow}>
            <TextInput
              style={styles.customInput}
              placeholder="Item name"
              value={customItemName}
              onChangeText={setCustomItemName}
              placeholderTextColor="#999"
            />
            <TextInput
              style={[styles.customInput, styles.customAmount]}
              placeholder="₹ Amt"
              value={customItemAmount}
              onChangeText={setCustomItemAmount}
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
            <TouchableOpacity style={styles.customAddBtn} onPress={addCustomItem}>
              <Text style={styles.customAddText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.numpad}>
          <View style={styles.numpadInputRow}>
            <TextInput
              style={styles.numpadInput}
              placeholder="Item name (optional)"
              value={itemName}
              onChangeText={setItemName}
              placeholderTextColor="#999"
            />
            <View style={styles.numpadDisplay}>
              <Text style={styles.numpadDisplayText}>{npValue}</Text>
            </View>
          </View>
          <View style={styles.numpadGrid}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'].map(key => (
              <TouchableOpacity
                key={key}
                style={[styles.numpadKey, (key === '.' || key === 'del') && styles.grayKey]}
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
              style={[styles.collectBtn, !currentSession.items.length && styles.collectBtnDisabled]}
              onPress={collectBill}
              disabled={!currentSession.items.length}
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

        <View style={styles.bottomNav}>
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

  // ─── Products Management UI ────────────────────────────────────────────────
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {renderAppAlert()}
      {renderUnitPickerModal()}
      {renderAddProductModal()}
      {renderEditProductModal()}

      <LinearGradient
        colors={['#4F46E5', '#7C3AED', '#9333EA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <Text style={styles.headerTitle}>Products</Text>
      </LinearGradient>

      <ScrollView
        style={styles.catalogueSection}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 36 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.productList}>
          {filteredProducts.map((item) => (
            <View key={item.id} style={styles.productCard}>
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
          ))}
        </View>

        <TouchableOpacity style={styles.addProductButton} onPress={() => setAddProductVisible(true)}>
          <Ionicons name="add-circle" size={50} color="#2563EB" />
          <Text style={styles.addProductButtonText}>Add Product</Text>
        </TouchableOpacity>
      </ScrollView>

      
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F3FF', flexDirection: 'column' },
  modalContainer: { flex: 1, justifyContent: 'flex-end' },
  header: { backgroundColor: '#2563EB', paddingHorizontal: 16, paddingBottom: 16 },
  headerTitle: { color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  loadingText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#94A3B8' },

  // ── Custom Alert ────────────────────────────────────────────────────────────
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  alertBox: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  alertIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  alertMessage: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  alertBtnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  alertCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  alertCancelText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748B',
  },
  alertOkBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
  },
  alertOkText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },

  // ── Bill UI ─────────────────────────────────────────────────────────────────
  billHeader: { backgroundColor: '#2563EB', padding: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText: { flex: 1 },
  billHeaderTitle: { color: '#fff', fontSize: 16, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '600', marginTop: 1 },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  toggleBtnOn: { backgroundColor: '#22C55E' },
  toggleText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  customerDisplay: { backgroundColor: 'rgba(252,128,25,0.15)', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'space-between' },
  customerIcon: { fontSize: 18 },
  customerInfo: { flex: 1 },
  customerName: { fontSize: 14, fontWeight: '800', color: '#2563EB' },
  customerPhone: { fontSize: 11, color: 'rgba(252,128,25,0.7)', fontWeight: '600' },
  totalBar: { backgroundColor: '#fff', padding: 12, paddingHorizontal: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: '#E2E8F0' },
  totalLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '700' },
  totalValue: { fontSize: 28, fontWeight: '900', color: '#2563EB', letterSpacing: -0.5 },
  itemsArea: { padding: 12, maxHeight: 250 },
  emptyBill: { alignItems: 'center', padding: 30 },
  emptyBillText: { color: '#bbb', fontSize: 13 },
  emptyBillSub: { fontSize: 11, color: '#ccc', marginTop: 4 },
  billItem: { backgroundColor: '#fff', borderRadius: 12, padding: 10, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 0.5, borderColor: '#E2E8F0' },
  itemName: { fontSize: 13, fontWeight: '700', color: '#0F172A', flex: 1 },
  customBadge: { fontSize: 10, color: '#64748B', fontWeight: '600' },
  itemControls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: { width: 26, height: 26, backgroundColor: '#F8FAFC', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 16, fontWeight: '800', color: '#2563EB' },
  qtyNum: { fontSize: 13, fontWeight: '800', color: '#0F172A', minWidth: 20, textAlign: 'center' },
  itemPrice: { fontSize: 13, fontWeight: '800', color: '#2563EB', minWidth: 52, textAlign: 'right' },
  removeBtn: { fontSize: 18, color: '#ddd', paddingHorizontal: 4 },
  customItemSection: { padding: 12, backgroundColor: '#fff', borderTopWidth: 0.5, borderTopColor: '#E2E8F0' },
  customLabel: { fontSize: 10, color: '#64748B', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  customRow: { flexDirection: 'row', gap: 8, alignItems: 'center', height: 42 },
  customInput: { flex: 2, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#fff', fontSize: 13, fontWeight: '600', color: '#333', height: 42 },
  customAmount: { flex: 1 },
  customAddBtn: { paddingHorizontal: 16, backgroundColor: '#2563EB', borderRadius: 10, alignItems: 'center', justifyContent: 'center', height: 42 },
  customAddText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  numpad: { backgroundColor: '#fff', borderTopWidth: 0.5, borderTopColor: '#E2E8F0', padding: 12 },
  numpadInputRow: { flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center', height: 44 },
  numpadInput: { flex: 1, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#fafafa', fontSize: 13, fontWeight: '700', color: '#333', height: 44 },
  numpadDisplay: { padding: 10, paddingHorizontal: 16, backgroundColor: '#fafafa', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, minWidth: 80, height: 44, alignItems: 'center', justifyContent: 'center' },
  numpadDisplayText: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  numpadGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  numpadKey: { width: '31%', padding: 14, backgroundColor: '#F8FAFC', borderRadius: 10, alignItems: 'center' },
  grayKey: { backgroundColor: '#E2E8F0' },
  numpadKeyText: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  buttonRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  outlineBtn: { flex: 1, padding: 12, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#2563EB', borderRadius: 10, alignItems: 'center' },
  outlineBtnText: { color: '#2563EB', fontSize: 12, fontWeight: '800' },
  fillBtn: { flex: 1, padding: 12, backgroundColor: '#2563EB', borderRadius: 10, alignItems: 'center' },
  fillBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  collectBtn: { padding: 14, backgroundColor: '#2563EB', borderRadius: 14, alignItems: 'center', marginTop: 4 },
  collectBtnDisabled: { backgroundColor: '#ddd' },
  collectBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },

  // ── Nav ─────────────────────────────────────────────────────────────────────
  bottomNav: { backgroundColor: '#fff', flexDirection: 'row', paddingVertical: 8, borderTopWidth: 0.5, borderTopColor: '#E2E8F0' },
  navItem: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  navLabel: { fontSize: 9, color: '#64748B', fontWeight: '700', marginTop: 2 },

  // ── Catalogue ───────────────────────────────────────────────────────────────
  catalogueSection: { flex: 1, padding: 14, backgroundColor: '#F5F3FF' },
  productList: { paddingBottom: 20 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 12, marginBottom: 10, height: 40, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '600', color: '#0F172A', height: 40 },
  productCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 0.5, borderColor: '#E2E8F0' },
  productName: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  productPrice: { fontSize: 13, color: '#2563EB', marginTop: 3, fontWeight: '700' },
  productActions: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  editBtn: { paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#fff8f0', borderWidth: 1, borderColor: '#2563EB', borderRadius: 9 },
  editBtnText: { fontSize: 12 },
  deleteBtn: { paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#FCEBEB', borderRadius: 9 },
  deleteBtnText: { fontSize: 12, color: '#A32D2D', fontWeight: '700' },
  addProductButton: { alignItems: 'center', justifyContent: 'center', paddingVertical: 20, gap: 8 },
  addProductButtonText: { fontSize: 14, fontWeight: '700', color: '#2563EB' },

  // ── Modals ──────────────────────────────────────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  pickerBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, maxHeight: '65%' },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  pickerTitle: { fontSize: 15, fontWeight: '900', color: '#0F172A' },
  pickerClose: { fontSize: 26, color: '#64748B' },
  pickerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#fafafa', borderRadius: 12, marginBottom: 8, borderWidth: 0.5, borderColor: '#E2E8F0' },
  pickerProdName: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  pickerProdPrice: { fontSize: 12, color: '#2563EB', marginTop: 2, fontWeight: '700' },
  pickerAddBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#2563EB', borderRadius: 8 },
  pickerAddText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  unitGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 10, justifyContent: 'space-around' },
  unitOption: { width: '45%', paddingVertical: 12, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1.5, borderColor: '#ddd', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  unitOptionSelected: { borderColor: '#2563EB', backgroundColor: 'rgba(37,99,235,0.08)' },
  unitOptionText: { fontSize: 13, fontWeight: '700', color: '#64748B', textTransform: 'capitalize' },
  unitOptionTextSelected: { color: '#2563EB' },
  addProductModal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  addProductModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  addProductModalTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  addProductModalContent: { gap: 16 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  lbInputBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 12, height: 50 },
  lbInput: { flex: 1, fontSize: 14, fontWeight: '600', color: '#333', height: 50 },
  saveBtn: { backgroundColor: '#2563EB', padding: 12, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});