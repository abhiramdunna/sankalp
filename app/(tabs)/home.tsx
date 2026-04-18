import { useAuthStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Types
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
  items: BillItem[];
  customerName: string;
  phone: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const [bizName, setBizName] = useState('Sri Venkata Tiffins');
  const [todayTotal, setTodayTotal] = useState(0);
  const [salesLog, setSalesLog] = useState<SaleLog[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [profileVisible, setProfileVisible] = useState(false);
  const [totalBills, setTotalBills] = useState(0);
  const [nextDue, setNextDue] = useState('');
  const [billingMode, setBillingMode] = useState<'full' | 'quick' | null>(null);
  const [quickAmount, setQuickAmount] = useState('');
  const [billingSessionActive, setBillingSessionActive] = useState(false);
  const [billingCustomerName, setBillingCustomerName] = useState('');
  const [billingCustomerPhone, setBillingCustomerPhone] = useState('');
  const [billingItems, setBillingItems] = useState<BillItem[]>([]);
  const [products, setProducts] = useState<BillItem[]>([]);
  const [customerToggleOn, setCustomerToggleOn] = useState(false);
  const [walkInSessions, setWalkInSessions] = useState<Session[]>([]);
  const [currentBillingSessionId, setCurrentBillingSessionId] = useState<number | null>(null);

  // Load data on mount
  useEffect(() => {
    loadData();
    updateDateTime();
    const interval = setInterval(updateDateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Reload data when billing modal closes (to show new bills)
  useEffect(() => {
    if (!billingSessionActive) {
      loadData();
    }
  }, [billingSessionActive]);

  // Update date/time display
  const updateDateTime = () => {
    const now = new Date();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const d = days[now.getDay()];
    const dt = now.getDate();
    const m = months[now.getMonth()];
    const hh = now.getHours().toString().padStart(2, '0');
    const mm = now.getMinutes().toString().padStart(2, '0');
    setCurrentDateTime(`Sankalp · ${d}, ${dt} ${m} · ${hh}:${mm}`);
    
    // Set next due date (1st of next month)
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    setNextDue(`${nextMonth.getDate()} ${months[nextMonth.getMonth()]}`);
  };

  // Load all data from storage
  const loadData = async () => {
    try {
      console.log('📦 Loading home data...');
      
      // ✅ Get user from Zustand store (already populated during login)
      console.log('👤 User from store:', user?.email, user?.id);
      
      if (user?.id) {
        console.log('🔍 Fetching profile for user:', user.id);
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('business_name')
          .eq('id', user.id)
          .maybeSingle();
        
        console.log('📊 Profile result:', { profile, error: profileError });
        
        if (profile?.business_name) {
          console.log('✅ Loaded business name:', profile.business_name);
          setBizName(profile.business_name);
        } else {
          console.log('⚠️ No business name found in profile');
        }
      } else {
        console.log('⚠️ No user in store');
      }

      const storedSales = await AsyncStorage.getItem('salesLog');
      if (storedSales) {
        const parsed = JSON.parse(storedSales);
        if (Array.isArray(parsed)) {
          setSalesLog(parsed);
          const total = parsed.reduce((sum: number, sale: SaleLog) => sum + sale.total, 0);
          setTodayTotal(total);
          setTotalBills(parsed.length);
        } else {
          console.warn('⚠️ Corrupted salesLog data, resetting');
          setSalesLog([]);
          setTodayTotal(0);
          setTotalBills(0);
        }
      }

      const storedSessions = await AsyncStorage.getItem('sessions');
      if (storedSessions) {
        setSessions(JSON.parse(storedSessions));
      }
    } catch (error) {
      console.error('❌ Error loading data:', error);
    }
  };

  // Create new billing session
  const startNewSession = async () => {
    if (!newCustName.trim() && !newCustPhone.trim()) {
      Alert.alert('Info', 'Please enter customer details');
      return;
    }

    const newSession: Session = {
      id: Date.now(),
      customerName: newCustName.trim() || 'Customer',
      phone: newCustPhone.trim(),
      items: [],
      npVal: '0',
    };

    const updatedSessions = [...sessions, newSession];
    setSessions(updatedSessions);
    await AsyncStorage.setItem('sessions', JSON.stringify(updatedSessions));
    
    setModalVisible(false);
    setNewCustName('');
    setNewCustPhone('');
    
    // Navigate to products screen with session ID
    router.push({
      pathname: '/products',
      params: { sessionId: newSession.id.toString() }
    });
  };

  // Continue existing session
  const continueSession = (sessionId: number) => {
    router.push({
      pathname: '/products',
      params: { sessionId: sessionId.toString() }
    });
  };

  // Update current billing session with items
  const updateCurrentBillingSession = async (items: BillItem[], custName?: string, custPhone?: string) => {
    if (!currentBillingSessionId) return;

    const updatedSessions = sessions.map(session => 
      session.id === currentBillingSessionId 
        ? { 
            ...session, 
            items, 
            customerName: custName || session.customerName,
            phone: custPhone || session.phone
          }
        : session
    );

    setSessions(updatedSessions);
    await AsyncStorage.setItem('sessions', JSON.stringify(updatedSessions));
  };

  // ✅ Save quick transaction
  const saveQuickTransaction = async () => {
    if (!newCustName.trim() || !quickAmount.trim()) {
      Alert.alert('Error', 'Please enter name and amount');
      return;
    }

    const amount = parseFloat(quickAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const newBill: SaleLog = {
      total: amount,
      time: new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }),
      items: [{ 
        name: 'Quick Payment', 
        price: amount, 
        qty: 1 
      }],
      customerName: newCustName || 'Walk-in',
      phone: newCustPhone,
    };

    const updatedBills = [newBill, ...salesLog];
    setSalesLog(updatedBills);
    await AsyncStorage.setItem('salesLog', JSON.stringify(updatedBills));

    // Update totals
    setTodayTotal(prev => prev + amount);
    setTotalBills(prev => prev + 1);

    // Reset and close
    setNewCustName('');
    setNewCustPhone('');
    setQuickAmount('');
    setBillingMode(null);
    setModalVisible(false);

    Alert.alert('Success', `Transaction saved! ₹${amount}`);
  };

  // View completed bill details
  const viewBillDetails = (bill: SaleLog, index: number) => {
    Alert.alert(
      `Bill #${salesLog.length - index}`,
      `Customer: ${bill.customerName}\nPhone: ${bill.phone || 'N/A'}\nTime: ${bill.time}\nTotal: ₹${bill.total}\n\nItems:\n${bill.items.map(item => `${item.name} x${item.qty} = ₹${item.price * item.qty}`).join('\n')}`,
      [{ text: 'OK' }]
    );
  };

  // Render active sessions
  const renderActiveSession = ({ item }: { item: Session }) => {
    const total = item.items.reduce((sum, i) => sum + i.price * i.qty, 0);
    const itemCount = item.items.reduce((sum, i) => sum + i.qty, 0);
    return (
      <TouchableOpacity 
        style={styles.activeCard} 
        onPress={() => continueSession(item.id)}
      >
        <View style={styles.activeCardLeft}>
          <Text style={styles.activeCardName}>👤 {item.customerName}</Text>
          <Text style={styles.activeCardItems}>
            {itemCount} item{itemCount !== 1 ? 's' : ''}
            {item.phone ? ` · 📞 ${item.phone}` : ''}
          </Text>
          <View style={styles.billingBadge}>
            <Text style={styles.billingBadgeText}>● BILLING IN PROGRESS</Text>
          </View>
        </View>
        <Text style={styles.activeCardRight}>₹{total.toLocaleString('en-IN')}</Text>
      </TouchableOpacity>
    );
  };

  // Render completed bills
  const renderSaleBill = ({ item, index }: { item: SaleLog; index: number }) => (
    <TouchableOpacity 
      style={styles.saleCard} 
      onPress={() => viewBillDetails(item, index)}
    >
      <View>
        <Text style={styles.saleName}>Bill #{salesLog.length - index}</Text>
        <Text style={styles.saleCust}>👤 {item.customerName}{item.phone ? ` · 📞 ${item.phone}` : ''}</Text>
        <Text style={styles.saleTime}>
          {item.items.reduce((sum, i) => sum + i.qty, 0)} items · {item.time}
        </Text>
      </View>
      <Text style={styles.saleAmount}>+₹{item.total.toLocaleString('en-IN')}</Text>
    </TouchableOpacity>
  );

  // Profile Modal Component
  const ProfileModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={profileVisible}
      onRequestClose={() => setProfileVisible(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1} 
        onPress={() => setProfileVisible(false)}
      >
        <View style={styles.profilePanel}>
          <View style={styles.profileHandle} />
          
          <View style={styles.profileHeader}>
            <Text style={styles.profileBizName}>{bizName}</Text>
            <Text style={styles.profileBizSub}>🏪 Hyderabad · Active since 2024</Text>
            <Text style={styles.profileEmail}>📧 {user?.email || 'Not available'}</Text>
            <View style={styles.qrBox}>
              <Image
                source={require('@/assets/images/icon.png')}
                style={styles.qrImage}
                resizeMode="contain"
              />
            </View>
          </View>

          <View style={styles.profileGrid}>
            <View style={styles.profileCell}>
              <Text style={styles.profileLabel}>Total Bills</Text>
              <Text style={styles.profileValue}>{totalBills}</Text>
            </View>
            <View style={styles.profileCell}>
              <Text style={styles.profileLabel}>Today Revenue</Text>
              <Text style={[styles.profileValue, { color: '#2563EB' }]}>₹{todayTotal}</Text>
            </View>
            <View style={styles.profileCell}>
              <Text style={styles.profileLabel}>Plan</Text>
              <Text style={[styles.profileValue, { color: '#2563EB' }]}>Active</Text>
            </View>
            <View style={styles.profileCell}>
              <Text style={styles.profileLabel}>Next Due</Text>
              <Text style={[styles.profileValue, { color: '#A32D2D' }]}>{nextDue}</Text>
            </View>
          </View>

          <View style={styles.profileWarning}>
            <Text style={styles.profileWarningText}>
              ⚠️ Subscription renews on 1st of every month · ₹10
            </Text>
            <Text style={styles.profileWarningSub}>App runs till 5th if unpaid</Text>
          </View>

          <TouchableOpacity 
            style={styles.profileCloseBtn} 
            onPress={() => setProfileVisible(false)}
          >
            <Text style={styles.profileCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // Transaction Mode Modal (shows two options)
  const TransactionModeModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={false}
      onRequestClose={() => {
        setBillingMode(null);
      }}
    >
      <View style={styles.modalOverlay} />
    </Modal>
  );

  // New Customer Modal - Quick Payment Version
  const QuickPaymentModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={billingMode === 'quick'}
      onRequestClose={() => {
        setBillingMode(null);
      }}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => {
          setBillingMode(null);
        }}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBox} pointerEvents="auto">
          {/* Header */}
          <View style={styles.quickPaymentHeader}>
            <View style={styles.headerContent}>
              <Ionicons name="flash" size={24} color="#2563EB" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.modalTitle}>Quick Payment</Text>
                <Text style={styles.modalSub}>Receive payment quickly</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setBillingMode(null)}>
              <Ionicons name="close" size={28} color="#999" />
            </TouchableOpacity>
          </View>

          {/* Form Section */}
          <View style={styles.quickPaymentForm}>
            <Text style={styles.inputLabel}>Customer Name</Text>
            <View style={styles.inputWithIcon}>
              <Ionicons name="person" size={20} color="#2563EB" />
              <TextInput
                style={styles.textInputWithIcon}
                placeholder="Enter name"
                value={newCustName}
                onChangeText={setNewCustName}
                placeholderTextColor="#ccc"
              />
            </View>

            <Text style={[styles.inputLabel, { marginTop: 16 }]}>Phone (Optional)</Text>
            <View style={styles.inputWithIcon}>
              <Ionicons name="call" size={20} color="#2563EB" />
              <TextInput
                style={styles.textInputWithIcon}
                placeholder="+91 98765 43210"
                value={newCustPhone}
                onChangeText={setNewCustPhone}
                keyboardType="phone-pad"
                placeholderTextColor="#ccc"
              />
            </View>

            <Text style={[styles.inputLabel, { marginTop: 16 }]}>Amount (₹)</Text>
            <View style={styles.inputWithIcon}>
              <Ionicons name="cash" size={20} color="#2563EB" />
              <TextInput
                style={[styles.textInputWithIcon, styles.amountInput]}
                placeholder="0.00"
                value={quickAmount}
                onChangeText={setQuickAmount}
                keyboardType="decimal-pad"
                placeholderTextColor="#ccc"
              />
            </View>
          </View>

          {/* Buttons */}
          <TouchableOpacity style={styles.modalBtn} onPress={saveQuickTransaction}>
            <Text style={styles.modalBtnText}>Save Payment</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.viewHistoryBtn} onPress={() => {}}>
            <Ionicons name="time" size={20} color="#2563EB" />
            <Text style={styles.viewHistoryText}>View Payment History</Text>
            <Ionicons name="chevron-forward" size={20} color="#2563EB" />
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );

  // Live Billing Modal - Select items and add to bill
  const LiveBillingModal = () => {
    const billTotal = billingItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const itemCount = billingItems.reduce((sum, item) => sum + item.qty, 0);
    
    const handleAddItem = (item: BillItem) => {
      let updatedItems = [];
      const existingItem = billingItems.find(i => i.name === item.name);
      if (existingItem) {
        updatedItems = billingItems.map(i => 
          i.name === item.name ? { ...i, qty: i.qty + 1 } : i
        );
      } else {
        updatedItems = [...billingItems, { ...item, qty: 1 }];
      }
      setBillingItems(updatedItems);
    };

    const handleRemoveItem = (itemName: string) => {
      let updatedItems = [];
      const item = billingItems.find(i => i.name === itemName);
      if (item && item.qty > 1) {
        updatedItems = billingItems.map(i => 
          i.name === itemName ? { ...i, qty: i.qty - 1 } : i
        );
      } else {
        updatedItems = billingItems.filter(i => i.name !== itemName);
      }
      setBillingItems(updatedItems);
    };

    const handleCompleteNill = async () => {
      if (!billingCustomerName.trim()) {
        Alert.alert('Error', 'Please enter customer name');
        return;
      }

      if (billingItems.length === 0) {
        Alert.alert('Error', 'Please add at least one item');
        return;
      }

      const newBill: SaleLog = {
        total: billTotal,
        time: new Date().toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        }),
        items: billingItems,
        customerName: billingCustomerName,
        phone: billingCustomerPhone,
      };

      const updatedBills = [newBill, ...salesLog];
      setSalesLog(updatedBills);
      await AsyncStorage.setItem('salesLog', JSON.stringify(updatedBills));

      // Remove current session from sessions
      if (currentBillingSessionId) {
        const updatedSessions = sessions.filter(s => s.id !== currentBillingSessionId);
        setSessions(updatedSessions);
        await AsyncStorage.setItem('sessions', JSON.stringify(updatedSessions));
        setCurrentBillingSessionId(null);
      }

      setTodayTotal(prev => prev + billTotal);
      setTotalBills(prev => prev + 1);

      setBillingSessionActive(false);
      setBillingCustomerName('');
      setBillingCustomerPhone('');
      setBillingItems([]);

      Alert.alert('Success', `Bill saved! ₹${billTotal}`);
    };

    // Sample products list
    const sampleProducts = [
      { name: 'Puri Plate', price: 20, qty: 0 },
      { name: 'Masala Puri', price: 25, qty: 0 },
      { name: 'Tamarind Water', price: 10, qty: 0 },
      { name: 'Special Plate', price: 40, qty: 0 },
      { name: 'Idly 2pcs', price: 15, qty: 0 },
    ];

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={billingSessionActive}
        onRequestClose={async () => {
          // Remove the billing session when modal is closed
          if (currentBillingSessionId) {
            const updatedSessions = sessions.filter(s => s.id !== currentBillingSessionId);
            setSessions(updatedSessions);
            await AsyncStorage.setItem('sessions', JSON.stringify(updatedSessions));
            setCurrentBillingSessionId(null);
          }
          setBillingSessionActive(false);
        }}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setBillingSessionActive(false);
          }}
        >
          <KeyboardAvoidingView style={styles.liveBillingBox} pointerEvents="auto">
            {/* Header */}
            <View style={styles.liveBillingHeader}>
              <View>
                <Text style={styles.liveBillingTitle}>Live Billing</Text>
                <Text style={styles.liveBillingSub}>Add items and create bill</Text>
              </View>
              <TouchableOpacity onPress={async () => {
                // Remove the billing session when closing
                if (currentBillingSessionId) {
                  const updatedSessions = sessions.filter(s => s.id !== currentBillingSessionId);
                  setSessions(updatedSessions);
                  await AsyncStorage.setItem('sessions', JSON.stringify(updatedSessions));
                  setCurrentBillingSessionId(null);
                }
                setBillingSessionActive(false);
              }}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.liveBillingContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Customer Details - Always visible */}
              <View style={styles.customerSection}>
                  <View style={styles.customerRow}>
                    <View style={styles.customerInfo}>
                      <Ionicons name="person-circle" size={40} color="#8B7AFF" />
                      <Text style={styles.customerNameBilling}>{billingCustomerName || 'Walk-in Customer'}</Text>
                    </View>
                    <TouchableOpacity 
                      style={[styles.toggleBtn, customerToggleOn && styles.toggleBtnOn]}
                      onPress={() => setCustomerToggleOn(!customerToggleOn)}
                    >
                      <Text style={styles.toggleText}>{customerToggleOn ? 'ON' : 'OFF'}</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={[styles.modalInput, { marginTop: 12 }]}
                    placeholder="Enter customer name"
                    value={billingCustomerName}
                    onChangeText={setBillingCustomerName}
                    placeholderTextColor="#ccc"
                  />
                  <TextInput
                    style={[styles.modalInput, { marginTop: 8 }]}
                    placeholder="Phone (optional)"
                    value={billingCustomerPhone}
                    onChangeText={setBillingCustomerPhone}
                    keyboardType="phone-pad"
                    placeholderTextColor="#ccc"
                  />
              </View>

              {/* Add Items Section - Always visible */
                <View style={styles.addItemsSection}>
                  <Text style={styles.sectionLabel}>Add Items</Text>
                  <View style={styles.searchBox}>
                    <Ionicons name="search" size={20} color="#999" />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search products..."
                      placeholderTextColor="#ccc"
                    />
                    <TouchableOpacity style={styles.addItemBtn}>
                      <Ionicons name="add" size={24} color="#fff" />
                    </TouchableOpacity>
                  </View>

                  {/* Products List */}
                  {sampleProducts.map((product) => (
                    <View key={product.name} style={styles.productItemRow}>
                      <View>
                        <Text style={styles.productNameBilling}>{product.name}</Text>
                        <Text style={styles.productPriceBilling}>₹ {product.price}</Text>
                      </View>
                      <View style={styles.quantityControl}>
                        <TouchableOpacity 
                          style={styles.qtyBtn}
                          onPress={() => handleRemoveItem(product.name)}
                        >
                          <Ionicons name="remove" size={18} color="#FF6B6B" />
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>
                          {billingItems.find(i => i.name === product.name)?.qty || 0}
                        </Text>
                        <TouchableOpacity 
                          style={styles.qtyBtn}
                          onPress={() => handleAddItem(product)}
                        >
                          <Ionicons name="add" size={18} color="#2563EB" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}

                  {/* Bill Summary */}
                  {billingItems.length > 0 && (
                    <View style={styles.billSummary}>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Items</Text>
                        <Text style={styles.summaryValue}>{itemCount}</Text>
                      </View>
                      <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 8, marginTop: 8 }]}>
                        <Text style={[styles.summaryLabel, { fontWeight: '700' }]}>Total</Text>
                        <Text style={[styles.summaryValue, { fontWeight: '900', fontSize: 18 }]}>₹ {billTotal}</Text>
                      </View>
                    </View>
                  )}
                </View>
              }
            </ScrollView>

            {/* Footer - Consistent height to prevent layout shifts */}
            <View style={{ minHeight: 90, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#E2E8F0', justifyContent: 'center' }}>
              {!customerToggleOn ? (
                <TouchableOpacity style={styles.completeBillBtn} onPress={handleCompleteNill}>
                  <Text style={styles.completeBillText}>Complete Bill</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.buttonRow}>
                  <TouchableOpacity 
                    style={styles.outlineBtn}
                    onPress={async () => {
                      // Remove the billing session and close modal
                      if (currentBillingSessionId) {
                        const updatedSessions = sessions.filter(s => s.id !== currentBillingSessionId);
                        setSessions(updatedSessions);
                        await AsyncStorage.setItem('sessions', JSON.stringify(updatedSessions));
                        setCurrentBillingSessionId(null);
                      }
                      setModalVisible(false);
                      setBillingSessionActive(false);
                      setCustomerToggleOn(false);
                      setBillingCustomerName('');
                      setBillingCustomerPhone('');
                      setBillingItems([]);
                    }}
                  >
                    <Text style={styles.outlineBtnText}>← Go Back</Text>
                  </TouchableOpacity>
                <TouchableOpacity style={styles.fillBtn} onPress={handleCompleteNill}>
                  <Text style={styles.fillBtnText}>Bill ✓</Text>
                </TouchableOpacity>
              </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <ProfileModal />
      <TransactionModeModal />
      <QuickPaymentModal />
      <LiveBillingModal />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.shopName}>{bizName}</Text>
            <Text style={styles.shopDateTime}>{currentDateTime}</Text>
          </View>
          <TouchableOpacity 
            style={styles.profileBtn} 
            onPress={() => setProfileVisible(true)}
          >
            <Ionicons name="person" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        
        {/* Collection Card */}
        <View style={styles.collectionCard}>
          <Text style={styles.collectionLabel}>Today's Collection</Text>
          <Text style={styles.collectionValue}>₹{todayTotal.toLocaleString('en-IN')}</Text>
          <Text style={styles.collectionSub}>
            {salesLog.length} bill{salesLog.length !== 1 ? 's' : ''} today
          </Text>
        </View>
      </View>

      {/* Body */}
      <ScrollView 
        style={styles.body} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Quick Actions Title */}
        <Text style={styles.quickActionsTitle}>Quick Actions</Text>

        {/* Start Billing Button */}
        <TouchableOpacity 
          style={[styles.fullWidthButton, { backgroundColor: '#2563EB' }]}
          onPress={async () => {
            // Create a new session for this billing
            const newSessionId = Date.now();
            const newSession: Session = {
              id: newSessionId,
              customerName: 'Walk-in Customer',
              phone: '',
              items: [],
              npVal: '0',
            };
            
            const updatedSessions = [...sessions, newSession];
            setSessions(updatedSessions);
            await AsyncStorage.setItem('sessions', JSON.stringify(updatedSessions));
            
            // Initialize billing modal
            setCurrentBillingSessionId(newSessionId);
            setBillingCustomerName('');
            setBillingCustomerPhone('');
            setBillingItems([]);
            setBillingSessionActive(true);
          }}
        >
          <Ionicons name="document-text" size={32} color="#fff" />
          <Text style={styles.fullWidthButtonText}>Start Billing</Text>
          <Ionicons name="chevron-forward" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Quick Payment Button */}
        <TouchableOpacity 
          style={[styles.fullWidthButton, { backgroundColor: '#7C3AED' }]}
          onPress={() => {
            setNewCustName('');
            setNewCustPhone('');
            setQuickAmount('');
            setBillingMode('quick');
          }}
        >
          <Ionicons name="flash" size={32} color="#FFD700" />
          <Text style={styles.fullWidthButtonText}>Quick Payment</Text>
          <Ionicons name="chevron-forward" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Completed Bills */}
        <Text style={styles.todayTitle}>Today's Bills</Text>
        {salesLog.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No sales yet</Text>
          </View>
        ) : (
          <FlatList
            data={salesLog}
            renderItem={renderSaleBill}
            keyExtractor={(_, index) => index.toString()}
            scrollEnabled={false}
          />
        )}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => {}}>
          <Ionicons name="home" size={24} color="#2563EB" />
          <Text style={[styles.navLabel, { color: '#2563EB' }]}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/analytics')}>
          <Ionicons name="stats-chart" size={24} color="#94A3B8" />
          <Text style={styles.navLabel}>Analytics</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/products')}>
          <Ionicons name="pricetag" size={24} color="#94A3B8" />
          <Text style={styles.navLabel}>Products</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/suppliers')}>
          <Ionicons name="people" size={24} color="#94A3B8" />
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
    padding: 16,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  shopName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  shopDateTime: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  collectionCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    marginTop: 8,
  },
  collectionLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  collectionValue: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -2,
    marginTop: 4,
  },
  collectionSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 6,
    fontWeight: '700',
  },
  body: {
    flex: 1,
    padding: 16,
  },
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#222',
    marginBottom: 14,
    marginTop: 4,
  },
  fullWidthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    padding: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fullWidthButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    marginLeft: 16,
    letterSpacing: -0.3,
  },
  transactionOptions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  transactionCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickPaymentCard: {
    backgroundColor: '#FFF5E6',
    borderWidth: 2,
    borderColor: '#2563EB',
  },
  liveBillingCard: {
    backgroundColor: '#F0F8E6',
    borderWidth: 2,
    borderColor: '#2563EB',
  },
  transactionCardTitle: {
    fontSize: 14,
    fontWeight: '900',
    marginTop: 8,
    color: '#222',
  },
  transactionCardSub: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
    marginTop: 2,
  },
  newBillBtn: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  newBillBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  activeSection: {
    marginBottom: 16,
  },
  activeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#222',
  },
  sectionSub: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '700',
  },
  activeCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#2563EB',
  },
  activeCardLeft: {
    flex: 1,
  },
  activeCardName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2563EB',
  },
  activeCardItems: {
    fontSize: 11,
    color: '#888',
    fontWeight: '600',
    marginTop: 2,
  },
  billingBadge: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 20,
    marginTop: 3,
    alignSelf: 'flex-start',
  },
  billingBadgeText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: '800',
  },
  activeCardRight: {
    fontSize: 16,
    fontWeight: '900',
    color: '#2563EB',
  },
  todayTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#222',
    marginBottom: 10,
  },
  saleCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#eee',
  },
  saleName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#333',
  },
  saleCust: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '600',
    marginTop: 1,
  },
  saleTime: {
    fontSize: 11,
    color: '#aaa',
    marginTop: 1,
  },
  saleAmount: {
    fontSize: 14,
    fontWeight: '900',
    color: '#2563EB',
  },
  emptyState: {
    alignItems: 'center',
    padding: 30,
  },
  emptyText: {
    color: '#bbb',
    fontSize: 13,
  },
  bottomNav: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    paddingVertical: 8,
    paddingBottom: 12,
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modeSelectionBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 32,
  },
  modeTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
  },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 14,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ececec',
  },
  modeIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modeContent: {
    flex: 1,
  },
  modeOptionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  modeOptionSub: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginTop: 2,
  },
  amountInput: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563EB',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '95%',
  },
  quickPaymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickPaymentForm: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#f0f0f0',
    backgroundColor: '#fafafa',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  textInputWithIcon: {
    flex: 1,
    padding: 12,
    fontSize: 15,
    fontWeight: '600',
    color: '#222',
  },
  viewHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#F0F9FF',
    marginTop: 12,
  },
  viewHistoryText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
    marginHorizontal: 8,
  },
  liveBillingBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    flex: 1,
    maxHeight: '95%',
    flexDirection: 'column',
  },
  liveBillingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  liveBillingTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#222',
  },
  liveBillingSub: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    marginTop: 2,
  },
  liveBillingContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  customerSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  customerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F3EDFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8DCFF',
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  customerNameBilling: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginLeft: 12,
  },
  customerLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnOn: {
    backgroundColor: '#2563EB',
  },
  toggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  toggleBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666',
  },
  walkInsContainer: {
    marginTop: 12,
  },
  walkInsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
  },
  emptyWalkIns: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    paddingVertical: 12,
    textAlign: 'center',
  },
  walkInItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: '#e0e0e0',
  },
  walkInName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#222',
  },
  walkInDetails: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
    marginTop: 2,
  },
  addItemsSection: {
    marginBottom: 20,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#f0f0f0',
    backgroundColor: '#fafafa',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  addItemBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f0f0f0',
  },
  productNameBilling: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
  },
  productPriceBilling: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
    marginTop: 4,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    minWidth: 20,
    textAlign: 'center',
  },
  billSummary: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222',
  },
  onModeContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  walkInInfo: {
    alignItems: 'center',
    marginBottom: 32,
  },
  walkInInfoTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#2563EB',
    marginBottom: 8,
  },
  walkInInfoSub: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  completeBillBtn: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginHorizontal: 24,
    marginVertical: 16,
  },
  completeBillText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginVertical: 0,
    justifyContent: 'center',
  },
  outlineBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#2563EB',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  outlineBtnText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '800',
  },
  fillBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  fillBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#222',
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    marginBottom: 18,
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: '#eee',
    backgroundColor: '#fafafa',
    borderRadius: 12,
    padding: 13,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
  },
  modalBtn: {
    backgroundColor: '#2563EB',
    padding: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 10,
  },
  modalBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  modalCancel: {
    textAlign: 'center',
    padding: 10,
    color: '#aaa',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
  // Profile Panel Styles
  profilePanel: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
  },
  profileHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#eee',
    borderRadius: 4,
    alignSelf: 'center',
    marginBottom: 20,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  profileBizName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#222',
  },
  profileBizSub: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 16,
  },
  profileEmail: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 16,
  },
  qrBox: {
    width: 140,
    height: 140,
    backgroundColor: '#fff',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  qrImage: {
    width: 130,
    height: 130,
  },
  profileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  profileCell: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  profileLabel: {
    fontSize: 10,
    color: '#999',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  profileValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#222',
    marginTop: 3,
  },
  profileWarning: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1.5,
    borderColor: '#2563EB',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  profileWarningText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '700',
  },
  profileWarningSub: {
    fontSize: 11,
    color: '#888',
    fontWeight: '600',
    marginTop: 2,
  },
  profileCloseBtn: {
    backgroundColor: '#2563EB',
    padding: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  profileCloseText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
});
