// home.tsx - UI redesigned to match the target images exactly
import { useAuthStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState, useRef, memo } from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const SAMPLE_PRODUCTS = [
  { name: 'Puri Plate', price: 20, qty: 0 },
  { name: 'Masala Puri', price: 25, qty: 0 },
  { name: 'Tamarind Water', price: 10, qty: 0 },
  { name: 'Special Plate', price: 40, qty: 0 },
  { name: 'Idly 2pcs', price: 15, qty: 0 },
];

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

interface SaleLog {
  total: number;
  time: string;
  date: string;
  items: BillItem[];
  customerName: string;
  phone: string;
}

// Toast Component
const Toast = ({
  visible,
  message,
  type = 'error',
  onHide,
}: {
  visible: boolean;
  message: string;
  type?: 'error' | 'success' | 'info';
  onHide: () => void;
}) => {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => onHide(), 2000);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  const bg =
    type === 'error' ? '#EF4444' : type === 'success' ? '#10B981' : '#3B82F6';

  return (
    <View style={[styles.toastContainer, { backgroundColor: bg }]}>
      <Text style={styles.toastText}>{message}</Text>
    </View>
  );
};

// ─────────────────────────────────────────────
// LiveBillingModal — matches Image 2 left panel
// ─────────────────────────────────────────────
const LiveBillingModalComponent = memo(
  ({
    visible,
    onClose,
    onSave,
    sessionId,
    initialCustomerName = '',
    initialCustomerPhone = '',
    initialItems = [],
  }: {
    visible: boolean;
    onClose: () => void;
    onSave: (
      customerName: string,
      customerPhone: string,
      items: BillItem[],
      shouldComplete: boolean
    ) => void;
    sessionId?: number | null;
    initialCustomerName?: string;
    initialCustomerPhone?: string;
    initialItems?: BillItem[];
  }) => {
    const [customerName, setCustomerName] = useState(initialCustomerName);
    const [customerPhone, setCustomerPhone] = useState(initialCustomerPhone);
    const [items, setItems] = useState<BillItem[]>(initialItems);
    const [searchQuery, setSearchQuery] = useState('');
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    useEffect(() => {
      if (visible) {
        setCustomerName(initialCustomerName);
        setCustomerPhone(initialCustomerPhone);
        setItems(initialItems);
      }
    }, [visible]);

    const showWarning = (msg: string) => {
      setToastMessage(msg);
      setShowToast(true);
    };

    const handleAddItem = useCallback((item: BillItem) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.name === item.name);
        if (existing) {
          return prev.map((i) =>
            i.name === item.name ? { ...i, qty: i.qty + 1 } : i
          );
        }
        return [...prev, { ...item, qty: 1 }];
      });
    }, []);

    const handleRemoveItem = useCallback((itemName: string) => {
      setItems((prev) => {
        const item = prev.find((i) => i.name === itemName);
        if (item && item.qty > 1) {
          return prev.map((i) =>
            i.name === itemName ? { ...i, qty: i.qty - 1 } : i
          );
        }
        return prev.filter((i) => i.name !== itemName);
      });
    }, []);

    const handleSaveAndGoBack = () => {
      const itemsToSave = items.filter((i) => i.qty > 0);
      if (itemsToSave.length === 0) {
        showWarning('Please add at least one item');
        return;
      }
      onSave(customerName, customerPhone, itemsToSave, false);
    };

    const handleCompleteBill = () => {
      if (items.filter((i) => i.qty > 0).length === 0) {
        showWarning('Please add at least one item');
        return;
      }
      onSave(customerName, customerPhone, items, true);
    };

    const billTotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
    const totalItemCount = items.reduce((sum, i) => sum + i.qty, 0);

    const filteredProducts = SAMPLE_PRODUCTS.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!visible) return null;

    return (
      <>
        <Toast
          visible={showToast}
          message={toastMessage}
          onHide={() => setShowToast(false)}
        />
        <Modal
          animationType="slide"
          transparent={false}
          visible={visible}
          onRequestClose={onClose}
        >
          <KeyboardAvoidingView
            style={styles.liveBillingFullScreen}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            {/* Header */}
            <View style={styles.liveBillingHeader}>
              <TouchableOpacity onPress={onClose} style={styles.liveBillingBackBtn}>
                <Ionicons name="arrow-back" size={22} color="#333" />
              </TouchableOpacity>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.liveBillingTitle}>Live Billing</Text>
                <Text style={styles.liveBillingSub}>Add items and create bill</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.liveBillingCloseBtn}>
                <Ionicons name="close" size={20} color="#2563EB" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.liveBillingContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Customer Name Section */}
              <View style={styles.customerSection}>
                <View style={styles.customerAvatarRow}>
                  <View style={styles.customerAvatar}>
                    <Ionicons name="person" size={24} color="#2563EB" />
                  </View>
                  <Text style={styles.customerSectionTitle}>Customer Name</Text>
                </View>

                {/* Name Input */}
                <View style={styles.lbInputBox}>
                  <Ionicons name="person-outline" size={18} color="#bbb" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.lbInput}
                    placeholder="Enter customer name (optional)"
                    value={customerName}
                    onChangeText={setCustomerName}
                    placeholderTextColor="#ccc"
                  />
                  {customerName.length > 0 && (
                    <TouchableOpacity onPress={() => setCustomerName('')}>
                      <Ionicons name="close-circle" size={18} color="#bbb" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Phone Input */}
                <View style={[styles.lbInputBox, { marginTop: 8 }]}>
                  <Ionicons name="call-outline" size={18} color="#bbb" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.lbInput}
                    placeholder="Phone (optional)"
                    value={customerPhone}
                    onChangeText={setCustomerPhone}
                    keyboardType="phone-pad"
                    placeholderTextColor="#ccc"
                  />
                </View>
              </View>

              {/* Add Items Section */}
              <View style={styles.addItemsSection}>
                <View style={styles.addItemsHeader}>
                  <Text style={styles.addItemsTitle}>Add Items</Text>
                  <TouchableOpacity>
                    <Text style={styles.addCustomItemBtn}>+ Add Custom Item</Text>
                  </TouchableOpacity>
                </View>

                {/* Search Box */}
                <View style={styles.searchBox}>
                  <Ionicons name="search" size={18} color="#bbb" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search items..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor="#ccc"
                  />
                </View>

                {/* Product Rows */}
                {filteredProducts.map((product) => {
                  const currentItem = items.find((i) => i.name === product.name);
                  const qty = currentItem?.qty || 0;
                  const lineTotal = qty * product.price;

                  return (
                    <View key={product.name} style={styles.productRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.productName}>{product.name}</Text>
                        <Text style={styles.productPrice}>₹ {product.price.toFixed(2)}</Text>
                      </View>
                      <View style={styles.qtyControl}>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => handleRemoveItem(product.name)}
                        >
                          <Ionicons name="remove" size={16} color="#2563EB" />
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>{qty}</Text>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => handleAddItem(product)}
                        >
                          <Ionicons name="add" size={16} color="#2563EB" />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.lineTotal}>
                        ₹ {lineTotal > 0 ? lineTotal.toFixed(2) : '0.00'}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Bill Summary Bar */}
              <View style={styles.billSummaryBar}>
                <View style={styles.summaryLeft}>
                  <Ionicons name="document-text-outline" size={28} color="#2563EB" />
                  <View style={{ marginLeft: 10 }}>
                    <Text style={styles.summaryItemsLabel}>Total Items</Text>
                    <Text style={styles.summaryItemsValue}>{totalItemCount} Items</Text>
                  </View>
                </View>
                <View style={styles.summaryRight}>
                  <Text style={styles.summaryTotalLabel}>Grand Total</Text>
                  <Text style={styles.summaryTotalValue}>₹ {billTotal.toFixed(2)}</Text>
                </View>
              </View>

              <View style={{ height: 100 }} />
            </ScrollView>

            {/* Bottom Buttons */}
            <View style={styles.lbBottomButtons}>
              <TouchableOpacity style={styles.saveGoBackBtn} onPress={handleSaveAndGoBack}>
                <Ionicons name="save-outline" size={18} color="#2563EB" style={{ marginRight: 6 }} />
                <Text style={styles.saveGoBackText}>Save & Go Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.completeBillBtn} onPress={handleCompleteBill}>
                <Ionicons name="checkmark" size={18} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.completeBillText}>Complete Bill</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </>
    );
  }
);

// ─────────────────────────────────────────────
// ReviewBillModal
// ─────────────────────────────────────────────
const ReviewBillModalComponent = memo(
  ({
    visible,
    onClose,
    onConfirm,
    customerName = '',
    customerPhone = '',
    items = [],
    total = 0,
  }: {
    visible: boolean;
    onClose: () => void;
    onConfirm: () => void;
    customerName?: string;
    customerPhone?: string;
    items?: BillItem[];
    total?: number;
  }) => {
    if (!visible) return null;
    return (
      <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
        <View style={styles.reviewBillOverlay}>
          <View style={styles.reviewBillContainer}>
            <View style={styles.reviewBillHeader}>
              <Text style={styles.reviewBillTitle}>Review Bill</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <View style={styles.reviewBillCustomerInfo}>
              <Text style={styles.reviewBillCustomerName}>{customerName || 'Walk-in Customer'}</Text>
              {customerPhone ? (
                <Text style={styles.reviewBillCustomerPhone}>{customerPhone}</Text>
              ) : null}
            </View>
            <ScrollView style={{ maxHeight: SCREEN_HEIGHT * 0.4 }} showsVerticalScrollIndicator={false}>
              {items.map((item, index) => (
                <View key={index} style={styles.reviewBillItem}>
                  <View>
                    <Text style={styles.reviewBillItemName}>{item.name}</Text>
                    <Text style={styles.reviewBillItemQty}>Qty: {item.qty}</Text>
                  </View>
                  <Text style={styles.reviewBillItemAmount}>₹{item.price * item.qty}</Text>
                </View>
              ))}
            </ScrollView>
            <View style={styles.reviewBillTotal}>
              <Text style={styles.reviewBillTotalLabel}>Total</Text>
              <Text style={styles.reviewBillTotalAmount}>₹{total}</Text>
            </View>
            <View style={styles.reviewBillButtons}>
              <TouchableOpacity style={styles.reviewBillBackBtn} onPress={onClose}>
                <Text style={styles.reviewBillBackBtnText}>Edit Bill</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.reviewBillDoneBtn} onPress={onConfirm}>
                <Text style={styles.reviewBillDoneBtnText}>Confirm & Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }
);

// ─────────────────────────────────────────────
// Main HomeScreen
// ─────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);

  const [bizName, setBizName] = useState('Sri Venkata Tiffins');
  const [todayTotal, setTodayTotal] = useState(0);
  const [salesLog, setSalesLog] = useState<SaleLog[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [profileVisible, setProfileVisible] = useState(false);
  const [totalBills, setTotalBills] = useState(0);
  const [nextDue, setNextDue] = useState('');

  // Quick Entry modal
  const [quickEntryVisible, setQuickEntryVisible] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickPhone, setQuickPhone] = useState('');
  const [quickAmount, setQuickAmount] = useState('');
  const [quickNote, setQuickNote] = useState('');

  // Live Billing
  const [billingSessionActive, setBillingSessionActive] = useState(false);
  const [currentBillingSessionId, setCurrentBillingSessionId] = useState<number | null>(null);
  const [billReviewVisible, setBillReviewVisible] = useState(false);
  const [reviewData, setReviewData] = useState<{
    customerName: string;
    customerPhone: string;
    items: BillItem[];
    total: number;
    sessionId?: number | null;
  }>({ customerName: '', customerPhone: '', items: [], total: 0, sessionId: null });

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'error' | 'success' | 'info'>('error');

  const showWarning = (msg: string) => { setToastMessage(msg); setToastType('error'); setShowToast(true); };
  const showSuccess = (msg: string) => { setToastMessage(msg); setToastType('success'); setShowToast(true); };

  useEffect(() => {
    loadData();
    updateDateTime();
    const interval = setInterval(updateDateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!billingSessionActive) loadData();
  }, [billingSessionActive]);

  const updateDateTime = () => {
    const now = new Date();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    setCurrentDateTime(
      `Sankalp · ${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} · ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    );
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    setNextDue(`${nextMonth.getDate()} ${months[nextMonth.getMonth()]}`);
  };

  const loadData = async () => {
    try {
      if (user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('business_name')
          .eq('id', user.id)
          .maybeSingle();
        if (profile?.business_name) setBizName(profile.business_name);
      }

      const storedSales = await AsyncStorage.getItem('salesLog');
      if (storedSales) {
        const parsed = JSON.parse(storedSales);
        if (Array.isArray(parsed)) {
          setSalesLog(parsed);
          setTodayTotal(parsed.reduce((sum: number, s: SaleLog) => sum + s.total, 0));
          setTotalBills(parsed.length);
        }
      }

      const storedSessions = await AsyncStorage.getItem('sessions');
      if (storedSessions) {
        const parsed = JSON.parse(storedSessions);
        setSessions(parsed);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const startBilling = async () => {
    const newSessionId = Date.now();
    setCurrentBillingSessionId(newSessionId);
    setBillingSessionActive(true);
  };

  const continueSession = (sessionId: number) => {
    router.push({ pathname: '/products', params: { sessionId: sessionId.toString() } });
  };

  const updateCurrentBillingSession = async (items: BillItem[], custName?: string, custPhone?: string) => {
    if (!currentBillingSessionId) return;
    const updated = sessions.map((s) =>
      s.id === currentBillingSessionId
        ? { ...s, items, customerName: custName || s.customerName, phone: custPhone || s.phone }
        : s
    );
    setSessions(updated);
    await AsyncStorage.setItem('sessions', JSON.stringify(updated));
  };

  const saveQuickEntry = async () => {
    if (!quickName.trim()) { showWarning('Please enter customer name'); return; }
    if (!quickAmount.trim()) { showWarning('Please enter amount'); return; }
    const amount = parseFloat(quickAmount);
    if (isNaN(amount) || amount <= 0) { showWarning('Enter a valid amount'); return; }

    const now = new Date();
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const newBill: SaleLog = {
      total: amount,
      time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      date: `${now.getDate()} ${months[now.getMonth()]}`,
      items: [{ name: quickNote.trim() || 'Quick Entry', price: amount, qty: 1 }],
      customerName: quickName.trim(),
      phone: quickPhone,
    };

    const updated = [newBill, ...salesLog];
    setSalesLog(updated);
    await AsyncStorage.setItem('salesLog', JSON.stringify(updated));
    setTodayTotal((prev) => prev + amount);
    setTotalBills((prev) => prev + 1);
    setQuickName(''); setQuickPhone(''); setQuickAmount(''); setQuickNote('');
    setQuickEntryVisible(false);
    showSuccess(`Payment saved! ₹${amount}`);
  };

  const handleSaveBill = async (customerName: string, customerPhone: string, items: BillItem[], shouldComplete: boolean) => {
    if (shouldComplete) {
      const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
      setReviewData({ customerName, customerPhone, items, total, sessionId: currentBillingSessionId });
      setBillingSessionActive(false);
      setBillReviewVisible(true);
    } else {
      if (!currentBillingSessionId) {
        const id = Date.now();
        setCurrentBillingSessionId(id);
        const newSession: Session = { id, customerName: customerName || 'Walk-in Customer', phone: customerPhone, items, npVal: '0' };
        const updated = [...sessions, newSession];
        setSessions(updated);
        await AsyncStorage.setItem('sessions', JSON.stringify(updated));
      } else {
        await updateCurrentBillingSession(items, customerName, customerPhone);
      }
      setBillingSessionActive(false);
      showSuccess('Bill saved as draft');
    }
  };

  const handleConfirmBill = async () => {
    const now = new Date();
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const newBill: SaleLog = {
      total: reviewData.total,
      time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      date: `${now.getDate()} ${months[now.getMonth()]}`,
      items: reviewData.items,
      customerName: reviewData.customerName,
      phone: reviewData.customerPhone,
    };
    const updatedBills = [newBill, ...salesLog];
    setSalesLog(updatedBills);
    await AsyncStorage.setItem('salesLog', JSON.stringify(updatedBills));

    if (reviewData.sessionId) {
      const updatedSessions = sessions.filter((s) => s.id !== reviewData.sessionId);
      setSessions(updatedSessions);
      await AsyncStorage.setItem('sessions', JSON.stringify(updatedSessions));
    }
    setTodayTotal((prev) => prev + reviewData.total);
    setTotalBills((prev) => prev + 1);
    setBillReviewVisible(false);
    setCurrentBillingSessionId(null);
    setReviewData({ customerName: '', customerPhone: '', items: [], total: 0, sessionId: null });
    showSuccess(`Bill saved! ₹${reviewData.total}`);
  };

  // Active sessions = those with items
  const activeSessions = sessions.filter((s) => s.items.length > 0);

  // Colour cycling for order cards
  const cardStyles = [
    { bg: '#EEF2FF', borderColor: '#2563EB', badgeBg: '#2563EB', amountColor: '#2563EB', badgeText: '#fff' },
    { bg: '#F5F3FF', borderColor: '#7C3AED', badgeBg: '#7C3AED', amountColor: '#7C3AED', badgeText: '#fff' },
    { bg: '#FFF7ED', borderColor: '#F59E0B', badgeBg: '#F59E0B', amountColor: '#F59E0B', badgeText: '#fff' },
  ];

  // Profile Modal
  const ProfileModal = () => (
    <Modal animationType="slide" transparent visible={profileVisible} onRequestClose={() => setProfileVisible(false)}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setProfileVisible(false)}>
        <View style={styles.profilePanel}>
          <View style={styles.profileHandle} />
          <View style={styles.profileHeader}>
            <Text style={styles.profileBizName}>{bizName}</Text>
            <Text style={styles.profileBizSub}>🏪 Active since 2024</Text>
            <Text style={styles.profileEmail}>📧 {user?.email || 'Not available'}</Text>
            <View style={styles.qrBox}>
              <Image source={require('@/assets/images/icon.png')} style={styles.qrImage} resizeMode="contain" />
            </View>
          </View>
          <View style={styles.profileGrid}>
            {[
              { label: 'Total Bills', value: String(totalBills) },
              { label: 'Today Revenue', value: `₹${todayTotal}`, color: '#2563EB' },
              { label: 'Plan', value: 'Active', color: '#2563EB' },
              { label: 'Next Due', value: nextDue, color: '#A32D2D' },
            ].map((cell) => (
              <View key={cell.label} style={styles.profileCell}>
                <Text style={styles.profileLabel}>{cell.label}</Text>
                <Text style={[styles.profileValue, cell.color ? { color: cell.color } : {}]}>{cell.value}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.profileCloseBtn} onPress={() => setProfileVisible(false)}>
            <Text style={styles.profileCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // ─── Quick Entry Bottom Sheet (Image 2 right panel) ───
  const QuickEntryModal = () => (
    <Modal animationType="slide" transparent visible={quickEntryVisible} onRequestClose={() => setQuickEntryVisible(false)}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setQuickEntryVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.qeSheet}
          pointerEvents="auto"
        >
          {/* Handle */}
          <View style={styles.qeHandle} />

          {/* Header */}
          <View style={styles.qeHeaderRow}>
            <View style={styles.qeHeaderLeft}>
              <View style={styles.qeIconBox}>
                <Ionicons name="flash" size={24} color="#6D28D9" />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.qeTitle}>Quick Entry</Text>
                <Text style={styles.qeSub}>Add name and amount quickly</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setQuickEntryVisible(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Fast & Simple Badge */}
          <View style={styles.qeFastBadge}>
            <Ionicons name="timer-outline" size={22} color="#6D28D9" />
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.qeFastTitle}>Fast & Simple</Text>
              <Text style={styles.qeFastSub}>Just enter details and save</Text>
            </View>
          </View>

          {/* Form */}
          <View style={styles.qeForm}>
            <Text style={styles.qeLabel}>Customer Name</Text>
            <View style={styles.qeInputBox}>
              <Ionicons name="person-outline" size={18} color="#bbb" style={{ marginRight: 8 }} />
              <TextInput style={styles.qeInput} placeholder="Enter customer name" value={quickName} onChangeText={setQuickName} placeholderTextColor="#ccc" />
            </View>

            <Text style={[styles.qeLabel, { marginTop: 14 }]}>Phone (Optional)</Text>
            <View style={styles.qeInputBox}>
              <Ionicons name="call-outline" size={18} color="#bbb" style={{ marginRight: 8 }} />
              <TextInput style={styles.qeInput} placeholder="+91 98765 43210" value={quickPhone} onChangeText={setQuickPhone} keyboardType="phone-pad" placeholderTextColor="#ccc" />
            </View>

            <Text style={[styles.qeLabel, { marginTop: 14 }]}>Amount (₹)</Text>
            <View style={styles.qeInputBox}>
              <Ionicons name="logo-usd" size={18} color="#bbb" style={{ marginRight: 8 }} />
              <TextInput style={[styles.qeInput, { fontSize: 16, color: '#2563EB', fontWeight: '700' }]} placeholder="0.00" value={quickAmount} onChangeText={setQuickAmount} keyboardType="decimal-pad" placeholderTextColor="#ccc" />
            </View>

            <Text style={[styles.qeLabel, { marginTop: 14 }]}>Payment Note (Optional)</Text>
            <View style={styles.qeInputBox}>
              <Ionicons name="document-text-outline" size={18} color="#bbb" style={{ marginRight: 8 }} />
              <TextInput style={styles.qeInput} placeholder="e.g., Lunch Payment, Advance, etc." value={quickNote} onChangeText={setQuickNote} placeholderTextColor="#ccc" />
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity style={styles.qeSaveBtn} onPress={saveQuickEntry}>
            <Ionicons name="wallet-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.qeSaveBtnText}>Save Payment</Text>
          </TouchableOpacity>

          <View style={{ height: 12 }} />
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <Toast visible={showToast} message={toastMessage} type={toastType} onHide={() => setShowToast(false)} />
      <ProfileModal />
      <QuickEntryModal />
      <LiveBillingModalComponent
        visible={billingSessionActive}
        onClose={() => { setBillingSessionActive(false); setCurrentBillingSessionId(null); }}
        onSave={handleSaveBill}
        sessionId={currentBillingSessionId}
      />
      <ReviewBillModalComponent
        visible={billReviewVisible}
        onClose={() => { setBillReviewVisible(false); setBillingSessionActive(true); }}
        onConfirm={handleConfirmBill}
        customerName={reviewData.customerName}
        customerPhone={reviewData.customerPhone}
        items={reviewData.items}
        total={reviewData.total}
      />

      {/* ── HEADER (blue) ── */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.shopName}>{bizName}</Text>
            <Text style={styles.shopDateTime}>{currentDateTime}</Text>
          </View>
          <TouchableOpacity style={styles.profileBtn} onPress={() => setProfileVisible(true)}>
            <Ionicons name="person" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Collection Card */}
        <View style={styles.collectionCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.collectionLabel}>TODAY'S COLLECTION</Text>
            <Text style={styles.collectionValue}>₹{todayTotal.toLocaleString('en-IN')}</Text>
            <Text style={styles.collectionSub}>{salesLog.length} bill{salesLog.length !== 1 ? 's' : ''} today</Text>
          </View>
          <View style={styles.collectionIconBox}>
            <Ionicons name="wallet-outline" size={26} color="rgba(255,255,255,0.9)" />
          </View>
        </View>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* ── ACTIVE ORDERS ── */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Active Orders</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View All &gt;</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
          {activeSessions.map((session, idx) => {
            const total = session.items.reduce((s, i) => s + i.price * i.qty, 0);
            const cs = cardStyles[idx % cardStyles.length];
            return (
              <TouchableOpacity
                key={session.id}
                style={[styles.activeOrderCard, { backgroundColor: cs.bg, borderColor: cs.borderColor }]}
                onPress={() => continueSession(session.id)}
              >
                <View style={[styles.orderBadge, { backgroundColor: cs.badgeBg }]}>
                  <Text style={[styles.orderBadgeText, { color: cs.badgeText }]}>#{idx + 1}</Text>
                </View>
                <Text style={styles.orderCustomerName} numberOfLines={1}>
                  {session.customerName}
                </Text>
                <Text style={[styles.orderTotal, { color: cs.amountColor }]}>
                  ₹{total.toLocaleString('en-IN')}
                </Text>
                <View style={styles.orderStatusRow}>
                  <Ionicons name="time-outline" size={11} color="#888" />
                  <Text style={styles.orderStatus}> In Progress</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── QUICK ACTIONS ── */}
        <Text style={styles.quickActionsTitle}>Quick Actions</Text>
        <View style={styles.quickActionsRow}>
          {/* New Bill */}
          <TouchableOpacity style={[styles.qaBtn, { backgroundColor: '#2563EB', marginRight: 10 }]} onPress={startBilling}>
            <View style={styles.qaLeft}>
              <Ionicons name="document-text-outline" size={22} color="#fff" />
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.qaBtnTitle}>+ New Bill</Text>
                <Text style={styles.qaBtnSub}>Add items &amp; generate bill</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </TouchableOpacity>

          {/* Quick Entry */}
          <TouchableOpacity
            style={[styles.qaBtn, { backgroundColor: '#6D28D9' }]}
            onPress={() => { setQuickName(''); setQuickPhone(''); setQuickAmount(''); setQuickNote(''); setQuickEntryVisible(true); }}
          >
            <View style={styles.qaLeft}>
              <Ionicons name="flash" size={22} color="#fff" />
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.qaBtnTitle}>+ Quick Entry</Text>
                <Text style={styles.qaBtnSub}>Just name &amp; amount</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* ── TODAY'S BILLS ── */}
        <View style={[styles.sectionRow, { marginTop: 16 }]}>
          <Text style={styles.sectionTitle}>Today's Bills</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {salesLog.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No sales yet today</Text>
          </View>
        ) : (
          salesLog.map((bill, index) => (
            <TouchableOpacity
              key={index}
              style={styles.billCard}
              onPress={() =>
                Alert.alert(
                  `Bill #${salesLog.length - index}`,
                  `Customer: ${bill.customerName}\nTime: ${bill.time}\nTotal: ₹${bill.total}\n\nItems:\n${bill.items.map((i) => `${i.name} x${i.qty} = ₹${i.price * i.qty}`).join('\n')}`,
                  [{ text: 'OK' }]
                )
              }
            >
              <View style={styles.billAvatarBox}>
                <Ionicons name="person" size={22} color="#2563EB" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.billNumber}>Bill #{salesLog.length - index}</Text>
                <Text style={styles.billCustomer}>{bill.customerName}</Text>
                <Text style={styles.billTime}>{bill.time} · {bill.date || ''}</Text>
              </View>
              <View style={styles.billRight}>
                <View style={styles.paidBadge}>
                  <Text style={styles.paidBadgeText}>PAID</Text>
                </View>
                <Text style={styles.billAmount}>₹{bill.total.toLocaleString('en-IN')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#bbb" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* ── BOTTOM NAV ── */}
      <View style={[styles.bottomNav, { paddingBottom: insets.bottom || 8 }]}>
        <TouchableOpacity style={styles.navItem} onPress={() => {}}>
          <Ionicons name="home" size={24} color="#2563EB" />
          <Text style={[styles.navLabel, { color: '#2563EB' }]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/analytics')}>
          <Ionicons name="stats-chart" size={24} color="#9CA3AF" />
          <Text style={styles.navLabel}>Analytics</Text>
        </TouchableOpacity>

        {/* FAB placeholder space */}
        <View style={{ width: 60 }} />

        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/products')}>
          <Ionicons name="pricetag" size={24} color="#9CA3AF" />
          <Text style={styles.navLabel}>Products</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/suppliers')}>
          <Ionicons name="people" size={24} color="#9CA3AF" />
          <Text style={styles.navLabel}>Customers</Text>
        </TouchableOpacity>
      </View>

      {/* FAB */}
      <TouchableOpacity style={[styles.fab, { bottom: (insets.bottom || 8) + 56 }]} onPress={startBilling}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F8' },

  // ── Header ──
  header: { backgroundColor: '#2563EB', paddingHorizontal: 16, paddingBottom: 22 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  shopName: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  shopDateTime: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '600', marginTop: 2 },
  profileBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  collectionCard: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center' },
  collectionLabel: { fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  collectionValue: { fontSize: 38, fontWeight: '900', color: '#fff', letterSpacing: -2, marginTop: 2 },
  collectionSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4, fontWeight: '600' },
  collectionIconBox: { width: 50, height: 50, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },

  // ── Body ──
  body: { flex: 1, paddingHorizontal: 16, paddingTop: 18 },

  // ── Section row ──
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111' },
  viewAllText: { fontSize: 13, fontWeight: '700', color: '#2563EB' },

  // ── Active Order Cards ──
  activeOrderCard: { width: 150, borderRadius: 14, borderWidth: 1.5, padding: 12, marginRight: 10, marginBottom: 8 },
  orderBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 8 },
  orderBadgeText: { fontSize: 11, fontWeight: '800' },
  orderCustomerName: { fontSize: 15, fontWeight: '800', color: '#111', marginBottom: 4 },
  orderTotal: { fontSize: 16, fontWeight: '900', marginBottom: 4 },
  orderStatusRow: { flexDirection: 'row', alignItems: 'center' },
  orderStatus: { fontSize: 11, color: '#888', fontWeight: '600' },
  newOrderCard: { width: 80, borderRadius: 14, borderWidth: 1.5, borderColor: '#2563EB', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: 8, backgroundColor: '#fff' },
  newOrderText: { fontSize: 13, fontWeight: '700', color: '#2563EB', marginTop: 4 },

  // ── Quick Actions ──
  quickActionsTitle: { fontSize: 16, fontWeight: '800', color: '#111', marginBottom: 10, marginTop: 6 },
  quickActionsRow: { flexDirection: 'row', marginBottom: 4 },
  qaBtn: { flex: 1, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4 },
  qaLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  qaBtnTitle: { fontSize: 14, fontWeight: '800', color: '#fff' },
  qaBtnSub: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginTop: 1 },

  // ── Today's Bills ──
  billCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 0.5, borderColor: '#E5E7EB', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 },
  billAvatarBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  billNumber: { fontSize: 12, fontWeight: '700', color: '#666' },
  billCustomer: { fontSize: 15, fontWeight: '800', color: '#2563EB', marginTop: 1 },
  billTime: { fontSize: 11, color: '#9CA3AF', marginTop: 2, fontWeight: '600' },
  billRight: { alignItems: 'flex-end' },
  paidBadge: { backgroundColor: '#DCFCE7', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 4 },
  paidBadgeText: { fontSize: 9, fontWeight: '800', color: '#16A34A', letterSpacing: 0.5 },
  billAmount: { fontSize: 16, fontWeight: '900', color: '#2563EB' },

  emptyState: { alignItems: 'center', paddingVertical: 30 },
  emptyText: { color: '#bbb', fontSize: 13, fontWeight: '600' },

  // ── Bottom Nav ──
  bottomNav: { backgroundColor: '#fff', flexDirection: 'row', paddingTop: 8, borderTopWidth: 0.5, borderTopColor: '#E5E7EB' },
  navItem: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  navLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '700', marginTop: 2 },
  fab: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8 },

  // ── Live Billing Modal ──
  liveBillingFullScreen: { flex: 1, backgroundColor: '#fff' },
  liveBillingHeader: { flexDirection: 'row', alignItems: 'center', paddingTop: 52, paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  liveBillingBackBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  liveBillingCloseBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  liveBillingTitle: { fontSize: 18, fontWeight: '900', color: '#111' },
  liveBillingSub: { fontSize: 12, color: '#9CA3AF', fontWeight: '600', marginTop: 1 },
  liveBillingContent: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },

  // Customer section
  customerSection: { marginBottom: 20 },
  customerAvatarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  customerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  customerSectionTitle: { fontSize: 15, fontWeight: '800', color: '#111', marginLeft: 10 },
  lbInputBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 2 },
  lbInput: { flex: 1, padding: 12, fontSize: 14, fontWeight: '600', color: '#333' },

  // Add items section
  addItemsSection: { marginBottom: 20 },
  addItemsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  addItemsTitle: { fontSize: 15, fontWeight: '800', color: '#111' },
  addCustomItemBtn: { fontSize: 13, fontWeight: '700', color: '#2563EB' },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 12, marginBottom: 10 },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 14, color: '#333', fontWeight: '600' },

  // Product rows
  productRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0' },
  productName: { fontSize: 14, fontWeight: '700', color: '#111' },
  productPrice: { fontSize: 12, fontWeight: '700', color: '#2563EB', marginTop: 2 },
  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: 10, marginRight: 12 },
  qtyBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: 14, fontWeight: '800', color: '#111', minWidth: 18, textAlign: 'center' },
  lineTotal: { fontSize: 13, fontWeight: '800', color: '#333', minWidth: 55, textAlign: 'right' },

  // Bill summary bar
  billSummaryBar: { backgroundColor: '#F0F4FF', borderRadius: 14, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  summaryLeft: { flexDirection: 'row', alignItems: 'center' },
  summaryItemsLabel: { fontSize: 11, color: '#666', fontWeight: '600' },
  summaryItemsValue: { fontSize: 13, fontWeight: '800', color: '#2563EB', marginTop: 2 },
  summaryRight: { alignItems: 'flex-end' },
  summaryTotalLabel: { fontSize: 11, color: '#666', fontWeight: '600' },
  summaryTotalValue: { fontSize: 22, fontWeight: '900', color: '#111', marginTop: 2 },

  // Bottom buttons
  lbBottomButtons: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14, gap: 12, borderTopWidth: 1, borderTopColor: '#F0F0F0', backgroundColor: '#fff' },
  saveGoBackBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#2563EB', borderRadius: 12, paddingVertical: 13 },
  saveGoBackText: { color: '#2563EB', fontSize: 14, fontWeight: '800' },
  completeBillBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 13, elevation: 2 },
  completeBillText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  // ── Quick Entry Modal ──
  qeSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12 },
  qeHandle: { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 4, alignSelf: 'center', marginBottom: 16 },
  qeHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  qeHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  qeIconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  qeTitle: { fontSize: 18, fontWeight: '900', color: '#111' },
  qeSub: { fontSize: 12, color: '#9CA3AF', fontWeight: '600', marginTop: 2 },
  qeFastBadge: { backgroundColor: '#F5F3FF', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  qeFastTitle: { fontSize: 14, fontWeight: '800', color: '#6D28D9' },
  qeFastSub: { fontSize: 12, color: '#7C3AED', fontWeight: '600', marginTop: 1 },
  qeForm: { marginBottom: 18 },
  qeLabel: { fontSize: 13, fontWeight: '700', color: '#111', marginBottom: 8 },
  qeInputBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 12 },
  qeInput: { flex: 1, paddingVertical: 12, fontSize: 14, fontWeight: '600', color: '#333' },
  qeSaveBtn: { backgroundColor: '#6D28D9', borderRadius: 14, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', elevation: 3 },
  qeSaveBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },

  // ── Profile Modal ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  profilePanel: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22 },
  profileHandle: { width: 40, height: 4, backgroundColor: '#eee', borderRadius: 4, alignSelf: 'center', marginBottom: 20 },
  profileHeader: { alignItems: 'center', marginBottom: 16 },
  profileBizName: { fontSize: 22, fontWeight: '900', color: '#222' },
  profileBizSub: { fontSize: 12, color: '#2563EB', fontWeight: '700', marginTop: 2, marginBottom: 10 },
  profileEmail: { fontSize: 12, color: '#666', fontWeight: '600', marginBottom: 12 },
  qrBox: { width: 130, height: 130, backgroundColor: '#fff', borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#ddd', borderStyle: 'dashed', overflow: 'hidden' },
  qrImage: { width: 120, height: 120 },
  profileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  profileCell: { flex: 1, minWidth: '45%', backgroundColor: '#f9f9f9', borderRadius: 12, padding: 12, alignItems: 'center' },
  profileLabel: { fontSize: 10, color: '#999', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  profileValue: { fontSize: 14, fontWeight: '800', color: '#222', marginTop: 3 },
  profileCloseBtn: { backgroundColor: '#2563EB', padding: 13, borderRadius: 12, alignItems: 'center' },
  profileCloseText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  // ── Review Bill Modal ──
  reviewBillOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  reviewBillContainer: { backgroundColor: '#fff', borderRadius: 16, width: '100%', maxHeight: '85%' },
  reviewBillHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  reviewBillTitle: { fontSize: 16, fontWeight: '900', color: '#222' },
  reviewBillCustomerInfo: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  reviewBillCustomerName: { fontSize: 16, fontWeight: '900', color: '#222' },
  reviewBillCustomerPhone: { fontSize: 13, color: '#666', fontWeight: '600', marginTop: 2 },
  reviewBillItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  reviewBillItemName: { fontSize: 14, fontWeight: '700', color: '#222' },
  reviewBillItemQty: { fontSize: 12, color: '#666', fontWeight: '600', marginTop: 2 },
  reviewBillItemAmount: { fontSize: 14, fontWeight: '900', color: '#2563EB' },
  reviewBillTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 2, borderTopColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  reviewBillTotalLabel: { fontSize: 14, fontWeight: '800', color: '#666' },
  reviewBillTotalAmount: { fontSize: 18, fontWeight: '900', color: '#2563EB' },
  reviewBillButtons: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  reviewBillBackBtn: { flex: 1, paddingVertical: 12, borderWidth: 2, borderColor: '#2563EB', borderRadius: 10, alignItems: 'center' },
  reviewBillBackBtnText: { color: '#2563EB', fontWeight: '800', fontSize: 14 },
  reviewBillDoneBtn: { flex: 1, paddingVertical: 12, backgroundColor: '#2563EB', borderRadius: 10, alignItems: 'center' },
  reviewBillDoneBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  // ── Toast ──
  toastContainer: { position: 'absolute', bottom: 100, left: 20, right: 20, padding: 12, borderRadius: 10, alignItems: 'center', zIndex: 9999 },
  toastText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});