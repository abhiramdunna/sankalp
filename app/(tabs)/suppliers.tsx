import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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

// Types
interface Order {
  id: number;
  date: string;
  amount: number;
  paid: number;
  note: string;
}

interface Supplier {
  id: number;
  name: string;
  category: string;
  orders: Order[];
}

export default function SuppliersScreen() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [addSupModalVisible, setAddSupModalVisible] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierCategory, setNewSupplierCategory] = useState('');
  const [newSupplierAmount, setNewSupplierAmount] = useState('');

  // Load suppliers from storage
  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      const stored = await AsyncStorage.getItem('suppliers');
      if (stored) {
        setSuppliers(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const saveSuppliers = async (updatedSuppliers: Supplier[]) => {
    try {
      await AsyncStorage.setItem('suppliers', JSON.stringify(updatedSuppliers));
      setSuppliers(updatedSuppliers);
    } catch (error) {
      console.error('Error saving suppliers:', error);
    }
  };

  // Calculate supplier totals
  const getSupplierTotals = (supplier: Supplier) => {
    const total = supplier.orders.reduce((sum, o) => sum + o.amount, 0);
    const paid = supplier.orders.reduce((sum, o) => sum + o.paid, 0);
    const pending = total - paid;
    const percentage = total > 0 ? Math.round((paid / total) * 100) : 100;
    return { total, paid, pending, percentage };
  };

  // Open payment modal
  const openPayModal = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setPaymentAmount('');
    setPayModalVisible(true);
  };

  // Confirm payment
  const confirmPayment = () => {
    if (!selectedSupplier) return;
    
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    let remaining = amount;
    const updatedOrders = [...selectedSupplier.orders];
    
    // Distribute payment to unpaid orders (oldest first)
    for (let i = 0; i < updatedOrders.length && remaining > 0; i++) {
      const order = updatedOrders[i];
      const orderPending = order.amount - order.paid;
      if (orderPending <= 0) continue;
      
      const paying = Math.min(orderPending, remaining);
      order.paid += paying;
      remaining -= paying;
    }

    const updatedSupplier = { ...selectedSupplier, orders: updatedOrders };
    const updatedSuppliers = suppliers.map(s =>
      s.id === selectedSupplier.id ? updatedSupplier : s
    );
    
    saveSuppliers(updatedSuppliers);
    setPayModalVisible(false);
    
    const { pending } = getSupplierTotals(updatedSupplier);
    if (pending === 0) {
      Alert.alert('Success', `🎉 ${selectedSupplier.name} fully cleared!`);
    } else {
      Alert.alert('Success', `₹${amount.toLocaleString('en-IN')} paid ✓`);
    }
  };

  // Add new order to supplier
  const addNewOrder = (supplier: Supplier) => {
    Alert.prompt(
      'New Order',
      'Enter order amount ₹',
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
              'Order Note',
              'Note (optional)',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Add',
                  onPress: (note: string | undefined) => {
                    const now = new Date();
                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const dateStr = `${now.getDate()} ${months[now.getMonth()]}`;
                    
                    const newOrder: Order = {
                      id: Date.now(),
                      date: dateStr,
                      amount,
                      paid: 0,
                      note: note || 'New order',
                    };
                    
                    const updatedSupplier = {
                      ...supplier,
                      orders: [...supplier.orders, newOrder],
                    };
                    const updatedSuppliers = suppliers.map(s =>
                      s.id === supplier.id ? updatedSupplier : s
                    );
                    saveSuppliers(updatedSuppliers);
                    Alert.alert('Success', 'Order added ✓');
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

  // Add new supplier
  const addSupplier = () => {
    if (!newSupplierName.trim() || !newSupplierCategory.trim()) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    
    const amount = parseFloat(newSupplierAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Enter valid amount for first order');
      return;
    }
    
    const now = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dateStr = `${now.getDate()} ${months[now.getMonth()]}`;
    
    const newSupplier: Supplier = {
      id: Date.now(),
      name: newSupplierName.trim(),
      category: newSupplierCategory.trim(),
      orders: [{
        id: Date.now(),
        date: dateStr,
        amount,
        paid: 0,
        note: 'First order',
      }],
    };
    
    const updatedSuppliers = [...suppliers, newSupplier];
    saveSuppliers(updatedSuppliers);
    
    setNewSupplierName('');
    setNewSupplierCategory('');
    setNewSupplierAmount('');
    setAddSupModalVisible(false);
    Alert.alert('Success', 'Supplier added ✓');
  };

  // Pay Modal Component
  const PayModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={payModalVisible}
      onRequestClose={() => setPayModalVisible(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1} 
        onPress={() => setPayModalVisible(false)}
      >
        <View style={styles.payModalBox}>
          <Text style={styles.payModalTitle}>Pay Supplier</Text>
          <Text style={styles.payModalSub}>
            Pending: ₹{selectedSupplier ? getSupplierTotals(selectedSupplier).pending.toLocaleString('en-IN') : 0}
          </Text>
          <TextInput
            style={styles.payModalInput}
            placeholder="Amount ₹"
            value={paymentAmount}
            onChangeText={setPaymentAmount}
            keyboardType="numeric"
          />
          <TouchableOpacity style={styles.payModalBtn} onPress={confirmPayment}>
            <Text style={styles.payModalBtnText}>Confirm Payment ✓</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setPayModalVisible(false)}>
            <Text style={styles.payModalCancel}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

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
            placeholder="First order amount ₹"
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

  // Render order status badge
  const getOrderStatus = (order: Order) => {
    const pending = order.amount - order.paid;
    if (pending === 0) return { label: '✓ Paid', style: styles.statusPaid };
    if (order.paid > 0) return { label: 'Part paid', style: styles.statusPart };
    return { label: 'Unpaid', style: styles.statusUnpaid };
  };

  // Render supplier card
  const renderSupplier = (supplier: Supplier) => {
    const { total, paid, pending, percentage } = getSupplierTotals(supplier);
    const isPaid = pending === 0;
    
    return (
      <View key={supplier.id} style={[styles.supplierCard, isPaid && styles.paidCard]}>
        <View style={styles.supplierHeader}>
          <Text style={styles.supplierName}>{supplier.name}</Text>
          <View style={[styles.supplierBadge, isPaid ? styles.badgePaid : styles.badgePending]}>
            <Text style={styles.supplierBadgeText}>{isPaid ? '✓ Cleared' : 'Pending'}</Text>
          </View>
        </View>
        <Text style={styles.supplierCategory}>{supplier.category}</Text>
        
        {/* Orders List */}
        <View style={styles.ordersList}>
          {supplier.orders.map((order, idx) => {
            const status = getOrderStatus(order);
            const pendingAmt = order.amount - order.paid;
            return (
              <View key={order.id} style={[styles.orderRow, 
                pendingAmt === 0 ? styles.orderFullyPaid : 
                order.paid > 0 ? styles.orderPartPaid : styles.orderUnpaid]}>
                <Text style={styles.orderDate}>{order.date}</Text>
                <Text style={styles.orderAmount}>
                  ₹{order.amount.toLocaleString('en-IN')}
                  {order.paid > 0 && pendingAmt > 0 && (
                    <Text style={styles.orderPaidNote}> (paid ₹{order.paid.toLocaleString('en-IN')})</Text>
                  )}
                </Text>
                <View style={status.style}>
                  <Text style={styles.orderStatusText}>{status.label}</Text>
                </View>
              </View>
            );
          })}
        </View>
        
        {/* Totals */}
        <View style={styles.totalsGrid}>
          <View style={styles.totalCell}>
            <Text style={styles.totalLabel}>Total Orders</Text>
            <Text style={styles.totalValue}>₹{total.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.totalCell}>
            <Text style={styles.totalLabel}>Paid</Text>
            <Text style={[styles.totalValue, { color: '#27500A' }]}>₹{paid.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.totalCell}>
            <Text style={styles.totalLabel}>Pending</Text>
            <Text style={[styles.totalValue, { color: pending === 0 ? '#27500A' : '#C0392B' }]}>
              ₹{pending.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>
        
        {/* Progress Bar */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${percentage}%` }, isPaid && styles.progressDone]} />
        </View>
        
        {!isPaid && (
          <TouchableOpacity style={styles.payButton} onPress={() => openPayModal(supplier)}>
            <Text style={styles.payButtonText}>
              Pay ₹{pending.toLocaleString('en-IN')} pending
            </Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity style={styles.addOrderBtn} onPress={() => addNewOrder(supplier)}>
          <Text style={styles.addOrderBtnText}>+ Add New Order / Bill</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <PayModal />
      <AddSupplierModal />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Suppliers</Text>
          <Text style={styles.headerSub}>Manage vendor bills & payments</Text>
        </View>
      </View>
      
      {/* Body */}
      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {suppliers.map(renderSupplier)}
        
        {/* Add Supplier Card */}
        <TouchableOpacity style={styles.addSupplierCard} onPress={() => setAddSupModalVisible(true)}>
          <Text style={styles.addSupplierTitle}>➕ Add Supplier</Text>
          <Text style={styles.addSupplierHint}>Tap to add new supplier</Text>
        </TouchableOpacity>
        
        <View style={{ height: 20 }} />
      </ScrollView>
      
      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/home')}>
          <Ionicons name="home" size={24} color="#aaa" />
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/products')}>
          <Ionicons name="pricetag" size={24} color="#aaa" />
          <Text style={styles.navLabel}>Products</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/analytics')}>
          <Ionicons name="stats-chart" size={24} color="#aaa" />
          <Text style={styles.navLabel}>Analytics</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => {}}>
          <Ionicons name="people" size={24} color="#FC8019" />
          <Text style={[styles.navLabel, { color: '#FC8019' }]}>Suppliers</Text>
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
    padding: 14,
    paddingHorizontal: 18,
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
  body: {
    flex: 1,
    padding: 14,
  },
  supplierCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: '#eee',
  },
  paidCard: {
    borderColor: '#c0dd97',
    backgroundColor: '#fafff5',
  },
  supplierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 3,
  },
  supplierName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#222',
  },
  supplierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgePending: {
    backgroundColor: '#fff3e8',
  },
  badgePaid: {
    backgroundColor: '#EAF3DE',
  },
  supplierBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  supplierCategory: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
    fontWeight: '600',
  },
  ordersList: {
    marginBottom: 12,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 5,
  },
  orderUnpaid: {
    backgroundColor: '#fff5eb',
    borderWidth: 1,
    borderColor: '#FC8019',
    borderStyle: 'dashed',
  },
  orderPartPaid: {
    backgroundColor: '#fff8f0',
    borderWidth: 1,
    borderColor: '#ffd5a0',
  },
  orderFullyPaid: {
    backgroundColor: '#eaf3de',
    borderWidth: 1,
    borderColor: '#c0dd97',
  },
  orderDate: {
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
  },
  orderAmount: {
    fontSize: 12,
    fontWeight: '800',
    color: '#222',
  },
  orderPaidNote: {
    color: '#aaa',
    fontWeight: '600',
  },
  statusUnpaid: {
    backgroundColor: '#FCEBEB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusPart: {
    backgroundColor: '#fff3e8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusPaid: {
    backgroundColor: '#EAF3DE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  orderStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#A32D2D',
  },
  totalsGrid: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  totalCell: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 10,
    color: '#999',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#222',
    marginTop: 2,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    marginBottom: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 20,
    backgroundColor: '#FC8019',
  },
  progressDone: {
    backgroundColor: '#27500A',
  },
  payButton: {
    padding: 10,
    borderWidth: 1.5,
    borderColor: '#FC8019',
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  payButtonText: {
    color: '#FC8019',
    fontSize: 13,
    fontWeight: '800',
  },
  addOrderBtn: {
    padding: 10,
    backgroundColor: '#fff8f0',
    borderWidth: 1.5,
    borderColor: '#FC8019',
    borderStyle: 'dashed',
    borderRadius: 10,
    alignItems: 'center',
  },
  addOrderBtnText: {
    color: '#FC8019',
    fontSize: 12,
    fontWeight: '800',
  },
  addSupplierCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 0.5,
    borderColor: '#eee',
    marginTop: 4,
    alignItems: 'center',
  },
  addSupplierTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#222',
    marginBottom: 4,
  },
  addSupplierHint: {
    fontSize: 11,
    color: '#FC8019',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  payModalBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  payModalTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#222',
    marginBottom: 4,
  },
  payModalSub: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    marginBottom: 16,
  },
  payModalInput: {
    borderWidth: 1.5,
    borderColor: '#eee',
    backgroundColor: '#fafafa',
    borderRadius: 12,
    padding: 13,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  payModalBtn: {
    backgroundColor: '#FC8019',
    padding: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  payModalBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  payModalCancel: {
    textAlign: 'center',
    padding: 10,
    color: '#aaa',
    fontSize: 13,
    fontWeight: '600',
  },
  addModalBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  addModalTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#222',
    marginBottom: 16,
  },
  addModalInput: {
    borderWidth: 1.5,
    borderColor: '#eee',
    backgroundColor: '#fafafa',
    borderRadius: 12,
    padding: 13,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  addModalBtn: {
    backgroundColor: '#FC8019',
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
    color: '#aaa',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
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
});