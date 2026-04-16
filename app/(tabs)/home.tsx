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

  // Load data on mount
  useEffect(() => {
    loadData();
    updateDateTime();
    const interval = setInterval(updateDateTime, 30000);
    return () => clearInterval(interval);
  }, []);

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
              <Text style={[styles.profileValue, { color: '#FC8019' }]}>₹{todayTotal}</Text>
            </View>
            <View style={styles.profileCell}>
              <Text style={styles.profileLabel}>Plan</Text>
              <Text style={[styles.profileValue, { color: '#27500A' }]}>Active</Text>
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
          <Text style={styles.modalTitle}>Quick Payment</Text>
          <Text style={styles.modalSub}>Enter customer name and amount</Text>
          
          <TextInput
            style={styles.modalInput}
            placeholder="Customer name"
            value={newCustName}
            onChangeText={setNewCustName}
            placeholderTextColor="#999"
            editable={true}
            selectTextOnFocus={false}
            blurOnSubmit={false}
          />
          
          <TextInput
            style={styles.modalInput}
            placeholder="Phone number (optional)"
            value={newCustPhone}
            onChangeText={setNewCustPhone}
            keyboardType="phone-pad"
            placeholderTextColor="#999"
            editable={true}
            selectTextOnFocus={false}
            blurOnSubmit={false}
          />

          <TextInput
            style={[styles.modalInput, styles.amountInput]}
            placeholder="Amount (₹)"
            value={quickAmount}
            onChangeText={setQuickAmount}
            keyboardType="decimal-pad"
            placeholderTextColor="#999"
            editable={true}
            selectTextOnFocus={false}
            blurOnSubmit={false}
          />
          
          <TouchableOpacity style={styles.modalBtn} onPress={saveQuickTransaction}>
            <Text style={styles.modalBtnText}>Save Payment ✓</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => {
            setBillingMode(null);
          }}>
            <Text style={styles.modalCancel}>Cancel</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );

  // Live Billing Modal - Select items and add to bill
  const LiveBillingModal = () => {
    const billTotal = billingItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
    
    const handleAddItem = (item: BillItem) => {
      const existingItem = billingItems.find(i => i.name === item.name);
      if (existingItem) {
        setBillingItems(billingItems.map(i => 
          i.name === item.name ? { ...i, qty: i.qty + 1 } : i
        ));
      } else {
        setBillingItems([...billingItems, { ...item, qty: 1 }]);
      }
    };

    const handleRemoveItem = (itemName: string) => {
      setBillingItems(billingItems.filter(i => i.name !== itemName));
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
      { name: 'Coffee', price: 80, qty: 0 },
      { name: 'Tea', price: 40, qty: 0 },
      { name: 'Samosa', price: 20, qty: 0 },
      { name: 'Dosa', price: 60, qty: 0 },
      { name: 'Idly', price: 30, qty: 0 },
      { name: 'Vada', price: 35, qty: 0 },
    ];

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={billingSessionActive}
        onRequestClose={() => {
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
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.liveBillingBox} pointerEvents="auto">
            <View style={styles.billingHeader}>
              <Text style={styles.modalTitle}>Live Billing</Text>
              <TouchableOpacity onPress={() => setBillingSessionActive(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Customer Details */}
            <View style={styles.billingSection}>
              <TextInput
                style={styles.modalInput}
                placeholder="Customer name"
                value={billingCustomerName}
                onChangeText={setBillingCustomerName}
                placeholderTextColor="#999"
              />
              
              <TextInput
                style={styles.modalInput}
                placeholder="Phone (optional)"
                value={billingCustomerPhone}
                onChangeText={setBillingCustomerPhone}
                keyboardType="phone-pad"
                placeholderTextColor="#999"
              />
            </View>

            {/* Products List */}
            <View style={styles.billingSection}>
              <Text style={styles.billingSubTitle}>Add Items</Text>
              <ScrollView style={styles.productsList} nestedScrollEnabled={true}>
                {sampleProducts.map((product) => (
                  <View key={product.name} style={styles.productItem}>
                    <View style={styles.productInfo}>
                      <Text style={styles.productName}>{product.name}</Text>
                      <Text style={styles.productPrice}>₹{product.price}</Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.addBtn}
                      onPress={() => handleAddItem(product)}
                    >
                      <Ionicons name="add" size={24} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* Selected Items */}
            {billingItems.length > 0 && (
              <View style={styles.billingSection}>
                <Text style={styles.billingSubTitle}>Bill Items</Text>
                {billingItems.map((item) => (
                  <View key={item.name} style={styles.billItemRow}>
                    <View>
                      <Text style={styles.billItemName}>{item.name} x {item.qty}</Text>
                      <Text style={styles.billItemPrice}>₹{item.price * item.qty}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleRemoveItem(item.name)}>
                      <Ionicons name="trash" size={20} color="#A32D2D" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Total and Complete Button */}
            <View style={styles.billingFooter}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total:</Text>
                <Text style={styles.totalAmount}>₹{billTotal}</Text>
              </View>
              <TouchableOpacity style={styles.completeBillBtn} onPress={handleCompleteNill}>
                <Text style={styles.completeBillText}>Complete Bill ✓</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setBillingSessionActive(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
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
        {/* Two Transaction Options */}
        <View style={styles.transactionOptions}>
          <TouchableOpacity 
            style={[styles.transactionCard, styles.quickPaymentCard]}
            onPress={() => {
              setNewCustName('');
              setNewCustPhone('');
              setQuickAmount('');
              setBillingMode('quick');
            }}
          >
            <Ionicons name="flash" size={32} color="#FC8019" />
            <Text style={styles.transactionCardTitle}>Quick Payment</Text>
            <Text style={styles.transactionCardSub}>Name + Amount</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.transactionCard, styles.liveBillingCard]}
            onPress={() => {
              setBillingCustomerName('');
              setBillingCustomerPhone('');
              setBillingItems([]);
              setBillingSessionActive(true);
            }}
          >
            <Ionicons name="cart" size={32} color="#27500A" />
            <Text style={styles.transactionCardTitle}>Live Billing</Text>
            <Text style={styles.transactionCardSub}>Add items</Text>
          </TouchableOpacity>
        </View>

        {/* Active Sessions */}
        {sessions.length > 0 && (
          <View style={styles.activeSection}>
            <View style={styles.activeHeader}>
              <Text style={styles.sectionTitle}>🔴 Live Billing</Text>
              <Text style={styles.sectionSub}>{sessions.length} active</Text>
            </View>
            <FlatList
              data={sessions}
              renderItem={renderActiveSession}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
            />
          </View>
        )}

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
          <Ionicons name="home" size={24} color="#FC8019" />
          <Text style={[styles.navLabel, { color: '#FC8019' }]}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/products')}>
          <Ionicons name="pricetag" size={24} color="#aaa" />
          <Text style={styles.navLabel}>Products</Text>
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
  header: {
    backgroundColor: '#FC8019',
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
    padding: 14,
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
    borderColor: '#FC8019',
  },
  liveBillingCard: {
    backgroundColor: '#F0F8E6',
    borderWidth: 2,
    borderColor: '#27500A',
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
    backgroundColor: '#FC8019',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#FC8019',
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
    color: '#FC8019',
    fontWeight: '700',
  },
  activeCard: {
    backgroundColor: '#fff5eb',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FC8019',
  },
  activeCardLeft: {
    flex: 1,
  },
  activeCardName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FC8019',
  },
  activeCardItems: {
    fontSize: 11,
    color: '#888',
    fontWeight: '600',
    marginTop: 2,
  },
  billingBadge: {
    backgroundColor: '#FC8019',
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
    color: '#FC8019',
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
    color: '#FC8019',
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
    color: '#27500A',
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
    color: '#FC8019',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
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
    backgroundColor: '#FC8019',
    padding: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 6,
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
    color: '#FC8019',
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
    backgroundColor: '#fff8f0',
    borderWidth: 1.5,
    borderColor: '#FC8019',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  profileWarningText: {
    fontSize: 12,
    color: '#FC8019',
    fontWeight: '700',
  },
  profileWarningSub: {
    fontSize: 11,
    color: '#888',
    fontWeight: '600',
    marginTop: 2,
  },
  profileCloseBtn: {
    backgroundColor: '#FC8019',
    padding: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  profileCloseText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  // Live Billing Modal Styles
  liveBillingBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    padding: 20,
    paddingTop: 16,
  },
  billingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  billingSection: {
    marginBottom: 16,
  },
  billingSubTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#222',
    marginBottom: 10,
  },
  productsList: {
    maxHeight: 200,
    marginBottom: 10,
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#222',
  },
  productPrice: {
    fontSize: 12,
    color: '#FC8019',
    fontWeight: '600',
    marginTop: 2,
  },
  addBtn: {
    backgroundColor: '#FC8019',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  billItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0f8e6',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#27500A',
  },
  billItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#222',
  },
  billItemPrice: {
    fontSize: 12,
    color: '#27500A',
    fontWeight: '600',
    marginTop: 2,
  },
  billingFooter: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 10,
    backgroundColor: '#FC8019',
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
  },
  completeBillBtn: {
    backgroundColor: '#27500A',
    padding: 13,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  completeBillText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
});