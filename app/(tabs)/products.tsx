import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const products = [
  { name: 'Puri plate', price: 20 },
  { name: 'Masala puri', price: 25 },
  { name: 'Tamarind water', price: 10 },
  { name: 'Special plate', price: 40 },
];

export default function Products() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Product Catalogue</Text>
        <Text style={styles.sub}>Add & manage your items</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, gap: 10 }}>
        {products.map((p) => (
          <View key={p.name} style={styles.card}>
            <View>
              <Text style={styles.name}>{p.name}</Text>
              <Text style={styles.price}>₹{p.price}</Text>
              <Text style={styles.muted}>Sold 0 times today</Text>
            </View>
            <View style={{ gap: 8 }}>
              <TouchableOpacity style={styles.del}><Text style={styles.delText}>Del</Text></TouchableOpacity>
              <TouchableOpacity style={styles.add}><Text style={styles.addText}>+ Bill</Text></TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={styles.form}>
          <Text style={styles.formTitle}>➕ Add new product</Text>
          <TextInput placeholder="Product name" style={styles.input} />
          <TextInput placeholder="Price ₹" keyboardType="numeric" style={styles.input} />
          <TouchableOpacity style={styles.save}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { backgroundColor: '#f97316', padding: 14 },
  title: { color: '#fff', fontSize: 22, fontWeight: '800' },
  sub: { color: '#ffedd5' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, flexDirection: 'row', justifyContent: 'space-between' },
  name: { fontSize: 20, fontWeight: '700' },
  price: { color: '#f97316', fontSize: 28, fontWeight: '700' },
  muted: { color: '#9ca3af' },
  del: { backgroundColor: '#fee2e2', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  delText: { color: '#b91c1c', fontWeight: '700' },
  add: { backgroundColor: '#f97316', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  addText: { color: '#fff', fontWeight: '700' },
  form: { backgroundColor: '#fff', borderRadius: 12, padding: 12, gap: 10 },
  formTitle: { fontSize: 22, fontWeight: '700' },
  input: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 10, height: 46 },
  save: { backgroundColor: '#f97316', borderRadius: 12, alignItems: 'center', paddingVertical: 12 },
  saveText: { color: '#fff', fontWeight: '700' },
});