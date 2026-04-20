// home.tsx — Fixed: active orders in RAM, sticky summary bar, quick entry full-screen, no custom item btn
import { useAuthStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState, memo } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Module-level RAM store for active sessions ───
// Lives in JS memory. Survives re-renders, cleared on app kill.
// When a bill is completed it is written to AsyncStorage (DB stub).
let RAM_SESSIONS: Session[] = [];

const SAMPLE_PRODUCTS = [
  { name: 'Puri Plate', price: 20 },
  { name: 'Masala Puri', price: 25 },
  { name: 'Tamarind Water', price: 10 },
  { name: 'Special Plate', price: 40 },
  { name: 'Idly 2pcs', price: 15 },
];

// ─── Types ───
interface BillItem { name: string; price: number; qty: number; }
interface Session { id: number; customerName: string; phone: string; items: BillItem[]; }
interface SaleLog { id: number; total: number; time: string; date: string; items: BillItem[]; customerName: string; phone: string; }

// ─── Toast ───
const Toast = ({
  visible, message, type = 'error', onHide,
}: {
  visible: boolean; message: string; type?: 'error' | 'success' | 'info'; onHide: () => void;
}) => {
  useEffect(() => {
    if (visible) { const t = setTimeout(onHide, 2000); return () => clearTimeout(t); }
  }, [visible]);
  if (!visible) return null;
  const bg = type === 'error' ? '#EF4444' : type === 'success' ? '#10B981' : '#3B82F6';
  return (
    <View style={[styles.toastContainer, { backgroundColor: bg }]}>
      <Text style={styles.toastText}>{message}</Text>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════
// LIVE BILLING MODAL
// Fixes:
//   1. Grand Total bar is OUTSIDE ScrollView — always visible at bottom
//   2. Removed "Add Custom Item" button
//   3. Save & Go Back properly saves session and it appears in Active Orders
//   4. Re-opening an existing session loads its saved items
// ═══════════════════════════════════════════════════════════════
const LiveBillingModal = memo(({
  visible, onClose, onSaveAndBack, onComplete, session,
}: {
  visible: boolean;
  onClose: () => void;
  onSaveAndBack: (customerName: string, phone: string, items: BillItem[]) => void;
  onComplete: (customerName: string, phone: string, items: BillItem[]) => void;
  session: Session | null;
}) => {
  const insets = useSafeAreaInsets();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [items, setItems] = useState<BillItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Load session data each time the modal opens
  useEffect(() => {
    if (visible) {
      if (session) {
        // Continue existing session — restore saved items
        setCustomerName(session.customerName === 'Walk-in Customer' ? '' : session.customerName);
        setCustomerPhone(session.phone);
        setItems(session.items.map(i => ({ ...i })));
      } else {
        // Brand new session
        setCustomerName('');
        setCustomerPhone('');
        setItems([]);
      }
      setSearchQuery('');
    }
  }, [visible, session?.id]);

  const warn = (msg: string) => { setToastMsg(msg); setShowToast(true); };

  const addItem = useCallback((product: { name: string; price: number }) => {
    setItems(prev => {
      const ex = prev.find(i => i.name === product.name);
      if (ex) return prev.map(i => i.name === product.name ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { name: product.name, price: product.price, qty: 1 }];
    });
  }, []);

  const removeItem = useCallback((name: string) => {
    setItems(prev => {
      const ex = prev.find(i => i.name === name);
      if (ex && ex.qty > 1) return prev.map(i => i.name === name ? { ...i, qty: i.qty - 1 } : i);
      return prev.filter(i => i.name !== name);
    });
  }, []);

  const activeItems = items.filter(i => i.qty > 0);
  const billTotal = activeItems.reduce((s, i) => s + i.price * i.qty, 0);
  const totalQty = activeItems.reduce((s, i) => s + i.qty, 0);
  const filtered = SAMPLE_PRODUCTS.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleSaveAndBack = () => {
    if (activeItems.length === 0) { warn('Add at least one item to save'); return; }
    onSaveAndBack(customerName.trim() || 'Walk-in Customer', customerPhone.trim(), activeItems);
  };

  const handleComplete = () => {
    if (activeItems.length === 0) { warn('Add at least one item'); return; }
    onComplete(customerName.trim() || 'Walk-in Customer', customerPhone.trim(), activeItems);
  };

  if (!visible) return null;

  return (
    <>
      <Toast visible={showToast} message={toastMsg} onHide={() => setShowToast(false)} />
      <Modal animationType="slide" transparent={false} visible={visible} onRequestClose={onClose}>
        <KeyboardAvoidingView style={styles.liveBillingFullScreen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

          {/* Header */}
          <View style={[styles.liveBillingHeader, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity onPress={onClose} style={styles.lbBackBtn}>
              <Ionicons name="arrow-back" size={22} color="#333" />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.liveBillingTitle}>Live Billing</Text>
              <Text style={styles.liveBillingSub}>Add items and create bill</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.lbCloseBtn}>
              <Ionicons name="close" size={20} color="#2563EB" />
            </TouchableOpacity>
          </View>

          {/* Scrollable product list */}
          <ScrollView
            style={styles.liveBillingContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Customer section */}
            <View style={styles.customerSection}>
              <View style={styles.customerAvatarRow}>
                <View style={styles.customerAvatar}>
                  <Ionicons name="person" size={22} color="#2563EB" />
                </View>
                <Text style={styles.customerSectionTitle}>Customer Name</Text>
              </View>
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

            {/* Add Items — no "Add Custom Item" button */}
            <View style={styles.addItemsSection}>
              <Text style={styles.addItemsTitle}>Add Items</Text>
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
              {filtered.map(product => {
                const cur = items.find(i => i.name === product.name);
                const qty = cur?.qty || 0;
                return (
                  <View key={product.name} style={styles.productRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.productName}>{product.name}</Text>
                      <Text style={styles.productPrice}>₹ {product.price.toFixed(2)}</Text>
                    </View>
                    <View style={styles.qtyControl}>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => removeItem(product.name)}>
                        <Ionicons name="remove" size={16} color="#2563EB" />
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{qty}</Text>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => addItem(product)}>
                        <Ionicons name="add" size={16} color="#2563EB" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.lineTotal}>₹ {(qty * product.price).toFixed(2)}</Text>
                  </View>
                );
              })}
            </View>
            <View style={{ height: 8 }} />
          </ScrollView>

          {/* ── STICKY GRAND TOTAL BAR — outside ScrollView, always at bottom ── */}
          <View style={styles.billSummaryBar}>
            <View style={styles.summaryLeft}>
              <Ionicons name="document-text-outline" size={26} color="#2563EB" />
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.summaryItemsLabel}>Total Items</Text>
                <Text style={styles.summaryItemsValue}>{totalQty} Items</Text>
              </View>
            </View>
            <View style={styles.summaryRight}>
              <Text style={styles.summaryTotalLabel}>Grand Total</Text>
              <Text style={styles.summaryTotalValue}>₹ {billTotal.toFixed(2)}</Text>
            </View>
          </View>

          {/* Bottom Buttons */}
          <View style={[styles.lbBottomButtons, { paddingBottom: insets.bottom || 14 }]}>
            <TouchableOpacity style={styles.saveGoBackBtn} onPress={handleSaveAndBack}>
              <Ionicons name="save-outline" size={18} color="#2563EB" style={{ marginRight: 6 }} />
              <Text style={styles.saveGoBackText}>Save & Go Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.completeBillBtn} onPress={handleComplete}>
              <Ionicons name="checkmark" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.completeBillText}>Complete Bill</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
});

// ═══════════════════════════════════════════════════════════════
// QUICK ENTRY MODAL — full-screen, same style as Live Billing
// ═══════════════════════════════════════════════════════════════
const QuickEntryModal = memo(({
  visible, onClose, onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string, phone: string, amount: number, note: string) => void;
}) => {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    if (visible) { setName(''); setPhone(''); setAmount(''); setNote(''); }
  }, [visible]);

  const warn = (msg: string) => { setToastMsg(msg); setShowToast(true); };

  const handleSave = () => {
    if (!name.trim()) { warn('Please enter customer name'); return; }
    if (!amount.trim()) { warn('Please enter amount'); return; }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { warn('Enter a valid amount'); return; }
    onSave(name.trim(), phone.trim(), amt, note.trim());
  };

  if (!visible) return null;

  return (
    <>
      <Toast visible={showToast} message={toastMsg} onHide={() => setShowToast(false)} />
      <Modal animationType="slide" transparent={false} visible={visible} onRequestClose={onClose}>
        <KeyboardAvoidingView style={styles.liveBillingFullScreen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

          {/* Header — same structure as Live Billing */}
          <View style={[styles.liveBillingHeader, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity onPress={onClose} style={styles.lbBackBtn}>
              <Ionicons name="arrow-back" size={22} color="#333" />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.liveBillingTitle}>Quick Entry</Text>
              <Text style={styles.liveBillingSub}>Add name and amount quickly</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.lbCloseBtn, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="close" size={20} color="#6D28D9" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.liveBillingContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* Fast & Simple badge */}
            <View style={styles.qeFastBadge}>
              <View style={styles.qeIconBox}>
                <Ionicons name="flash" size={22} color="#6D28D9" />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.qeFastTitle}>Fast & Simple</Text>
                <Text style={styles.qeFastSub}>Just enter details and save</Text>
              </View>
            </View>

            {/* Form */}
            <Text style={styles.qeLabel}>Customer Name</Text>
            <View style={styles.lbInputBox}>
              <Ionicons name="person-outline" size={18} color="#bbb" style={{ marginRight: 8 }} />
              <TextInput style={styles.lbInput} placeholder="Enter customer name" value={name} onChangeText={setName} placeholderTextColor="#ccc" />
            </View>

            <Text style={[styles.qeLabel, { marginTop: 16 }]}>Phone (Optional)</Text>
            <View style={styles.lbInputBox}>
              <Ionicons name="call-outline" size={18} color="#bbb" style={{ marginRight: 8 }} />
              <TextInput style={styles.lbInput} placeholder="+91 98765 43210" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholderTextColor="#ccc" />
            </View>

            <Text style={[styles.qeLabel, { marginTop: 16 }]}>Amount (₹)</Text>
            <View style={styles.lbInputBox}>
              <Ionicons name="cash-outline" size={18} color="#bbb" style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.lbInput, { fontSize: 18, color: '#2563EB', fontWeight: '700' }]}
                placeholder="0.00"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholderTextColor="#ccc"
              />
            </View>

            <Text style={[styles.qeLabel, { marginTop: 16 }]}>Payment Note (Optional)</Text>
            <View style={styles.lbInputBox}>
              <Ionicons name="document-text-outline" size={18} color="#bbb" style={{ marginRight: 8 }} />
              <TextInput style={styles.lbInput} placeholder="e.g., Lunch Payment, Advance, etc." value={note} onChangeText={setNote} placeholderTextColor="#ccc" />
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Purple save button at bottom */}
          <View style={[styles.qeBottomBar, { paddingBottom: insets.bottom || 14 }]}>
            <TouchableOpacity style={styles.qeSaveBtn} onPress={handleSave}>
              <Ionicons name="wallet-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.qeSaveBtnText}>Save Payment</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
});

// ═══════════════════════════════════════════════════════════════
// REVIEW BILL MODAL
// ═══════════════════════════════════════════════════════════════
const ReviewBillModal = memo(({
  visible, onClose, onConfirm, customerName = '', customerPhone = '', items = [], total = 0,
}: {
  visible: boolean; onClose: () => void; onConfirm: () => void;
  customerName?: string; customerPhone?: string; items?: BillItem[]; total?: number;
}) => {
  if (!visible) return null;
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.reviewBillOverlay}>
        <View style={styles.reviewBillContainer}>
          <View style={styles.reviewBillHeader}>
            <Text style={styles.reviewBillTitle}>Review Bill</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#333" /></TouchableOpacity>
          </View>
          <View style={styles.reviewBillCustomerInfo}>
            <Text style={styles.reviewBillCustomerName}>{customerName || 'Walk-in Customer'}</Text>
            {customerPhone ? <Text style={styles.reviewBillCustomerPhone}>{customerPhone}</Text> : null}
          </View>
          <ScrollView style={{ maxHeight: SCREEN_HEIGHT * 0.38 }} showsVerticalScrollIndicator={false}>
            {items.map((item, idx) => (
              <View key={idx} style={styles.reviewBillItem}>
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
});

// ═══════════════════════════════════════════════════════════════
// SWIPEABLE ACTIVE ORDER BUTTON
// ═══════════════════════════════════════════════════════════════
const SwipeableOrderButton = memo(({
  session, idx, CARD_COLORS, onPress, onDelete,
}: {
  session: Session; idx: number; CARD_COLORS: any[]; onPress: () => void; onDelete: () => void;
}) => {
  const panX = new Animated.ValueXY();
  const total = session.items.reduce((s, i) => s + i.price * i.qty, 0);
  const cs = CARD_COLORS[idx % CARD_COLORS.length];

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (evt, gestureState) => {
      if (gestureState.dx < 0) {
        panX.x.setValue(Math.max(-80, gestureState.dx));
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      if (gestureState.dx < -40) {
        Animated.spring(panX.x, {
          toValue: -80,
          useNativeDriver: false,
        }).start();
      } else {
        Animated.spring(panX.x, {
          toValue: 0,
          useNativeDriver: false,
        }).start();
      }
    },
  });

  return (
    <View style={{ overflow: 'hidden', borderRadius: 14, marginBottom: 10 }}>
      <Animated.View style={[{ transform: [{ translateX: panX.x }] }]} {...panResponder.panHandlers}>
        <TouchableOpacity
          style={[styles.activeOrderButton, { backgroundColor: cs.badgeBg }]}
          onPress={onPress}
          activeOpacity={0.7}
        >
          <View style={styles.aoLeft}>
            <View style={[styles.aoIconBox, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Ionicons name="time-outline" size={24} color="#fff" />
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.aoBadge}>Order #{idx + 1}</Text>
              <Text style={styles.aoCustomerName} numberOfLines={1}>{session.customerName}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <Text style={styles.aoItemCount}>{session.items.reduce((s, i) => s + i.qty, 0)} items</Text>
                <Text style={{ color: '#fff', marginHorizontal: 6 }}>·</Text>
                <Text style={styles.aoTotal}>₹{total.toLocaleString('en-IN')}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* Delete button revealed on swipe */}
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => {
          onDelete();
          panX.flattenOffset();
        }}
      >
        <Ionicons name="trash" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );
});

// ═══════════════════════════════════════════════════════════════
// MAIN HOME SCREEN
// ═══════════════════════════════════════════════════════════════
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);

  const [bizName, setBizName] = useState('Sri Venkata Tiffins');
  const [todayTotal, setTodayTotal] = useState(0);
  const [salesLog, setSalesLog] = useState<SaleLog[]>([]);
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [nextDue, setNextDue] = useState('');
  const [profileVisible, setProfileVisible] = useState(false);

  // Active sessions live in RAM (RAM_SESSIONS). State is a mirror for re-renders.
  const [activeSessions, setActiveSessions] = useState<Session[]>([]);

  // Modal states
  const [liveBillingVisible, setLiveBillingVisible] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [quickEntryVisible, setQuickEntryVisible] = useState(false);
  const [billReviewVisible, setBillReviewVisible] = useState(false);
  const [reviewData, setReviewData] = useState<{
    customerName: string; customerPhone: string; items: BillItem[]; total: number; sessionId: number | null;
  }>({ customerName: '', customerPhone: '', items: [], total: 0, sessionId: null });

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'error' | 'success' | 'info'>('error');

  const showSuccess = (msg: string) => { setToastMessage(msg); setToastType('success'); setShowToast(true); };

  useEffect(() => {
    loadData();
    updateDateTime();
    const interval = setInterval(updateDateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const updateDateTime = () => {
    const now = new Date();
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    setCurrentDateTime(
      `Sankalp · ${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} · ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
    );
    const nm = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    setNextDue(`${nm.getDate()} ${months[nm.getMonth()]}`);
  };

  const loadData = async () => {
    try {
      if (user?.id) {
        const { data: profile } = await supabase.from('profiles').select('business_name').eq('id', user.id).maybeSingle();
        if (profile?.business_name) setBizName(profile.business_name);
      }
      const stored = await AsyncStorage.getItem('salesLog');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setSalesLog(parsed);
          setTodayTotal(parsed.reduce((s: number, b: SaleLog) => s + b.total, 0));
        }
      }
      // Sync RAM sessions into state
      setActiveSessions([...RAM_SESSIONS]);
    } catch (e) { console.error(e); }
  };

  // ── Start a brand new billing session ──
  const startNewBilling = () => {
    setEditingSession(null);
    setLiveBillingVisible(true);
  };

  // ── Tap an active order card → re-open that session ──
  const openSession = (session: Session) => {
    setEditingSession(session);
    setLiveBillingVisible(true);
  };

  // ── Delete active order by swipe ──
  const deleteActiveOrder = (sessionId: number) => {
    Alert.alert(
      'Delete Order',
      'Are you sure you want to delete this order?',
      [
        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
        {
          text: 'Delete',
          onPress: () => {
            RAM_SESSIONS = RAM_SESSIONS.filter(s => s.id !== sessionId);
            setActiveSessions([...RAM_SESSIONS]);
            showSuccess('Order deleted');
          },
          style: 'destructive',
        },
      ]
    );
  };

  // ── Save & Go Back: upsert session in RAM → appears in Active Orders ──
  const handleSaveAndBack = (customerName: string, phone: string, items: BillItem[]) => {
    if (editingSession) {
      // Update existing session in RAM
      RAM_SESSIONS = RAM_SESSIONS.map(s =>
        s.id === editingSession.id ? { ...s, customerName, phone, items } : s
      );
    } else {
      // Create new session in RAM
      RAM_SESSIONS = [...RAM_SESSIONS, { id: Date.now(), customerName, phone, items }];
    }
    setActiveSessions([...RAM_SESSIONS]); // trigger re-render
    setLiveBillingVisible(false);
    setEditingSession(null);
    showSuccess('Order saved! Tap the card to continue.');
  };

  // ── Complete Bill → show review ──
  const handleComplete = (customerName: string, phone: string, items: BillItem[]) => {
    const total = items.reduce((s, i) => s + i.price * i.qty, 0);
    setReviewData({ customerName, customerPhone: phone, items, total, sessionId: editingSession?.id ?? null });
    setLiveBillingVisible(false);
    setBillReviewVisible(true);
  };

  // ── Confirm & Save: write to AsyncStorage (DB stub) + purge from RAM ──
  const handleConfirmBill = async () => {
    const now = new Date();
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const newBill: SaleLog = {
      id: Date.now(),
      total: reviewData.total,
      time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      date: `${now.getDate()} ${months[now.getMonth()]}`,
      items: reviewData.items,
      customerName: reviewData.customerName,
      phone: reviewData.customerPhone || '',
    };

    // ── DB STUB ──
    // When Supabase table is ready, replace the two lines below with:
    //   await supabase.from('bills').insert({ ...newBill, user_id: user?.id });
    // and remove the AsyncStorage write.
    const updatedBills = [newBill, ...salesLog];
    setSalesLog(updatedBills);
    await AsyncStorage.setItem('salesLog', JSON.stringify(updatedBills));

    setTodayTotal(prev => prev + reviewData.total);

    // Remove session from RAM
    if (reviewData.sessionId) {
      RAM_SESSIONS = RAM_SESSIONS.filter(s => s.id !== reviewData.sessionId);
      setActiveSessions([...RAM_SESSIONS]);
    }

    setBillReviewVisible(false);
    setEditingSession(null);
    setReviewData({ customerName: '', customerPhone: '', items: [], total: 0, sessionId: null });
    showSuccess(`Bill saved! ₹${newBill.total}`);
  };

  // ── Quick Entry Save ──
  const handleQuickEntrySave = async (name: string, phone: string, amount: number, note: string) => {
    const now = new Date();
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const newBill: SaleLog = {
      id: Date.now(),
      total: amount,
      time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      date: `${now.getDate()} ${months[now.getMonth()]}`,
      items: [{ name: note || 'Quick Entry', price: amount, qty: 1 }],
      customerName: name,
      phone,
    };
    // ── DB STUB: replace with supabase insert when ready ──
    const updated = [newBill, ...salesLog];
    setSalesLog(updated);
    await AsyncStorage.setItem('salesLog', JSON.stringify(updated));
    setTodayTotal(prev => prev + amount);
    setQuickEntryVisible(false);
    showSuccess(`₹${amount} saved!`);
  };

  const CARD_COLORS = [
    { bg: '#EEF2FF', border: '#2563EB', badgeBg: '#2563EB', amtColor: '#2563EB' },
    { bg: '#F5F3FF', border: '#7C3AED', badgeBg: '#7C3AED', amtColor: '#7C3AED' },
    { bg: '#FFF7ED', border: '#F59E0B', badgeBg: '#F59E0B', amtColor: '#F59E0B' },
  ];

  // Profile Modal (inline for access to state)
  const ProfileModal = () => (
    <Modal animationType="slide" transparent visible={profileVisible} onRequestClose={() => setProfileVisible(false)}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setProfileVisible(false)}>
        <View style={styles.profilePanel}>
          <View style={styles.profileHandle} />
          <View style={styles.profileHeader}>
            <Text style={styles.profileBizName}>{bizName}</Text>
            <Text style={styles.profileBizSub}>🏪 Active since 2024</Text>
            <Text style={styles.profileEmail}>📧 {user?.email || 'Not available'}</Text>
          </View>
          <View style={styles.profileGrid}>
            {[
              { label: 'Total Bills', value: String(salesLog.length) },
              { label: 'Today Revenue', value: `₹${todayTotal}`, color: '#2563EB' },
              { label: 'Active Orders', value: String(activeSessions.length), color: '#10B981' },
              { label: 'Next Due', value: nextDue, color: '#A32D2D' },
            ].map(cell => (
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

  return (
    <View style={styles.container}>
      <Toast visible={showToast} message={toastMessage} type={toastType} onHide={() => setShowToast(false)} />
      <ProfileModal />

      <LiveBillingModal
        visible={liveBillingVisible}
        onClose={() => { setLiveBillingVisible(false); setEditingSession(null); }}
        onSaveAndBack={handleSaveAndBack}
        onComplete={handleComplete}
        session={editingSession}
      />

      <QuickEntryModal
        visible={quickEntryVisible}
        onClose={() => setQuickEntryVisible(false)}
        onSave={handleQuickEntrySave}
      />

      <ReviewBillModal
        visible={billReviewVisible}
        onClose={() => { setBillReviewVisible(false); setLiveBillingVisible(true); }}
        onConfirm={handleConfirmBill}
        customerName={reviewData.customerName}
        customerPhone={reviewData.customerPhone}
        items={reviewData.items}
        total={reviewData.total}
      />

      {/* ══ BLUE HEADER ══ */}
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

        {/* ══ QUICK ACTIONS ══ */}
        <Text style={styles.quickActionsTitle}>Quick Actions</Text>
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={[styles.qaBtn, { backgroundColor: '#2563EB', marginRight: 10 }]}
            onPress={startNewBilling}
          >
            <View style={styles.qaLeft}>
              <Ionicons name="document-text-outline" size={22} color="#fff" />
              <View style={{ marginLeft: 10, marginRight: 12 }}>
                <Text style={styles.qaBtnTitle}>+ New Bill</Text>
                <Text style={styles.qaBtnSub}>Add items & generate bill</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.qaBtn, { backgroundColor: '#6D28D9' }]}
            onPress={() => setQuickEntryVisible(true)}
          >
            <View style={styles.qaLeft}>
              <Ionicons name="flash" size={22} color="#fff" />
              <View style={{ marginLeft: 10, marginRight: 12 }}>
                <Text style={styles.qaBtnTitle}>+ Quick Entry</Text>
                <Text style={styles.qaBtnSub}>Just name & amount</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* ══ ACTIVE ORDERS ══ */}
        {activeSessions.length > 0 && (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Active Orders</Text>
              <Text style={styles.viewAllText}>{activeSessions.length} in progress</Text>
            </View>

            <View style={styles.activeOrdersContainer}>
              {activeSessions.map((session, idx) => (
                <SwipeableOrderButton
                  key={session.id}
                  session={session}
                  idx={idx}
                  CARD_COLORS={CARD_COLORS}
                  onPress={() => openSession(session)}
                  onDelete={() => deleteActiveOrder(session.id)}
                />
              ))}
            </View>
          </>
        )}

        {/* ══ TODAY'S BILLS ══ */}
        <View style={[styles.sectionRow, { marginTop: 16 }]}>
          <Text style={styles.sectionTitle}>Today's Bills</Text>
          <TouchableOpacity><Text style={styles.viewAllText}>View All</Text></TouchableOpacity>
        </View>

        {salesLog.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No sales yet today</Text>
          </View>
        ) : (
          salesLog.map((bill, index) => (
            <TouchableOpacity
              key={bill.id || index}
              style={styles.billCard}
              onPress={() => Alert.alert(
                `Bill #${salesLog.length - index}`,
                `Customer: ${bill.customerName}\nTime: ${bill.time}\nTotal: ₹${bill.total}\n\nItems:\n${bill.items.map(i => `${i.name} x${i.qty} = ₹${i.price * i.qty}`).join('\n')}`,
                [{ text: 'OK' }]
              )}
            >
              <View style={styles.billAvatarBox}>
                <Ionicons name="person" size={22} color="#2563EB" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.billNumber}>Bill #{salesLog.length - index}</Text>
                <Text style={styles.billCustomer}>{bill.customerName}</Text>
                <Text style={styles.billTime}>{bill.time} · {bill.date}</Text>
              </View>
              <View style={styles.billRight}>
                <View style={styles.paidBadge}><Text style={styles.paidBadgeText}>PAID</Text></View>
                <Text style={styles.billAmount}>₹{bill.total.toLocaleString('en-IN')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#bbb" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* ══ BOTTOM NAV ══ */}
      <View style={[styles.bottomNav, { paddingBottom: insets.bottom || 8 }]}>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="home" size={24} color="#2563EB" />
          <Text style={[styles.navLabel, { color: '#2563EB' }]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/analytics')}>
          <Ionicons name="stats-chart" size={24} color="#9CA3AF" />
          <Text style={styles.navLabel}>Analytics</Text>
        </TouchableOpacity>
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
      <TouchableOpacity style={[styles.fab, { bottom: (insets.bottom || 8) + 56 }]} onPress={startNewBilling}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F8' },

  // Header
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

  // Body
  body: { flex: 1, paddingHorizontal: 16, paddingTop: 18 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111' },
  viewAllText: { fontSize: 13, fontWeight: '700', color: '#2563EB' },

  // Active orders container and buttons
  activeOrdersContainer: { marginBottom: 6, gap: 10 },
  activeOrderButton: { borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4 },
  aoLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  aoIconBox: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  aoBadge: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  aoCustomerName: { fontSize: 15, fontWeight: '800', color: '#fff', marginTop: 3 },
  aoItemCount: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  aoTotal: { fontSize: 16, fontWeight: '900', color: '#fff' },
  aoRight: { marginLeft: 12 },
  deleteButton: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 60, alignItems: 'center', justifyContent: 'center' },

  // Quick actions
  quickActionsTitle: { fontSize: 16, fontWeight: '800', color: '#111', marginBottom: 10, marginTop: 6 },
  quickActionsRow: { flexDirection: 'row', marginBottom: 4 },
  qaBtn: { flex: 1, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4 },
  qaLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  qaBtnTitle: { fontSize: 14, fontWeight: '800', color: '#fff' },
  qaBtnSub: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginTop: 1 },

  // Today's bills
  billCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 0.5, borderColor: '#E5E7EB', elevation: 1 },
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

  // Bottom nav + FAB
  bottomNav: { backgroundColor: '#fff', flexDirection: 'row', paddingTop: 8, borderTopWidth: 0.5, borderTopColor: '#E5E7EB' },
  navItem: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  navLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '700', marginTop: 2 },
  fab: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8 },

  // Live Billing + Quick Entry shared header/layout
  liveBillingFullScreen: { flex: 1, backgroundColor: '#fff' },
  liveBillingHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  lbBackBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  lbCloseBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  liveBillingTitle: { fontSize: 18, fontWeight: '900', color: '#111' },
  liveBillingSub: { fontSize: 12, color: '#9CA3AF', fontWeight: '600', marginTop: 1 },
  liveBillingContent: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },

  // Customer inputs
  customerSection: { marginBottom: 20 },
  customerAvatarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  customerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  customerSectionTitle: { fontSize: 15, fontWeight: '800', color: '#111', marginLeft: 10 },
  lbInputBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 2 },
  lbInput: { flex: 1, padding: 12, fontSize: 14, fontWeight: '600', color: '#333' },

  // Items list
  addItemsSection: { marginBottom: 12 },
  addItemsTitle: { fontSize: 15, fontWeight: '800', color: '#111', marginBottom: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 12, marginBottom: 10 },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 14, color: '#333', fontWeight: '600' },
  productRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0' },
  productName: { fontSize: 14, fontWeight: '700', color: '#111' },
  productPrice: { fontSize: 12, fontWeight: '700', color: '#2563EB', marginTop: 2 },
  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: 10, marginRight: 12 },
  qtyBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: 14, fontWeight: '800', color: '#111', minWidth: 18, textAlign: 'center' },
  lineTotal: { fontSize: 13, fontWeight: '800', color: '#333', minWidth: 55, textAlign: 'right' },

  // Sticky summary bar — placed BETWEEN scroll and buttons
  billSummaryBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#EEF2FF', paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#D1D5DB' },
  summaryLeft: { flexDirection: 'row', alignItems: 'center' },
  summaryItemsLabel: { fontSize: 11, color: '#555', fontWeight: '600' },
  summaryItemsValue: { fontSize: 13, fontWeight: '800', color: '#2563EB', marginTop: 2 },
  summaryRight: { alignItems: 'flex-end' },
  summaryTotalLabel: { fontSize: 11, color: '#555', fontWeight: '600' },
  summaryTotalValue: { fontSize: 22, fontWeight: '900', color: '#111', marginTop: 2 },

  // Action buttons row
  lbBottomButtons: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, gap: 12, backgroundColor: '#fff' },
  saveGoBackBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#2563EB', borderRadius: 12, paddingVertical: 13 },
  saveGoBackText: { color: '#2563EB', fontSize: 14, fontWeight: '800' },
  completeBillBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 13, elevation: 2 },
  completeBillText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  // Quick Entry specifics
  qeFastBadge: { backgroundColor: '#F5F3FF', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  qeIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  qeFastTitle: { fontSize: 15, fontWeight: '800', color: '#6D28D9' },
  qeFastSub: { fontSize: 12, color: '#7C3AED', fontWeight: '600', marginTop: 2 },
  qeLabel: { fontSize: 13, fontWeight: '700', color: '#111', marginBottom: 8 },
  qeBottomBar: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: '#fff' },
  qeSaveBtn: { backgroundColor: '#6D28D9', borderRadius: 14, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', elevation: 3 },
  qeSaveBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },

  // Profile
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  profilePanel: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22 },
  profileHandle: { width: 40, height: 4, backgroundColor: '#eee', borderRadius: 4, alignSelf: 'center', marginBottom: 20 },
  profileHeader: { alignItems: 'center', marginBottom: 16 },
  profileBizName: { fontSize: 22, fontWeight: '900', color: '#222' },
  profileBizSub: { fontSize: 12, color: '#2563EB', fontWeight: '700', marginTop: 2, marginBottom: 10 },
  profileEmail: { fontSize: 12, color: '#666', fontWeight: '600', marginBottom: 12 },
  profileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  profileCell: { flex: 1, minWidth: '45%', backgroundColor: '#f9f9f9', borderRadius: 12, padding: 12, alignItems: 'center' },
  profileLabel: { fontSize: 10, color: '#999', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  profileValue: { fontSize: 14, fontWeight: '800', color: '#222', marginTop: 3 },
  profileCloseBtn: { backgroundColor: '#2563EB', padding: 13, borderRadius: 12, alignItems: 'center' },
  profileCloseText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  // Review Bill
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

  // Toast
  toastContainer: { position: 'absolute', bottom: 100, left: 20, right: 20, padding: 12, borderRadius: 10, alignItems: 'center', zIndex: 9999 },
  toastText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});