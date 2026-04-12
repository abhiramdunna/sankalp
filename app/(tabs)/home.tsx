import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
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
      const storedSales = await AsyncStorage.getItem('salesLog');
      if (storedSales) {
        const parsed = JSON.parse(storedSales);
        setSalesLog(parsed);
        const total = parsed.reduce((sum: number, sale: SaleLog) => sum + sale.total, 0);
        setTodayTotal(total);
        setTotalBills(parsed.length);
      }

      const storedSessions = await AsyncStorage.getItem('sessions');
      if (storedSessions) {
        setSessions(JSON.parse(storedSessions));
      }
    } catch (error) {
      console.error('Error loading data:', error);
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
            <View style={styles.qrBox}>
              <Text style={styles.qrEmoji}>▦</Text>
              <Text style={styles.qrText}>QR Code{'\n'}Payment</Text>
              <Text style={styles.qrSubText}>Tap to share</Text>
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

  // New Customer Modal
  const CustomerModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1} 
        onPress={() => setModalVisible(false)}
      >
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>New Bill · కొత్త బిల్లు</Text>
          <Text style={styles.modalSub}>Enter customer details to start billing</Text>
          
          <TextInput
            style={styles.modalInput}
            placeholder="Customer name (optional)"
            value={newCustName}
            onChangeText={setNewCustName}
          />
          
          <TextInput
            style={styles.modalInput}
            placeholder="Phone number (optional)"
            value={newCustPhone}
            onChangeText={setNewCustPhone}
            keyboardType="phone-pad"
          />
          
          <TouchableOpacity style={styles.modalBtn} onPress={startNewSession}>
            <Text style={styles.modalBtnText}>Start Billing ⚡</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => setModalVisible(false)}>
            <Text style={styles.modalCancel}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <ProfileModal />
      <CustomerModal />
      
      {/* Header */}
      <View style={styles.header}>
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
          <Text style={styles.collectionLabel}>Today's Collection · నేటి వసూలు</Text>
          <Text style={styles.collectionValue}>₹{todayTotal.toLocaleString('en-IN')}</Text>
          <Text style={styles.collectionSub}>
            {salesLog.length} bill{salesLog.length !== 1 ? 's' : ''} today
          </Text>
        </View>
      </View>

      {/* Body */}
      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        <TouchableOpacity 
          style={styles.newBillBtn} 
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.newBillBtnText}>⚡ New Bill · కొత్త బిల్లు</Text>
        </TouchableOpacity>

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
        <Text style={styles.todayTitle}>Today's Bills · నేటి బిల్లులు</Text>
        {salesLog.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No sales yet · ఇంకా అమ్మకాలు లేవు</Text>
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
    paddingTop: 12,
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
  qrBox: {
    width: 140,
    height: 140,
    backgroundColor: '#f5f5f5',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  qrEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  qrText: {
    fontSize: 11,
    color: '#bbb',
    textAlign: 'center',
    fontWeight: '600',
  },
  qrSubText: {
    fontSize: 10,
    color: '#FC8019',
    fontWeight: '700',
    marginTop: 4,
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
});