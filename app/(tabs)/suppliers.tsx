import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Types
interface Bill {
  id: number;
  name: string;
  date: string;
  amount: number;
  paid: number;
}

interface Transaction {
  id: number;
  date: string;
  type: 'bill' | 'payment';
  billId: number;
  billName: string;
  amount: number;
}

interface Supplier {
  id: number;
  name: string;
  category: string;
  bills: Bill[];
  transactions: Transaction[];
}

// Helper functions
const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

const getPending = (supplier: Supplier) => {
  const bills = supplier.bills || [];
  return bills.reduce((sum, bill) => sum + (bill.amount - bill.paid), 0);
};

const getAvatarColor = (id: number) => {
  const colors = [
    '#6366F1','#0EA5E9','#F59E0B','#10B981','#EF4444',
    '#8B5CF6','#EC4899','#14B8A6','#F97316','#84CC16',
  ];
  return colors[id % colors.length];
};

const getInitials = (name: string) =>
  name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();

const todayStr = () => {
  const d = new Date();
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

// Supplier Detail Screen Component (inline)
const SupplierDetailScreen = ({ 
  supplier, 
  onBack, 
  onUpdate 
}: { 
  supplier: Supplier; 
  onBack: () => void; 
  onUpdate: (updated: Supplier) => void;
}) => {
  const insets = useSafeAreaInsets();
  const [billModal, setBillModal] = useState(false);
  const [payModal, setPayModal] = useState(false);
  const [billForm, setBillForm] = useState({ name: '', amount: '' });
  const [payForm, setPayForm] = useState({ billId: 0, amount: '' });

  const totalPending = getPending(supplier);
  const accentColor = getAvatarColor(supplier.id);
  const pendingBills = supplier.bills.filter((b) => b.amount - b.paid > 0);

  // History sections (date-grouped)
  const historySections = (() => {
    const sorted = [...supplier.transactions].sort((a, b) => b.id - a.id);
    const groups: Record<string, Transaction[]> = {};
    sorted.forEach((tx) => {
      if (!groups[tx.date]) groups[tx.date] = [];
      groups[tx.date].push(tx);
    });
    return Object.entries(groups).map(([title, data]) => ({ title, data }));
  })();

  const addBill = () => {
    const amount = parseFloat(billForm.amount);
    if (!billForm.name.trim() || isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Enter bill name and valid amount');
      return;
    }

    const newBill: Bill = {
      id: Date.now(),
      name: billForm.name.trim(),
      date: todayStr(),
      amount,
      paid: 0,
    };

    const newTx: Transaction = {
      id: Date.now() + 1,
      date: todayStr(),
      type: 'bill',
      billId: newBill.id,
      billName: newBill.name,
      amount,
    };

    const updatedSupplier = {
      ...supplier,
      bills: [...supplier.bills, newBill],
      transactions: [...supplier.transactions, newTx],
    };
    onUpdate(updatedSupplier);
    setBillForm({ name: '', amount: '' });
    setBillModal(false);
  };

  const recordPayment = () => {
    const amount = parseFloat(payForm.amount);
    if (!payForm.billId || isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Select a bill and enter valid amount');
      return;
    }

    const bill = supplier.bills.find((b) => b.id === payForm.billId);
    if (!bill) return;

    const maxPay = bill.amount - bill.paid;
    if (amount > maxPay) {
      Alert.alert('Error', `Max payable for this bill: ${fmt(maxPay)}`);
      return;
    }

    const newTx: Transaction = {
      id: Date.now(),
      date: todayStr(),
      type: 'payment',
      billId: bill.id,
      billName: bill.name,
      amount,
    };

    const updatedBills = supplier.bills.map((b) =>
      b.id === payForm.billId ? { ...b, paid: b.paid + amount } : b
    );

    const updatedSupplier = {
      ...supplier,
      bills: updatedBills,
      transactions: [...supplier.transactions, newTx],
    };
    onUpdate(updatedSupplier);
    setPayForm({ billId: 0, amount: '' });
    setPayModal(false);
    Alert.alert('✅ Payment recorded', `${fmt(amount)} paid towards "${bill.name}"`);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* AppBar */}
      <View style={styles.appBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.appBarCenter}>
          <View style={[styles.appBarAvatar, { backgroundColor: accentColor + '22' }]}>
            <Text style={[styles.appBarAvatarText, { color: accentColor }]}>
              {getInitials(supplier.name)}
            </Text>
          </View>
          <View>
            <Text style={styles.appBarName}>{supplier.name}</Text>
            <Text style={styles.appBarCategory}>{supplier.category}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Summary Card - Pending Amount Only */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>PENDING</Text>
          <Text style={[styles.summaryAmount, totalPending === 0 && { color: '#16A34A' }]}>
            {totalPending === 0 ? 'All Clear ✅' : fmt(totalPending)}
          </Text>
        </View>

        {/* Bills Section */}
        {supplier.bills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bills</Text>
            {supplier.bills.map((bill) => {
              const remaining = bill.amount - bill.paid;
              const progress = bill.amount > 0 ? bill.paid / bill.amount : 1;
              const isCleared = remaining <= 0;
              return (
                <View key={bill.id} style={styles.billCard}>
                  <View style={styles.billHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.billName}>{bill.name}</Text>
                      <Text style={styles.billDate}>{bill.date}</Text>
                    </View>
                    {isCleared ? (
                      <View style={styles.clearedPill}>
                        <Text style={styles.clearedPillText}>Cleared</Text>
                      </View>
                    ) : (
                      <View>
                        <Text style={styles.billRemaining}>{fmt(remaining)}</Text>
                        <Text style={styles.billRemainingLabel}>remaining</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.round(progress * 100)}%` as any,
                          backgroundColor: isCleared ? '#16A34A' : '#2563EB',
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.billMeta}>
                    <View style={styles.billMetaCell}>
                      <Text style={styles.billMetaLabel}>Total Bill</Text>
                      <Text style={styles.billMetaValue}>{fmt(bill.amount)}</Text>
                    </View>
                    <View style={[styles.billMetaCell, { alignItems: 'center' }]}>
                      <Text style={styles.billMetaLabel}>Paid</Text>
                      <Text style={[styles.billMetaValue, { color: '#16A34A' }]}>
                        {fmt(bill.paid)}
                      </Text>
                    </View>
                    <View style={[styles.billMetaCell, { alignItems: 'flex-end' }]}>
                      <Text style={styles.billMetaLabel}>Pending</Text>
                      <Text
                        style={[
                          styles.billMetaValue,
                          { color: isCleared ? '#16A34A' : '#EF4444' },
                        ]}
                      >
                        {fmt(remaining)}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {supplier.bills.length === 0 && (
          <View style={styles.emptyBills}>
            <Text style={styles.emptyIcon}>🧾</Text>
            <Text style={styles.emptyTitle}>No bills added</Text>
            <Text style={styles.emptySub}>Tap "Add Bill" to start tracking</Text>
          </View>
        )}

        {/* History Section */}
        {historySections.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>History</Text>
            <View style={styles.historyContainer}>
              {historySections.map((section) => (
                <View key={section.title}>
                  <Text style={styles.historyDate}>{section.title}</Text>
                  {section.data.map((tx, index) => (
                    <View
                      key={tx.id}
                      style={[
                        styles.historyItem,
                        index < section.data.length - 1 && styles.historyItemBorder,
                      ]}
                    >
                      <View
                        style={[
                          styles.historyIcon,
                          {
                            backgroundColor:
                              tx.type === 'payment' ? '#F0FDF4' : '#FFF7ED',
                          },
                        ]}
                      >
                        <Ionicons
                          name={tx.type === 'payment' ? 'checkmark-circle' : 'document-text'}
                          size={18}
                          color={tx.type === 'payment' ? '#16A34A' : '#F97316'}
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.historyItemTitle}>
                          {tx.type === 'payment' ? 'Payment' : 'Bill Added'} · {tx.billName}
                        </Text>
                        <Text style={styles.historyItemSub}>{tx.date}</Text>
                      </View>

                      <View style={{ alignItems: 'flex-end' }}>
                        <Text
                          style={[
                            styles.historyAmount,
                            {
                              color: tx.type === 'payment' ? '#16A34A' : '#EF4444',
                            },
                          ]}
                        >
                          {tx.type === 'payment' ? '+' : '-'}
                          {fmt(tx.amount)}
                        </Text>
                        <Text
                          style={[
                            styles.historyStatus,
                            {
                              color: tx.type === 'payment' ? '#16A34A' : '#EF4444',
                            },
                          ]}
                        >
                          {tx.type === 'payment' ? 'Paid' : 'Pending'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Bill Modal */}
      <Modal visible={billModal} transparent animationType="slide" onRequestClose={() => setBillModal(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setBillModal(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Add Bill</Text>

          <Text style={styles.fieldLabel}>Bill Name *</Text>
          <TextInput
            style={styles.fieldInput}
            placeholder="e.g. Tomatoes, Weekly Supply…"
            placeholderTextColor="#CBD5E1"
            value={billForm.name}
            onChangeText={(v) => setBillForm((p) => ({ ...p, name: v }))}
          />

          <Text style={styles.fieldLabel}>Bill Amount *</Text>
          <TextInput
            style={styles.fieldInput}
            placeholder="₹ 0"
            placeholderTextColor="#CBD5E1"
            value={billForm.amount}
            onChangeText={(v) => setBillForm((p) => ({ ...p, amount: v }))}
            keyboardType="numeric"
          />

          <TouchableOpacity
            style={[styles.sheetPrimaryBtn, (!billForm.name.trim() || !billForm.amount) && { opacity: 0.4 }]}
            onPress={addBill}
          >
            <Text style={styles.sheetPrimaryBtnText}>Add Bill</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setBillModal(false)}>
            <Text style={styles.sheetCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Record Payment Modal */}
      <Modal visible={payModal} transparent animationType="slide" onRequestClose={() => setPayModal(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setPayModal(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Record Payment</Text>

          <Text style={styles.fieldLabel}>Select Bill</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {pendingBills.map((b) => {
              const rem = b.amount - b.paid;
              const selected = payForm.billId === b.id;
              return (
                <TouchableOpacity
                  key={b.id}
                  style={[styles.billChip, selected && styles.billChipSelected]}
                  onPress={() => setPayForm((p) => ({ ...p, billId: b.id }))}
                >
                  <Text style={[styles.billChipName, selected && { color: '#2563EB' }]}>{b.name}</Text>
                  <Text style={[styles.billChipAmt, selected && { color: '#EF4444' }]}>
                    {fmt(rem)} due
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {payForm.billId > 0 && (() => {
            const selBill = supplier.bills.find((b) => b.id === payForm.billId);
            return selBill ? (
              <View style={styles.payBillInfo}>
                <Text style={styles.payBillInfoText}>
                  Max payable: <Text style={{ color: '#EF4444', fontWeight: '700' }}>
                    {fmt(selBill.amount - selBill.paid)}
                  </Text>
                </Text>
              </View>
            ) : null;
          })()}

          <Text style={styles.fieldLabel}>Amount</Text>
          <TextInput
            style={styles.fieldInput}
            placeholder="₹ 0"
            placeholderTextColor="#CBD5E1"
            value={payForm.amount}
            onChangeText={(v) => setPayForm((p) => ({ ...p, amount: v }))}
            keyboardType="numeric"
          />

          <TouchableOpacity
            style={[styles.sheetPrimaryBtn, (!payForm.billId || !payForm.amount) && { opacity: 0.4 }]}
            onPress={recordPayment}
          >
            <Text style={styles.sheetPrimaryBtnText}>Confirm Payment</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setPayModal(false)}>
            <Text style={styles.sheetCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

// Main Suppliers Screen
export default function SuppliersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [addSupModalVisible, setAddSupModalVisible] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierCategory, setNewSupplierCategory] = useState('');
  const [newSupplierAmount, setNewSupplierAmount] = useState('');

  // Load suppliers from storage
  const loadSuppliers = async () => {
    try {
      const stored = await AsyncStorage.getItem('suppliers_v2');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Ensure all suppliers have bills and transactions arrays
        const sanitized = parsed.map((s: any) => ({
          ...s,
          bills: Array.isArray(s.bills) ? s.bills : [],
          transactions: Array.isArray(s.transactions) ? s.transactions : [],
        }));
        setSuppliers(sanitized);
      }
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadSuppliers();
    }, [])
  );

  const saveSuppliers = async (updatedSuppliers: Supplier[]) => {
    try {
      await AsyncStorage.setItem('suppliers_v2', JSON.stringify(updatedSuppliers));
      setSuppliers(updatedSuppliers);
    } catch (error) {
      console.error('Error saving suppliers:', error);
    }
  };

  const updateSupplier = (updatedSupplier: Supplier) => {
    const updatedSuppliers = suppliers.map(s =>
      s.id === updatedSupplier.id ? updatedSupplier : s
    );
    saveSuppliers(updatedSuppliers);
    setSelectedSupplier(updatedSupplier);
  };

  // Add new supplier
  const addSupplier = () => {
    if (!newSupplierName.trim() || !newSupplierCategory.trim()) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    
    const amount = parseFloat(newSupplierAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Enter valid amount for first bill');
      return;
    }
    
    const now = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dateStr = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
    
    const newBill: Bill = {
      id: Date.now(),
      name: 'First Bill',
      date: dateStr,
      amount,
      paid: 0,
    };
    
    const newTransaction: Transaction = {
      id: Date.now() + 1,
      date: dateStr,
      type: 'bill',
      billId: newBill.id,
      billName: newBill.name,
      amount,
    };
    
    const newSupplier: Supplier = {
      id: Date.now(),
      name: newSupplierName.trim(),
      category: newSupplierCategory.trim(),
      bills: [newBill],
      transactions: [newTransaction],
    };
    
    const updatedSuppliers = [...suppliers, newSupplier];
    saveSuppliers(updatedSuppliers);
    
    setNewSupplierName('');
    setNewSupplierCategory('');
    setNewSupplierAmount('');
    setAddSupModalVisible(false);
    Alert.alert('Success', 'Supplier added ✓');
  };

  // Calculate supplier totals
  const getSupplierTotals = (supplier: Supplier) => {
    const bills = supplier.bills || [];
    const total = bills.reduce((sum, b) => sum + b.amount, 0);
    const paid = bills.reduce((sum, b) => sum + b.paid, 0);
    const pending = total - paid;
    const percentage = total > 0 ? Math.round((paid / total) * 100) : 100;
    return { total, paid, pending, percentage };
  };

  // Add new bill to supplier (from main screen)
  const addNewBillToSupplier = (supplier: Supplier) => {
    Alert.prompt(
      'New Bill',
      'Enter bill amount ₹',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: (amountStr: string | undefined) => {
            const amount = parseFloat(amountStr || '');
            if (isNaN(amount) || amount <= 0) {
              Alert.alert('Error', 'Enter valid amount');
              return;
            }
            
            Alert.prompt(
              'Bill Name',
              'Bill description (e.g., Weekly Vegetables)',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Add',
                  onPress: (name: string | undefined) => {
                    const now = new Date();
                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const dateStr = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
                    
                    const newBill: Bill = {
                      id: Date.now(),
                      name: name?.trim() || 'New Bill',
                      date: dateStr,
                      amount,
                      paid: 0,
                    };
                    
                    const newTx: Transaction = {
                      id: Date.now() + 1,
                      date: dateStr,
                      type: 'bill',
                      billId: newBill.id,
                      billName: newBill.name,
                      amount,
                    };
                    
                    const updatedSupplier = {
                      ...supplier,
                      bills: [...supplier.bills, newBill],
                      transactions: [...supplier.transactions, newTx],
                    };
                    
                    const updatedSuppliers = suppliers.map(s =>
                      s.id === supplier.id ? updatedSupplier : s
                    );
                    saveSuppliers(updatedSuppliers);
                    Alert.alert('Success', 'Bill added ✓');
                  },
                },
              ],
              'plain-text'
            );
          },
        },
      ],
      'plain-text'
    );
  };

  // Delete supplier
  const deleteSupplier = (supplier: Supplier) => {
    Alert.alert(
      'Delete Supplier',
      `Are you sure you want to delete ${supplier.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedSuppliers = suppliers.filter(s => s.id !== supplier.id);
            saveSuppliers(updatedSuppliers);
          }
        }
      ]
    );
  };

  // Add Supplier Modal
  const AddSupplierModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={addSupModalVisible}
      onRequestClose={() => setAddSupModalVisible(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1} 
        onPress={() => setAddSupModalVisible(false)}
      >
        <View style={styles.addModalBox}>
          <Text style={styles.addModalTitle}>➕ Add Supplier</Text>
          <TextInput
            style={styles.addModalInput}
            placeholder="Supplier name"
            value={newSupplierName}
            onChangeText={setNewSupplierName}
          />
          <TextInput
            style={styles.addModalInput}
            placeholder="Category (e.g. Vegetables)"
            value={newSupplierCategory}
            onChangeText={setNewSupplierCategory}
          />
          <TextInput
            style={styles.addModalInput}
            placeholder="First bill amount ₹"
            value={newSupplierAmount}
            onChangeText={setNewSupplierAmount}
            keyboardType="numeric"
          />
          <TouchableOpacity style={styles.addModalBtn} onPress={addSupplier}>
            <Text style={styles.addModalBtnText}>Add Supplier</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setAddSupModalVisible(false)}>
            <Text style={styles.addModalCancel}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // If a supplier is selected, show detail view
  if (selectedSupplier) {
    return (
      <SupplierDetailScreen 
        supplier={selectedSupplier} 
        onBack={() => setSelectedSupplier(null)} 
        onUpdate={updateSupplier}
      />
    );
  }

  // Main suppliers list view
  return (
    <View style={styles.container}>
      <AddSupplierModal />
      
      {/* Header */}
      <View style={[styles.mainHeader, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.mainHeaderTitle}>Suppliers</Text>
      </View>
      
      {/* Body */}
      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {suppliers.map((supplier) => {
          const { total, paid, pending, percentage } = getSupplierTotals(supplier);
          const isPaid = pending === 0;
          
          return (
            <TouchableOpacity 
              key={supplier.id} 
              style={[styles.supplierCard, isPaid && styles.paidCard]}
              onPress={() => setSelectedSupplier(supplier)}
              activeOpacity={0.7}
            >
              <View style={styles.supplierHeader}>
                <View style={styles.supplierNameRow}>
                  <View style={[styles.supplierAvatar, { backgroundColor: getAvatarColor(supplier.id) + '22' }]}>
                    <Text style={[styles.supplierAvatarText, { color: getAvatarColor(supplier.id) }]}>
                      {getInitials(supplier.name)}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.supplierName}>{supplier.name}</Text>
                    <Text style={styles.supplierCategory}>{supplier.category}</Text>
                  </View>
                </View>
                <View style={[styles.supplierBadge, isPaid ? styles.badgePaid : styles.badgePending]}>
                  <Text style={styles.supplierBadgeText}>{isPaid ? '✓ Cleared' : 'Pending'}</Text>
                </View>
              </View>
              
              {/* Quick stats */}
              <View style={styles.statsRow}>
                <View style={styles.statCell}>
                  <Text style={styles.statLabel}>Total Bills</Text>
                  <Text style={styles.statValue}>₹{total.toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.statCell}>
                  <Text style={styles.statLabel}>Paid</Text>
                  <Text style={[styles.statValue, { color: '#22C55E' }]}>₹{paid.toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.statCell}>
                  <Text style={styles.statLabel}>Pending</Text>
                  <Text style={[styles.statValue, { color: pending === 0 ? '#22C55E' : '#EF4444' }]}>
                    ₹{pending.toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
              
              {/* Progress Bar */}
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${percentage}%` }, isPaid && styles.progressDone]} />
              </View>
              
              {/* Action Buttons */}
              <View style={styles.cardActions}>
                <TouchableOpacity 
                  style={[styles.cardActionBtn, styles.cardActionOutline]} 
                  onPress={() => addNewBillToSupplier(supplier)}
                >
                  <Text style={styles.cardActionOutlineText}>+ Add Bill</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.cardActionBtn, styles.cardActionDanger]} 
                  onPress={() => deleteSupplier(supplier)}
                >
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  <Text style={styles.cardActionDangerText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}
        
        {/* Add Supplier Card */}
        <TouchableOpacity style={styles.addSupplierCard} onPress={() => setAddSupModalVisible(true)}>
          <Ionicons name="add-circle" size={40} color="#2563EB" />
          <Text style={styles.addSupplierTitle}>Add New Supplier</Text>
          <Text style={styles.addSupplierHint}>Tap to add supplier and track bills</Text>
        </TouchableOpacity>
        
        <View style={{ height: 20 }} />
      </ScrollView>
      
      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/home')}>
          <Ionicons name="home" size={24} color="#64748B" />
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/analytics')}>
          <Ionicons name="stats-chart" size={24} color="#64748B" />
          <Text style={styles.navLabel}>Analytics</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/products')}>
          <Ionicons name="pricetag" size={24} color="#64748B" />
          <Text style={styles.navLabel}>Products</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => {}}>
          <Ionicons name="people" size={24} color="#2563EB" />
          <Text style={[styles.navLabel, { color: '#2563EB' }]}>Suppliers</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  
  // Main Header
  mainHeader: {
    backgroundColor: '#2563EB',
    padding: 16,
    paddingBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainHeaderTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  
  // App Bar (Detail View)
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: { padding: 4, marginRight: 8 },
  appBarCenter: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  appBarAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  appBarAvatarText: { fontSize: 14, fontWeight: '800' },
  appBarName: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  appBarCategory: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
  
  // Body
  body: {
    flex: 1,
    padding: 14,
  },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },
  
  // Supplier Card
  supplierCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
  },
  paidCard: {
    borderColor: '#c0dd97',
    backgroundColor: '#fafff5',
  },
  supplierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  supplierNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  supplierAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supplierAvatarText: {
    fontSize: 16,
    fontWeight: '800',
  },
  supplierName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  supplierCategory: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 2,
  },
  supplierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgePending: {
    backgroundColor: '#FFF7ED',
  },
  badgePaid: {
    backgroundColor: '#EAF3DE',
  },
  supplierBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F172A',
  },
  
  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  statCell: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 3,
  },
  
  // Progress Bar
  progressBar: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 20,
    backgroundColor: '#2563EB',
  },
  progressDone: {
    backgroundColor: '#22C55E',
  },
  
  // Card Actions
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  cardActionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  cardActionOutline: {
    borderWidth: 1.5,
    borderColor: '#2563EB',
    backgroundColor: '#fff',
  },
  cardActionOutlineText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '800',
  },
  cardActionDanger: {
    borderWidth: 1.5,
    borderColor: '#EF4444',
    backgroundColor: '#fff',
  },
  cardActionDangerText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '800',
  },
  
  // Summary Card (Detail View)
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 34,
    fontWeight: '900',
    color: '#EF4444',
    letterSpacing: -1,
  },
  summaryNote: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: 4,
  },
  
  // Action Row
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  outlineBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtnText: { color: '#2563EB', fontSize: 14, fontWeight: '800' },
  
  // Section
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  
  // Bill Card
  billCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  billHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  billName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  billDate: { fontSize: 12, color: '#94A3B8', fontWeight: '500', marginTop: 2 },
  billRemaining: { fontSize: 16, fontWeight: '800', color: '#EF4444', textAlign: 'right' },
  billRemainingLabel: {
    fontSize: 10,
    color: '#EF4444',
    fontWeight: '600',
    textAlign: 'right',
    opacity: 0.75,
  },
  clearedPill: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  clearedPillText: { fontSize: 12, fontWeight: '700', color: '#16A34A' },
  progressTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 100,
    overflow: 'hidden',
    marginBottom: 12,
  },
  billMeta: { flexDirection: 'row' },
  billMetaCell: { flex: 1 },
  billMetaLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  billMetaValue: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  
  // Empty State
  emptyBills: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 42, marginBottom: 10 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  emptySub: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
  
  // History
  historyContainer: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  historyDate: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  historyItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  historyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  historyItemTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  historyItemSub: { fontSize: 11, color: '#94A3B8', fontWeight: '500', marginTop: 2 },
  historyAmount: { fontSize: 14, fontWeight: '800' },
  historyStatus: { fontSize: 10, fontWeight: '700', marginTop: 2 },
  
  // Add Supplier Card
  addSupplierCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginTop: 8,
    alignItems: 'center',
    gap: 8,
  },
  addSupplierTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  addSupplierHint: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
  },
  
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  addModalBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  addModalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 16,
  },
  addModalInput: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#fafafa',
    borderRadius: 12,
    padding: 13,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  addModalBtn: {
    backgroundColor: '#2563EB',
    padding: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  addModalBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  addModalCancel: {
    textAlign: 'center',
    padding: 10,
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
  
  // Sheet Modal
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    marginTop: 'auto',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 20 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  fieldInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 13,
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 16,
  },
  sheetPrimaryBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 14,
    padding: 15,
    alignItems: 'center',
    marginBottom: 12,
  },
  sheetPrimaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  sheetCancelText: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 6,
  },
  
  // Bill Chip
  billChip: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 10,
    backgroundColor: '#F8FAFC',
  },
  billChipSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  billChipName: { fontSize: 13, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
  billChipAmt: { fontSize: 11, fontWeight: '600', color: '#EF4444' },
  payBillInfo: {
    backgroundColor: '#FFF7ED',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  payBillInfoText: { fontSize: 12, fontWeight: '600', color: '#92400E' },
  
  // Bottom Nav
  bottomNav: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    paddingVertical: 8,
    paddingBottom: 12,
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
});