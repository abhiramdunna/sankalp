import { SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function Bill() {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Live Bill</Text>
        <Text style={styles.sub}>Add items · collect when done</Text>
      </View>

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Running total</Text>
        <Text style={styles.total}>₹0</Text>
      </View>

      <View style={styles.emptyBox}>
        <Text style={styles.empty}>No items yet</Text>
      </View>

      <View style={styles.inputRow}>
        <TextInput placeholder="Item name (optional)" style={styles.input} />
        <View style={styles.qty}><Text style={styles.qtyText}>0</Text></View>
      </View>

      <View style={styles.pad}>
        {keys.map((k) => (
          <TouchableOpacity key={k} style={styles.key}>
            <Text style={styles.keyText}>{k}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.btn, styles.btnOutline]}>
            <Text style={styles.btnOutlineText}>📋 From catalogue</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnPrimary]}>
          <Text style={styles.btnPrimaryText}>+ Add item</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.collect} disabled>
        <Text style={styles.collectText}>Collect</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', padding: 12 },
  header: { backgroundColor: '#f97316', borderRadius: 14, padding: 14, marginBottom: 10 },
  title: { color: '#fff', fontWeight: '800', fontSize: 24 },
  sub: { color: '#ffedd5' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, backgroundColor: '#fff', borderRadius: 12 },
  totalLabel: { color: '#6b7280' },
  total: { color: '#f97316', fontWeight: '800', fontSize: 42 },
  emptyBox: { height: 100, alignItems: 'center', justifyContent: 'center' },
  empty: { color: '#9ca3af' },
  inputRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  input: { flex: 1, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, height: 48 },
  qty: { width: 88, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: 30, fontWeight: '700' },
  pad: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  key: { width: '31%', backgroundColor: '#fff', borderRadius: 10, height: 52, alignItems: 'center', justifyContent: 'center' },
  keyText: { fontSize: 30, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  btn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  btnOutline: { borderWidth: 1.5, borderColor: '#f97316', backgroundColor: '#fff' },
  btnPrimary: { backgroundColor: '#f97316' },
  btnOutlineText: { color: '#f97316', fontWeight: '700' },
  btnPrimaryText: { color: '#fff', fontWeight: '700' },
  collect: { backgroundColor: '#d1d5db', marginTop: 8, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  collectText: { color: '#fff', fontWeight: '700' },
});