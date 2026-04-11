import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function Dashboard() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.app}>Sankalp</Text>
        <Text style={styles.sub}>Business dashboard</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today's collection</Text>
        <Text style={styles.amount}>₹0</Text>
        <Text style={styles.muted}>No sales yet today</Text>
      </View>

      <TouchableOpacity style={styles.cta}>
        <Text style={styles.ctaText}>New Bill</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Today's bills</Text>
      <Text style={styles.empty}>No sales yet</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', padding: 16 },
  header: { backgroundColor: '#f97316', borderRadius: 18, padding: 16, marginBottom: 14 },
  app: { color: '#fff', fontSize: 34, fontWeight: '800' },
  sub: { color: '#ffedd5', marginTop: 2, fontSize: 15 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 14 },
  cardTitle: { color: '#6b7280', fontSize: 16 },
  amount: { fontSize: 56, fontWeight: '800', color: '#111827', marginVertical: 4 },
  muted: { color: '#f97316', fontWeight: '600' },
  cta: {
    backgroundColor: '#f97316',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 14,
  },
  ctaText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  sectionTitle: { fontSize: 28, fontWeight: '700', color: '#111827' },
  empty: { marginTop: 20, textAlign: 'center', color: '#9ca3af', fontSize: 18 },
});