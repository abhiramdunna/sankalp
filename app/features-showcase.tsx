// features-showcase.tsx — UI-first walkthrough with inline phone mockups
// Each slide renders the actual screen UI so users see what they'll use

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  SafeAreaView,
  FlatList,
  StatusBar,
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Mock UI Components ────────────────────────────────────────────────────────

/** Home / Quick Billing screen mockup */
const BillingMockup = () => (
  <View style={mock.phone}>
    {/* header */}
    <LinearGradient colors={['#7C3AED', '#5B21B6']} style={mock.header}>
      <View style={mock.headerRow}>
        <View>
          <Text style={mock.headerGreet}>Good morning 👋</Text>
          <Text style={mock.headerBiz}>Ravi Stores</Text>
        </View>
        <View style={mock.avatarCircle}>
          <Text style={mock.avatarText}>R</Text>
        </View>
      </View>
      {/* stat cards */}
      <View style={mock.statRow}>
        <View style={[mock.statCard, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
          <Text style={mock.statVal}>₹12,400</Text>
          <Text style={mock.statLbl}>Today's Sales</Text>
        </View>
        <View style={[mock.statCard, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
          <Text style={mock.statVal}>8</Text>
          <Text style={mock.statLbl}>Bills</Text>
        </View>
      </View>
    </LinearGradient>

    {/* product list */}
    <View style={mock.body}>
      <Text style={mock.sectionTitle}>Select Products</Text>
      {[
        { name: 'Rice (5kg)', price: '₹280', qty: 2 },
        { name: 'Sunflower Oil', price: '₹185', qty: 1 },
        { name: 'Sugar (1kg)', price: '₹48', qty: 3 },
      ].map((item, i) => (
        <View key={i} style={mock.productRow}>
          <View style={[mock.productIcon, { backgroundColor: i === 0 ? '#F5F3FF' : i === 1 ? '#ECFEFF' : '#FFF7ED' }]}>
            <Text style={{ fontSize: 13 }}>{i === 0 ? '🌾' : i === 1 ? '🛢️' : '🍬'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={mock.productName}>{item.name}</Text>
            <Text style={mock.productPrice}>{item.price}</Text>
          </View>
          <View style={mock.qtyBadge}>
            <Text style={mock.qtyText}>×{item.qty}</Text>
          </View>
        </View>
      ))}
      {/* total bar */}
      <View style={mock.totalBar}>
        <Text style={mock.totalLabel}>Total</Text>
        <Text style={mock.totalAmt}>₹ 849</Text>
      </View>
      <View style={[mock.actionBtn, { backgroundColor: '#7C3AED' }]}>
        <Text style={mock.actionBtnText}>⚡  Complete Bill</Text>
      </View>
    </View>
  </View>
);

/** Pending Payments mockup */
const PendingMockup = () => (
  <View style={mock.phone}>
    <LinearGradient colors={['#D97706', '#B45309']} style={mock.header}>
      <View style={mock.headerRow}>
        <View>
          <Text style={mock.headerGreet}>Pending Payments</Text>
          <Text style={[mock.headerBiz, { fontSize: 12, opacity: 0.85 }]}>3 customers owe you</Text>
        </View>
        <View style={[mock.avatarCircle, { backgroundColor: '#fff' }]}>
          <Ionicons name="time-outline" size={18} color="#D97706" />
        </View>
      </View>
      <View style={mock.statRow}>
        <View style={[mock.statCard, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
          <Text style={mock.statVal}>₹6,200</Text>
          <Text style={mock.statLbl}>Total Pending</Text>
        </View>
        <View style={[mock.statCard, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
          <Text style={mock.statVal}>3</Text>
          <Text style={mock.statLbl}>Customers</Text>
        </View>
      </View>
    </LinearGradient>
    <View style={mock.body}>
      {[
        { name: 'Arjun Kumar', phone: '98765 43210', amount: '₹2,400', due: '2 days ago' },
        { name: 'Meena Devi',  phone: '87654 32109', amount: '₹1,800', due: '5 days ago' },
        { name: 'Suresh Rao',  phone: '76543 21098', amount: '₹2,000', due: 'Today' },
      ].map((c, i) => (
        <View key={i} style={mock.pendingCard}>
          <View style={[mock.ppAvatar, { backgroundColor: ['#FEF3C7','#EEF2FF','#FDF2F8'][i] }]}>
            <Text style={[mock.ppAvatarText, { color: ['#D97706','#4F46E5','#DB2777'][i] }]}>
              {c.name[0]}
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={mock.ppName}>{c.name}</Text>
            <Text style={mock.ppPhone}>{c.phone}</Text>
            <Text style={[mock.ppDue, { color: i === 2 ? '#EF4444' : '#9CA3AF' }]}>{c.due}</Text>
          </View>
          <Text style={mock.ppAmt}>{c.amount}</Text>
        </View>
      ))}
      <View style={[mock.actionBtn, { backgroundColor: '#D97706', marginTop: 4 }]}>
        <Text style={mock.actionBtnText}>+ Add Pending Payment</Text>
      </View>
    </View>
  </View>
);

/** Payment Recording mockup */
const PaymentsMockup = () => (
  <View style={mock.phone}>
    <LinearGradient colors={['#0891B2', '#0E7490']} style={mock.header}>
      <View style={mock.headerRow}>
        <View>
          <Text style={mock.headerGreet}>Record Payment</Text>
          <Text style={[mock.headerBiz, { fontSize: 12, opacity: 0.85 }]}>Supplier payouts</Text>
        </View>
        <View style={[mock.avatarCircle, { backgroundColor: '#fff' }]}>
          <Ionicons name="card-outline" size={18} color="#0891B2" />
        </View>
      </View>
    </LinearGradient>
    <View style={mock.body}>
      <Text style={mock.sectionTitle}>Recent Payments</Text>
      {[
        { supplier: 'Agro Traders',   amt: '₹14,500', date: 'Today 10:32 AM',    mode: 'UPI',  color: '#0891B2' },
        { supplier: 'Krishna Oils',   amt: '₹8,200',  date: 'Yesterday 4:15 PM', mode: 'Cash', color: '#059669' },
        { supplier: 'Metro Supplies', amt: '₹21,000', date: '14 May',            mode: 'UPI',  color: '#0891B2' },
      ].map((p, i) => (
        <View key={i} style={mock.payRow}>
          <View style={[mock.payIcon, { backgroundColor: i % 2 === 0 ? '#ECFEFF' : '#ECFDF5' }]}>
            <Ionicons name={p.mode === 'UPI' ? 'phone-portrait-outline' : 'cash-outline'} size={15} color={p.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={mock.productName}>{p.supplier}</Text>
            <Text style={mock.productPrice}>{p.date}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[mock.ppAmt, { fontSize: 13 }]}>{p.amt}</Text>
            <View style={[mock.modeBadge, { backgroundColor: p.mode === 'UPI' ? '#ECFEFF' : '#ECFDF5' }]}>
              <Text style={[mock.modeText, { color: p.color }]}>{p.mode}</Text>
            </View>
          </View>
        </View>
      ))}
      <View style={[mock.actionBtn, { backgroundColor: '#0891B2', marginTop: 8 }]}>
        <Text style={mock.actionBtnText}>+ Log New Payment</Text>
      </View>
    </View>
  </View>
);

/** Supplier Management mockup */
const SuppliersMockup = () => (
  <View style={mock.phone}>
    <LinearGradient colors={['#4F46E5', '#4338CA']} style={mock.header}>
      <View style={mock.headerRow}>
        <View>
          <Text style={mock.headerGreet}>Suppliers</Text>
          <Text style={[mock.headerBiz, { fontSize: 12, opacity: 0.85 }]}>6 active suppliers</Text>
        </View>
        <View style={[mock.avatarCircle, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
          <Ionicons name="add" size={20} color="#fff" />
        </View>
      </View>
      {/* search bar */}
      <View style={mock.searchBar}>
        <Ionicons name="search-outline" size={13} color="#94A3B8" />
        <Text style={mock.searchText}>Search suppliers...</Text>
      </View>
    </LinearGradient>
    <View style={mock.body}>
      {[
        { name: 'Agro Traders',   cat: 'Grains',     balance: '₹4,200', color: '#6366F1' },
        { name: 'Krishna Oils',   cat: 'Cooking Oil', balance: '₹1,800', color: '#0EA5E9' },
        { name: 'Metro Supplies', cat: 'Wholesale',   balance: '₹9,500', color: '#F59E0B' },
        { name: 'Patel Farms',    cat: 'Vegetables',  balance: '₹600',   color: '#10B981' },
      ].map((s, i) => (
        <View key={i} style={mock.supplierCard}>
          <View style={[mock.supplierAvatar, { backgroundColor: s.color }]}>
            <Text style={mock.supplierInitial}>{s.name[0]}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={mock.productName}>{s.name}</Text>
            <Text style={mock.productPrice}>{s.cat}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[mock.ppAmt, { fontSize: 13, color: '#EF4444' }]}>{s.balance}</Text>
            <Text style={{ fontSize: 9, color: '#9CA3AF', marginTop: 2 }}>pending</Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color="#CBD5E1" style={{ marginLeft: 6 }} />
        </View>
      ))}
    </View>
  </View>
);

/** Bill Tracking mockup */
const BillsMockup = () => (
  <View style={mock.phone}>
    <LinearGradient colors={['#DB2777', '#BE185D']} style={mock.header}>
      <View style={mock.headerRow}>
        <View>
          <Text style={mock.headerGreet}>Bill Tracking</Text>
          <Text style={[mock.headerBiz, { fontSize: 12, opacity: 0.85 }]}>Agro Traders</Text>
        </View>
        <View style={[mock.avatarCircle, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
          <Ionicons name="document-text-outline" size={18} color="#fff" />
        </View>
      </View>
      <View style={mock.statRow}>
        <View style={[mock.statCard, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
          <Text style={mock.statVal}>₹18,700</Text>
          <Text style={mock.statLbl}>Total Billed</Text>
        </View>
        <View style={[mock.statCard, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
          <Text style={mock.statVal}>₹4,200</Text>
          <Text style={mock.statLbl}>Pending</Text>
        </View>
      </View>
    </LinearGradient>
    <View style={mock.body}>
      <Text style={mock.sectionTitle}>Bills</Text>
      {[
        { name: 'May Stock',   date: '15 May', total: '₹8,200',  paid: true  },
        { name: 'Apr Stock',   date: '30 Apr', total: '₹6,300',  paid: true  },
        { name: 'Extra Order', date: '10 May', total: '₹4,200',  paid: false },
      ].map((b, i) => (
        <View key={i} style={mock.billRow}>
          <View style={[mock.billIcon, { backgroundColor: b.paid ? '#ECFDF5' : '#FDF2F8' }]}>
            <Ionicons name={b.paid ? 'checkmark-circle' : 'time-outline'} size={16}
              color={b.paid ? '#059669' : '#DB2777'} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={mock.productName}>{b.name}</Text>
            <Text style={mock.productPrice}>{b.date}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[mock.ppAmt, { fontSize: 13 }]}>{b.total}</Text>
            <View style={[mock.modeBadge, {
              backgroundColor: b.paid ? '#ECFDF5' : '#FDF2F8',
            }]}>
              <Text style={[mock.modeText, { color: b.paid ? '#059669' : '#DB2777' }]}>
                {b.paid ? 'Paid' : 'Pending'}
              </Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  </View>
);

/** Analytics / AI Insights mockup — highlighted */
const AnalyticsMockup = () => (
  <View style={mock.phone}>
    <LinearGradient colors={['#059669', '#047857']} style={mock.header}>
      <View style={mock.headerRow}>
        <View>
          <Text style={mock.headerGreet}>Reports & AI Insights</Text>
          <Text style={[mock.headerBiz, { fontSize: 12, opacity: 0.85 }]}>May 2025</Text>
        </View>
        {/* AI badge */}
        <View style={mock.aiBadgeHeader}>
          <Text style={mock.aiBadgeText}>✦ AI</Text>
        </View>
      </View>
      <View style={mock.statRow}>
        <View style={[mock.statCard, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
          <Text style={mock.statVal}>₹68,400</Text>
          <Text style={mock.statLbl}>Total Spent</Text>
        </View>
        <View style={[mock.statCard, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
          <Text style={mock.statVal}>↑ 18%</Text>
          <Text style={mock.statLbl}>vs Last Month</Text>
        </View>
      </View>
    </LinearGradient>
    <View style={mock.body}>
      {/* mini bar chart */}
      <Text style={mock.sectionTitle}>Monthly Spend</Text>
      <View style={mock.chartRow}>
        {[40, 65, 50, 80, 55, 100].map((h, i) => (
          <View key={i} style={{ alignItems: 'center', gap: 3 }}>
            <View style={[mock.bar, { height: h * 0.55, backgroundColor: i === 5 ? '#059669' : '#D1FAE5' }]} />
            <Text style={mock.barLabel}>{['D','J','F','M','A','M'][i]}</Text>
          </View>
        ))}
      </View>

      {/* AI insight card */}
      <LinearGradient colors={['#ECFDF5', '#D1FAE5']} style={mock.aiCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 }}>
          <View style={mock.aiIcon}>
            <Text style={{ fontSize: 12 }}>✦</Text>
          </View>
          <Text style={mock.aiTitle}>AI Insight</Text>
        </View>
        <Text style={mock.aiText}>
          Your spending on <Text style={{ fontWeight: '800', color: '#059669' }}>Agro Traders</Text> is up 23% this month. Consider negotiating bulk discounts.
        </Text>
      </LinearGradient>
    </View>
  </View>
);

/** Transaction History mockup */
const HistoryMockup = () => (
  <View style={mock.phone}>
    <LinearGradient colors={['#D97706', '#B45309']} style={mock.header}>
      <View style={mock.headerRow}>
        <View>
          <Text style={mock.headerGreet}>Transaction History</Text>
          <Text style={[mock.headerBiz, { fontSize: 12, opacity: 0.85 }]}>All records</Text>
        </View>
        <View style={[mock.avatarCircle, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
          <Ionicons name="funnel-outline" size={16} color="#fff" />
        </View>
      </View>
      <View style={mock.searchBar}>
        <Ionicons name="search-outline" size={13} color="#94A3B8" />
        <Text style={mock.searchText}>Search any transaction...</Text>
      </View>
    </LinearGradient>
    <View style={mock.body}>
      {[
        { label: 'Payment · Agro Traders',   sub: 'Today 10:32 AM',    amt: '-₹14,500', plus: false },
        { label: 'Bill · Krishna Oils',       sub: 'Yesterday',         amt: '+₹8,200',  plus: true  },
        { label: 'Payment · Metro Supplies',  sub: '14 May',            amt: '-₹21,000', plus: false },
        { label: 'Bill · Patel Farms',        sub: '12 May',            amt: '+₹3,600',  plus: true  },
      ].map((t, i) => (
        <View key={i} style={mock.txRow}>
          <View style={[mock.txDot, { backgroundColor: t.plus ? '#ECFDF5' : '#FFFBEB' }]}>
            <Ionicons name={t.plus ? 'document-text-outline' : 'arrow-up-outline'} size={14}
              color={t.plus ? '#059669' : '#D97706'} />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={mock.productName} numberOfLines={1}>{t.label}</Text>
            <Text style={mock.productPrice}>{t.sub}</Text>
          </View>
          <Text style={[mock.ppAmt, { fontSize: 12, color: t.plus ? '#059669' : '#D97706' }]}>
            {t.amt}
          </Text>
        </View>
      ))}
    </View>
  </View>
);

// ─── Shared mock styles ────────────────────────────────────────────────────────
const mock = StyleSheet.create({
  phone: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  headerGreet: { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },
  headerBiz: { fontSize: 15, color: '#fff', fontWeight: '900', letterSpacing: -0.3 },
  avatarCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '900', color: '#fff' },
  statRow: { flexDirection: 'row', gap: 8 },
  statCard: {
    flex: 1, borderRadius: 10, padding: 8,
  },
  statVal: { fontSize: 15, fontWeight: '900', color: '#fff' },
  statLbl: { fontSize: 9, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginTop: 1 },
  body: { flex: 1, padding: 12, gap: 6 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8,
    marginTop: 2,
  },
  searchText: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  productRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 10,
    padding: 8, borderWidth: 1, borderColor: '#F1F5F9',
  },
  productIcon: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  productName: { fontSize: 12, fontWeight: '700', color: '#1E293B' },
  productPrice: { fontSize: 10, color: '#94A3B8', fontWeight: '500', marginTop: 1 },
  qtyBadge: {
    backgroundColor: '#F5F3FF', borderRadius: 8,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  qtyText: { fontSize: 11, fontWeight: '800', color: '#7C3AED' },
  totalBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 8, marginTop: 2,
  },
  totalLabel: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  totalAmt: { fontSize: 16, fontWeight: '900', color: '#1E293B' },
  actionBtn: {
    borderRadius: 10, paddingVertical: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  actionBtnText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  pendingCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 10,
    padding: 8, borderWidth: 1, borderColor: '#F1F5F9',
  },
  ppAvatar: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  ppAvatarText: { fontSize: 13, fontWeight: '900' },
  ppName: { fontSize: 12, fontWeight: '800', color: '#1E293B' },
  ppPhone: { fontSize: 9, color: '#94A3B8', fontWeight: '500' },
  ppDue: { fontSize: 9, fontWeight: '600', marginTop: 1 },
  ppAmt: { fontSize: 14, fontWeight: '900', color: '#D97706' },
  payRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 10,
    padding: 8, borderWidth: 1, borderColor: '#F1F5F9',
  },
  payIcon: {
    width: 30, height: 30, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  modeBadge: {
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 2,
  },
  modeText: { fontSize: 9, fontWeight: '700' },
  supplierCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 10,
    padding: 8, borderWidth: 1, borderColor: '#F1F5F9',
  },
  supplierAvatar: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  supplierInitial: { fontSize: 14, fontWeight: '900', color: '#fff' },
  billRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 10,
    padding: 8, borderWidth: 1, borderColor: '#F1F5F9',
  },
  billIcon: {
    width: 30, height: 30, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  // Analytics
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 4, height: 60 },
  bar: { width: 20, borderRadius: 4 },
  barLabel: { fontSize: 9, color: '#94A3B8', fontWeight: '600' },
  aiCard: {
    borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: '#A7F3D0',
  },
  aiIcon: {
    width: 20, height: 20, borderRadius: 6,
    backgroundColor: '#059669',
    alignItems: 'center', justifyContent: 'center',
  },
  aiTitle: { fontSize: 11, fontWeight: '800', color: '#059669' },
  aiText: { fontSize: 11, color: '#374151', fontWeight: '500', lineHeight: 16 },
  aiBadgeHeader: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)',
  },
  aiBadgeText: { fontSize: 11, fontWeight: '900', color: '#fff' },
  // History
  txRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 10,
    padding: 8, borderWidth: 1, borderColor: '#F1F5F9',
  },
  txDot: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
});

// ─── Feature Data ──────────────────────────────────────────────────────────────
interface FeatureDef {
  id: string;
  title: string;
  emoji: string;
  tagline: string;
  tip: string;          // single actionable how-to hint
  accentColor: string;
  gradientColors: [string, string];
  badge?: string;
  isAI?: boolean;
  Mockup: React.FC;
}

const FEATURES: FeatureDef[] = [
  {
    id: 'billing',
    title: 'Quick Billing',
    emoji: '⚡',
    tagline: 'Bill customers in under a minute',
    tip: 'Tap + on Home → pick products → hit Complete Bill',
    accentColor: '#7C3AED',
    gradientColors: ['#7C3AED', '#5B21B6'],
    badge: 'Start here',
    Mockup: BillingMockup,
  },
  {
    id: 'pending',
    title: 'Pending Payments',
    emoji: '⏳',
    tagline: 'Track what customers owe you',
    tip: 'Home → Pending Payments → tap + to add a due amount',
    accentColor: '#D97706',
    gradientColors: ['#D97706', '#B45309'],
    badge: 'Never miss a due',
    Mockup: PendingMockup,
  },
  {
    id: 'payments',
    title: 'Payment Recording',
    emoji: '💳',
    tagline: 'Log supplier payments instantly',
    tip: 'Open a supplier → tap Record Payment → choose UPI or Cash',
    accentColor: '#0891B2',
    gradientColors: ['#0891B2', '#0E7490'],
    badge: 'Most used',
    Mockup: PaymentsMockup,
  },
  {
    id: 'suppliers',
    title: 'Supplier Management',
    emoji: '🏢',
    tagline: 'All your suppliers in one place',
    tip: 'Suppliers tab → tap + → fill name, phone & category',
    accentColor: '#4F46E5',
    gradientColors: ['#4F46E5', '#4338CA'],
    Mockup: SuppliersMockup,
  },
  {
    id: 'bills',
    title: 'Bill Tracking',
    emoji: '📄',
    tagline: 'See paid vs pending at a glance',
    tip: 'Open any supplier → Add Bill → enter items & amounts',
    accentColor: '#DB2777',
    gradientColors: ['#DB2777', '#BE185D'],
    Mockup: BillsMockup,
  },
  {
    id: 'analytics',
    title: 'AI Reports & Insights',
    emoji: '✦',
    tagline: 'Smart insights powered by AI',
    tip: 'Analytics tab → tap the ✦ AI card for personalised suggestions',
    accentColor: '#059669',
    gradientColors: ['#059669', '#047857'],
    badge: '✦ AI Powered',
    isAI: true,
    Mockup: AnalyticsMockup,
  },
  {
    id: 'history',
    title: 'Transaction History',
    emoji: '🕐',
    tagline: 'Every record, always available',
    tip: 'Analytics tab → History — search or filter by supplier & date',
    accentColor: '#D97706',
    gradientColors: ['#D97706', '#B45309'],
    Mockup: HistoryMockup,
  },
];

// ─── Dot Indicator ─────────────────────────────────────────────────────────────
const DotIndicator: React.FC<{ total: number; current: number; accentColor: string }> = ({
  total, current, accentColor,
}) => (
  <View style={dotS.row}>
    {Array.from({ length: total }).map((_, i) => (
      <Animated.View
        key={i}
        style={[
          dotS.dot,
          {
            backgroundColor: i === current ? accentColor : '#E2E8F0',
            width: i === current ? 22 : 6,
          },
        ]}
      />
    ))}
  </View>
);

const dotS = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  dot: { height: 6, borderRadius: 3 },
});

// ─── Slide ─────────────────────────────────────────────────────────────────────
const Slide: React.FC<{ feature: FeatureDef; index: number; scrollX: Animated.Value }> = ({
  feature, index, scrollX,
}) => {
  const inputRange = [(index - 1) * SCREEN_W, index * SCREEN_W, (index + 1) * SCREEN_W];

  const scale = scrollX.interpolate({
    inputRange,
    outputRange: [0.92, 1, 0.92],
    extrapolate: 'clamp',
  });

  const opacity = scrollX.interpolate({
    inputRange,
    outputRange: [0.55, 1, 0.55],
    extrapolate: 'clamp',
  });

  const { Mockup } = feature;
  // Compute phone preview height based on screen
  const phoneH = Math.min(SCREEN_H * 0.45, 340);

  return (
    <Animated.View style={[slideS.wrapper, { width: SCREEN_W, transform: [{ scale }], opacity }]}>

      {/* ── Phone frame ─────────────────────── */}
      <View style={[slideS.phoneFrame, { height: phoneH }]}>
        {/* notch */}
        <View style={slideS.notch} />
        <Mockup />
      </View>

      {/* ── Text card ───────────────────────── */}
      <View style={slideS.card}>
        {/* title row */}
        <View style={slideS.titleRow}>
          <LinearGradient
            colors={feature.gradientColors}
            style={slideS.emojiBox}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            {feature.isAI
              ? <Text style={slideS.emojiAI}>✦</Text>
              : <Text style={slideS.emoji}>{feature.emoji}</Text>
            }
          </LinearGradient>

          <View style={{ flex: 1 }}>
            <Text style={slideS.title}>{feature.title}</Text>
            <Text style={slideS.tagline}>{feature.tagline}</Text>
          </View>

          {feature.badge && (
            <View style={[slideS.badge, { backgroundColor: feature.isAI ? '#ECFDF5' : '#F5F3FF' }]}>
              <Text style={[slideS.badgeText, { color: feature.accentColor }]}>{feature.badge}</Text>
            </View>
          )}
        </View>

        {/* divider */}
        <View style={[slideS.divider, { backgroundColor: feature.accentColor + '22' }]} />

        {/* how-to tip */}
        <View style={slideS.tipRow}>
          <View style={[slideS.tipIcon, { backgroundColor: feature.accentColor + '18' }]}>
            <Ionicons name="finger-print-outline" size={14} color={feature.accentColor} />
          </View>
          <Text style={slideS.tipText}>{feature.tip}</Text>
        </View>

        {/* AI extra highlight */}
        {feature.isAI && (
          <LinearGradient
            colors={['#ECFDF5', '#D1FAE5']}
            style={slideS.aiHighlight}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            <Text style={slideS.aiHighlightText}>
              ✦  Powered by Sankalp AI — asks questions, finds patterns, gives smart recommendations
            </Text>
          </LinearGradient>
        )}
      </View>
    </Animated.View>
  );
};

const slideS = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 18,
    gap: 12,
  },
  phoneFrame: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
    paddingTop: 10, // room for notch
  },
  notch: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    width: 60, height: 10,
    backgroundColor: '#1E293B',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    zIndex: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emojiBox: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  emoji: { fontSize: 22 },
  emojiAI: { fontSize: 20, color: '#fff', fontWeight: '900' },
  title: { fontSize: 17, fontWeight: '900', color: '#0F172A', letterSpacing: -0.3 },
  tagline: { fontSize: 12, color: '#64748B', fontWeight: '500', marginTop: 2 },
  badge: {
    borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4,
  },
  badgeText: { fontSize: 10, fontWeight: '800' },
  divider: { height: 1 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  tipIcon: {
    width: 26, height: 26, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 1,
  },
  tipText: { flex: 1, fontSize: 12, color: '#475569', fontWeight: '600', lineHeight: 18 },
  aiHighlight: {
    borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: '#A7F3D0',
  },
  aiHighlightText: { fontSize: 11, color: '#065F46', fontWeight: '600', lineHeight: 17 },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────
const FeatureShowcase = ({ onComplete }: { onComplete?: () => void }) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  React.useEffect(() => {
    const onBackPress = () => true;
    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, []);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const x = event.nativeEvent.contentOffset.x;
        const idx = Math.round(x / SCREEN_W);
        setCurrentIndex(idx);
      },
    }
  );

  const scrollTo = useCallback((index: number) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
    setCurrentIndex(index);
  }, []);

  const goNext = () => scrollTo(currentIndex + 1);
  const finish = () => {
    if (onComplete) onComplete();
    else router.replace('/(tabs)/suppliers');
  };

  const currentFeature = FEATURES[currentIndex];
  const isLast = currentIndex === FEATURES.length - 1;

  return (
    <SafeAreaView style={[mainS.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* ── Header ──────────────────────────── */}
      <View style={mainS.header}>
        <View>
          <Text style={mainS.headline}>See what's inside</Text>
          <Text style={mainS.sub}>Swipe to explore each screen</Text>
        </View>
        <View style={mainS.stepBadge}>
          <Text style={[mainS.stepText, { color: currentFeature.accentColor }]}>
            {currentIndex + 1} / {FEATURES.length}
          </Text>
        </View>
      </View>

      {/* ── Carousel ────────────────────────── */}
      <Animated.FlatList
        ref={flatListRef}
        data={FEATURES}
        renderItem={({ item, index }) => (
          <Slide feature={item} index={index} scrollX={scrollX} />
        )}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        snapToInterval={SCREEN_W}
        decelerationRate="fast"
        style={{ flex: 1 }}
        contentContainerStyle={{ alignItems: 'center' }}
        getItemLayout={(_, index) => ({ length: SCREEN_W, offset: SCREEN_W * index, index })}
      />

      {/* ── Footer ──────────────────────────── */}
      <View style={[mainS.footer, { paddingBottom: insets.bottom + 10 }]}>
        <DotIndicator
          total={FEATURES.length}
          current={currentIndex}
          accentColor={currentFeature.accentColor}
        />

        <View style={mainS.btnRow}>
          {!isLast && (
            <TouchableOpacity style={mainS.skipBtn} onPress={finish} activeOpacity={0.7}>
              <Text style={mainS.skipText}>Skip</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[mainS.nextBtn, { backgroundColor: currentFeature.accentColor }]}
            onPress={isLast ? finish : goNext}
            activeOpacity={0.85}
          >
            {isLast ? (
              <>
                <Ionicons name="rocket-outline" size={17} color="#fff" />
                <Text style={mainS.nextText}>Get Started</Text>
              </>
            ) : (
              <>
                <Text style={mainS.nextText}>Next</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const mainS = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    paddingHorizontal: 22, paddingTop: 14, paddingBottom: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  headline: { fontSize: 20, fontWeight: '900', color: '#0F172A', letterSpacing: -0.4 },
  sub: { fontSize: 12, color: '#94A3B8', fontWeight: '500', marginTop: 2 },
  stepBadge: {
    backgroundColor: '#fff', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1.5, borderColor: '#E2E8F0',
  },
  stepText: { fontSize: 12, fontWeight: '800' },
  footer: {
    backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
    paddingHorizontal: 20, paddingTop: 14, gap: 12,
  },
  btnRow: { flexDirection: 'row', gap: 10 },
  skipBtn: {
    paddingVertical: 14, paddingHorizontal: 20,
    borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8F0',
    alignItems: 'center', justifyContent: 'center',
  },
  skipText: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  nextBtn: {
    flex: 1, flexDirection: 'row',
    paddingVertical: 14, paddingHorizontal: 20,
    borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14, shadowRadius: 8, elevation: 4,
  },
  nextText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});

export default FeatureShowcase;