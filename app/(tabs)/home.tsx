// home.tsx — Complete working version with session persistence, business details, and profile fixes

import { useAuthStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { SankalpAIModal } from '@/components/SankalpAIModal';
import { db as DatabaseService } from '@/lib/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { SubscriptionModal } from '@/components/SubscriptionModal';

import { useRouter, useFocusEffect } from 'expo-router';
import { CommonActions, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState, memo, useRef, useMemo } from 'react';
import {
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  View,
  Dimensions,
  InteractionManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Import shared theme system ──────────────────────────────────────────────
import { useThemeStore } from '@/lib/store';
import { THEMES, DEFAULT_THEME_ID, type AppTheme, type ThemeId } from '@/constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Module-level RAM store for active sessions
let RAM_SESSIONS: Session[] = [];

// Types
interface BillItem { name: string; price: number; qty: number; }
interface Session { id: number; customerName: string; phone: string; items: BillItem[]; npVal?: string; }
interface SaleLog { id: number; total: number; time: string; date: string; items: BillItem[]; customerName: string; phone: string; paymentMode?: 'cash' | 'upi'; }

// Toast Component
const Toast = memo(({
  visible, message, type = 'error', onHide,
}: {
  visible: boolean; message: string; type?: 'error' | 'success' | 'info'; onHide: () => void;
}) => {
  useEffect(() => {
    if (visible) {
      const t = setTimeout(onHide, 2000);
      return () => clearTimeout(t);
    }
  }, [visible, onHide]);
  
  if (!visible) return null;
  
  const bg = type === 'error' ? '#EF4444' : type === 'success' ? '#10B981' : '#3B82F6';
  return (
    <View style={[styles.toastContainer, { backgroundColor: bg }]}>
      <Text style={styles.toastText}>{message}</Text>
    </View>
  );
});

// ThemePickerModal
const ThemePickerModal = memo(({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
  const insets = useSafeAreaInsets();
  const { themeId, setTheme, theme } = useThemeStore();
  if (!visible) return null;
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 16 }}>
          <View style={{ width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 4, alignSelf: 'center', marginBottom: 16 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <View>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#111827' }}>Choose Theme</Text>
              <Text style={{ fontSize: 12, color: '#9CA3AF', fontWeight: '500', marginTop: 2 }}>Personalise your app appearance</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingBottom: 8 }}>
              {(Object.keys(THEMES) as ThemeId[]).map((id) => {
                const t = THEMES[id];
                const isActive = themeId === id;
                const isDefault = id === DEFAULT_THEME_ID;
                return (
                  <TouchableOpacity
                    key={id}
                    style={{ width: '47%', borderRadius: 14, backgroundColor: '#F9FAFB', borderWidth: isActive ? 2.5 : 1.5, borderColor: isActive ? t.colors.primary : '#E5E7EB', overflow: 'hidden' }}
                    onPress={() => setTheme(id)}
                    activeOpacity={0.8}
                  >
                    <LinearGradient colors={t.preview as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 72, justifyContent: 'space-between', padding: 10 }}>
                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        {[0.9, 0.6, 0.4].map((op, i) => <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: `rgba(255,255,255,${op})` }} />)}
                      </View>
                      {isActive && (
                        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end' }}>
                          <Ionicons name="checkmark" size={14} color="#fff" />
                        </View>
                      )}
                    </LinearGradient>
                    <View style={{ padding: 10, gap: 2 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#111827' }}>{t.name}</Text>
                        {isDefault && <View style={{ backgroundColor: '#EEF2FF', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 }}><Text style={{ fontSize: 9, fontWeight: '700', color: '#4F46E5' }}>Default</Text></View>}
                      </View>
                      <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '500' }}>{t.description}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
          <TouchableOpacity onPress={onClose} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, marginTop: 10, backgroundColor: theme.colors.primary, elevation: 2 }}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
});

// Live Billing Modal
const LiveBillingModal = memo(({
  visible,
  onClose,
  onSaveAndBack,
  onComplete,
  session,
  products,
  theme,
}: {
  visible: boolean;
  onClose: () => void;
  onSaveAndBack: (customerName: string, phone: string, items: BillItem[]) => void;
  onComplete: (customerName: string, phone: string, items: BillItem[]) => void;
  session: Session | null;
  products?: { name: string; price: number }[];
  theme: AppTheme;
}) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation<any>();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [items, setItems] = useState<BillItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const modalOpacity = useRef(new Animated.Value(1)).current;
  

  useEffect(() => {
    if (visible) {
      if (session) {
        setCustomerName(session.customerName === 'Walk-in Customer' ? '' : session.customerName);
        setCustomerPhone(session.phone);
        setItems(session.items.map(i => ({ ...i })));
      } else {
        setCustomerName('');
        setCustomerPhone('');
        setItems([]);
      }
      setSearchQuery('');
    }
  }, [visible, session?.id]);

  const warn = useCallback((msg: string) => {
    setToastMsg(msg);
    setShowToast(true);
  }, []);

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

  const productsToUse = products && products.length > 0 ? products : [];
  const filtered = searchQuery 
    ? productsToUse.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : productsToUse;

  const { height: SCREEN_HEIGHT } = Dimensions.get('window');
  const slideY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      slideY.setValue(0);
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleSaveAndBack = useCallback(() => {
    if (activeItems.length === 0) {
      warn('Add at least one item to save');
      return;
    }
    onSaveAndBack(customerName.trim() || 'Walk-in Customer', customerPhone.trim(), activeItems);
  }, [activeItems, customerName, customerPhone, onSaveAndBack, warn]);

  const handleComplete = useCallback(() => {
    if (activeItems.length === 0) {
      warn('Please add products to complete the bill');
      return;
    }
    onComplete(customerName.trim() || 'Walk-in Customer', customerPhone.trim(), activeItems);
  }, [activeItems, customerName, customerPhone, onComplete, warn]);

  const handleGoToProducts = useCallback(() => {
    // 1. Fade out the modal
    Animated.timing(modalOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      // 2. Only AFTER fade completes, switch tab and close
      navigation.dispatch(CommonActions.navigate({ name: 'products' }));
      onClose();
      modalOpacity.setValue(1); // reset for next time
    });
  }, [navigation, onClose, modalOpacity]);

  if (!visible) return null;

  return (
    <>
      <Toast visible={showToast} message={toastMsg} onHide={() => setShowToast(false)} />
      <Modal 
        animationType="none" 
        transparent={false} 
        visible={visible} 
        onRequestClose={handleClose}
        statusBarTranslucent
      >
        <Animated.View style={{ flex: 1, backgroundColor: '#fff', transform: [{ translateY: slideY }], opacity: modalOpacity }}>
          <KeyboardAvoidingView 
            style={{ flex: 1 }} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={[styles.liveBillingHeader, { paddingTop: insets.top + 10 }]}>
              <TouchableOpacity onPress={handleClose} style={styles.lbBackBtn}>
                <Ionicons name="arrow-back" size={22} color="#333" />
              </TouchableOpacity>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.liveBillingTitle}>New Bill</Text>
                <Text style={styles.liveBillingSub}>Add items and create bill</Text>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.lbCloseBtn}>
                <Ionicons name="close" size={20} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.liveBillingContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.customerSection}>
                <View style={styles.lbInputBox}>
                  <Ionicons name="person-outline" size={18} color="#bbb" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.lbInput}
                    placeholder="Customer Name"
                    value={customerName}
                    onChangeText={setCustomerName}
                    placeholderTextColor="#9CA3AF"
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
                    placeholder="Phone"
                    value={customerPhone}
                    onChangeText={setCustomerPhone}
                    keyboardType="phone-pad"
                    placeholderTextColor="#ccc"
                  />
                </View>
              </View>

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
                {productsToUse.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20 }}>
                    <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                      <Ionicons name="cube-outline" size={48} color="#D1D5DB" />
                    </View>
                    <Text style={{ color: '#111827', fontSize: 18, fontWeight: '800', marginBottom: 8, textAlign: 'center' }}>No Products Available</Text>
                    <Text style={{ color: '#6B7280', fontSize: 14, fontWeight: '600', marginBottom: 16, textAlign: 'center' }}>Add products from the Products tab to start creating bills</Text>
                  </View>
                ) : filtered.map(product => {
                  const cur = items.find(i => i.name === product.name);
                  const qty = cur?.qty || 0;
                  return (
                    <View key={product.name} style={styles.productRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.productName}>{product.name}</Text>
                        <Text style={[styles.productPrice, { color: theme.colors.primary }]}>₹ {product.price.toFixed(2)}</Text>
                      </View>
                      <View style={styles.qtyControl}>
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => removeItem(product.name)}>
                          <Ionicons name="remove" size={16} color={theme.colors.primary} />
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>{qty}</Text>
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => addItem(product)}>
                          <Ionicons name="add" size={16} color={theme.colors.primary} />
                        </TouchableOpacity>
                      </View>
                      <Text style={[styles.lineTotal, { color: theme.colors.primary }]}>₹ {(qty * product.price).toFixed(2)}</Text>
                    </View>
                  );
                })}
              </View>
              <View style={{ height: 8 }} />
            </ScrollView>

            <View style={styles.billSummaryBar}>
              <View style={styles.summaryLeft}>
                <Ionicons name="document-text-outline" size={26} color={theme.colors.primary} />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.summaryItemsLabel}>Total Items</Text>
                  <Text style={[styles.summaryItemsValue, { color: theme.colors.primary }]}>{totalQty} Items</Text>
                </View>
              </View>
              <View style={styles.summaryRight}>
                <Text style={styles.summaryTotalLabel}>Grand Total</Text>
                <Text style={styles.summaryTotalValue}>₹ {billTotal.toFixed(2)}</Text>
              </View>
            </View>

            <View style={[styles.lbBottomButtons, { paddingBottom: insets.bottom || 14 }]}>
              <TouchableOpacity style={styles.saveGoBackBtn} onPress={handleSaveAndBack}>
                <Ionicons name="save-outline" size={18} color={theme.colors.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.saveGoBackText, { color: theme.colors.primary }]}>Save & Go Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.completeBillBtn, { backgroundColor: theme.colors.primary }]} onPress={handleComplete}>
                <Ionicons name="checkmark" size={18} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.completeBillText}>Complete Bill</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </Modal>
    </>
  );
});

// Reusable right-to-left slide wrapper (WhatsApp-style push navigation)
const QuickEntrySlideWrapper = memo(({
  visible, onClose, theme, insets, children,
}: {
  visible: boolean;
  onClose: () => void;
  theme: AppTheme;
  insets: any;
  children: React.ReactNode;
}) => {
  const { width: SCREEN_WIDTH } = Dimensions.get('window');
  const slideX = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  useEffect(() => {
    if (visible) {
      slideX.setValue(0);
    }
  }, [visible]);

  const handleAnimatedClose = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!visible) return null;

  // Pass animated close handler down to children via context-like prop injection
  const childWithClose = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<any>, { __onAnimatedClose: handleAnimatedClose })
    : children;

  return (
    <Modal animationType="none" transparent={false} visible={visible} onRequestClose={handleAnimatedClose} statusBarTranslucent>
      <Animated.View style={{ flex: 1, backgroundColor: '#fff', transform: [{ translateX: slideX }] }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          {childWithClose}
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
});

// Quick Bill Modal
const QuickEntryModal = memo(({
  visible, onClose, onSave, theme, presetMode, __onAnimatedClose,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string, phone: string, amount: number, note: string, paymentMode: 'cash' | 'upi') => void;
  theme: AppTheme;
  presetMode?: 'cash' | 'upi' | null;
  __onAnimatedClose?: () => void;
}) => {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi'>('cash');
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Use animated close if injected by wrapper, fallback to plain onClose
  const doClose = __onAnimatedClose ?? onClose;

  useEffect(() => {
    if (visible) {
      setName('');
      setPhone('');
      setAmount('');
      setNote('');
      setPaymentMode(presetMode || 'cash');
    }
  }, [visible, presetMode]);

  const warn = useCallback((msg: string) => {
    setToastMsg(msg);
    setShowToast(true);
  }, []);

  const handleSave = useCallback(() => {
    if (!name.trim()) {
      warn('Please enter customer name');
      return;
    }
    if (!amount.trim()) {
      warn('Please enter amount');
      return;
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      warn('Enter a valid amount');
      return;
    }
    onSave(name.trim(), phone.trim(), amt, note.trim(), paymentMode);
  }, [name, phone, amount, note, onSave, warn]);

  if (!visible) return null;

  return (
    <QuickEntrySlideWrapper visible={visible} onClose={onClose} theme={theme} insets={insets}>
      <Toast visible={showToast} message={toastMsg} onHide={() => setShowToast(false)} />

      <View style={[styles.liveBillingHeader, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={doClose} style={styles.lbBackBtn}>
          <Ionicons name="arrow-back" size={22} color="#333" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.liveBillingTitle}>Quick Bill</Text>
          <Text style={styles.liveBillingSub}>Add name and amount quickly</Text>
        </View>
        <TouchableOpacity onPress={doClose} style={[styles.lbCloseBtn, { backgroundColor: `${theme.colors.primary}20` }]}>
          <Ionicons name="close" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.liveBillingContent} 
        showsVerticalScrollIndicator={false} 
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.qeFastBadge}>
          <View style={[styles.qeIconBox, { backgroundColor: `${theme.colors.primary}20` }]}>
            <Ionicons name={paymentMode === 'upi' ? 'phone-portrait-outline' : 'flash'} size={22} color={paymentMode === 'upi' ? '#8B5CF6' : theme.colors.primary} />
          </View>
          <View style={{ marginLeft: 12 }}>
            <Text style={[styles.qeFastTitle, { color: paymentMode === 'upi' ? '#8B5CF6' : theme.colors.primary }]}>
              {paymentMode === 'upi' ? 'UPI Collection' : paymentMode === 'cash' && presetMode === 'cash' ? 'Cash Collection' : 'Fast & Simple'}
            </Text>
            <Text style={styles.qeFastSub}>Just enter details and save</Text>
          </View>
        </View>

        <Text style={styles.qeLabel}>Customer Name</Text>
        <View style={styles.lbInputBox}>
          <Ionicons name="person-outline" size={18} color="#bbb" style={{ marginRight: 8 }} />
          <TextInput 
            style={styles.lbInput} 
            placeholder="" 
            value={name} 
            onChangeText={setName} 
            placeholderTextColor="#ccc" 
          />
        </View>

        <Text style={[styles.qeLabel, { marginTop: 16 }]}>Phone (Optional)</Text>
        <View style={styles.lbInputBox}>
          <Ionicons name="call-outline" size={18} color="#bbb" style={{ marginRight: 8 }} />
          <TextInput 
            style={styles.lbInput} 
            placeholder="" 
            value={phone} 
            onChangeText={setPhone} 
            keyboardType="phone-pad" 
            placeholderTextColor="#ccc" 
          />
        </View>

        <Text style={[styles.qeLabel, { marginTop: 16 }]}>Amount (₹)</Text>
        <View style={styles.lbInputBox}>
          <Ionicons name="cash-outline" size={18} color="#bbb" style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.lbInput, { fontSize: 18, color: theme.colors.primary, fontWeight: '700' }]}
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
          <TextInput 
            style={styles.lbInput} 
            placeholder="" 
            value={note} 
            onChangeText={setNote} 
            placeholderTextColor="#ccc" 
          />
        </View>

        <Text style={[styles.qeLabel, { marginTop: 16 }]}>Payment Mode</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 4 }}>
          <TouchableOpacity
            onPress={() => setPaymentMode('cash')}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 12, borderWidth: 2, borderColor: paymentMode === 'cash' ? '#10B981' : '#E5E7EB', backgroundColor: paymentMode === 'cash' ? '#ECFDF5' : '#F9FAFB' }}
          >
            <Ionicons name="cash-outline" size={20} color={paymentMode === 'cash' ? '#10B981' : '#9CA3AF'} />
            <Text style={{ fontSize: 14, fontWeight: '800', color: paymentMode === 'cash' ? '#10B981' : '#9CA3AF' }}>Cash</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setPaymentMode('upi')}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 12, borderWidth: 2, borderColor: paymentMode === 'upi' ? '#8B5CF6' : '#E5E7EB', backgroundColor: paymentMode === 'upi' ? '#F5F3FF' : '#F9FAFB' }}
          >
            <Ionicons name="phone-portrait-outline" size={20} color={paymentMode === 'upi' ? '#8B5CF6' : '#9CA3AF'} />
            <Text style={{ fontSize: 14, fontWeight: '800', color: paymentMode === 'upi' ? '#8B5CF6' : '#9CA3AF' }}>UPI</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <View style={[styles.qeBottomBar, { paddingBottom: insets.bottom || 14 }]}>
        <TouchableOpacity style={[styles.qeSaveBtn, { backgroundColor: theme.colors.primary }]} onPress={handleSave}>
          <Ionicons name="wallet-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.qeSaveBtnText}>Save Payment</Text>
        </TouchableOpacity>
      </View>
    </QuickEntrySlideWrapper>
  );
});

// Review Bill Modal — modern bottom sheet
const ReviewBillModal = memo(({
  visible, onClose, onConfirm, customerName = '', customerPhone = '', items = [], total = 0, theme,
}: {
  visible: boolean; onClose: () => void; onConfirm: (paymentMode: 'cash' | 'upi') => void;
  customerName?: string; customerPhone?: string; items?: BillItem[]; total?: number;
  theme: AppTheme;
}) => {
  const insets = useSafeAreaInsets();
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi'>('cash');

  useEffect(() => {
    if (visible) setPaymentMode('cash');
  }, [visible]);

  if (!visible) return null;

  const initials = (customerName || 'W').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
  const itemCount = items.reduce((s, i) => s + i.qty, 0);

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#F9FAFB', borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', maxHeight: SCREEN_HEIGHT * 0.92 }}>

          {/* Gradient header */}
         

          {/* Items list */}
          <ScrollView
            style={{ maxHeight: SCREEN_HEIGHT * 0.26, backgroundColor: '#fff', marginHorizontal: 16, marginTop: -12, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB' }}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#9CA3AF', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8 }}>Items</Text>
            </View>
            {items.map((item, idx) => (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: '#F3F4F6' }}>
                <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: `${theme.colors.primary}15`, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: theme.colors.primary }}>{String(idx + 1).padStart(2, '0')}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#111' }}>{item.name}</Text>
                  <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginTop: 1 }}>Qty: {item.qty} × ₹{item.price.toLocaleString('en-IN')}</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '900', color: theme.colors.primary }}>₹{(item.price * item.qty).toLocaleString('en-IN')}</Text>
              </View>
            ))}
            <View style={{ marginHorizontal: 14, marginTop: 6, marginBottom: 0, borderTopWidth: 1.5, borderTopColor: '#E5E7EB', borderStyle: 'dashed' }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#6B7280' }}>Total</Text>
              <Text style={{ fontSize: 16, fontWeight: '900', color: theme.colors.primary }}>₹{total.toLocaleString('en-IN')}</Text>
            </View>
          </ScrollView>

          {/* Payment Mode */}
          <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#9CA3AF', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10 }}>Payment Mode</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setPaymentMode('cash')}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 14, borderWidth: 2, borderColor: paymentMode === 'cash' ? '#10B981' : '#E5E7EB', backgroundColor: paymentMode === 'cash' ? '#ECFDF5' : '#fff' }}
              >
                <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: paymentMode === 'cash' ? '#10B98120' : '#F3F4F6', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="cash-outline" size={18} color={paymentMode === 'cash' ? '#10B981' : '#9CA3AF'} />
                </View>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: paymentMode === 'cash' ? '#10B981' : '#6B7280' }}>Cash</Text>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: paymentMode === 'cash' ? '#6EE7B7' : '#9CA3AF' }}>Physical money</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setPaymentMode('upi')}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 14, borderWidth: 2, borderColor: paymentMode === 'upi' ? '#8B5CF6' : '#E5E7EB', backgroundColor: paymentMode === 'upi' ? '#F5F3FF' : '#fff' }}
              >
                <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: paymentMode === 'upi' ? '#8B5CF620' : '#F3F4F6', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="phone-portrait-outline" size={18} color={paymentMode === 'upi' ? '#8B5CF6' : '#9CA3AF'} />
                </View>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: paymentMode === 'upi' ? '#8B5CF6' : '#6B7280' }}>UPI</Text>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: paymentMode === 'upi' ? '#C4B5FD' : '#9CA3AF' }}>GPay / PhonePe</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Action buttons */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingTop: 14, paddingBottom: insets.bottom + 16, gap: 10 }}>
            <TouchableOpacity
              style={{ width: 52, height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: theme.colors.primary + '50', backgroundColor: theme.colors.primary + '10', alignItems: 'center', justifyContent: 'center' }}
              onPress={onClose}
            >
              <Ionicons name="pencil-outline" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1, height: 52, borderRadius: 14, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, elevation: 4, shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}
              onPress={() => onConfirm(paymentMode)}
            >
              <Ionicons name="checkmark-circle" size={22} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900' }}>Confirm & Save</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
});

// Swipeable Order Button
const SwipeableOrderButton = memo(({
  session, idx, CARD_COLORS, onPress, onDelete, theme,
}: {
  session: Session; idx: number; CARD_COLORS: any[]; onPress: () => void; onDelete: () => void;
  theme: AppTheme;
}) => {
  const panX = useRef(new Animated.ValueXY()).current;
  const total = session.items.reduce((s, i) => s + i.price * i.qty, 0);
  const cs = CARD_COLORS[idx % CARD_COLORS.length];

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dx < 0) {
          panX.x.setValue(Math.max(-80, gestureState.dx));
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx < -40) {
          Animated.spring(panX.x, { toValue: -80, useNativeDriver: false }).start();
        } else {
          Animated.spring(panX.x, { toValue: 0, useNativeDriver: false }).start();
        }
      },
    })
  ).current;

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

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => { onDelete(); panX.flattenOffset(); }}
      >
        <Ionicons name="trash" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );
});

// Bill Detail Modal — modern receipt style
const BillDetailModal = memo(({
  visible,
  bill,
  billNumber,
  onClose,
  onDelete,
  theme,
}: {
  visible: boolean;
  bill: SaleLog | null;
  billNumber: number;
  onClose: () => void;
  onDelete?: (bill: SaleLog) => void;
  theme: AppTheme;
}) => {
  if (!visible || !bill) return null;
  const initials = (bill.customerName || 'W').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
  const itemCount = bill.items.reduce((s, i) => s + i.qty, 0);
  const payMode = bill.paymentMode;

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#F9FAFB', borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', maxHeight: SCREEN_HEIGHT * 0.88 }}>

          {/* Gradient header */}
          <LinearGradient
            colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ paddingTop: 20, paddingBottom: 24, paddingHorizontal: 20 }}
          >
            {/* Drag handle */}
            <View style={{ width: 36, height: 4, backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 4, alignSelf: 'center', marginBottom: 18 }} />

            {/* Top row: bill number + close */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 }}>BILL #{billNumber}</Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Customer info */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
              <View style={{ width: 52, alignItems: 'center', gap: 8 }}>
                <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: '#fff' }}>{initials}</Text>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 19, fontWeight: '900', color: '#fff' }}>{bill.customerName || 'Walk-in Customer'}</Text>
                {bill.phone ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <Ionicons name="call-outline" size={12} color="rgba(255,255,255,0.75)" />
                    <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600' }}>{bill.phone}</Text>
                  </View>
                ) : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.75)" />
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600' }}>{bill.time} · {bill.date}</Text>
                </View>
              </View>
              <View style={{ alignItems: 'center', gap: 4 }}>
                {payMode ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3, gap: 3, backgroundColor: payMode === 'cash' ? 'rgba(16,185,129,0.35)' : 'rgba(139,92,246,0.35)', maxWidth: 60 }}>
                    <Ionicons name={payMode === 'cash' ? 'cash-outline' : 'phone-portrait-outline'} size={10} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800', textTransform: 'uppercase' }}>{payMode}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Total amount */}
            <View style={{ marginTop: 20, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' }}>Total Paid</Text>
                <Text style={{ fontSize: 30, fontWeight: '900', color: '#fff', letterSpacing: -1, marginTop: 2 }}>₹{bill.total.toLocaleString('en-IN')}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, gap: 5 }}>
                  <Ionicons name="cube-outline" size={13} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{itemCount} item{itemCount !== 1 ? 's' : ''}</Text>
                </View>
              </View>
            </View>
          </LinearGradient>

          {/* Items list */}
          <ScrollView
            style={{ maxHeight: SCREEN_HEIGHT * 0.32, backgroundColor: '#fff', marginHorizontal: 16, marginTop: -12, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB' }}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#9CA3AF', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10 }}>Items Breakdown</Text>
            </View>
            {bill.items.map((item, idx) => (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: '#F3F4F6' }}>
                <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: `${theme.colors.primary}15`, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: theme.colors.primary }}>{String(idx + 1).padStart(2, '0')}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#111' }}>{item.name}</Text>
                  <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginTop: 2 }}>
                    {item.qty} × ₹{item.price.toLocaleString('en-IN')}
                  </Text>
                </View>
                <Text style={{ fontSize: 15, fontWeight: '900', color: theme.colors.primary }}>₹{(item.price * item.qty).toLocaleString('en-IN')}</Text>
              </View>
            ))}

            {/* Dashed divider + total */}
            <View style={{ marginHorizontal: 14, marginTop: 8, marginBottom: 4, borderTopWidth: 1.5, borderTopColor: '#E5E7EB', borderStyle: 'dashed' }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#6B7280' }}>Grand Total</Text>
              <Text style={{ fontSize: 18, fontWeight: '900', color: theme.colors.primary }}>₹{bill.total.toLocaleString('en-IN')}</Text>
            </View>
          </ScrollView>

          {/* Action buttons */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 24, gap: 10 }}>
            {onDelete && (
              <TouchableOpacity
                onPress={() => onDelete(bill)}
                style={{ width: 48, height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: '#FEE2E2', backgroundColor: '#FFF5F5', alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="trash-outline" size={18} color="#DC2626" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={{ flex: 1, height: 48, borderRadius: 14, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, elevation: 3 }}
              onPress={onClose}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>Done</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
});

// Profile Modal
const ProfileModal = memo(({
  visible, bizName, bizLocation, userEmail, subStatus, isSubscribed, isTrialActive,
  nextDue, pendingCount, pendingTotal, onClose, onEditProfile, onLogout, onUpgrade, onPendingPayments, onChooseTheme, theme,
}: {
  visible: boolean; bizName: string; bizLocation: string; userEmail: string;
  subStatus: { label: string; color: string; bg: string; icon: any };
  isSubscribed: boolean; isTrialActive: boolean; nextDue: string;
  pendingCount: number; pendingTotal: number;
  onClose: () => void; onEditProfile: () => void; onLogout: () => void;
  onUpgrade: () => void; onPendingPayments: () => void; onChooseTheme: () => void;
  theme: AppTheme;
}) => (
  <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
    <TouchableWithoutFeedback onPress={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableWithoutFeedback onPress={() => {}}>
          <View style={[styles.profilePanel, { paddingBottom: 32 }]}>
            <View style={styles.profileHandle} />

            <View style={styles.profileHeaderNew}>
              <LinearGradient colors={[theme.colors.gradientStart, theme.colors.gradientEnd]} style={styles.profileAvatarNew}>
                <Text style={styles.profileAvatarText}>
                  {bizName ? bizName.charAt(0).toUpperCase() : (userEmail?.charAt(0).toUpperCase() || 'S')}
                </Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.profileNameNew}>{bizName || 'Your Business'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                  {bizLocation ? (
                    <>
                      <Ionicons name="location-outline" size={12} color="#9CA3AF" />
                      <Text style={styles.profileMetaNew}>{bizLocation}</Text>
                    </>
                  ) : null}
                </View>
                <View style={[styles.subBadgeNew, { backgroundColor: subStatus.bg }]}>
                  <Ionicons name={subStatus.icon} size={11} color={subStatus.color} />
                  <Text style={[styles.subBadgeText, { color: subStatus.color }]}>{subStatus.label}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={onEditProfile} style={styles.editIconBtn}>
                <Ionicons name="pencil" size={15} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.statsRow}>
              <View style={[styles.statBox, { borderColor: '#EEF2FF' }]}>
                <Ionicons name="mail-outline" size={15} color="#6B7280" />
                <Text style={styles.statLabel}>Account</Text>
                <Text style={styles.statValue} numberOfLines={1}>{userEmail?.split('@')[0] || '—'}</Text>
              </View>
              <View style={[styles.statBox, { borderColor: '#FEF3C7' }]}>
                <Ionicons name="diamond-outline" size={15} color="#D97706" />
                <Text style={styles.statLabel}>Plan</Text>
                <Text style={[styles.statValue, { color: '#D97706' }]}>{isSubscribed ? 'Pro' : 'Trial'}</Text>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: SCREEN_HEIGHT * 0.38 }}>
              <TouchableOpacity style={styles.menuItem} onPress={onPendingPayments}>
                <View style={[styles.menuItemIcon, { backgroundColor: '#FFF7ED' }]}>
                  <Ionicons name="time-outline" size={20} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuItemTitle}>Pending Payments</Text>
                  <Text style={styles.menuItemSub}>
                    {pendingCount > 0 ? `${pendingCount} person${pendingCount !== 1 ? 's' : ''} · ₹${pendingTotal.toLocaleString('en-IN')} due` : 'No pending payments'}
                  </Text>
                </View>
                {pendingCount > 0 && (
                  <View style={styles.menuBadge}>
                    <Text style={styles.menuBadgeText}>{pendingCount}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={16} color="#D1D5DB" style={{ marginLeft: 4 }} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={onChooseTheme}>
                <View style={[styles.menuItemIcon, { backgroundColor: '#F5F3FF' }]}>
                  <Ionicons name="color-palette-outline" size={20} color="#7C3AED" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuItemTitle}>Choose Theme</Text>
                  <Text style={styles.menuItemSub}>Personalise your app colours</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#D1D5DB" style={{ marginLeft: 4 }} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={!isSubscribed ? onUpgrade : undefined} activeOpacity={isSubscribed ? 1 : 0.7}>
                <View style={[styles.menuItemIcon, { backgroundColor: '#ECFDF5' }]}>
                  <Ionicons name="sparkles" size={20} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuItemTitle}>Subscription</Text>
                  <Text style={styles.menuItemSub}>{isSubscribed ? `Renews ${nextDue} · ₹29/month` : isTrialActive ? 'Trial active — Upgrade to Pro' : 'Trial expired — Upgrade now'}</Text>
                </View>
                {!isSubscribed && (
                  <View style={[styles.menuBadge, { backgroundColor: '#ECFDF5' }]}>
                    <Text style={[styles.menuBadgeText, { color: '#10B981' }]}>Upgrade</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={16} color="#D1D5DB" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
              <Ionicons name="log-out-outline" size={18} color="#DC2626" style={{ marginRight: 8 }} />
              <Text style={styles.logoutBtnText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  </Modal>
));

// Pending Payments Modal
interface PendingPayment { id: string; name: string; phone: string; amount: number; date: string; notes: string; place: string; }
interface PaidPayment { id: string; name: string; phone: string; amount: number; date: string; notes: string; place: string; paid_at: string; }

const PendingPaymentsModal = memo(({
  visible, userId, onClose, theme,
}: { visible: boolean; userId: string; onClose: () => void; theme: AppTheme; }) => {
  const insets = useSafeAreaInsets();
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [paidPayments, setPaidPayments] = useState<PaidPayment[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'paid'>('pending');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [place, setPlace] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState<PendingPayment | null>(null);

  const [detailPayment, setDetailPayment] = useState<PendingPayment | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState<'error'|'success'|'info'>('error');

  const toast = (msg: string, type: 'error'|'success'|'info' = 'error') => {
    setToastMsg(msg); setToastType(type); setShowToast(true);
  };

  const loadPayments = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pending_payments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (!error && data) setPayments(data.map((r: any) => ({
        id: r.id, name: r.name, phone: r.phone || '', amount: Number(r.amount),
        date: r.date_added, notes: r.notes || '', place: r.place || '',
      })));
    } catch (e) { console.log('loadPayments error', e); }
    setLoading(false);
  }, [userId]);

  const loadPaidPayments = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('paid_payments')
        .select('*')
        .eq('user_id', userId)
        .order('paid_at', { ascending: false });
      if (!error && data) setPaidPayments(data.map((r: any) => ({
        id: r.id, name: r.name, phone: r.phone || '', amount: Number(r.amount),
        date: r.date_added, notes: r.notes || '', place: r.place || '', paid_at: r.paid_at || '',
      })));
    } catch (e) { console.log('loadPaidPayments error', e); }
  }, [userId]);

  useEffect(() => {
    if (visible) {
      loadPayments();
      loadPaidPayments();
    }
  }, [visible, loadPayments, loadPaidPayments]);

  const resetForm = () => { setName(''); setPhone(''); setAmount(''); setNotes(''); setPlace(''); setDuplicateWarning(null); };

  const checkDuplicate = useCallback((phoneVal: string) => {
    if (!phoneVal.trim()) { setDuplicateWarning(null); return; }
    const match = payments.find(p => p.phone.trim() === phoneVal.trim());
    setDuplicateWarning(match || null);
  }, [payments]);

  const handleAdd = async () => {
    if (!name.trim()) { toast('Enter customer name'); return; }
    const amt = parseFloat(amount);
    if (!amount.trim() || isNaN(amt) || amt <= 0) { toast('Enter a valid amount'); return; }
    try {
      const now = new Date();
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const dateStr = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
      const { error } = await supabase.from('pending_payments').insert({
        user_id: userId, name: name.trim(), phone: phone.trim(),
        amount: amt, date_added: dateStr, notes: notes.trim(), place: place.trim(),
      });
      if (error) { toast('Failed to save'); return; }
      toast('Payment added!', 'success');
      resetForm(); setShowAdd(false); loadPayments();
    } catch (e) { toast('Something went wrong'); }
  };

  const openDetail = (p: PendingPayment) => {
    setDetailPayment(p);
    setShowDetail(true);
  };

  const handleMarkPaid = async (p: PendingPayment) => {
    try {
      const now = new Date();
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const paidAt = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
      await supabase.from('paid_payments').insert({
        user_id: userId, name: p.name, phone: p.phone, amount: p.amount,
        date_added: p.date, notes: p.notes, place: p.place, paid_at: paidAt,
      });
      await supabase.from('pending_payments').delete().eq('id', p.id);
      toast(`${p.name} marked as paid!`, 'success');
      setShowDetail(false);
      setDetailPayment(null);
      loadPayments();
      loadPaidPayments();
    } catch (e) { toast('Something went wrong'); }
  };

  const totalPending = payments.reduce((s, p) => s + p.amount, 0);
  const totalPaid = paidPayments.reduce((s, p) => s + p.amount, 0);
  
  

  if (!visible) return null;
  return (
    <Modal animationType="slide" transparent={false} visible={visible} onRequestClose={onClose} statusBarTranslucent>
      <Toast visible={showToast} message={toastMsg} type={toastType} onHide={() => setShowToast(false)} />
      <View style={{ flex: 1, backgroundColor: '#F5F3FF' }}>
        <LinearGradient colors={['#F59E0B', '#D97706']} style={[styles.ppHeader, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={onClose} style={styles.ppBackBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.ppHeaderTitle}>Pending Payments</Text>
            <Text style={styles.ppHeaderSub}>{payments.length} person{payments.length !== 1 ? 's' : ''} · ₹{totalPending.toLocaleString('en-IN')} due</Text>
          </View>
          {activeTab === 'pending' && (
            <TouchableOpacity onPress={() => { resetForm(); setShowAdd(true); }} style={styles.ppAddBtn}>
              <Ionicons name="add" size={22} color="#D97706" />
            </TouchableOpacity>
          )}
        </LinearGradient>

        <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
          <TouchableOpacity
            style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: activeTab === 'pending' ? '#F59E0B' : 'transparent' }}
            onPress={() => setActiveTab('pending')}
          >
            <Text style={{ fontSize: 13, fontWeight: '800', color: activeTab === 'pending' ? '#D97706' : '#9CA3AF' }}>Pending ({payments.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: activeTab === 'paid' ? '#10B981' : 'transparent' }}
            onPress={() => setActiveTab('paid')}
          >
            <Text style={{ fontSize: 13, fontWeight: '800', color: activeTab === 'paid' ? '#10B981' : '#9CA3AF' }}>Paid ({paidPayments.length})</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1, padding: 16 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {loading ? (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Text style={{ color: '#9CA3AF', fontSize: 14 }}>Loading...</Text>
            </View>
          ) : activeTab === 'pending' ? (
            payments.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <Ionicons name="time-outline" size={34} color="#F59E0B" />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#111', marginBottom: 6 }}>No Pending Payments</Text>
                <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center' }}>Tap + to add someone who owes you money</Text>
              </View>
            ) : payments.map(p => (
              <TouchableOpacity key={p.id} style={styles.ppCard} onPress={() => openDetail(p)} activeOpacity={0.75}>
                <View style={styles.ppCardLeft}>
                  <View style={styles.ppAvatar}>
                    <Text style={styles.ppAvatarText}>{p.name.charAt(0).toUpperCase()}</Text>
                  </View>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.ppName}>{p.name}</Text>
                  {p.phone ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                      <Ionicons name="call-outline" size={11} color="#9CA3AF" />
                      <Text style={styles.ppPhone}>{p.phone}</Text>
                    </View>
                  ) : null}
                  {p.place ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                      <Ionicons name="location-outline" size={11} color="#9CA3AF" />
                      <Text style={[styles.ppPhone, { color: '#6B7280' }]}>{p.place}</Text>
                    </View>
                  ) : null}
                  {p.notes ? <Text style={styles.ppNotes} numberOfLines={1}>{p.notes}</Text> : null}
                  <Text style={styles.ppDate}>{p.date}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.ppAmount}>₹{p.amount.toLocaleString('en-IN')}</Text>
                  <View style={styles.ppDeleteBtn}>
                    <Ionicons name="checkmark-circle-outline" size={14} color="#10B981" />
                    <Text style={styles.ppDeleteText}>Mark Paid</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            paidPayments.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <Ionicons name="checkmark-done-circle-outline" size={34} color="#10B981" />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#111', marginBottom: 6 }}>No Paid Records Yet</Text>
                <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center' }}>Payments you mark as paid will appear here</Text>
              </View>
            ) : (
              <>
                {paidPayments.map(p => (
                  <View key={p.id} style={[styles.ppCard, { borderLeftWidth: 3, borderLeftColor: '#10B981' }]}>
                    <View style={styles.ppCardLeft}>
                      <View style={[styles.ppAvatar, { backgroundColor: '#ECFDF5' }]}>
                        <Text style={[styles.ppAvatarText, { color: '#10B981' }]}>{p.name.charAt(0).toUpperCase()}</Text>
                      </View>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.ppName}>{p.name}</Text>
                      {p.phone ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                          <Ionicons name="call-outline" size={11} color="#9CA3AF" />
                          <Text style={styles.ppPhone}>{p.phone}</Text>
                        </View>
                      ) : null}
                      {p.place ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                          <Ionicons name="location-outline" size={11} color="#9CA3AF" />
                          <Text style={[styles.ppPhone, { color: '#6B7280' }]}>{p.place}</Text>
                        </View>
                      ) : null}
                      {p.notes ? <Text style={styles.ppNotes} numberOfLines={1}>{p.notes}</Text> : null}
                      <Text style={styles.ppDate}>Added: {p.date} · Paid: {p.paid_at}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.ppAmount, { color: '#10B981' }]}>₹{p.amount.toLocaleString('en-IN')}</Text>
                      <View style={[styles.ppDeleteBtn, { gap: 3 }]}>
                        <Ionicons name="checkmark-circle" size={13} color="#10B981" />
                        <Text style={[styles.ppDeleteText, { color: '#10B981' }]}>Paid</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </>
            )
          )}
          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Payment Detail Bottom Sheet */}
        <Modal animationType="slide" transparent visible={showDetail} onRequestClose={() => setShowDetail(false)}>
          <TouchableWithoutFeedback onPress={() => setShowDetail(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={[styles.profilePanel, { paddingBottom: 32 }]}>
                  <View style={styles.profileHandle} />
                  {detailPayment && (
                    <>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                        <View style={[styles.ppAvatar, { width: 52, height: 52, borderRadius: 26 }]}>
                          <Text style={[styles.ppAvatarText, { fontSize: 20 }]}>{detailPayment.name.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={{ marginLeft: 14, flex: 1 }}>
                          <Text style={{ fontSize: 18, fontWeight: '900', color: '#111' }}>{detailPayment.name}</Text>
                          <Text style={{ fontSize: 12, color: '#9CA3AF', fontWeight: '500', marginTop: 2 }}>Pending since {detailPayment.date}</Text>
                        </View>
                        <Text style={{ fontSize: 22, fontWeight: '900', color: '#D97706' }}>₹{detailPayment.amount.toLocaleString('en-IN')}</Text>
                      </View>

                      {[
                        { icon: 'call-outline', label: 'Phone', value: detailPayment.phone || '—' },
                        { icon: 'location-outline', label: 'Place', value: detailPayment.place || '—' },
                        { icon: 'document-text-outline', label: 'Notes', value: detailPayment.notes || '—' },
                        { icon: 'calendar-outline', label: 'Date Added', value: detailPayment.date },
                      ].map(row => (
                        <View key={row.label} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                          <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                            <Ionicons name={row.icon as any} size={15} color="#D97706" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 10, color: '#9CA3AF', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>{row.label}</Text>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#111', marginTop: 1 }}>{row.value}</Text>
                          </View>
                        </View>
                      ))}

                      <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                        <TouchableOpacity
                          style={[styles.saveGoBackBtn, { flex: 1 }]}
                          onPress={() => setShowDetail(false)}
                        >
                          <Text style={styles.saveGoBackText}>Close</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.completeBillBtn, { flex: 1, backgroundColor: '#10B981' }]}
                          onPress={() => handleMarkPaid(detailPayment)}
                        >
                          <Ionicons name="checkmark-circle-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                          <Text style={styles.completeBillText}>Mark as Paid</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Add Payment Full Screen */}
        <Modal animationType="slide" transparent={false} visible={showAdd} onRequestClose={() => { setShowAdd(false); resetForm(); }} statusBarTranslucent>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, backgroundColor: '#fff' }}
          >
            <View style={{ flex: 1, backgroundColor: '#fff' }}>
              <LinearGradient colors={['#F59E0B', '#D97706']} style={{ paddingTop: insets.top + 12, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => { setShowAdd(false); resetForm(); }} style={styles.ppBackBtn}>
                  <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.ppHeaderTitle}>Add Pending Payment</Text>
                  <Text style={styles.ppHeaderSub}>Fill in the details below</Text>
                </View>
              </LinearGradient>

              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
                {duplicateWarning && (
                  <View style={{ backgroundColor: '#FEF3C7', borderRadius: 10, padding: 12, marginBottom: 14, flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderColor: '#FCD34D' }}>
                    <Ionicons name="warning-outline" size={18} color="#D97706" style={{ marginRight: 8, marginTop: 1 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#92400E' }}>Returning Person Detected!</Text>
                      <Text style={{ fontSize: 12, color: '#92400E', marginTop: 3, fontWeight: '500' }}>
                        {duplicateWarning.name} already has a pending payment of ₹{duplicateWarning.amount.toLocaleString('en-IN')} (added {duplicateWarning.date}). You are adding a new record for the same phone number.
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Customer Name *</Text>
                  <View style={styles.formInputBox}>
                    <Ionicons name="person-outline" size={18} color="#999" style={{ marginRight: 8 }} />
                    <TextInput style={styles.formInput} placeholder="Enter name" value={name} onChangeText={setName} placeholderTextColor="#ccc" autoCorrect={false} blurOnSubmit={false} />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Phone Number</Text>
                  <View style={styles.formInputBox}>
                    <Ionicons name="call-outline" size={18} color="#999" style={{ marginRight: 8 }} />
                    <TextInput style={styles.formInput} placeholder="" value={phone} onChangeText={(v) => { setPhone(v); checkDuplicate(v); }} keyboardType="phone-pad" placeholderTextColor="#ccc" autoCorrect={false} blurOnSubmit={false} />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Place</Text>
                  <View style={styles.formInputBox}>
                    <Ionicons name="location-outline" size={18} color="#999" style={{ marginRight: 8 }} />
                    <TextInput style={styles.formInput} placeholder="e.g. Shop, Colony, Area..." value={place} onChangeText={setPlace} placeholderTextColor="#ccc" autoCorrect={false} blurOnSubmit={false} />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Amount (₹) *</Text>
                  <View style={styles.formInputBox}>
                    <Ionicons name="cash-outline" size={18} color="#999" style={{ marginRight: 8 }} />
                    <TextInput style={styles.formInput} placeholder="0.00" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholderTextColor="#ccc" autoCorrect={false} blurOnSubmit={false} />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Notes (Optional)</Text>
                  <View style={[styles.formInputBox, { height: 100, alignItems: 'flex-start', paddingTop: 12 }]}>
                    <Ionicons name="document-text-outline" size={18} color="#999" style={{ marginRight: 8, marginTop: 2 }} />
                    <TextInput
                      style={[styles.formInput, { height: 76, textAlignVertical: 'top' }]}
                      placeholder="e.g. Lunch, Advance..."
                      value={notes}
                      onChangeText={setNotes}
                      placeholderTextColor="#ccc"
                      autoCorrect={false}
                      blurOnSubmit={false}
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                </View>

              <View style={{ height: 10 }} />
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 12, padding: 16, paddingBottom: insets.bottom + 8, borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: '#fff' }}>
                <TouchableOpacity style={[styles.saveGoBackBtn, { flex: 1 }]} onPress={() => { setShowAdd(false); resetForm(); }}>
                  <Text style={styles.saveGoBackText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.completeBillBtn, { flex: 1, backgroundColor: '#F59E0B' }]} onPress={handleAdd}>
                  <Text style={styles.completeBillText}>Add Payment</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </Modal>
  );
});

// Edit Profile Modal
const EditProfileModal = memo(({
  visible,
  editingBizName,
  editingBizLocation,
  isSavingProfile,
  onChangeName,
  onChangeLocation,
  onSave,
  onClose,
}: {
  visible: boolean;
  editingBizName: string;
  editingBizLocation: string;
  isSavingProfile: boolean;
  onChangeName: (v: string) => void;
  onChangeLocation: (v: string) => void;
  onSave: () => void;
  onClose: () => void;
}) => (
  <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
    >
      <View style={styles.modalOverlay}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.profilePanel} onStartShouldSetResponder={() => true}>
              <View style={styles.profileHandle} />

              <View style={[styles.profileHeader, { marginBottom: 24 }]}>
                <Text style={styles.profileBizName}>Edit Business Details</Text>
              </View>

              <View style={styles.editProfileForm}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Business Name</Text>
                  <View style={styles.formInputBox}>
                    <Ionicons name="business-outline" size={18} color="#999" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.formInput}
                      placeholder="Enter business name"
                      value={editingBizName}
                      onChangeText={onChangeName}
                      placeholderTextColor="#999"
                      autoCorrect={false}
                      blurOnSubmit={false}
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>City</Text>
                  <View style={styles.formInputBox}>
                    <Ionicons name="location-outline" size={18} color="#999" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.formInput}
                      placeholder="Enter city"
                      value={editingBizLocation}
                      onChangeText={onChangeLocation}
                      placeholderTextColor="#999"
                      autoCorrect={false}
                      blurOnSubmit={false}
                    />
                  </View>
                </View>

                <TouchableOpacity style={styles.saveProfileBtn} onPress={onSave} disabled={isSavingProfile}>
                  <Text style={styles.saveProfileBtnText}>{isSavingProfile ? 'Saving...' : 'Save Changes'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>
));

// Inline Mini-Calendar
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_NAMES = ['Su','Mo','Tu','We','Th','Fr','Sa'];

const MiniCalendar = memo(({
  selectedDate, onSelect, markedDates,
}: {
  selectedDate: Date | null;
  onSelect: (d: Date) => void;
  markedDates: Set<string>;
}) => {
  const today = new Date();
  const { theme } = useThemeStore();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const toKey = (d: number) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${viewYear}-${mm}-${dd}`;
  };

  const selectedKey = selectedDate
    ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth()+1).padStart(2,'0')}-${String(selectedDate.getDate()).padStart(2,'0')}`
    : null;

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <TouchableOpacity onPress={prevMonth} style={{ padding: 6 }}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '800', color: '#111' }}>
          {MONTH_NAMES[viewMonth]} {viewYear}
        </Text>
        <TouchableOpacity onPress={nextMonth} style={{ padding: 6 }}>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: 'row', marginBottom: 4 }}>
        {DAY_NAMES.map(d => (
          <Text key={d} style={{ flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#9CA3AF' }}>{d}</Text>
        ))}
      </View>
      {Array.from({ length: Math.ceil(cells.length / 7) }, (_, row) => (
        <View key={row} style={{ flexDirection: 'row', marginBottom: 2 }}>
          {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
            if (!day) return <View key={col} style={{ flex: 1, height: 36 }} />;
            const key = toKey(day);
            const isSelected = selectedKey === key;
            const isToday = today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;
            return (
              <TouchableOpacity
                key={col}
                onPress={() => onSelect(new Date(viewYear, viewMonth, day))}
                style={{
                  flex: 1, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10,
                  backgroundColor: isSelected ? theme.colors.primary : isToday ? theme.colors.primaryLight : 'transparent',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: isSelected || isToday ? '800' : '500', color: isSelected ? '#fff' : isToday ? theme.colors.primary : '#111' }}>
                  {day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
});

// View All Bills Modal
const ViewAllBillsModal = memo(({
  visible, onClose, insetTop, activeSessions, filteredBills, filteredTotal,
  billsDateFilter, setBillsDateFilter,
  billsSearchQuery, setBillsSearchQuery,
  openSession, openBillDetail,
}: {
  visible: boolean;
  onClose: () => void;
  insetTop: number;
  activeSessions: Session[];
  filteredBills: SaleLog[];
  filteredTotal: number;
  billsDateFilter: string;
  setBillsDateFilter: (d: string) => void;
  billsSearchQuery: string;
  setBillsSearchQuery: (q: string) => void;
  openSession: (s: Session) => void;
  openBillDetail: (b: SaleLog, n: number) => void;
}) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const { theme } = useThemeStore();

  const selectedCalDate = useMemo((): Date | null => {
    if (billsDateFilter === 'All') return null;
    try {
      const d = new Date(billsDateFilter + ' ' + new Date().getFullYear());
      if (!isNaN(d.getTime())) return d;
    } catch { /* ignore */ }
    return null;
  }, [billsDateFilter]);

  const handleCalendarSelect = useCallback((d: Date) => {
    const day = d.getDate();
    const monthName = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
    setBillsDateFilter(`${day} ${monthName}`);
    setShowCalendar(false);
  }, [setBillsDateFilter]);

  return (
    <Modal animationType="slide" transparent={false} visible={visible} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#F9FAFB', paddingTop: insetTop }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#fff' }}>
          <TouchableOpacity onPress={onClose} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={22} color="#333" />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#111', flex: 1 }}>All Bills</Text>
        </View>

        <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingHorizontal: 16, paddingVertical: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 10 }}>
            <Ionicons name="search" size={15} color="#9CA3AF" style={{ marginRight: 6 }} />
            <TextInput
              style={{ flex: 1, fontSize: 13, fontWeight: '600', color: '#111', padding: 0 }}
              placeholder="Search by name or phone..."
              placeholderTextColor="#9CA3AF"
              value={billsSearchQuery}
              onChangeText={setBillsSearchQuery}
            />
            {billsSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setBillsSearchQuery('')}>
                <Ionicons name="close-circle" size={15} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              onPress={() => { setBillsDateFilter('All'); setShowCalendar(false); }}
              style={{
                paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14,
                backgroundColor: billsDateFilter === 'All' ? theme.colors.primary : '#F3F4F6',
                borderWidth: 1, borderColor: billsDateFilter === 'All' ? theme.colors.primary : '#E5E7EB',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: billsDateFilter === 'All' ? '#fff' : '#6B7280' }}>All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowCalendar(c => !c)}
              style={{
                flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14,
                backgroundColor: billsDateFilter !== 'All' ? theme.colors.primaryLight : '#F3F4F6',
                borderWidth: 1, borderColor: billsDateFilter !== 'All' ? theme.colors.primary : '#E5E7EB',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="calendar-outline" size={14} color={billsDateFilter !== 'All' ? theme.colors.primary : '#9CA3AF'} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: billsDateFilter !== 'All' ? theme.colors.primary : '#6B7280' }}>
                  {billsDateFilter !== 'All' ? billsDateFilter : 'Pick a date'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {billsDateFilter !== 'All' && (
                  <TouchableOpacity onPress={(e) => { e.stopPropagation?.(); setBillsDateFilter('All'); setShowCalendar(false); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={14} color={theme.colors.primary} />
                  </TouchableOpacity>
                )}
                <Ionicons name={showCalendar ? 'chevron-up' : 'chevron-down'} size={13} color={billsDateFilter !== 'All' ? theme.colors.primary : '#9CA3AF'} />
              </View>
            </TouchableOpacity>
          </View>
          {showCalendar && (
            <View style={{ marginTop: 10, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff', overflow: 'hidden' }}>
              <MiniCalendar
                selectedDate={selectedCalDate}
                onSelect={handleCalendarSelect}
                markedDates={new Set()}
              />
            </View>
          )}
        </View>

        <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '700' }}>BILLS</Text>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#111' }}>{filteredBills.length + (billsDateFilter === 'All' ? activeSessions.length : 0)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '700' }}>TOTAL</Text>
            <Text style={{ fontSize: 18, fontWeight: '900', color: theme.colors.primary }}>₹{filteredTotal.toLocaleString('en-IN')}</Text>
          </View>
          {billsDateFilter === 'All' && activeSessions.length > 0 && (
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '700' }}>PENDING</Text>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#F97316' }}>{activeSessions.length}</Text>
            </View>
          )}
        </View>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {billsDateFilter === 'All' && activeSessions.map((session) => (
            <TouchableOpacity
              key={session.id}
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#FED7AA' }}
              onPress={() => { onClose(); openSession(session); }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Ionicons name="time-outline" size={20} color="#F97316" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#111' }}>{session.customerName || 'Walk-in Customer'}</Text>
                <Text style={{ fontSize: 11, color: '#F97316', fontWeight: '600', marginTop: 2 }}>🔄 Pending · {session.items.length} item{session.items.length !== 1 ? 's' : ''}</Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#F97316' }}>
                ₹{session.items.reduce((s, i) => s + i.price * i.qty, 0).toLocaleString('en-IN')}
              </Text>
            </TouchableOpacity>
          ))}

          {filteredBills.length === 0 && (billsDateFilter !== 'All' || activeSessions.length === 0) ? (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Ionicons name="document-outline" size={48} color="#D1D5DB" />
              <Text style={{ marginTop: 12, fontSize: 14, color: '#9CA3AF', fontWeight: '600' }}>No bills {billsDateFilter !== 'All' ? `on ${billsDateFilter}` : 'yet'}</Text>
            </View>
          ) : filteredBills.map((bill, index) => (
            <TouchableOpacity
              key={`filtered-bill-${bill.id}-${index}`}
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E5E7EB' }}
              onPress={() => openBillDetail(bill, filteredBills.length - index)}
            >
              <View style={{ alignItems: 'center', gap: 6 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: theme.colors.primary }}>
                    {(bill.customerName || 'W').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)}
                  </Text>
                </View>
                {bill.paymentMode ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2, gap: 2, backgroundColor: bill.paymentMode === 'cash' ? 'rgba(16,185,129,0.35)' : 'rgba(139,92,246,0.35)', maxWidth: 52 }}>
                    <Ionicons name={bill.paymentMode === 'cash' ? 'cash-outline' : 'phone-portrait-outline'} size={9} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 8, fontWeight: '800', textTransform: 'uppercase' }}>{bill.paymentMode}</Text>
                  </View>
                ) : null}
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#111' }}>{bill.customerName || 'Walk-in Customer'}</Text>
                <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '500', marginTop: 2 }}>{bill.time} · {bill.date}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#22C55E' }}>₹{bill.total.toLocaleString('en-IN')}</Text>
                <Ionicons name="chevron-forward" size={14} color="#D1D5DB" style={{ marginTop: 4 }} />
              </View>
            </TouchableOpacity>
          ))}
          <View style={{ height: 30 }} />
        </ScrollView>
      </View>
    </Modal>
  );
});

// Main Home Screen Component
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const setSession = useAuthStore((state) => state.setSession);
  const { theme } = useThemeStore();

  const [bizName, setBizName] = useState('');
  const [bizLocation, setBizLocation] = useState('');
  const [editProfileModalVisible, setEditProfileModalVisible] = useState(false);
  const [editingBizName, setEditingBizName] = useState('');
  const [editingBizLocation, setEditingBizLocation] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [todayTotal, setTodayTotal] = useState(0);
  const [salesLog, setSalesLog] = useState<SaleLog[]>([]);
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [nextDue, setNextDue] = useState('');
  const [profileVisible, setProfileVisible] = useState(false);
  const [themePickerVisible, setThemePickerVisible] = useState(false);
  const [products, setProducts] = useState<{ name: string; price: number }[]>([]);
  const [trialStart, setTrialStart] = useState<Date | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [activeSessions, setActiveSessions] = useState<Session[]>([]);
  const [liveBillingVisible, setLiveBillingVisible] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [quickEntryVisible, setQuickEntryVisible] = useState(false);
  const [quickEntryPresetMode, setQuickEntryPresetMode] = useState<'cash' | 'upi' | null>(null);
  const [billReviewVisible, setBillReviewVisible] = useState(false);
  const [viewAllBillsVisible, setViewAllBillsVisible] = useState(false);
  const [reviewData, setReviewData] = useState<{
    customerName: string; customerPhone: string; items: BillItem[]; total: number; sessionId: number | null;
  }>({ customerName: '', customerPhone: '', items: [], total: 0, sessionId: null });
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'error' | 'success' | 'info'>('error');
  const [billDetailVisible, setBillDetailVisible] = useState(false);
  const [selectedBill, setSelectedBill] = useState<SaleLog | null>(null);
  const [selectedBillNumber, setSelectedBillNumber] = useState(0);
  const [pendingPaymentsVisible, setPendingPaymentsVisible] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [aiModalVisible, setAiModalVisible] = useState(false); 

  const openBillDetail = useCallback((bill: SaleLog, number: number) => {
    setSelectedBill(bill);
    setSelectedBillNumber(number);
    setBillDetailVisible(true);
  }, []);

  const handleDeleteBill = useCallback((bill: SaleLog) => {
    Alert.alert(
      'Delete Bill',
      `Delete bill for ${bill.customerName || 'Walk-in Customer'} (₹${bill.total})? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await DatabaseService.deleteSaleLog(bill.id);
              setSalesLog(prev => prev.filter(b => b.id !== bill.id));
              setTodayTotal(prev => prev - bill.total);
              setBillDetailVisible(false);
              setSelectedBill(null);
              showSuccess('Bill deleted');
            } catch (e) {
              showError('Failed to delete bill');
            }
          },
        },
      ]
    );
  }, []);

  const showSuccess = useCallback((msg: string) => {
    setToastMessage(msg);
    setToastType('success');
    setShowToast(true);
  }, []);

  const showError = useCallback((msg: string) => {
    setToastMessage(msg);
    setToastType('error');
    setShowToast(true);
  }, []);

  // Load business details from Supabase
  const loadBusinessDetails = useCallback(async () => {
    if (user?.id) {
      try {
        console.log('📋 Loading business details for user:', user.id);
        const { data, error } = await supabase
          .from('profiles')
          .select('business_name, city')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('❌ Error loading business details:', error);
          return;
        }

        if (data) {
          console.log('✅ Business details loaded:', data);
          setBizName(data.business_name || '');
          setBizLocation(data.city || '');
        } else {
          console.log('⚠️ No profile found, creating one...');
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email,
            });
          
          if (insertError) {
            console.error('❌ Failed to create profile:', insertError);
          }
        }
      } catch (err) {
        console.error('Error in loadBusinessDetails:', err);
      }
    }
  }, [user?.id, user?.email]);

  // Open edit profile modal
  const openEditProfile = () => {
    setEditingBizName(bizName);
    setEditingBizLocation(bizLocation);
    setEditProfileModalVisible(true);
  };

  // Save profile changes to Supabase
  const saveProfileChanges = async () => {
    if (!editingBizName.trim() || !editingBizLocation.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user?.id,
          business_name: editingBizName.trim(),
          city: editingBizLocation.trim(),
        });

      if (error) {
        console.error('❌ Error saving profile:', error);
        Alert.alert('Error', 'Failed to save profile changes');
        setIsSavingProfile(false);
        return;
      }

      console.log('✅ Profile saved successfully');
      setBizName(editingBizName.trim());
      setBizLocation(editingBizLocation.trim());
      setEditProfileModalVisible(false);
      setIsSavingProfile(false);
    } catch (err) {
      console.error('Error saving profile:', err);
      Alert.alert('Error', 'An unexpected error occurred');
      setIsSavingProfile(false);
    }
  };

const loadData = useCallback(async () => {
  try {
    const storedTrialStart = await AsyncStorage.getItem('trialStart');
    const storedSubscribed = await AsyncStorage.getItem('isSubscribed');

    if (storedTrialStart) {
      setTrialStart(new Date(storedTrialStart));
    }

    if (storedSubscribed === 'true') {
      setIsSubscribed(true);
    }

    if (!storedTrialStart) {
      const now = new Date();
      await AsyncStorage.setItem('trialStart', now.toISOString());
      setTrialStart(now);
    }

    const storedProducts = await DatabaseService.loadProducts();

    if (Array.isArray(storedProducts)) {
      setProducts(
        storedProducts.map((p: any) => ({
          name: p.name,
          price: p.price,
        }))
      );
    }

    const parsed = await DatabaseService.loadSalesLog();

    if (Array.isArray(parsed)) {
      const now = new Date();
      const months = [
        'Jan','Feb','Mar','Apr','May','Jun',
        'Jul','Aug','Sep','Oct','Nov','Dec'
      ];

      const todayDateStr = `${now.getDate()} ${months[now.getMonth()]}`;

      const todaysBills = parsed.filter(
        (bill: SaleLog) => bill.date === todayDateStr
      );

      setSalesLog(todaysBills);

      setTodayTotal(
        todaysBills.reduce(
          (sum: number, bill: SaleLog) => sum + bill.total,
          0
        )
      );
    }

    setActiveSessions([...RAM_SESSIONS]);

  } catch (e) {
    console.error('loadData error:', e);
  }
}, []);

  const updateDateTime = useCallback(() => {
    const now = new Date();
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    setCurrentDateTime(
      `Sankalp · ${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} · ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
    );
    const nm = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    setNextDue(`${nm.getDate()} ${months[nm.getMonth()]}`);
  }, []);

  const getTrialDaysLeft = useCallback((): number => {
    if (!trialStart) return 7;
    const msPerDay = 1000 * 60 * 60 * 24;
    const elapsed = Math.floor((Date.now() - trialStart.getTime()) / msPerDay);
    return Math.max(0, 7 - elapsed);
  }, [trialStart]);

  const isTrialActive = useCallback((): boolean => getTrialDaysLeft() > 0, [getTrialDaysLeft]);

  const getSubscriptionStatus = useCallback(() => {
    if (isSubscribed) return { label: 'Pro — Active', color: '#16A34A', bg: '#DCFCE7', icon: 'checkmark-circle' as const };
    if (isTrialActive()) return { label: `Free Trial — ${getTrialDaysLeft()} day${getTrialDaysLeft() !== 1 ? 's' : ''} left`, color: '#D97706', bg: '#FEF3C7', icon: 'time-outline' as const };
    return { label: 'Trial Expired', color: '#DC2626', bg: '#FEE2E2', icon: 'close-circle' as const };
  }, [isSubscribed, isTrialActive, getTrialDaysLeft]);

  // Handle logout
  const handleLogout = useCallback(async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout from Sankalp?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              setProfileVisible(false);
              RAM_SESSIONS = [];
              await AsyncStorage.multiRemove(['trialStart', 'isSubscribed', 'supabase_session', 'salesLog']);
              const { error } = await supabase.auth.signOut();
              if (error) console.error('Supabase sign out error:', error);
              // Don't manually navigate - let the auth state change trigger navigation
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
  }, [router, setUser, setSession]);

  // Initialize data on mount
  useEffect(() => {
    loadData();
    loadBusinessDetails();
    updateDateTime();
    const interval = setInterval(updateDateTime, 30000);

    // Load pending payments summary
    if (user?.id) {
      supabase.from('pending_payments').select('amount').eq('user_id', user.id).then(({ data }) => {
        if (data) {
          setPendingCount(data.length);
          setPendingTotal(data.reduce((s: number, r: any) => s + Number(r.amount), 0));
        }
      });
    }

    return () => clearInterval(interval);
  }, [loadData, loadBusinessDetails, updateDateTime, user?.id]);

  // Reload products every time the home tab comes into focus
  useFocusEffect(
    useCallback(() => {
      DatabaseService.loadProducts().then((storedProducts) => {
        if (Array.isArray(storedProducts)) {
          setProducts(
            storedProducts.map((p: any) => ({ name: p.name, price: p.price }))
          );
        }
      });
    }, [])
  );

  const startNewBilling = useCallback(() => {
    setEditingSession(null);
    setLiveBillingVisible(true);
  }, []);

  const openSession = useCallback((session: Session) => {
    setEditingSession(session);
    setLiveBillingVisible(true);
  }, []);

  const deleteActiveOrder = useCallback((sessionId: number) => {
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
  }, [showSuccess]);

  const handleSaveAndBack = useCallback((customerName: string, phone: string, items: BillItem[]) => {
    if (editingSession) {
      RAM_SESSIONS = RAM_SESSIONS.map(s =>
        s.id === editingSession.id ? { ...s, customerName, phone, items } : s
      );
    } else {
      RAM_SESSIONS = [...RAM_SESSIONS, { id: Date.now(), customerName, phone, items }];
    }
    setActiveSessions([...RAM_SESSIONS]);
    setLiveBillingVisible(false);
    setEditingSession(null);
    showSuccess('Order saved! Tap the card to continue.');
  }, [editingSession, showSuccess]);

  const handleComplete = useCallback((customerName: string, phone: string, items: BillItem[]) => {
    const total = items.reduce((s, i) => s + i.price * i.qty, 0);
    setReviewData({ customerName, customerPhone: phone, items, total, sessionId: editingSession?.id ?? null });
    setLiveBillingVisible(false);
    setBillReviewVisible(true);
  }, [editingSession?.id]);

  const handleConfirmBill = useCallback(async (paymentMode: 'cash' | 'upi') => {
  const now = new Date();
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const newBill: SaleLog = {
    id: Date.now() + Math.floor(Math.random() * 10000),
    total: reviewData.total,
    time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    date: `${now.getDate()} ${months[now.getMonth()]}`,
    items: reviewData.items,
    customerName: reviewData.customerName,
    phone: reviewData.customerPhone || '',
    paymentMode,
  };
  
  try {
    console.log('💰 Saving bill:', newBill);
    
    await DatabaseService.addSaleLog(newBill, salesLog);
    
    const updatedBills = [newBill, ...salesLog];
    setSalesLog(updatedBills);
    setTodayTotal(prev => prev + reviewData.total);

    if (reviewData.sessionId) {
      RAM_SESSIONS = RAM_SESSIONS.filter(s => s.id !== reviewData.sessionId);
      setActiveSessions([...RAM_SESSIONS]);
    }

    setBillReviewVisible(false);
    setEditingSession(null);
    setReviewData({ customerName: '', customerPhone: '', items: [], total: 0, sessionId: null });
    showSuccess(`Bill saved! ₹${newBill.total}`);
  } catch (error) {
    console.error('Failed to save bill:', error);
    showError('Failed to save bill. Please try again.');
  }
}, [reviewData, salesLog, showSuccess, showError]);

  const handleQuickEntrySave = useCallback(async (name: string, phone: string, amount: number, note: string, paymentMode: 'cash' | 'upi') => {
    const now = new Date();
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const newBill: SaleLog = {
      id: Date.now() + Math.floor(Math.random() * 10000),
      total: amount,
      time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      date: `${now.getDate()} ${months[now.getMonth()]}`,
      items: [{ name: note || 'Quick Bill', price: amount, qty: 1 }],
      customerName: name,
      phone,
      paymentMode,
    };
    const updated = [newBill, ...salesLog];
    setSalesLog(updated);
    await DatabaseService.addSaleLog(newBill, salesLog);
    setTodayTotal(prev => prev + amount);
    setQuickEntryVisible(false);
    showSuccess(`₹${amount} saved!`);
  }, [salesLog, showSuccess]);

  const CARD_COLORS = useRef([
    { bg: '#EEF2FF', border: '#2563EB', badgeBg: '#2563EB', amtColor: '#2563EB' },
    { bg: '#F5F3FF', border: '#7C3AED', badgeBg: '#7C3AED', amtColor: '#7C3AED' },
    { bg: '#FFF7ED', border: '#F59E0B', badgeBg: '#F59E0B', amtColor: '#F59E0B' },
  ]).current;

  const subStatus = getSubscriptionStatus();

  // View All Bills Modal state
  const [billsDateFilter, setBillsDateFilter] = useState<string>('All');
  const [billsSearchQuery, setBillsSearchQuery] = useState<string>('');

  const filteredBills = useMemo(() => {
    let bills = billsDateFilter === 'All' ? salesLog : salesLog.filter(b => b.date === billsDateFilter);
    if (billsSearchQuery.trim()) {
      const q = billsSearchQuery.toLowerCase();
      bills = bills.filter(b => (b.customerName || '').toLowerCase().includes(q) || (b.phone || '').includes(q));
    }
    return bills;
  }, [salesLog, billsDateFilter, billsSearchQuery]);

  const filteredTotal = useMemo(() => filteredBills.reduce((s, b) => s + b.total, 0), [filteredBills]);
  const [subscriptionModalVisible, setSubscriptionModalVisible] = useState(false);


  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Toast visible={showToast} message={toastMessage} type={toastType} onHide={() => setShowToast(false)} />
      <ProfileModal
        visible={profileVisible}
        bizName={bizName}
        bizLocation={bizLocation}
        userEmail={user?.email || ''}
        subStatus={subStatus}
        isSubscribed={isSubscribed}
        isTrialActive={isTrialActive()}
        nextDue={nextDue}
        pendingCount={pendingCount}
        pendingTotal={pendingTotal}
        theme={theme}
        onClose={() => setProfileVisible(false)}
        onEditProfile={() => {
          setProfileVisible(false);
          setTimeout(() => openEditProfile(), 300);
        }}
        onLogout={handleLogout}
        onUpgrade={() => {
          setProfileVisible(false);
          setTimeout(() => setSubscriptionModalVisible(true), 300);
        }}
        onPendingPayments={() => {
          setProfileVisible(false);
          setTimeout(() => setPendingPaymentsVisible(true), 300);
        }}
        onChooseTheme={() => {
          setProfileVisible(false);
          setTimeout(() => setThemePickerVisible(true), 300);
        }}
      />
      <ThemePickerModal
        visible={themePickerVisible}
        onClose={() => setThemePickerVisible(false)}
      />
      <EditProfileModal
        visible={editProfileModalVisible}
        editingBizName={editingBizName}
        editingBizLocation={editingBizLocation}
        isSavingProfile={isSavingProfile}
        onChangeName={setEditingBizName}
        onChangeLocation={setEditingBizLocation}
        onSave={saveProfileChanges}
        onClose={() => setEditProfileModalVisible(false)}
      />
      <BillDetailModal
        visible={billDetailVisible}
        bill={selectedBill}
        billNumber={selectedBillNumber}
        onClose={() => setBillDetailVisible(false)}
        onDelete={handleDeleteBill}
        theme={theme}
      />
      <PendingPaymentsModal
        visible={pendingPaymentsVisible}
        userId={user?.id || ''}
        onClose={() => {
          setPendingPaymentsVisible(false);
          if (user?.id) {
            supabase.from('pending_payments').select('amount').eq('user_id', user.id).then(({ data }) => {
              if (data) { setPendingCount(data.length); setPendingTotal(data.reduce((s: number, r: any) => s + Number(r.amount), 0)); }
            });
          }
        }}
        theme={theme}
      />
      
        <SubscriptionModal
            visible={subscriptionModalVisible}
            onClose={() => setSubscriptionModalVisible(false)}
            onSuccess={() => {
              // Handle successful subscription
              setIsSubscribed(true);
              setSubscriptionModalVisible(false);
              showSuccess('Thank you for subscribing to Sankalp Pro! 🎉');
            }}
            userId={user?.id || ''}
            isTrialActive={isTrialActive()}
            trialDaysLeft={getTrialDaysLeft()}
          />

          {/* Sankalp AI Modal */}
          <SankalpAIModal 
            visible={aiModalVisible} 
            onClose={() => setAiModalVisible(false)} 
          />

      <LiveBillingModal
        visible={liveBillingVisible}
        onClose={() => { setLiveBillingVisible(false); }}
        onSaveAndBack={handleSaveAndBack}
        onComplete={handleComplete}
        session={editingSession}
        products={products}
        theme={theme}
      />

      <QuickEntryModal
        visible={quickEntryVisible}
        onClose={() => { setQuickEntryVisible(false); setQuickEntryPresetMode(null); }}
        onSave={handleQuickEntrySave}
        theme={theme}
        presetMode={quickEntryPresetMode}
      />

      <ReviewBillModal
        visible={billReviewVisible}
        onClose={() => { 
          // Update editingSession with current reviewData before opening editor
          if (editingSession) {
            setEditingSession({ 
              ...editingSession, 
              customerName: reviewData.customerName, 
              phone: reviewData.customerPhone, 
              items: reviewData.items 
            });
          } else {
            setEditingSession({
              id: Date.now(),
              customerName: reviewData.customerName,
              phone: reviewData.customerPhone,
              items: reviewData.items,
              npVal: '0'
            });
          }
          setBillReviewVisible(false); 
          setLiveBillingVisible(true); 
        }}
        onConfirm={handleConfirmBill}
        customerName={reviewData.customerName}
        customerPhone={reviewData.customerPhone}
        items={reviewData.items}
        total={reviewData.total}
        theme={theme}
      />

      <ViewAllBillsModal
        visible={viewAllBillsVisible}
        onClose={() => setViewAllBillsVisible(false)}
        insetTop={insets.top}
        activeSessions={activeSessions}
        filteredBills={filteredBills}
        filteredTotal={filteredTotal}
        billsDateFilter={billsDateFilter}
        setBillsDateFilter={setBillsDateFilter}
        billsSearchQuery={billsSearchQuery}
        setBillsSearchQuery={setBillsSearchQuery}
        openSession={openSession}
        openBillDetail={openBillDetail}
      />

      {/* Header - Redesigned with compact collection card */}
      {/* Header - Redesigned with AI button */}
<LinearGradient
  colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
  style={[styles.header, { paddingTop: insets.top + 10, paddingBottom: 12 }]}
>
  <View style={styles.headerTop}>
    <View>
      <Text style={styles.shopName}>{bizName || 'Sankalp'}</Text>
      <Text style={styles.shopDateTime}>{currentDateTime}</Text>
    </View>
    <View style={styles.headerRightButtons}>
      {/* Sankalp AI Button */}
      <TouchableOpacity 
        style={styles.aiHeaderBtn} 
        onPress={() => setAiModalVisible(true)}
      >
        <LinearGradient
          colors={['#8B5CF6', '#6366F1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.aiGradient}
        >
          <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
          <Text style={styles.aiBtnText}>AI</Text>
        </LinearGradient>
      </TouchableOpacity>
      
      {/* Profile Button */}
      <TouchableOpacity 
        style={styles.profileBtn} 
        onPress={() => setProfileVisible(true)}
      >
        <Text style={styles.headerProfileLetter}>
          {user?.email?.charAt(0).toUpperCase() || 'S'}
        </Text>
      </TouchableOpacity>
    </View>
  </View>

  {/* Compact Collection Card */}
  <View style={[styles.collectionCard, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
    <View style={styles.collectionRow}>
      <View>
        <Text style={styles.collectionLabel}>TODAY'S COLLECTION</Text>
        <Text style={styles.collectionValue}>₹{todayTotal.toLocaleString('en-IN')}</Text>
      </View>
      <View style={styles.billsCountBadge}>
        <Ionicons name="receipt-outline" size={14} color="#fff" />
        <Text style={styles.billsCountText}>{salesLog.length} bill{salesLog.length !== 1 ? 's' : ''}</Text>
      </View>
    </View>
  </View>
</LinearGradient>

      {/* Quick Actions */}
      <View style={styles.quickActionsContainer}>
        <Text style={[styles.quickActionsTitle, { color: theme.colors.textPrimary }]}>Quick Actions</Text>
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={[styles.qaBtn, { backgroundColor: theme.colors.primary }]}
            onPress={startNewBilling}
          >
            <View style={styles.quickActionHorizontal}>
              <View style={styles.quickActionSmallIcon}>
                <Ionicons name="document-text-outline" size={20} color="#fff" />
              </View>
              <Text style={styles.quickActionMainText}>New Bill</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.qaBtn, { backgroundColor: theme.colors.secondary }]}
            onPress={() => setQuickEntryVisible(true)}
          >
            <View style={styles.quickActionHorizontal}>
              <View style={styles.quickActionSmallIcon}>
                <Ionicons name="flash" size={20} color="#fff" />
              </View>
              <Text style={styles.quickActionMainText}>Quick Bill</Text>
            </View>
          </TouchableOpacity>
        </View>

      </View>
      

      {/* Today's Bills Header */}
      <View style={styles.billsHeaderContainer}>
        <View style={styles.sectionRow}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Today's Bills</Text>
          <TouchableOpacity onPress={() => setViewAllBillsVisible(true)}>
            <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>View All</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {activeSessions.length === 0 && salesLog.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No sales yet today</Text>
          </View>
        ) : (
          <>
            {activeSessions.map((session, idx) => (
              <SwipeableOrderButton
                key={session.id}
                session={session}
                idx={idx}
                CARD_COLORS={CARD_COLORS}
                onPress={() => openSession(session)}
                onDelete={() => deleteActiveOrder(session.id)}
                theme={theme}
              />
            ))}

            {salesLog.map((bill, index) => (
              <TouchableOpacity
                key={`bill-${bill.id}-${index}`}
                style={[styles.billCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                onPress={() => openBillDetail(bill, salesLog.length - index)}
              >
                <View style={{ alignItems: 'center', gap: 6 }}>
                  <View style={[styles.billAvatarBox, { backgroundColor: `${theme.colors.primary}20` }]}>
                    <Text style={[styles.billAvatarText, { color: theme.colors.primary }]}>
                      {bill.customerName.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2)}
                    </Text>
                  </View>
                  {bill.paymentMode && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6, backgroundColor: bill.paymentMode === 'cash' ? 'rgba(16,185,129,0.35)' : 'rgba(139,92,246,0.35)', maxWidth: 52 }}>
                      <Ionicons name={bill.paymentMode === 'cash' ? 'cash-outline' : 'phone-portrait-outline'} size={9} color="#fff" />
                      <Text style={{ fontSize: 8, fontWeight: '800', color: '#fff', textTransform: 'uppercase' }}>{bill.paymentMode}</Text>
                    </View>
                  )}
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.billCustomer, { color: theme.colors.textPrimary }]}>{bill.customerName}</Text>
                  <Text style={[styles.billTime, { marginTop: 4 }]}>{bill.time} · {bill.date}</Text>
                </View>
                <View style={styles.billRight}>
                  <Text style={[styles.billAmount, { color: theme.colors.primary }]}>₹{bill.total.toLocaleString('en-IN')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#bbb" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            ))}
          </>
        )}
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: { flex: 1 },
  // Add these inside the styles object
headerRightButtons: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
},
aiHeaderBtn: {
  borderRadius: 24,
  overflow: 'hidden',
  elevation: 2,
  shadowColor: '#8B5CF6',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 4,
},
aiGradient: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 12,
  paddingVertical: 8,
  gap: 4,
},
aiBtnText: {
  color: '#fff',
  fontSize: 12,
  fontWeight: '700',
  letterSpacing: 0.5,
},
  header: { paddingHorizontal: 16, paddingBottom: 12 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  shopName: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  shopDateTime: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '600', marginTop: 2 },
  profileBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerProfileLetter: { color: '#fff', fontSize: 16, fontWeight: '900' },
  collectionCard: { borderRadius: 16, padding: 14 },
  collectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  collectionLabel: { fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  collectionValue: { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: -1, marginTop: 2 },
  billsCountBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 5 },
  billsCountText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  body: { flex: 1, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 20 },
  quickActionsContainer: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  billsHeaderContainer: { paddingHorizontal: 16, paddingVertical: 6 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  viewAllText: { fontSize: 13, fontWeight: '700' },
  activeOrderButton: { borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4 },
  aoLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  aoIconBox: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  aoBadge: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  aoCustomerName: { fontSize: 15, fontWeight: '800', color: '#fff', marginTop: 3 },
  aoItemCount: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  aoTotal: { fontSize: 16, fontWeight: '900', color: '#fff' },
  deleteButton: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 60, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EF4444', borderRadius: 14 },
  quickActionsTitle: { fontSize: 16, fontWeight: '800', marginBottom: 10, marginTop: 6 },
  quickActionsRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  qaBtn: { flex: 1, height: 70, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4 },
  quickActionHorizontal: { flexDirection: 'row', alignItems: 'center', width: '85%' },
  quickActionSmallIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  quickActionMainText: { fontSize: 14, fontWeight: '800', color: '#fff', flexShrink: 1 },
  billCard: { borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 0.5, elevation: 1 },
  billAvatarBox: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  billAvatarText: { fontSize: 14, fontWeight: '800' },
  billCustomer: { fontSize: 18, fontWeight: '900' },
  billTime: { fontSize: 11, color: '#9CA3AF', marginTop: 4, fontWeight: '600' },
  billRight: { alignItems: 'flex-end' },
  billAmount: { fontSize: 24, fontWeight: '900' },
  emptyState: { alignItems: 'center', paddingVertical: 30 },
  emptyText: { color: '#bbb', fontSize: 13, fontWeight: '600' },
  
  // Live Billing Modal Styles
  liveBillingHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  lbBackBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  lbCloseBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  liveBillingTitle: { fontSize: 18, fontWeight: '900', color: '#111' },
  liveBillingSub: { fontSize: 12, color: '#9CA3AF', fontWeight: '600', marginTop: 1 },
  liveBillingContent: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  customerSection: { marginBottom: 20 },
  lbInputBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 2 },
  lbInput: { flex: 1, padding: 12, fontSize: 14, fontWeight: '600', color: '#333' },
  addItemsSection: { marginBottom: 12 },
  addItemsTitle: { fontSize: 15, fontWeight: '800', color: '#111', marginBottom: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 12, marginBottom: 10 },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 14, color: '#333', fontWeight: '600' },
  productRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0' },
  productName: { fontSize: 14, fontWeight: '700', color: '#111' },
  productPrice: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: 10, marginRight: 12 },
  qtyBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: 14, fontWeight: '800', color: '#111', minWidth: 18, textAlign: 'center' },
  lineTotal: { fontSize: 13, fontWeight: '800', minWidth: 55, textAlign: 'right' },
  billSummaryBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#EEF2FF', paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#D1D5DB' },
  summaryLeft: { flexDirection: 'row', alignItems: 'center' },
  summaryItemsLabel: { fontSize: 11, color: '#555', fontWeight: '600' },
  summaryItemsValue: { fontSize: 13, fontWeight: '800', marginTop: 2 },
  summaryRight: { alignItems: 'flex-end' },
  summaryTotalLabel: { fontSize: 11, color: '#555', fontWeight: '600' },
  summaryTotalValue: { fontSize: 22, fontWeight: '900', color: '#111', marginTop: 2 },
  lbBottomButtons: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, gap: 12, backgroundColor: '#fff' },
  saveGoBackBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderRadius: 12, paddingVertical: 13 },
  saveGoBackText: { fontSize: 14, fontWeight: '800' },
  completeBillBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 13, elevation: 2 },
  completeBillText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  
  // Quick Entry Modal Styles
  qeFastBadge: { borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 24, backgroundColor: '#F5F3FF' },
  qeIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  qeFastTitle: { fontSize: 15, fontWeight: '800' },
  qeFastSub: { fontSize: 12, fontWeight: '600', marginTop: 2, color: '#7C3AED' },
  qeLabel: { fontSize: 13, fontWeight: '700', color: '#111', marginBottom: 8 },
  qeBottomBar: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: '#fff' },
  qeSaveBtn: { borderRadius: 14, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', elevation: 3 },
  qeSaveBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  
  // Profile Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  profilePanel: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  profileHandle: { width: 40, height: 4, backgroundColor: '#eee', borderRadius: 4, alignSelf: 'center', marginBottom: 20 },
  profileHeader: { alignItems: 'center', marginBottom: 20 },
  profileAvatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  profileAvatarText: { fontSize: 26, fontWeight: '900', color: '#fff' },
  profileBizName: { fontSize: 20, fontWeight: '900', color: '#111', textAlign: 'center' },
  profileBizTypeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginTop: 6, gap: 4 },
  profileBizTypeText: { fontSize: 12, fontWeight: '700', color: '#2563EB' },
  profileSection: { marginBottom: 18 },
  profileSectionLabel: { fontSize: 10, fontWeight: '800', color: '#9CA3AF', letterSpacing: 0.8, marginBottom: 8, textTransform: 'uppercase' },
  profileRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#F3F4F6' },
  profileRowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  profileRowLabel: { fontSize: 10, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.4 },
  profileRowValue: { fontSize: 14, fontWeight: '700', color: '#111', marginTop: 2 },
  subStatusCard: { borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1 },
  subStatusLabel: { fontSize: 14, fontWeight: '800' },
  subStatusNote: { fontSize: 12, color: '#6B7280', fontWeight: '500', lineHeight: 18 },
  upgradeBtn: { borderRadius: 12, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 4, elevation: 2 },
  upgradeBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#FEE2E2', backgroundColor: '#FFF5F5', borderRadius: 12, paddingVertical: 13, marginTop: 6 },
  logoutBtnText: { color: '#DC2626', fontSize: 14, fontWeight: '800' },
  
  // Review Bill Modal Styles
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
  reviewBillItemAmount: { fontSize: 14, fontWeight: '900' },
  reviewBillTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 2, borderTopColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  reviewBillTotalLabel: { fontSize: 14, fontWeight: '800', color: '#666' },
  reviewBillTotalAmount: { fontSize: 18, fontWeight: '900' },
  reviewBillButtons: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  reviewBillBackBtn: { flex: 1, paddingVertical: 12, borderWidth: 2, borderRadius: 10, alignItems: 'center' },
  reviewBillBackBtnText: { fontWeight: '800', fontSize: 14 },
  reviewBillDoneBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  reviewBillDoneBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  
  // Toast
  toastContainer: { position: 'absolute', bottom: 100, left: 20, right: 20, padding: 12, borderRadius: 10, alignItems: 'center', zIndex: 9999 },
  toastText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  
  // Edit Profile
  editProfileBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#EEF2FF', borderRadius: 8, gap: 4 },
  editProfileBtnText: { fontSize: 12, fontWeight: '700', color: '#2563EB' },
  editProfileForm: { paddingHorizontal: 6 },
  formGroup: { marginBottom: 18 },
  formLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  formInputBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 12, height: 50 },
  formInput: { flex: 1, fontSize: 14, fontWeight: '600', color: '#333', height: 50, paddingVertical: 0 },
  saveProfileBtn: { padding: 15, borderRadius: 14, alignItems: 'center', marginTop: 10, backgroundColor: '#4F46E5' },
  saveProfileBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  
  // Profile redesign styles
  profileHeaderNew: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 14 },
  profileAvatarNew: { width: 58, height: 58, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  profileNameNew: { fontSize: 17, fontWeight: '900', color: '#111' },
  profileMetaNew: { fontSize: 12, color: '#9CA3AF', fontWeight: '600', marginLeft: 3 },
  subBadgeNew: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 5, alignSelf: 'flex-start' },
  subBadgeText: { fontSize: 11, fontWeight: '700' },
  editIconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statBox: { flex: 1, borderRadius: 12, borderWidth: 1.5, backgroundColor: '#F9FAFB', padding: 12, alignItems: 'flex-start', gap: 2 },
  statLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
  statValue: { fontSize: 13, fontWeight: '800', color: '#111' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderRadius: 12, paddingHorizontal: 4, marginBottom: 2 },
  menuItemIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  menuItemTitle: { fontSize: 14, fontWeight: '700', color: '#111' },
  menuItemSub: { fontSize: 12, color: '#9CA3AF', fontWeight: '500', marginTop: 2 },
  menuBadge: { backgroundColor: '#FEF3C7', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, marginRight: 4 },
  menuBadgeText: { fontSize: 11, fontWeight: '800', color: '#D97706' },
  
  // Pending Payments styles
  ppHeader: { paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center' },
  ppHeaderTitle: { fontSize: 18, fontWeight: '900', color: '#fff' },
  ppHeaderSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600', marginTop: 2 },
  ppBackBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  ppAddBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  ppCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB', elevation: 1 },
  ppCardLeft: {},
  ppAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' },
  ppAvatarText: { fontSize: 16, fontWeight: '900', color: '#D97706' },
  ppName: { fontSize: 15, fontWeight: '800', color: '#111' },
  ppPhone: { fontSize: 12, color: '#9CA3AF', fontWeight: '500', marginLeft: 3 },
  ppNotes: { fontSize: 12, color: '#6B7280', fontWeight: '500', marginTop: 3, fontStyle: 'italic' },
  ppDate: { fontSize: 11, color: '#D1D5DB', fontWeight: '600', marginTop: 4 },
  ppAmount: { fontSize: 17, fontWeight: '900', color: '#D97706' },
  ppDeleteBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 3 },
  ppDeleteText: { fontSize: 11, color: '#10B981', fontWeight: '700' },
});