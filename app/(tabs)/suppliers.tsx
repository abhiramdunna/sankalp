import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const suppliers = [
  { name: 'Raju Wholesale', category: 'Puri & dry goods', total: 8500, paid: 6000, pending: 2500 },
  { name: 'Venkat Fresh Mart', category: 'Vegetables & onions', total: 3200, paid: 3200, pending: 0 },
  { name: 'Sri Lakshmi Traders', category: 'Masala & spices', total: 4500, paid: 2000, pending: 2500 },
];

export default function Suppliers() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Suppliers</Text>
        <Text style={styles.sub}>Manage your vendors</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, gap: 10 }}>
        {suppliers.map((s) => {
          const paidAll = s.pending === 0;
          return (
            <View key={s.name} style={[styles.card, paidAll && styles.cardPaid]}>
              <View style={styles.topRow}>
                <Text style={styles.name}>{s.name}</Text>
                <Text style={[styles.tag, paidAll ? styles.tagPaid : styles.tagPending]}>
                  {paidAll ? 'Paid ✓' : 'Pending'}
                </Text>
              </View>
              <Text style={styles.cat}>{s.category}</Text>

              <View style={styles.stats}>
                <Stat label="Total" value={`₹${s.total}`} />
                <Stat label="Paid" value={`₹${s.paid}`} green />
                <Stat label="Pending" value={`₹${s.pending}`} red />
              </View>

              {paidAll ? (
                <Text style={styles.full}>Fully paid ✓</Text>
              ) : (
                <TouchableOpacity style={styles.payBtn}>
                  <Text style={styles.payText}>Pay ₹{s.pending}</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, green, red }: { label: string; value: string; green?: boolean; red?: boolean }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, green && { color: '#166534' }, red && { color: '#dc2626' }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { backgroundColor: '#f97316', padding: 14 },
  title: { color: '#fff', fontSize: 22, fontWeight: '800' },
  sub: { color: '#ffedd5' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  cardPaid: { borderColor: '#84cc16' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 24, fontWeight: '700' },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, fontWeight: '700', fontSize: 12 },
  tagPaid: { backgroundColor: '#ecfccb', color: '#3f6212' },
  tagPending: { backgroundColor: '#ffedd5', color: '#c2410c' },
  cat: { color: '#6b7280', marginVertical: 6 },
  stats: { flexDirection: 'row', gap: 8, marginTop: 4 },
  statBox: { flex: 1, backgroundColor: '#f9fafb', borderRadius: 10, padding: 8 },
  statLabel: { color: '#9ca3af', fontSize: 12 },
  statValue: { fontWeight: '800', fontSize: 20, color: '#111827' },
  payBtn: { marginTop: 10, borderWidth: 1.5, borderColor: '#f97316', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  payText: { color: '#f97316', fontWeight: '700' },
  full: { marginTop: 10, color: '#3f6212', fontWeight: '700' },
});