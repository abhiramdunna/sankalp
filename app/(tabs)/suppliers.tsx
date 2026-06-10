import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/lib/store';
import { AppTheme } from '@/constants/theme';
import { db as DatabaseService } from '@/lib/database';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState, memo, useMemo } from 'react';
import {
    Alert,
    BackHandler,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
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
  items?: string[]; // Items/products in the bill
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

// Generate a unique numeric id — timestamp + random suffix to avoid collisions
let _idCounter = 0;
const uniqueId = () => Date.now() * 1000 + ((_idCounter++) % 1000);

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

  const accentColor = type === 'error' ? '#EF4444' : type === 'success' ? '#16A34A' : '#2563EB';
  const iconName = type === 'error' ? 'alert-circle' : type === 'success' ? 'checkmark-circle' : 'information-circle';
  const bgColor = type === 'error' ? '#FEF2F2' : type === 'success' ? '#F0FDF4' : '#EFF6FF';

  return (
    <View style={{
      position: 'absolute',
      bottom: 20,
      left: 16,
      right: 16,
      borderRadius: 12,
      paddingVertical: 13,
      paddingHorizontal: 16,
      zIndex: 9999,
      flexDirection: 'row',
      alignItems: 'center',
      borderLeftWidth: 4,
      backgroundColor: bgColor,
      borderLeftColor: accentColor,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.10,
      shadowRadius: 8,
      elevation: 6,
    }}>
      <Ionicons name={iconName as any} size={20} color={accentColor} style={{ marginRight: 10, flexShrink: 0 }} />
      <Text style={{ fontSize: 14, fontWeight: '600', flex: 1, flexWrap: 'wrap', color: '#0F172A' }} numberOfLines={2}>{message}</Text>
    </View>
  );
});

const todayStr = () => {
  const d = new Date();
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} ${hours}:${minutes}`;
};


// Helper to parse date string for sorting
const parseDate = (dateStr: string): Date => {
  const months: Record<string, number> = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
  };
  const parts = dateStr.split(' ');
  const day = parseInt(parts[0]);
  const month = months[parts[1]];
  const year = parseInt(parts[2]);
  const hours = parts[3] ? parseInt(parts[3].split(':')[0]) : 0;
  const minutes = parts[3] ? parseInt(parts[3].split(':')[1]) : 0;
  return new Date(year, month, day, hours, minutes);
};

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
            const hasData = markedDates.has(key);
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
                {hasData && !isSelected && (
                  <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: theme.colors.primary, marginTop: 1 }} />
                )}
              </TouchableOpacity>
            );
          })}
          {cells.slice(row * 7, row * 7 + 7).length < 7 &&
            Array.from({ length: 7 - cells.slice(row * 7, row * 7 + 7).length }, (_, i) => (
              <View key={`pad-${i}`} style={{ flex: 1, height: 36 }} />
            ))
          }
        </View>
      ))}
    </View>
  );
});

// Transaction History Full Screen Component
const TransactionHistoryScreen = memo(({
  supplier,
  onBack,
  insetTop,
}: {
  supplier: Supplier;
  onBack: () => void;
  insetTop: number;
}) => {
  const { theme } = useThemeStore();
  const [showCalendar, setShowCalendar] = useState(false);
  const [txDateFilter, setTxDateFilter] = useState<string>('All');

  // All transactions for this supplier — with fallback for older records
  // that only have bills saved (no transactions array populated yet)
  const allTransactions = useMemo(() => {
    const txs = supplier.transactions || [];
    if (txs.length > 0) {
      return [...txs].sort((a, b) => b.id - a.id);
    }
    // Synthesize bill + payment transactions from bills array as fallback
    const synth: Transaction[] = [];
    (supplier.bills || []).forEach((b) => {
      synth.push({
        id: b.id,
        date: b.date,
        type: 'bill',
        billId: b.id,
        billName: b.name,
        amount: b.amount,
      });
      if (b.paid > 0) {
        synth.push({
          id: b.id - 1,
          date: b.date,
          type: 'payment',
          billId: b.id,
          billName: b.name,
          amount: b.paid,
        });
      }
    });
    return synth.sort((a, b) => b.id - a.id);
  }, [supplier.transactions, supplier.bills]);

  // Parse date string "3 May 2025 14:30" → "3 May 2025"
  const dayKey = (dateStr: string) => dateStr.split(' ').slice(0, 3).join(' ');

  // Filtered list
  const filtered = useMemo(() =>
    txDateFilter === 'All' ? allTransactions : allTransactions.filter(tx => dayKey(tx.date) === txDateFilter),
    [allTransactions, txDateFilter]
  );

  // Group by date
  const groups = useMemo(() => {
    const g: Record<string, Transaction[]> = {};
    filtered.forEach(tx => {
      const d = dayKey(tx.date);
      if (!g[d]) g[d] = [];
      g[d].push(tx);
    });
    return Object.entries(g).sort((a, b) => {
      const dateA = parseDate(a[0] + ' 00:00');
      const dateB = parseDate(b[0] + ' 00:00');
      return dateB.getTime() - dateA.getTime();
    });
  }, [filtered]);

  // Marked dates for calendar
  const markedDates = useMemo(() => {
    const s = new Set<string>();
    allTransactions.forEach(tx => {
      const parts = tx.date.split(' ');
      const months: Record<string,number> = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
      const d = parseInt(parts[0]);
      const m = months[parts[1]];
      const y = parseInt(parts[2]);
      if (!isNaN(d) && m !== undefined && !isNaN(y)) {
        s.add(`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
      }
    });
    return s;
  }, [allTransactions]);

  const selectedCalDate = useMemo((): Date | null => {
    if (txDateFilter === 'All') return null;
    const parts = txDateFilter.split(' ');
    const months: Record<string,number> = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
    const d = parseInt(parts[0]);
    const m = months[parts[1]];
    const y = parseInt(parts[2]);
    if (!isNaN(d) && m !== undefined && !isNaN(y)) return new Date(y, m, d);
    return null;
  }, [txDateFilter]);

  const handleCalendarSelect = useCallback((d: Date) => {
    const day = d.getDate();
    const monthName = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
    const year = d.getFullYear();
    setTxDateFilter(`${day} ${monthName} ${year}`);
    setShowCalendar(false);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB', paddingTop: insetTop }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#fff' }}>
        <TouchableOpacity onPress={onBack} style={{ marginRight: 12 }}>
          <Ionicons name="arrow-back" size={22} color="#333" />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#111', flex: 1 }}>Transaction History</Text>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '600' }}>{txDateFilter === 'All' ? 'All time' : txDateFilter}</Text>
        </View>
      </View>

      {/* Date filter bar */}
      <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingHorizontal: 16, paddingVertical: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            onPress={() => { setTxDateFilter('All'); setShowCalendar(false); }}
            style={{
              paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14,
              backgroundColor: txDateFilter === 'All' ? theme.colors.primary : '#F3F4F6',
              borderWidth: 1, borderColor: txDateFilter === 'All' ? theme.colors.primary : '#E5E7EB',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: txDateFilter === 'All' ? '#fff' : '#6B7280' }}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowCalendar(c => !c)}
            style={{
              flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14,
              backgroundColor: txDateFilter !== 'All' ? theme.colors.primaryLight : '#F3F4F6',
              borderWidth: 1, borderColor: txDateFilter !== 'All' ? theme.colors.primary : '#E5E7EB',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="calendar-outline" size={14} color={txDateFilter !== 'All' ? theme.colors.primary : '#9CA3AF'} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: txDateFilter !== 'All' ? theme.colors.primary : '#6B7280' }}>
                {txDateFilter !== 'All' ? txDateFilter : 'Pick a date'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {txDateFilter !== 'All' && (
                <TouchableOpacity onPress={() => { setTxDateFilter('All'); setShowCalendar(false); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={14} color={theme.colors.primary} />
                </TouchableOpacity>
              )}
              <Ionicons name={showCalendar ? 'chevron-up' : 'chevron-down'} size={13} color={txDateFilter !== 'All' ? theme.colors.primary : '#9CA3AF'} />
            </View>
          </TouchableOpacity>
        </View>
        {showCalendar && (
          <View style={{ marginTop: 10, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff', overflow: 'hidden' }}>
            <MiniCalendar selectedDate={selectedCalDate} onSelect={handleCalendarSelect} markedDates={markedDates} />
          </View>
        )}
      </View>

      {/* List */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {groups.length > 0 ? groups.map(([date, txList]) => (
          <View key={date}>
            <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>{date}</Text>
            </View>
            {txList.map((tx, i) => {
              const isBill = tx.type === 'bill';
              const bgColor = isBill ? '#FFF7ED' : '#F0FDF4';
              const iconColor = isBill ? '#F97316' : '#16A34A';
              const iconName = isBill ? 'document-text' : 'checkmark-circle';
              const txLabel = isBill ? 'Bill Added' : 'Payment';
              const amountColor = isBill ? '#0F172A' : '#16A34A';
              
              return (
                <View key={`${tx.id}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E5E7EB' }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: bgColor, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <Ionicons name={iconName} size={22} color={iconColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>{txLabel}</Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#64748B', marginTop: 1 }}>{tx.billName}</Text>
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: amountColor }}>{fmt(tx.amount)}</Text>
                </View>
              );
            })}
          </View>
        )) : (
          <View style={{ alignItems: 'center', paddingVertical: 80 }}>
            <Ionicons name="list-outline" size={56} color="#D1D5DB" />
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#9CA3AF', marginTop: 16 }}>No transactions found</Text>
            {txDateFilter !== 'All' && (
              <Text style={{ fontSize: 13, color: '#9CA3AF', marginTop: 6 }}>No transactions on {txDateFilter}</Text>
            )}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
});

// Pay Bill Full Screen — simple 2-step
const PayBillScreen = memo(({
  supplier, onBack, onPayment, insetTop, insetBottom,
}: {
  supplier: Supplier;
  onBack: () => void;
  onPayment: (billId: number, amount: number) => void;
  insetTop: number;
  insetBottom: number;
}) => {
  const { theme } = useThemeStore();
  const pendingBills = useMemo(
    () => [...supplier.bills.filter((b) => b.amount - b.paid > 0)].sort((a, b) => b.id - a.id),
    [supplier.bills]
  );

  const [selectedBillId, setSelectedBillId] = useState<number | null>(null);
  const [amountStr, setAmountStr] = useState('');

  const selectedBill = pendingBills.find((b) => b.id === selectedBillId) ?? null;
  const maxPay = selectedBill ? selectedBill.amount - selectedBill.paid : 0;
  const parsedAmount = parseFloat(amountStr);
  const amountValid = !isNaN(parsedAmount) && parsedAmount > 0 && parsedAmount <= maxPay;

  // Step 1 — pick bill
  if (!selectedBill) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8FAFC', paddingTop: insetTop }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
          <TouchableOpacity onPress={onBack} style={{ marginRight: 12, padding: 4 }}>
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A', flex: 1 }}>Pay Bill</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '600', marginBottom: 14 }}>
            Select a bill to pay
          </Text>

          {pendingBills.map((bill) => {
            const due = bill.amount - bill.paid;
            return (
              <TouchableOpacity
                key={bill.id}
                onPress={() => { setSelectedBillId(bill.id); setAmountStr(''); }}
                activeOpacity={0.75}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 14,
                  padding: 16,
                  marginBottom: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 3 }}>{bill.name}</Text>
                  <Text style={{ fontSize: 12, color: '#94A3B8' }}>{bill.date}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#EF4444' }}>{fmt(due)}</Text>
                  <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>due</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#CBD5E1" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  // Step 2 — enter amount
  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC', paddingTop: insetTop }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
        <TouchableOpacity onPress={() => setSelectedBillId(null)} style={{ marginRight: 12, padding: 4 }}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>{selectedBill.name}</Text>
          <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 1 }}>Due: {fmt(maxPay)}</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
          {/* Big amount input */}
          <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '600', marginBottom: 12, textAlign: 'center' }}>
            Enter payment amount
          </Text>
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            borderBottomWidth: 2,
            borderBottomColor: amountStr === '' ? '#E2E8F0' : amountValid ? theme.colors.primary : '#EF4444',
            paddingBottom: 8, marginBottom: 8,
          }}>
            <Text style={{ fontSize: 32, fontWeight: '700', color: '#94A3B8', marginRight: 4 }}>₹</Text>
            <TextInput
              style={{ fontSize: 40, fontWeight: '800', color: '#0F172A', minWidth: 80, textAlign: 'center' }}
              placeholder="0"
              placeholderTextColor="#D1D5DB"
              value={amountStr}
              onChangeText={setAmountStr}
              keyboardType="numeric"
              autoFocus
            />
          </View>

          {amountStr !== '' && !amountValid && (
            <Text style={{ fontSize: 12, color: '#EF4444', fontWeight: '600', textAlign: 'center', marginBottom: 8 }}>
              {parsedAmount > maxPay ? `Max is ${fmt(maxPay)}` : 'Enter a valid amount'}
            </Text>
          )}

          {/* Pay full shortcut */}
          <TouchableOpacity onPress={() => setAmountStr(String(maxPay))} style={{ alignSelf: 'center', marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.colors.primaryLight, borderWidth: 1, borderColor: theme.colors.border }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.primary }}>Pay full  {fmt(maxPay)}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: 16, paddingBottom: insetBottom + 16, paddingTop: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
          <TouchableOpacity
            onPress={() => { if (amountValid) onPayment(selectedBill.id, parsedAmount); }}
            activeOpacity={amountValid ? 0.8 : 1}
            style={{ backgroundColor: amountValid ? theme.colors.primary : '#E2E8F0', borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
          >
            <Text style={{ fontSize: 16, fontWeight: '800', color: amountValid ? '#fff' : '#94A3B8' }}>
              {amountValid ? `Confirm  ${fmt(parsedAmount)}` : 'Enter amount'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
});

// Supplier Detail Screen Component (inline)
const SupplierDetailScreen = ({ 
  supplier, 
  onBack, 
  onUpdate,
  onDelete
}: { 
  supplier: Supplier; 
  onBack: () => void; 
  onUpdate: (updated: Supplier) => void;
  onDelete: (supplier: Supplier) => void;
}) => {
  const insets = useSafeAreaInsets();
  const { theme } = useThemeStore();
  const styles = makeStyles(theme);
  const [billModal, setBillModal] = useState(false);
  const [payModal, setPayModal] = useState(false);
  const [clearedBillsModal, setClearedBillsModal] = useState(false);
  const [historyModal, setHistoryModal] = useState(false);
  const [transactionHistoryFullScreen, setTransactionHistoryFullScreen] = useState(false);
  const [payBillModalVisible, setPayBillModalVisible] = useState(false);
  const [payBillSelectedId, setPayBillSelectedId] = useState<number | null>(null);
  const [payBillAmountStr, setPayBillAmountStr] = useState('');
  const [billForm, setBillForm] = useState({ name: '', amount: '', items: '' });
  const [payForm, setPayForm] = useState({ billId: 0, amount: '' });
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');

  // Handle Android hardware back button — go back to supplier list, not out of the app
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (billModal) { setBillModal(false); return true; }
        if (payModal) { setPayModal(false); return true; }
        if (clearedBillsModal) { setClearedBillsModal(false); return true; }
        if (historyModal) { setHistoryModal(false); return true; }
        if (transactionHistoryFullScreen) { setTransactionHistoryFullScreen(false); return true; }
        if (payBillModalVisible) { setPayBillModalVisible(false); return true; }
        onBack();
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [billModal, payModal, clearedBillsModal, historyModal, transactionHistoryFullScreen, payBillModalVisible, onBack])
  );

  // If full-screen transaction history is open, show it
  if (transactionHistoryFullScreen) {
    return (
      <TransactionHistoryScreen
        supplier={supplier}
        onBack={() => setTransactionHistoryFullScreen(false)}
        insetTop={insets.top}
      />
    );
  }

  const totalPending = getPending(supplier);
  const accentColor = getAvatarColor(supplier.id);
  const pendingBills = supplier.bills.filter((b) => b.amount - b.paid > 0);
  const clearedBills = supplier.bills.filter((b) => b.amount - b.paid <= 0);
  
  // Group cleared bills by date
  const clearedBillsByDate = (() => {
    const sorted = [...clearedBills].sort((a, b) => {
      return parseDate(b.date).getTime() - parseDate(a.date).getTime();
    });
    const groups: Record<string, Bill[]> = {};
    sorted.forEach((bill) => {
      if (!groups[bill.date]) groups[bill.date] = [];
      groups[bill.date].push(bill);
    });
    return Object.entries(groups).map(([title, data]) => ({ title, data }));
  })();

  // History sections (date-grouped, ALL transactions — bills + payments)
  // Falls back to building from supplier.bills if transactions table is empty
  const historySections = (() => {
    const allTxs = supplier.transactions;

    // If no transactions exist (e.g. older records only saved in bills array),
    // synthesize bill + payment entries from supplier.bills so history is never blank
    const source: Transaction[] =
      allTxs.length > 0
        ? allTxs
        : supplier.bills.flatMap((b) => {
            const entries: Transaction[] = [{
              id: b.id,
              date: b.date,
              type: 'bill' as const,
              billId: b.id,
              billName: b.name,
              amount: b.amount,
            }];
            if (b.paid > 0) {
              entries.push({
                id: b.id - 1,
                date: b.date,
                type: 'payment' as const,
                billId: b.id,
                billName: b.name,
                amount: b.paid,
              });
            }
            return entries;
          });

    const sorted = [...source].sort((a, b) => b.id - a.id);
    const groups: Record<string, Transaction[]> = {};
    sorted.forEach((tx) => {
      const dateOnly = tx.date.split(' ').slice(0, 3).join(' ');
      if (!groups[dateOnly]) groups[dateOnly] = [];
      groups[dateOnly].push(tx);
    });
    return Object.entries(groups).map(([title, data]) => ({ title, data }));
  })();

  const addBill = () => {
    const amount = parseFloat(billForm.amount);
    if (!billForm.name.trim() || isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Enter bill name and valid amount');
      return;
    }

    // Parse items if provided
    const items = billForm.items.trim() 
      ? billForm.items.split('\n').map(item => item.trim()).filter(item => item.length > 0)
      : [];

    const newBill: Bill = {
      id: uniqueId(),
      name: billForm.name.trim(),
      date: todayStr(),
      amount,
      paid: 0,
      items: items.length > 0 ? items : undefined,
    };

    const newTx: Transaction = {
      id: uniqueId(),
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
    setBillForm({ name: '', amount: '', items: '' });
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
      id: uniqueId(),
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
    setToastMessage(`${fmt(amount)} paid towards "${bill.name}"`);
    setToastType('success');
    setToastVisible(true);
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
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity 
            onPress={() => {
              Alert.alert(
                'Delete Supplier',
                `Are you sure you want to delete ${supplier.name}?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                      onDelete(supplier);
                      onBack();
                    }
                  }
                ]
              );
            }}
            style={styles.deleteHeaderBtn}
          >
            <Ionicons name="trash-outline" size={22} color="#EF4444" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setTransactionHistoryFullScreen(true)}
            style={styles.deleteHeaderBtn}
          >
            <Ionicons name="time-outline" size={22} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>TOTAL PENDING</Text>
          <Text style={[styles.summaryAmount, totalPending === 0 && { color: '#16A34A' }]}>
            {totalPending === 0 ? 'All Clear ✅' : fmt(totalPending)}
          </Text>
          {totalPending > 0 && (
            <Text style={styles.summaryNote}>
              across {pendingBills.length} bill{pendingBills.length !== 1 ? 's' : ''}
            </Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.colors.primary }]} onPress={() => setBillModal(true)}>
            <Ionicons name="document-text-outline" size={17} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.primaryBtnText}>Add Bill</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.outlineBtn, pendingBills.length === 0 && { opacity: 0.4 }]}
            onPress={() => {
              if (pendingBills.length === 0) return;
              setPayBillSelectedId(pendingBills.length === 1 ? pendingBills[0].id : null);
              setPayBillAmountStr('');
              setPayBillModalVisible(true);
            }}
          >
            <Ionicons name="cash-outline" size={17} color={theme.colors.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.outlineBtnText, { color: theme.colors.primary }]}>Pay Bill</Text>
          </TouchableOpacity>
        </View>

        {/* Bills Section */}
        {supplier.bills.length > 0 && (
          <View style={styles.section}>
            <View style={styles.billsHeader}>
              <Text style={styles.sectionTitle}>Bills</Text>
              {clearedBills.length > 0 && (
                <TouchableOpacity onPress={() => setClearedBillsModal(true)}>
                  <Text style={[styles.seeAllBtn, { color: theme.colors.primary }]}>See All</Text>
                </TouchableOpacity>
              )}
            </View>
            {pendingBills.length > 0 ? (
              [...pendingBills].sort((a, b) => b.id - a.id).map((bill) => {
                const remaining = bill.amount - bill.paid;
                const progress = bill.amount > 0 ? bill.paid / bill.amount : 0;
                return (
                  <View key={bill.id} style={styles.billCard}>
                    <View style={styles.billHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.billName}>{bill.name}</Text>
                        <Text style={styles.billDate}>{bill.date}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          Alert.alert(
                            'Delete Bill',
                            `Delete "${bill.name}"? This cannot be undone.`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Delete',
                                style: 'destructive',
                                onPress: () => {
                                  const updatedBills = supplier.bills.filter(b => b.id !== bill.id);
                                  const updatedTx = supplier.transactions.filter(tx => tx.billId !== bill.id);
                                  onUpdate({ ...supplier, bills: updatedBills, transactions: updatedTx });
                                },
                              },
                            ]
                          );
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={{ padding: 4, marginLeft: 8 }}
                      >
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>

                    {progress > 0 && progress < 1 && (
                      <View style={styles.progressTrack}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${Math.round(progress * 100)}%` as any,
                              backgroundColor: theme.colors.primary,
                            },
                          ]}
                        />
                      </View>
                    )}

                    <View style={styles.billMeta}>
                      <View style={styles.billMetaCell}>
                        <Text style={styles.billMetaValue}>{fmt(bill.amount)}</Text>
                        <Text style={styles.billMetaName}>Total Bill</Text>
                      </View>
                      <View style={[styles.billMetaCell, { alignItems: 'flex-end' }]}>
                        <Text
                          style={[
                            styles.billMetaValue,
                            { color: '#EF4444' },
                          ]}
                        >
                          {fmt(remaining)}
                        </Text>
                        <Text style={styles.billMetaName}>Pending</Text>
                      </View>
                    </View>

                    {bill.items && bill.items.length > 0 && (
                      <View style={styles.billItems}>
                        <Text style={styles.billItemsTitle}>Items:</Text>
                        {bill.items.map((item, idx) => (
                          <Text key={idx} style={styles.billItem}>• {item}</Text>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyActiveBills}>
                <Text style={styles.emptyIcon}>✅</Text>
                <Text style={styles.emptyText}>No pending bills</Text>
              </View>
            )}
          </View>
        )}

        {supplier.bills.length === 0 && (
          <View style={styles.emptyBills}>
            <Text style={styles.emptyIcon}>🧾</Text>
            <Text style={styles.emptyTitle}>No bills added</Text>
            <Text style={styles.emptySub}>Tap "Add Bill" to start tracking</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Bill Modal */}
      <Modal visible={billModal} transparent animationType="slide" onRequestClose={() => setBillModal(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setBillModal(false)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Add Bill</Text>

            <Text style={styles.fieldLabel}>Bill Name *</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder=""
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

            <Text style={styles.fieldLabel}>Items (Optional)</Text>
            <TextInput
              style={[styles.fieldInput, { height: 80, textAlignVertical: 'top' }]}
              placeholder=""
              placeholderTextColor="#CBD5E1"
              value={billForm.items}
              onChangeText={(v) => setBillForm((p) => ({ ...p, items: v }))}
              multiline
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
        </KeyboardAvoidingView>
      </Modal>

      {/* Pay Bill Modal — inline bottom sheet */}
      <Modal visible={payBillModalVisible} transparent animationType="slide" onRequestClose={() => setPayBillModalVisible(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setPayBillModalVisible(false)} />
          <View style={[styles.sheet, { paddingBottom: 0, maxHeight: '90%', flexDirection: 'column' }]}>
            {/* Fixed header */}
            <View style={{ paddingHorizontal: 0, paddingTop: 0 }}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Pay Bill</Text>
            </View>

            {/* Scrollable content */}
            {(() => {
              const selBill = pendingBills.find(b => b.id === payBillSelectedId);
              const maxPay = selBill ? selBill.amount - selBill.paid : 0;
              const parsed = parseFloat(payBillAmountStr);
              const valid = !isNaN(parsed) && parsed > 0 && parsed <= maxPay;

              return (
                <>
                  <ScrollView
                    style={{ flexShrink: 1 }}
                    contentContainerStyle={{ paddingBottom: 8 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  >
                    {/* Bill selector — only shown when there are multiple pending bills */}
                    {pendingBills.length > 1 && (
                      <>
                        <Text style={styles.fieldLabel}>Select Bill</Text>
                        <View style={{ marginBottom: 16 }}>
                          {[...pendingBills].sort((a, b) => b.id - a.id).map((bill) => {
                            const due = bill.amount - bill.paid;
                            const selected = payBillSelectedId === bill.id;
                            return (
                              <TouchableOpacity
                                key={bill.id}
                                onPress={() => { setPayBillSelectedId(bill.id); setPayBillAmountStr(''); }}
                                style={[
                                  styles.billChip,
                                  selected && styles.billChipSelected,
                                  { marginRight: 0, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
                                ]}
                              >
                                <View style={{ flex: 1 }}>
                                  <Text style={[styles.billChipName, selected && { color: theme.colors.primary }]}>{bill.name}</Text>
                                  <Text style={styles.billChipAmt}>{fmt(due)} due</Text>
                                </View>
                                {selected && (
                                  <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} style={{ marginLeft: 8 }} />
                                )}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </>
                    )}

                    {/* Selected bill summary */}
                    {selBill && (
                      <View style={styles.payBillInfo}>
                        <Text style={styles.payBillInfoText}>
                          {selBill.name} · Due: {fmt(maxPay)}
                          {selBill.paid > 0 ? ` (Paid so far: ${fmt(selBill.paid)})` : ''}
                        </Text>
                      </View>
                    )}

                    <Text style={styles.fieldLabel}>Amount ₹</Text>
                    <TextInput
                      style={[
                        styles.fieldInput,
                        payBillAmountStr !== '' && !valid && { borderColor: '#EF4444' },
                        payBillAmountStr !== '' && valid && { borderColor: '#16A34A' },
                      ]}
                      placeholder="₹ 0"
                      placeholderTextColor="#CBD5E1"
                      value={payBillAmountStr}
                      onChangeText={setPayBillAmountStr}
                      keyboardType="numeric"
                      autoFocus={pendingBills.length === 1}
                    />

                    {selBill && (
                      <TouchableOpacity
                        onPress={() => setPayBillAmountStr(String(maxPay))}
                        style={{ alignSelf: 'flex-start', marginTop: -8, marginBottom: 16, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: theme.colors.primaryLight, borderWidth: 1, borderColor: theme.colors.border }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.primary }}>Pay full {fmt(maxPay)}</Text>
                      </TouchableOpacity>
                    )}

                    {payBillAmountStr !== '' && !valid && selBill && (
                      <Text style={{ fontSize: 12, color: '#EF4444', fontWeight: '600', marginTop: -8, marginBottom: 12 }}>
                        {parsed > maxPay ? `Max payable: ${fmt(maxPay)}` : 'Enter a valid amount'}
                      </Text>
                    )}
                  </ScrollView>

                  {/* Pinned action buttons — always visible */}
                  <View style={{ paddingTop: 12, paddingBottom: insets.bottom + 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
                    <TouchableOpacity
                      style={[styles.sheetPrimaryBtn, (!valid || !selBill) && { opacity: 0.4 }]}
                      onPress={() => {
                        if (!valid || !selBill) return;
                        const newTx: Transaction = {
                          id: uniqueId(),
                          date: todayStr(),
                          type: 'payment',
                          billId: selBill.id,
                          billName: selBill.name,
                          amount: parsed,
                        };
                        const updatedBills = supplier.bills.map((b) =>
                          b.id === selBill.id ? { ...b, paid: b.paid + parsed } : b
                        );
                        onUpdate({ ...supplier, bills: updatedBills, transactions: [...supplier.transactions, newTx] });
                        setPayBillModalVisible(false);
                        setPayBillAmountStr('');
                        setPayBillSelectedId(null);
                        setToastMessage(`${fmt(parsed)} paid towards "${selBill.name}"`);
                        setToastType('success');
                        setToastVisible(true);
                      }}
                    >
                      <Text style={styles.sheetPrimaryBtnText}>
                        {valid ? `Confirm  ${fmt(parsed)}` : 'Confirm Payment'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setPayBillModalVisible(false)}>
                      <Text style={styles.sheetCancelText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Cleared Bills Modal */}
      <Modal visible={clearedBillsModal} transparent animationType="slide" onRequestClose={() => setClearedBillsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.clearedBillsSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Cleared Bills</Text>
              <TouchableOpacity onPress={() => setClearedBillsModal(false)}>
                <Ionicons name="close" size={24} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false}>
              <View style={styles.clearedBillsContainer}>
                {clearedBillsByDate.length > 0 ? (
                  clearedBillsByDate.map((section) => (
                    <View key={section.title}>
                      <Text style={styles.clearedBillsDateHeader}>{section.title}</Text>
                      {section.data.map((bill) => {
                        return (
                          <View key={bill.id} style={styles.clearedBillItem}>
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                <Text style={styles.clearedBillName}>{bill.name}</Text>
                                <Ionicons name="checkmark-circle" size={18} color="#16A34A" style={{ marginLeft: 8 }} />
                              </View>
                              <Text style={styles.clearedBillAmount}>
                                Bill: {fmt(bill.amount)} • Paid: {fmt(bill.paid)}
                              </Text>
                              {bill.items && bill.items.length > 0 && (
                                <View style={{ marginTop: 8, backgroundColor: '#F1F5F9', borderRadius: 8, padding: 10 }}>
                                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B', marginBottom: 4 }}>Items:</Text>
                                  {bill.items.map((item, idx) => (
                                    <Text key={idx} style={{ fontSize: 11, color: '#0F172A', marginBottom: 2 }}>
                                      • {item}
                                    </Text>
                                  ))}
                                </View>
                              )}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyCleared}>
                    <Text style={styles.emptyIcon}>📋</Text>
                    <Text style={styles.emptyText}>No cleared bills yet</Text>
                  </View>
                )}
              </View>
            </ScrollView>

            <TouchableOpacity 
              style={[styles.clearedBillsCloseBtn, { backgroundColor: theme.colors.primary }]}
              onPress={() => setClearedBillsModal(false)}
            >
              <Text style={styles.clearedBillsCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* History Modal */}
      <Modal visible={historyModal} transparent animationType="slide" onRequestClose={() => setHistoryModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.clearedBillsSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Transaction History</Text>
              <TouchableOpacity onPress={() => setHistoryModal(false)}>
                <Ionicons name="close" size={24} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false}>
              <View style={styles.historyModalContainer}>
                {historySections.length > 0 ? (
                  historySections.map((section) => (
                    <View key={section.title}>
                      <Text style={styles.historyModalDate}>{section.title}</Text>
                      {section.data.map((tx, index) => {
                        const isBill = tx.type === 'bill';
                        const bgColor = isBill ? '#FFF7ED' : '#F0FDF4';
                        const iconColor = isBill ? '#F97316' : '#16A34A';
                        const iconName = isBill ? 'document-text' : 'checkmark-circle';
                        const txLabel = isBill ? 'Bill Added' : 'Payment';
                        const amountColor = isBill ? '#0F172A' : '#16A34A';
                        return (
                          <View
                            key={tx.id}
                            style={[
                              styles.historyModalItem,
                              index < section.data.length - 1 && styles.historyModalItemBorder,
                            ]}
                          >
                            <View style={[styles.historyModalIcon, { backgroundColor: bgColor }]}>
                              <Ionicons name={iconName as any} size={20} color={iconColor} />
                            </View>

                            <View style={{ flex: 1 }}>
                              <Text style={styles.historyModalItemTitle}>{txLabel}</Text>
                              <Text style={styles.historyModalItemBillName}>{tx.billName}</Text>
                            </View>

                            <View style={{ alignItems: 'flex-end' }}>
                              <Text style={[styles.historyModalAmount, { color: amountColor }]}>
                                {isBill ? '' : '+'}{fmt(tx.amount)}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyCleared}>
                    <Text style={styles.emptyIcon}>📋</Text>
                    <Text style={styles.emptyText}>No transaction history yet</Text>
                  </View>
                )}
              </View>
            </ScrollView>

            <TouchableOpacity 
              style={[styles.clearedBillsCloseBtn, { backgroundColor: theme.colors.primary }]}
              onPress={() => setHistoryModal(false)}
            >
              <Text style={styles.clearedBillsCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Toast Notification */}
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />
    </View>
  );
};

// Paid Bills Full Screen
const PaidBillsScreen = memo(({
  suppliers, txDateFilter, setTxDateFilter, insetTop, onClose,
}: {
  suppliers: Supplier[];
  txDateFilter: string;
  setTxDateFilter: (d: string) => void;
  insetTop: number;
  onClose: () => void;
}) => {
  const { theme } = useThemeStore();
  const [showCalendar, setShowCalendar] = useState(false);

  // Collect only payment transactions
  const allPayments = useMemo(() => {
    const list: (Transaction & { supplierName: string; supplierId: number })[] = [];
    suppliers.forEach(s => {
      s.transactions.filter(tx => tx.type === 'payment').forEach(tx => {
        list.push({ ...tx, supplierName: s.name, supplierId: s.id });
      });
    });
    return list.sort((a, b) => b.id - a.id);
  }, [suppliers]);

  // Parse date string "3 May 2025 14:30" → "3 May 2025"
  const dayKey = (dateStr: string) => dateStr.split(' ').slice(0, 3).join(' ');

  // Filtered list
  const filtered = useMemo(() =>
    txDateFilter === 'All' ? allPayments : allPayments.filter(tx => dayKey(tx.date) === txDateFilter),
    [allPayments, txDateFilter]
  );

  const filteredTotal = useMemo(() => filtered.reduce((s, tx) => s + tx.amount, 0), [filtered]);

  // Group by date
  const groups = useMemo(() => {
    const g: Record<string, typeof filtered> = {};
    filtered.forEach(tx => {
      const d = dayKey(tx.date);
      if (!g[d]) g[d] = [];
      g[d].push(tx);
    });
    return Object.entries(g);
  }, [filtered]);

  // Marked dates for calendar dots
  const markedDates = useMemo(() => {
    const s = new Set<string>();
    allPayments.forEach(tx => {
      const parts = tx.date.split(' ');
      const months: Record<string,number> = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
      const d = parseInt(parts[0]);
      const m = months[parts[1]];
      const y = parseInt(parts[2]);
      if (!isNaN(d) && m !== undefined && !isNaN(y)) {
        s.add(`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
      }
    });
    return s;
  }, [allPayments]);

  const selectedCalDate = useMemo((): Date | null => {
    if (txDateFilter === 'All') return null;
    const parts = txDateFilter.split(' ');
    const months: Record<string,number> = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
    const d = parseInt(parts[0]);
    const m = months[parts[1]];
    const y = parseInt(parts[2]);
    if (!isNaN(d) && m !== undefined && !isNaN(y)) return new Date(y, m, d);
    return null;
  }, [txDateFilter]);

  const handleCalendarSelect = useCallback((d: Date) => {
    const day = d.getDate();
    const monthName = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
    const year = d.getFullYear();
    setTxDateFilter(`${day} ${monthName} ${year}`);
    setShowCalendar(false);
  }, [setTxDateFilter]);

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB', paddingTop: insetTop }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#fff' }}>
        <TouchableOpacity onPress={onClose} style={{ marginRight: 12 }}>
          <Ionicons name="arrow-back" size={22} color="#333" />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#111', flex: 1 }}>Paid Bills</Text>
        <View style={{ alignItems: 'flex-end' }}>
          {txDateFilter !== 'All' && (
            <>
              <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '600' }}>{txDateFilter}</Text>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#16A34A' }}>{fmt(filteredTotal)}</Text>
            </>
          )}
        </View>
      </View>

      {/* Date filter bar */}
      <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingHorizontal: 16, paddingVertical: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            onPress={() => { setTxDateFilter('All'); setShowCalendar(false); }}
            style={{
              paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14,
              backgroundColor: txDateFilter === 'All' ? theme.colors.primary : '#F3F4F6',
              borderWidth: 1, borderColor: txDateFilter === 'All' ? theme.colors.primary : '#E5E7EB',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: txDateFilter === 'All' ? '#fff' : '#6B7280' }}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowCalendar(c => !c)}
            style={{
              flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14,
              backgroundColor: txDateFilter !== 'All' ? theme.colors.primaryLight : '#F3F4F6',
              borderWidth: 1, borderColor: txDateFilter !== 'All' ? theme.colors.primary : '#E5E7EB',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="calendar-outline" size={14} color={txDateFilter !== 'All' ? theme.colors.primary : '#9CA3AF'} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: txDateFilter !== 'All' ? theme.colors.primary : '#6B7280' }}>
                {txDateFilter !== 'All' ? txDateFilter : 'Pick a date'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {txDateFilter !== 'All' && (
                <TouchableOpacity onPress={() => { setTxDateFilter('All'); setShowCalendar(false); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={14} color={theme.colors.primary} />
                </TouchableOpacity>
              )}
              <Ionicons name={showCalendar ? 'chevron-up' : 'chevron-down'} size={13} color={txDateFilter !== 'All' ? theme.colors.primary : '#9CA3AF'} />
            </View>
          </TouchableOpacity>
        </View>
        {showCalendar && (
          <View style={{ marginTop: 10, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff', overflow: 'hidden' }}>
            <MiniCalendar selectedDate={selectedCalDate} onSelect={handleCalendarSelect} markedDates={markedDates} />
          </View>
        )}
      </View>


      {/* List */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {groups.length > 0 ? groups.map(([date, txList]) => (
          <View key={date}>
            <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>{date}</Text>
            </View>
            {txList.map((tx, i) => {
              const accent = getAvatarColor(tx.supplierId);
              return (
                <View key={`${tx.id}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E5E7EB' }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <Ionicons name="checkmark-circle" size={22} color="#16A34A" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>{tx.supplierName}</Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#64748B', marginTop: 1 }}>{tx.billName}</Text>
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: '#16A34A' }}>{fmt(tx.amount)}</Text>
                </View>
              );
            })}
          </View>
        )) : (
          <View style={{ alignItems: 'center', paddingVertical: 80 }}>
            <Ionicons name="checkmark-done-circle-outline" size={56} color="#D1D5DB" />
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#9CA3AF', marginTop: 16 }}>No payments found</Text>
            {txDateFilter !== 'All' && (
              <Text style={{ fontSize: 13, color: '#9CA3AF', marginTop: 6 }}>No payments on {txDateFilter}</Text>
            )}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
});

// Main Suppliers Screen
export default function SuppliersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useThemeStore();
  const styles = makeStyles(theme);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [addSupModalVisible, setAddSupModalVisible] = useState(false);
  const [paymentHistoryModalVisible, setPaymentHistoryModalVisible] = useState(false);
  const [txDateFilter, setTxDateFilter] = useState<string>('All');
  const [newSupplierName, setNewSupplierName] = useState('');
  
  const [newSupplierCategory, setNewSupplierCategory] = useState('');
  const [newSupplierAmount, setNewSupplierAmount] = useState('');

const loadSuppliers = async () => {
  try {
    const data = await DatabaseService.loadSuppliers();

    const sanitized = data.map((s: any) => ({
      ...s,
      bills: Array.isArray(s.bills) ? s.bills : [],
      transactions: Array.isArray(s.transactions) ? s.transactions : [],
    }));

    setSuppliers(sanitized);
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
    await DatabaseService.saveSuppliers(updatedSuppliers);
    setSuppliers(updatedSuppliers);
  } catch (error) {
    console.error('Error saving suppliers:', error);
    Alert.alert('Save Failed', 'Could not save changes. Please try again.'); // ✅ surface the error
  }
};

  const updateSupplier = (updatedSupplier: Supplier) => {
    const oldSupplier = suppliers.find(s => s.id === updatedSupplier.id);
    
    const updatedSuppliers = suppliers.map(s =>
      s.id === updatedSupplier.id ? updatedSupplier : s
    );
    
    // Save supplier first
    saveSuppliers(updatedSuppliers);
    
    // Then save any new transactions to the database
    if (oldSupplier) {
      const oldTxIds = new Set(oldSupplier.transactions.map(tx => tx.id));
      const newTransactions = updatedSupplier.transactions.filter(tx => !oldTxIds.has(tx.id));
      
      // Save each new transaction to database
      newTransactions.forEach(tx => {
        if (tx.type === 'bill') {
          const bill = updatedSupplier.bills.find(b => b.id === tx.billId);
          if (bill) {
            DatabaseService.addSupplierBill(updatedSupplier, bill).catch(err =>
              console.error('Error saving bill transaction:', err)
            );
          }
        } else if (tx.type === 'payment') {
          const bill = updatedSupplier.bills.find(b => b.id === tx.billId);
          if (bill) {
            DatabaseService.addSupplierPayment(updatedSupplier, bill, tx.amount, tx.date).catch(err =>
              console.error('Error saving payment transaction:', err)
            );
          }
        }
      });
    }
    
    setSelectedSupplier(updatedSupplier);
  };

  const addSupplier = () => {
  if (!newSupplierName.trim() || !newSupplierCategory.trim()) {
    Alert.alert('Error', 'Please fill supplier name and category');
    return;
  }

  const amount = parseFloat(newSupplierAmount);

  const now = new Date();
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  const dateStr = `${now.getDate()} ${
    months[now.getMonth()]
  } ${now.getFullYear()} ${hours}:${minutes}`;

  let bills: Bill[] = [];
  let transactions: Transaction[] = [];

  // Create first bill only if amount entered
  if (!isNaN(amount) && amount > 0) {
    const newBill: Bill = {
      id: uniqueId(),
      name: 'First Bill',
      date: dateStr,
      amount,
      paid: 0,
    };

    const newTransaction: Transaction = {
      id: uniqueId(),
      date: dateStr,
      type: 'bill',
      billId: newBill.id,
      billName: newBill.name,
      amount,
    };

    bills = [newBill];
    transactions = [newTransaction];
  }

  const newSupplier: Supplier = {
    id: uniqueId(),
    name: newSupplierName.trim(),
    category: newSupplierCategory.trim(),
    bills,
    transactions,
  };

  const updatedSuppliers = [...suppliers, newSupplier];

  saveSuppliers(updatedSuppliers).then(() => {
    // Save the first bill transaction to database if it exists
    if (bills.length > 0) {
      DatabaseService.addSupplierBill(newSupplier, bills[0]).catch(err =>
        console.error('Error saving first bill transaction:', err)
      );
    }
  });

  setNewSupplierName('');
  setNewSupplierCategory('');
  setNewSupplierAmount('');
  setAddSupModalVisible(false);

  Alert.alert('Success', 'Supplier added successfully ✓');
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
                    const hours = String(now.getHours()).padStart(2, '0');
                    const minutes = String(now.getMinutes()).padStart(2, '0');
                    const dateStr = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()} ${hours}:${minutes}`;
                    
                    const newBill: Bill = {
                      id: uniqueId(),
                      name: name?.trim() || 'New Bill',
                      date: dateStr,
                      amount,
                      paid: 0,
                    };
                    
                    const newTx: Transaction = {
                      id: uniqueId(),
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
                    
                    saveSuppliers(updatedSuppliers).then(() => {
                      DatabaseService.addSupplierBill(updatedSupplier, newBill).catch(err =>
                        console.error('Error saving bill transaction:', err)
                      );
                    });
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

  // Add Supplier Modal - inline (not a nested component) to prevent remount on every keystroke
  const renderAddSupplierModal = () => (
    <Modal
      animationType="slide"
      transparent
      visible={addSupModalVisible}
      onRequestClose={() => setAddSupModalVisible(false)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end' }}
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={() => setAddSupModalVisible(false)}
        />
        <View style={[styles.addSupplierModal, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.addSupplierModalHeader}>
            <Text style={styles.addSupplierModalTitle}>➕ Add Supplier</Text>
            <TouchableOpacity onPress={() => setAddSupModalVisible(false)}>
              <Text style={styles.modalClose}>×</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.addSupplierModalContent}>
            <View>
              <Text style={styles.inputLabel}>Supplier Name</Text>
              <View style={styles.inputBox}>
                <Ionicons name="person-outline" size={18} color="#999" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.inputField}
                  placeholder="Enter supplier name"
                  value={newSupplierName}
                  onChangeText={setNewSupplierName}
                  placeholderTextColor="#999"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
            </View>

            <View>
              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.inputBox}>
                <Ionicons name="pricetag-outline" size={18} color="#999" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.inputField}
                  placeholder="e.g., Vegetables"
                  value={newSupplierCategory}
                  onChangeText={setNewSupplierCategory}
                  placeholderTextColor="#999"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
            </View>

            <View>
              <Text style={styles.inputLabel}>First Bill Amount (Optional)</Text>
              <View style={styles.inputBox}>
                <Ionicons name="cash-outline" size={18} color="#999" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.inputField}
                  placeholder="Optional"
                  value={newSupplierAmount}
                  onChangeText={setNewSupplierAmount}
                  keyboardType="numeric"
                  placeholderTextColor="#999"
                  returnKeyType="done"
                />
              </View>
            </View>

            <TouchableOpacity style={[styles.addSupplierBtn, { backgroundColor: theme.colors.primary }]} onPress={addSupplier}>
              <Text style={styles.addSupplierBtnText}>Add Supplier ✓</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  // If a supplier is selected, show detail view
  if (selectedSupplier) {
    return (
      <SupplierDetailScreen 
        supplier={selectedSupplier} 
        onBack={() => setSelectedSupplier(null)} 
        onUpdate={updateSupplier}
        onDelete={deleteSupplier}
      />
    );
  }

  // Main suppliers list view
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {renderAddSupplierModal()}
      
      {/* Header */}
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.mainHeader, { paddingTop: insets.top + 8 }]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <Text style={styles.mainHeaderTitle}>Suppliers</Text>
          <TouchableOpacity onPress={() => setPaymentHistoryModalVisible(true)} style={styles.headerHistoryBtn}>
            <Ionicons name="time-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
      
      {/* Body */}
      <ScrollView style={[styles.body, { backgroundColor: theme.colors.background }]} showsVerticalScrollIndicator={false}>
        {suppliers.map((supplier) => {
          const { pending } = getSupplierTotals(supplier);
          const isPaid = pending === 0;
          
          return (
            <TouchableOpacity 
              key={supplier.id} 
              style={styles.supplierCard}
              onPress={() => setSelectedSupplier(supplier)}
              activeOpacity={0.7}
            >
              <View style={styles.supplierNameRow}>
                <View style={[styles.supplierAvatar, { backgroundColor: getAvatarColor(supplier.id) + '22' }]}>
                  <Text style={[styles.supplierAvatarText, { color: getAvatarColor(supplier.id) }]}>
                    {getInitials(supplier.name)}
                  </Text>
                </View>
                <Text style={styles.supplierName}>{supplier.name}</Text>
                <Text style={[styles.pendingAmount, pending === 0 && { color: '#22C55E' }]}>
                  {pending === 0 ? 'All Clear ✅' : fmt(pending)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
        
        {/* Add Supplier Card */}
        <TouchableOpacity style={styles.addSupplierCard} onPress={() => setAddSupModalVisible(true)}>
          <Ionicons name="add-circle" size={40} color={theme.colors.primary} />
          <Text style={styles.addSupplierTitle}>Add New Supplier</Text>
          <Text style={[styles.addSupplierHint, { color: theme.colors.primary }]}>Tap to add supplier and track bills</Text>
        </TouchableOpacity>
        
        <View style={{ height: 20 }} />
      </ScrollView>
      
      {/* Bottom Navigation */}
      

      {/* Paid Bills - Full Screen Modal */}
      <Modal visible={paymentHistoryModalVisible} transparent={false} animationType="slide" onRequestClose={() => { setPaymentHistoryModalVisible(false); setTxDateFilter('All'); }} statusBarTranslucent>
        <PaidBillsScreen
          suppliers={suppliers}
          txDateFilter={txDateFilter}
          setTxDateFilter={setTxDateFilter}
          insetTop={insets.top}
          onClose={() => { setPaymentHistoryModalVisible(false); setTxDateFilter('All'); }}
        />
      </Modal>
    </View>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  
  // Toast Notification
  toastContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    // Elevation for Android
    elevation: 6,
  },
  toastText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    flexWrap: 'wrap',
  },
  
  // Main Header
  mainHeader: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  mainHeaderTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },

  // Header History Button
  headerHistoryBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
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
  deleteHeaderBtn: { padding: 4 },
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
  supplierAvatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  supplierAvatarSmallText: {
    fontSize: 12,
    fontWeight: '700',
  },
  paymentSupplierName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  supplierName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgePending: {
    backgroundColor: '#FFF7ED',
  },
  statusBadgePaid: {
    backgroundColor: '#DCFCE7',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  pendingAmount: {
    fontSize: 24,
    fontWeight: '900',
    color: '#EF4444',
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
    backgroundColor: theme.colors.primary,
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
    borderColor: theme.colors.primary,
    backgroundColor: '#fff',
  },
  cardActionOutlineText: {
    color: theme.colors.primary,
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
    backgroundColor: theme.colors.primary,
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
    borderColor: theme.colors.primary,
    borderRadius: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtnText: { color: theme.colors.primary, fontSize: 14, fontWeight: '800' },
  
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
  billsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAllBtn: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
    textDecorationLine: 'underline',
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
  billMetaName: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 4,
  },
  billMetaValue: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  
  // Bill Items
  billItems: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  billItemsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
  },
  billItem: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
    marginBottom: 4,
  },
  
  // Empty State
  emptyBills: { alignItems: 'center', paddingVertical: 48 },
  emptyActiveBills: { alignItems: 'center', paddingVertical: 32 },
  emptyIcon: { fontSize: 42, marginBottom: 10 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  emptySub: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
  emptyText: { fontSize: 14, color: '#94A3B8', fontWeight: '500' },
  
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
    color: theme.colors.primary,
    fontWeight: '600',
  },
  
  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  modalContainer: { flex: 1 },
  addSupplierModal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  addSupplierModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  addSupplierModalTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A', marginBottom: 0 },
  modalClose: { fontSize: 28, fontWeight: '600', color: '#999' },
  addSupplierModalContent: { gap: 16 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 8 },
  inputBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 12, height: 50 },
  inputField: { flex: 1, fontSize: 14, fontWeight: '600', color: '#333', height: 50, paddingVertical: 0 },
  addSupplierBtn: { backgroundColor: theme.colors.primary, padding: 15, borderRadius: 14, alignItems: 'center', marginTop: 10 },
  addSupplierBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  
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
    backgroundColor: theme.colors.primary,
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
    borderColor: theme.colors.primary,
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
  
  // Cleared Bills Modal
  clearedBillsSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    marginTop: 'auto',
    flexDirection: 'column',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  clearedBillsContainer: {
    padding: 20,
    minHeight: 200,
  },
  clearedBillsDateHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 10,
  },
  clearedBillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  clearedBillName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  clearedBillAmount: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  emptyCleared: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  clearedBillsCloseBtn: {
    backgroundColor: theme.colors.primary,
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 14,
    alignItems: 'center',
  },
  clearedBillsCloseBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  
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

  // History Modal
  historyModalContainer: {
    padding: 20,
    minHeight: 200,
  },
  historyModalDate: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 10,
  },
  historyModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  historyModalItemBorder: {
    borderBottomWidth: 0,
  },
  historyModalIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  historyModalItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  historyModalItemBillName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  historyModalItemSub: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: 2,
  },
  historyModalAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  historyModalStatus: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
});